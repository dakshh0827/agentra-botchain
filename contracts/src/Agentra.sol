// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IAgentraRegistry {
    function registerAgent(uint256 _localTokenId, uint256 _version) external returns (uint256 globalAgentId);
}

/// @notice The ERC-7857 standard interface. It IS-A IERC721 by definition — this is not
/// a second token, it's the same token gaining three extra required functions.
interface IERC7857 is IERC721 {
    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external;
    function clone(address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external returns (uint256 newTokenId);
    function authorizeUsage(uint256 tokenId, address executor, bytes calldata permissions) external;
}

/// @notice Verifies re-encryption proofs. BOOTSTRAP implementation using your own
/// backend oracle's ECDSA signature — not a cryptographic guarantee, just a trust
/// assumption on your oracle key. Replace with 0G's TEE verifier before mainnet.
interface IERC7857DataVerifier {
    function verifyTransferProof(uint256 tokenId, bytes32 oldCommitment, bytes32 newCommitment, bytes calldata proof) external view returns (bool);
    function verifyCloneProof(uint256 sourceTokenId, bytes32 sourceCommitment, bytes32 newCommitment, bytes calldata proof) external view returns (bool);
}

contract TrustedOracleVerifier is IERC7857DataVerifier {
    address public admin;
    address public oracleSigner;

    event OracleSignerUpdated(address indexed oldSigner, address indexed newSigner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Verifier: not admin");
        _;
    }

    constructor(address _oracleSigner) {
        require(_oracleSigner != address(0), "Verifier: zero address");
        admin = msg.sender;
        oracleSigner = _oracleSigner;
    }

    function setOracleSigner(address _newSigner) external onlyAdmin {
        require(_newSigner != address(0), "Verifier: zero address");
        emit OracleSignerUpdated(oracleSigner, _newSigner);
        oracleSigner = _newSigner;
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Verifier: zero address");
        admin = _newAdmin;
    }

    function verifyTransferProof(uint256 tokenId, bytes32 oldCommitment, bytes32 newCommitment, bytes calldata proof) external view override returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked("TRANSFER", tokenId, oldCommitment, newCommitment));
        return _recoverSigner(messageHash, proof) == oracleSigner;
    }

    function verifyCloneProof(uint256 sourceTokenId, bytes32 sourceCommitment, bytes32 newCommitment, bytes calldata proof) external view override returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked("CLONE", sourceTokenId, sourceCommitment, newCommitment));
        return _recoverSigner(messageHash, proof) == oracleSigner;
    }

    function _recoverSigner(bytes32 messageHash, bytes calldata signature) private pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        require(signature.length == 65, "Verifier: bad signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(ethSignedHash, v, r, s);
    }
}

contract Agentra is ERC721, IERC7857, AccessControl, Pausable, ReentrancyGuard {
    address public feeCollector;
    uint256 public current0GPriceUSD;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 20;
    uint256 public constant ESCROW_TIMEOUT = 24 hours;

    uint256 private _nextTokenId = 1;
    uint256 public txCounter;
    uint256 public constant VERSION = 2;

    IAgentraRegistry public immutable registry;
    IERC7857DataVerifier public verifier;

    mapping(uint256 => uint256) public localToGlobalId;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 public constant VERIFIER_ADMIN_ROLE = keccak256("VERIFIER_ADMIN_ROLE");

    enum AgentTier { Standard, Professional, Enterprise }
    enum SubPeriod { Monthly, Yearly }
    enum TxStatus { Pending, Resolved, Refunded }
    enum TxType { Access, Comms }

    struct AgentInfo {
        AgentTier tier;
        uint256 monthlyPriceUSD;
        bool commsEnabled;
        uint256 commsPricePerCallUSD;
    }

    struct AgentIntelligence {
        bytes32 dataCommitment; // hash / 0G Storage root hash of the encrypted payload
        bytes sealedKey;        // decryption key, encrypted to current owner's pubkey
    }

    struct AgentDisplay {
        string avatarURI;
        string displayName;
    }

    struct PendingTx {
        uint256 id;
        address user;
        uint256 agentId;
        uint256 weiAmount;
        TxType txType;
        SubPeriod period;
        TxStatus status;
        uint256 timestamp;
    }

    struct DeployParams {
        uint256 monthlyPriceUSD;
        string avatarURI;
        string displayName;
        bytes32 dataCommitment;
        bytes sealedKey;
        bool commsEnabled;
        uint256 commsPricePerCallUSD;
        uint256 listingFeeUSD;
    }

    mapping(uint256 => AgentInfo) public agents;
    mapping(uint256 => AgentIntelligence) public agentData;
    mapping(uint256 => AgentDisplay) public agentDisplay;
    mapping(uint256 => mapping(address => uint256)) public accessRegistry;
    mapping(uint256 => PendingTx) public pendingTransactions;

    event PriceUpdated(uint256 new0GPriceUSD);
    event AgentDeployed(uint256 indexed agentId, address indexed creator, AgentTier tier, uint256 listingFeePaidUSD);
    event TxPending(uint256 indexed txId, address indexed user, uint256 indexed agentId, TxType txType, uint256 weiAmount);
    event TxResolved(uint256 indexed txId, address indexed user, uint256 indexed agentId);
    event TxRefunded(uint256 indexed txId, address indexed user, uint256 indexed agentId);
    event AgentCommsToggled(uint256 indexed agentId, bool enabled);
    event AgentCommsPriceUpdated(uint256 indexed agentId, uint256 newPrice);
    event AgentAccessGranted(uint256 indexed agentId, address indexed user, uint256 expiry);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event DataTransferred(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 newDataCommitment);
    event Cloned(uint256 indexed sourceTokenId, uint256 indexed newTokenId, address indexed to, bytes32 newDataCommitment);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor, bytes permissions);

    constructor(address _feeCollector, address _registry, address _verifier) ERC721("Agentra INFT", "AGNT") {
        require(_feeCollector != address(0), "Fee collector cannot be zero");
        require(_registry != address(0), "Registry cannot be zero");
        require(_verifier != address(0), "Verifier cannot be zero");

        feeCollector = _feeCollector;
        registry = IAgentraRegistry(_registry);
        verifier = IERC7857DataVerifier(_verifier);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(RESOLVER_ROLE, msg.sender);
        _grantRole(VERIFIER_ADMIN_ROLE, msg.sender);

        current0GPriceUSD = 1 ether;
    }

        function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IERC7857).interfaceId || super.supportsInterface(interfaceId);
    }

    function update0GPrice(uint256 _newPriceUSD) external onlyRole(ORACLE_ROLE) {
        require(_newPriceUSD > 0, "Price cannot be zero");
        current0GPriceUSD = _newPriceUSD;
        emit PriceUpdated(_newPriceUSD);
    }

    function setVerifier(address _newVerifier) external onlyRole(VERIFIER_ADMIN_ROLE) {
        require(_newVerifier != address(0), "Verifier cannot be zero");
        emit VerifierUpdated(address(verifier), _newVerifier);
        verifier = IERC7857DataVerifier(_newVerifier);
    }

    function getRequiredWei(uint256 _usdAmount) public view returns (uint256) {
        require(current0GPriceUSD > 0, "Oracle price not set");
        if (_usdAmount == 0) return 0;
        return (_usdAmount * 1e18) / current0GPriceUSD;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return agentDisplay[tokenId].avatarURI;
    }

    function deployStandardAgent(DeployParams calldata params) external payable nonReentrant whenNotPaused returns (uint256) {
        return _deployAgent(AgentTier.Standard, params);
    }

    function deployProfessionalAgent(DeployParams calldata params) external payable nonReentrant whenNotPaused returns (uint256) {
        return _deployAgent(AgentTier.Professional, params);
    }

    function deployEnterpriseAgent(DeployParams calldata params) external payable nonReentrant whenNotPaused returns (uint256) {
        return _deployAgent(AgentTier.Enterprise, params);
    }

    function _deployAgent(AgentTier _tier, DeployParams calldata params) private returns (uint256) {
        uint256 requiredWei = getRequiredWei(params.listingFeeUSD);
        require(msg.value >= requiredWei, "Insufficient Native 0G sent");

        if (msg.value > requiredWei) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - requiredWei}("");
            require(success, "Refund failed");
        }
        if (requiredWei > 0) {
            (bool feeSuccess, ) = payable(feeCollector).call{value: requiredWei}("");
            require(feeSuccess, "Fee transfer failed");
        }

        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        agents[tokenId] = AgentInfo({
            tier: _tier,
            monthlyPriceUSD: params.monthlyPriceUSD,
            commsEnabled: params.commsEnabled,
            commsPricePerCallUSD: params.commsPricePerCallUSD
        });

        agentData[tokenId] = AgentIntelligence({ dataCommitment: params.dataCommitment, sealedKey: params.sealedKey });
        agentDisplay[tokenId] = AgentDisplay({ avatarURI: params.avatarURI, displayName: params.displayName });
        accessRegistry[tokenId][msg.sender] = type(uint256).max;

        uint256 globalId = registry.registerAgent(tokenId, VERSION);
        localToGlobalId[tokenId] = globalId;

        emit AgentDeployed(tokenId, msg.sender, _tier, params.listingFeeUSD);
        return tokenId;
    }

    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("Agentra: use IERC7857.transfer with re-encryption proof");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert("Agentra: use IERC7857.transfer with re-encryption proof");
    }

    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external override nonReentrant whenNotPaused {
        require(_isAuthorized(ownerOf(tokenId), msg.sender, tokenId), "Agentra: not authorized");
        require(ownerOf(tokenId) == from, "Agentra: from is not owner");
        require(to != address(0), "Agentra: transfer to zero address");

        AgentIntelligence storage data = agentData[tokenId];
        bytes32 oldCommitment = data.dataCommitment;
        require(verifier.verifyTransferProof(tokenId, oldCommitment, oldCommitment, proof), "Agentra: invalid re-encryption proof");

        data.sealedKey = sealedKey;
        _transfer(from, to, tokenId);

        emit DataTransferred(tokenId, from, to, oldCommitment);
    }

    function clone(address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external override nonReentrant whenNotPaused returns (uint256 newTokenId) {
        require(_isAuthorized(ownerOf(tokenId), msg.sender, tokenId), "Agentra: not authorized");
        require(to != address(0), "Agentra: clone to zero address");

        AgentIntelligence storage sourceData = agentData[tokenId];
        bytes32 sourceCommitment = sourceData.dataCommitment;
        require(verifier.verifyCloneProof(tokenId, sourceCommitment, sourceCommitment, proof), "Agentra: invalid clone proof");

        newTokenId = _nextTokenId++;
        _mint(to, newTokenId);

        agentData[newTokenId] = AgentIntelligence({ dataCommitment: sourceCommitment, sealedKey: sealedKey });
        agentDisplay[newTokenId] = agentDisplay[tokenId];
        agents[newTokenId] = agents[tokenId];
        accessRegistry[newTokenId][to] = type(uint256).max;

        uint256 globalId = registry.registerAgent(newTokenId, VERSION);
        localToGlobalId[newTokenId] = globalId;

        emit Cloned(tokenId, newTokenId, to, sourceCommitment);
        emit AgentDeployed(newTokenId, to, agents[tokenId].tier, 0);
    }

    function authorizeUsage(uint256 tokenId, address executor, bytes calldata permissions) external override whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Agentra: not agent owner");
        require(executor != address(0), "Agentra: executor cannot be zero");

        uint256 expiry = abi.decode(permissions, (uint256));
        accessRegistry[tokenId][executor] = expiry;

        emit UsageAuthorized(tokenId, executor, permissions);
        emit AgentAccessGranted(tokenId, executor, expiry);
    }

    function purchaseAccess(uint256 _agentId, SubPeriod _period) external payable nonReentrant whenNotPaused {
        require(ownerOf(_agentId) != address(0), "Agent does not exist");

        AgentInfo storage agent = agents[_agentId];
        uint256 totalUsdCost = _period == SubPeriod.Yearly ? agent.monthlyPriceUSD * 12 : agent.monthlyPriceUSD;
        uint256 requiredWei = getRequiredWei(totalUsdCost);
        require(msg.value >= requiredWei, "Insufficient Native 0G sent");

        if (msg.value > requiredWei) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - requiredWei}("");
            require(success, "Refund failed");
        }

        txCounter++;
        pendingTransactions[txCounter] = PendingTx({
            id: txCounter, user: msg.sender, agentId: _agentId, weiAmount: requiredWei,
            txType: TxType.Access, period: _period, status: TxStatus.Pending, timestamp: block.timestamp
        });

        emit TxPending(txCounter, msg.sender, _agentId, TxType.Access, requiredWei);
    }

    function initiateAgentComms(uint256 _callerAgentId, uint256 _targetAgentId) external payable nonReentrant whenNotPaused {
        require(ownerOf(_callerAgentId) != address(0), "Caller agent missing");
        require(ownerOf(_targetAgentId) != address(0), "Target agent missing");

        AgentInfo storage targetAgent = agents[_targetAgentId];
        require(targetAgent.commsEnabled, "Target comms disabled");
        require(targetAgent.commsPricePerCallUSD > 0, "Target comms price zero");

        uint256 requiredWei = getRequiredWei(targetAgent.commsPricePerCallUSD);
        require(msg.value >= requiredWei, "Insufficient Native 0G sent");

        if (msg.value > requiredWei) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - requiredWei}("");
            require(success, "Refund failed");
        }

        txCounter++;
        pendingTransactions[txCounter] = PendingTx({
            id: txCounter, user: msg.sender, agentId: _targetAgentId, weiAmount: requiredWei,
            txType: TxType.Comms, period: SubPeriod.Monthly, status: TxStatus.Pending, timestamp: block.timestamp
        });

        emit TxPending(txCounter, msg.sender, _targetAgentId, TxType.Comms, requiredWei);
    }

    function resolveTransaction(uint256 _txId) external onlyRole(RESOLVER_ROLE) nonReentrant {
        PendingTx storage pTx = pendingTransactions[_txId];
        require(pTx.status == TxStatus.Pending, "Tx not pending");
        pTx.status = TxStatus.Resolved;

        if (pTx.txType == TxType.Access) {
            uint256 timeToAdd = pTx.period == SubPeriod.Yearly ? 365 days : 30 days;
            uint256 currentExp = accessRegistry[pTx.agentId][pTx.user];

            if (currentExp > block.timestamp && currentExp != type(uint256).max) {
                accessRegistry[pTx.agentId][pTx.user] = currentExp + timeToAdd;
            } else {
                accessRegistry[pTx.agentId][pTx.user] = block.timestamp + timeToAdd;
            }

            emit AgentAccessGranted(pTx.agentId, pTx.user, accessRegistry[pTx.agentId][pTx.user]);
        }

        uint256 platformFee = (pTx.weiAmount * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 creatorCut = pTx.weiAmount - platformFee;
        address currentOwner = ownerOf(pTx.agentId);

        if (platformFee > 0) {
            (bool feeSuccess, ) = payable(feeCollector).call{value: platformFee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        if (creatorCut > 0) {
            (bool creatorSuccess, ) = payable(currentOwner).call{value: creatorCut}("");
            require(creatorSuccess, "Creator transfer failed");
        }

        emit TxResolved(_txId, pTx.user, pTx.agentId);
    }

    function refundTransaction(uint256 _txId) external onlyRole(RESOLVER_ROLE) nonReentrant {
        PendingTx storage pTx = pendingTransactions[_txId];
        require(pTx.status == TxStatus.Pending, "Tx not pending");
        pTx.status = TxStatus.Refunded;

        (bool success, ) = payable(pTx.user).call{value: pTx.weiAmount}("");
        require(success, "Refund failed");

        emit TxRefunded(_txId, pTx.user, pTx.agentId);
    }

    function claimTimeoutRefund(uint256 _txId) external nonReentrant {
        PendingTx storage pTx = pendingTransactions[_txId];
        require(pTx.status == TxStatus.Pending, "Tx not pending");
        require(msg.sender == pTx.user, "Only payer can claim");
        require(block.timestamp > pTx.timestamp + ESCROW_TIMEOUT, "Escrow timeout not reached");

        pTx.status = TxStatus.Refunded;
        (bool success, ) = payable(pTx.user).call{value: pTx.weiAmount}("");
        require(success, "Refund failed");

        emit TxRefunded(_txId, pTx.user, pTx.agentId);
    }

    function toggleAgentComms(uint256 _agentId, bool _enabled) external whenNotPaused {
        require(ownerOf(_agentId) == msg.sender, "Not agent owner");
        agents[_agentId].commsEnabled = _enabled;
        emit AgentCommsToggled(_agentId, _enabled);
    }

    function updateAgentPricing(uint256 _agentId, uint256 _newMonthlyUSD, uint256 _newCommsUSD) external whenNotPaused {
        require(ownerOf(_agentId) == msg.sender, "Not agent owner");
        agents[_agentId].monthlyPriceUSD = _newMonthlyUSD;
        agents[_agentId].commsPricePerCallUSD = _newCommsUSD;
        emit AgentCommsPriceUpdated(_agentId, _newCommsUSD);
    }

    function updateAgentDisplay(uint256 _agentId, string calldata _avatarURI, string calldata _displayName) external whenNotPaused {
        require(ownerOf(_agentId) == msg.sender, "Not agent owner");
        agentDisplay[_agentId] = AgentDisplay({avatarURI: _avatarURI, displayName: _displayName});
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}