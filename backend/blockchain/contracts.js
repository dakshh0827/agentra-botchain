// backend/blockchain/contracts.js
import { ethers } from 'ethers'
import config from '../config/config.js'
const RPC_URLS = {
  16602: 'https://evmrpc-testnet.0g.ai',
  16661: 'https://evmrpc.0g.ai',
  968: 'https://rpc.bohr.life',
  677: 'https://rpc.botchain.ai',
}

// ─────────────────────────────────────────────
// AGENTRA ABI (ERC-7857 / V2)
// ─────────────────────────────────────────────
const AGENTRA_ABI = [
  // ─────────────────────────────────────────────
  // DEPLOYMENT — now takes a single DeployParams tuple instead of loose args
  // ─────────────────────────────────────────────
  'function deployStandardAgent(uint256 _monthlyPriceUSD,string _metadataURI,bool _commsEnabled,uint256 _commsPricePerCallUSD,uint256 _listingFeeUSD) payable returns (uint256)',
  'function deployProfessionalAgent(uint256 _monthlyPriceUSD,string _metadataURI,bool _commsEnabled,uint256 _commsPricePerCallUSD,uint256 _listingFeeUSD) payable returns (uint256)',
  'function deployEnterpriseAgent(uint256 _monthlyPriceUSD,string _metadataURI,bool _commsEnabled,uint256 _commsPricePerCallUSD,uint256 _listingFeeUSD) payable returns (uint256)',

  // ─────────────────────────────────────────────
  // ACCESS / PAYMENTS — unchanged
  // ─────────────────────────────────────────────
  'function purchaseAccess(uint256 _agentId,uint8 _period) payable',
  'function initiateAgentComms(uint256 _callerAgentId,uint256 _targetAgentId) payable',
  'function getRequiredWei(uint256 _usdAmount) view returns (uint256)',

  // ─────────────────────────────────────────────
  // AGENTS — unchanged
  // ─────────────────────────────────────────────
  'function agents(uint256) view returns (uint8 tier,uint256 monthlyPriceUSD,bool commsEnabled,uint256 commsPricePerCallUSD)',
  'function updateAgentPricing(uint256 _agentId,uint256 _newMonthlyUSD,uint256 _newCommsUSD)',
  'function toggleAgentComms(uint256 _agentId,bool _enabled)',
  'function updateAgentDisplay(uint256 _agentId,string _avatarURI,string _displayName)',

  // ─────────────────────────────────────────────
  // ERC-7857 CORE — new
  // ─────────────────────────────────────────────
  'function agentData(uint256) view returns (bytes32 dataCommitment,bytes sealedKey)',
  'function agentDisplay(uint256) view returns (string avatarURI,string displayName)',
  'function transfer(address from,address to,uint256 tokenId,bytes sealedKey,bytes proof)',
  'function clone(address to,uint256 tokenId,bytes sealedKey,bytes proof) returns (uint256 newTokenId)',
  'function authorizeUsage(uint256 tokenId,address executor,bytes permissions)',
  'function setVerifier(address _newVerifier)',
  'function verifier() view returns (address)',

  // ─────────────────────────────────────────────
  // ACCESS REGISTRY — unchanged
  // ─────────────────────────────────────────────
  'function accessRegistry(uint256,address) view returns (uint256)',
  'function localToGlobalId(uint256) view returns (uint256)',

  // ─────────────────────────────────────────────
  // TRANSACTIONS — unchanged
  // ─────────────────────────────────────────────
  'function pendingTransactions(uint256) view returns (uint256 id,address user,uint256 agentId,uint256 weiAmount,uint8 txType,uint8 period,uint8 status,uint256 timestamp)',
  'function txCounter() view returns (uint256)',
  'function resolveTransaction(uint256 _txId)',
  'function refundTransaction(uint256 _txId)',
  'function claimTimeoutRefund(uint256 _txId)',

  // ─────────────────────────────────────────────
  // ORACLE / PRICING — unchanged
  // ─────────────────────────────────────────────
  'function update0GPrice(uint256 _newPriceUSD)',
  'function current0GPriceUSD() view returns (uint256)',

  // ─────────────────────────────────────────────
  // ADMIN / PAUSABLE — unchanged
  // ─────────────────────────────────────────────
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',

  // ─────────────────────────────────────────────
  // ROLES — unchanged
  // ─────────────────────────────────────────────
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function ORACLE_ROLE() view returns (bytes32)',
  'function RESOLVER_ROLE() view returns (bytes32)',
  'function VERIFIER_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
  'function grantRole(bytes32 role,address account)',
  'function revokeRole(bytes32 role,address account)',
  'function renounceRole(bytes32 role,address callerConfirmation)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',

  // ─────────────────────────────────────────────
  // ERC721 CORE — transferFrom/safeTransferFrom kept in ABI so ethers
  // can still decode them if something calls them, but the contract
  // itself reverts on these now (see Agentra.sol)
  // ─────────────────────────────────────────────
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function approve(address to,uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator,bool approved)',
  'function isApprovedForAll(address owner,address operator) view returns (bool)',
  'function transferFrom(address from,address to,uint256 tokenId)',
  'function safeTransferFrom(address from,address to,uint256 tokenId)',
  'function safeTransferFrom(address from,address to,uint256 tokenId,bytes data)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',

  // ─────────────────────────────────────────────
  // METADATA — unchanged
  // ─────────────────────────────────────────────
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function VERSION() view returns (uint256)',

  // ─────────────────────────────────────────────
  // CONFIG — unchanged
  // ─────────────────────────────────────────────
  'function feeCollector() view returns (address)',
  'function registry() view returns (address)',
  'function PLATFORM_FEE_PERCENTAGE() view returns (uint256)',
  'function ESCROW_TIMEOUT() view returns (uint256)',

  // ─────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────
  'event AgentAccessGranted(uint256 indexed agentId,address indexed user,uint256 expiry)',
  'event AgentCommsPriceUpdated(uint256 indexed agentId,uint256 newPrice)',
  'event AgentCommsToggled(uint256 indexed agentId,bool enabled)',
  'event AgentDeployed(uint256 indexed agentId,address indexed creator,uint8 tier,uint256 listingFeePaidUSD)',
  'event TxPending(uint256 indexed txId,address indexed user,uint256 indexed agentId,uint8 txType,uint256 weiAmount)',
  'event TxResolved(uint256 indexed txId,address indexed user,uint256 indexed agentId)',
  'event TxRefunded(uint256 indexed txId,address indexed user,uint256 indexed agentId)',
  'event Approval(address indexed owner,address indexed approved,uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner,address indexed operator,bool approved)',
  'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
  'event Paused(address account)',
  'event Unpaused(address account)',
  'event PriceUpdated(uint256 new0GPriceUSD)',
  'event RoleAdminChanged(bytes32 indexed role,bytes32 indexed previousAdminRole,bytes32 indexed newAdminRole)',
  'event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)',
  'event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)',
  // ERC-7857 events — new
  'event DataTransferred(uint256 indexed tokenId,address indexed from,address indexed to,bytes32 newDataCommitment)',
  'event Cloned(uint256 indexed sourceTokenId,uint256 indexed newTokenId,address indexed to,bytes32 newDataCommitment)',
  'event UsageAuthorized(uint256 indexed tokenId,address indexed executor,bytes permissions)',
  'event VerifierUpdated(address indexed oldVerifier,address indexed newVerifier)',
]

// ─────────────────────────────────────────────
// CONTRACT MANAGER
// ─────────────────────────────────────────────
class ContractManager {
  constructor() {
    this.provider = null
    this.signer = null
    this.agentra = null
    this._initialized = false
    this._mockMode = false
  }

  async init() {
    if (this._initialized) return

    console.log('[CONTRACTS] ━━━ INITIALIZATION START ━━━')
    console.log('[CONTRACTS] Config Blockchain:', {
      rpcUrl: config.blockchain.rpcUrl || '(empty)',
      contractAddress: config.blockchain.contracts?.agentra || '(empty)',
      hasPrivateKey: !!config.blockchain.privateKey
    })

    if (!config.blockchain.rpcUrl) {
      console.warn('[CONTRACTS] ❌ Mock mode enabled — no RPC URL configured')
      this._mockMode = true
      this._initialized = true
      return
    }

    try {
      console.log('[CONTRACTS] Creating JSON RPC Provider:', config.blockchain.rpcUrl)
      this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)

      console.log('[CONTRACTS] Testing provider connection...')
      const network = await this.provider.getNetwork()
      console.log('[CONTRACTS] ✅ Connected to network:', {
        chainId: network.chainId,
        name: network.name
      })

      if (config.blockchain.privateKey) {
        console.log('[CONTRACTS] Creating signer from private key...')
        this.signer = new ethers.Wallet(config.blockchain.privateKey, this.provider)
        console.log('[CONTRACTS] ✅ Signer created:', this.signer.address)
      } else {
        console.log('[CONTRACTS] ⚠️ No private key provided, using provider as runner')
      }

      const runner = this.signer || this.provider
      const { agentra } = config.blockchain.contracts

      if (!agentra) {
        console.warn('[CONTRACTS] ❌ Agentra contract address not configured — mock mode enabled')
        this._mockMode = true
        this._initialized = true
        return
      }

      console.log('[CONTRACTS] Creating contract instance for:', agentra)
      this.agentra = new ethers.Contract(agentra, AGENTRA_ABI, runner)
      console.log('[CONTRACTS] ✅ Contract instance created')

      this._initialized = true
      console.log('[CONTRACTS] ✅ INITIALIZATION COMPLETE (LIVE MODE)')
      console.log('[CONTRACTS] ━━━ INITIALIZATION END ━━━')
    } catch (err) {
      console.error('[CONTRACTS] ❌ INITIALIZATION FAILED')
      console.error('[CONTRACTS] Error type:', err.constructor.name)
      console.error('[CONTRACTS] Error message:', err.message)
      console.error('[CONTRACTS] Error code:', err.code)
      console.error('[CONTRACTS] Error details:', err)
      this._mockMode = true
      this._initialized = true
      console.log('[CONTRACTS] ✅ Fallback to MOCK MODE')
      console.log('[CONTRACTS] ━━━ INITIALIZATION END ━━━')
    }
  }

  get isMock() {
    return this._mockMode
  }

  // ─────────────────────────────────────────────
  // NETWORK INFO — unchanged
  // ─────────────────────────────────────────────
  async getNetworkInfo() {
    if (this._mockMode || !this.provider) {
      return { mock: true, rpcUrl: config.blockchain.rpcUrl || 'none' }
    }
    try {
      const network = await this.provider.getNetwork()
      return {
        chainId: Number(network.chainId),
        name: network.name,
        rpcUrl: config.blockchain.rpcUrl,
      }
    } catch (err) {
      return { error: err.message }
    }
  }

  // ─────────────────────────────────────────────
  // DEPLOY AGENT — positional args, matches the deployed contract's real ABI
  // (not the older struct-based signature — see AGENTRA_ABI above)
  // ─────────────────────────────────────────────
  async deployAgent(tier, params) {
    // params: { monthlyPriceUSD, metadataURI, commsEnabled, commsPricePerCallUSD, listingFeeUSD }
    if (this._mockMode) {
      return { success: true, txHash: `0xmock_deploy_${Date.now()}` }
    }
    try {
      const requiredWei = params.listingFeeUSD > 0n
        ? await this.agentra.getRequiredWei(params.listingFeeUSD)
        : 0n
      const buffered = requiredWei ? (requiredWei + (requiredWei * 2n) / 100n) : 0n

      const tierIndex = Number(tier)
      let tx
      const args = [
        params.monthlyPriceUSD,
        params.metadataURI,
        !!params.commsEnabled,
        params.commsPricePerCallUSD,
        params.listingFeeUSD,
      ]

      if (tierIndex === 0) {
        tx = await this.agentra.deployStandardAgent(...args, { value: buffered })
      } else if (tierIndex === 1) {
        tx = await this.agentra.deployProfessionalAgent(...args, { value: buffered })
      } else {
        tx = await this.agentra.deployEnterpriseAgent(...args, { value: buffered })
      }

      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─────────────────────────────────────────────
  // ERC-7857 TRANSFER / CLONE / AUTHORIZE — new
  // These are typically submitted by the FRONTEND via the user's own
  // wallet (same pattern as your existing purchaseAccess flow), so this
  // manager-level method exists mainly for backend-relayed cases (e.g. a
  // "gasless transfer" feature) — most calls will go straight from the
  // frontend using sealedKey/proof values this backend computed for it.
  // ─────────────────────────────────────────────
  async transferAgent(from, to, tokenId, sealedKey, proof) {
    if (this._mockMode) {
      return { success: true, txHash: `0xmock_transfer_${Date.now()}` }
    }
    if (!this.signer) throw new Error('Signer required to relay transfer')
    try {
      const tx = await this.agentra.transfer(from, to, tokenId, sealedKey, proof)
      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async cloneAgent(to, tokenId, sealedKey, proof) {
    if (this._mockMode) {
      return { success: true, txHash: `0xmock_clone_${Date.now()}` }
    }
    if (!this.signer) throw new Error('Signer required to relay clone')
    try {
      const tx = await this.agentra.clone(to, tokenId, sealedKey, proof)
      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async getAgentData(tokenId) {
    if (this._mockMode) return null
    try {
      const d = await this.agentra.agentData(tokenId)
      return { dataCommitment: d.dataCommitment, sealedKey: d.sealedKey }
    } catch (err) {
      console.error('[CONTRACTS] getAgentData error:', err.message)
      return null
    }
  }

  // ─────────────────────────────────────────────
  // READ FUNCTIONS — unchanged
  // ─────────────────────────────────────────────
  async getAgent(agentId) {
    if (this._mockMode) return null
    try {
      const a = await this.agentra.agents(agentId)
      return {
        id: Number(agentId),
        tier: Number(a.tier),
        monthlyPriceUSD: a.monthlyPriceUSD.toString(),
        commsEnabled: Boolean(a.commsEnabled),
        commsPricePerCallUSD: a.commsPricePerCallUSD.toString(),
      }
    } catch (err) {
      console.error('[CONTRACTS] getAgent error:', err.message)
      return null
    }
  }

  async hasAccess(agentId, user) {
    if (this._mockMode) {
      console.log('[CONTRACTS] hasAccess() - Mock mode active, denying access', { agentId, user })
      return false
    }
    try {
      console.log('[CONTRACTS] hasAccess() - Checking on-chain access', { agentId, user })
      const exp = await this.agentra.accessRegistry(agentId, user)
      if (!exp) {
        console.log('[CONTRACTS] hasAccess() - No access record found')
        return false
      }
      const expNum = Number(exp)
      const isLifetime = expNum === Number.MAX_SAFE_INTEGER
      const hasNotExpired = expNum > Math.floor(Date.now() / 1000)
      console.log('[CONTRACTS] hasAccess() - Access found:', {
        agentId, user, isLifetime, expiresAt: new Date(expNum * 1000), hasNotExpired
      })
      if (isLifetime) return true
      return hasNotExpired
    } catch (err) {
      console.error('[CONTRACTS] hasAccess() - Error checking access:', err.message)
      return false
    }
  }

 // Helper to dynamically get or cache the provider for any chain
  getProvider(chainId) {
    const url = RPC_URLS[chainId] || config.blockchain.rpcUrl || 'https://rpc.bohr.life'
    if (!this._providers) this._providers = {}
    if (!this._providers[url]) {
      this._providers[url] = new ethers.JsonRpcProvider(url)
    }
    return this._providers[url]
  }

  async isTransactionConfirmed(txHash, chainId = null) {
    if (!txHash || typeof txHash !== 'string') return false
    if (this._mockMode) return true

    // Select the provider based on the chain where the agent lives
    const provider = chainId ? this.getProvider(chainId) : (this.provider || this.getProvider(677))
    if (!provider) return false

    // Retry up to 5 times (polling every 2s) to account for block minting latency
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash)
        if (receipt && receipt.status === 1) {
          return true
        }
      } catch (err) {
        // Ignore transient network errors while polling
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    return false
  }

  async waitForTransactionConfirmation(txHash, { timeoutMs = 120000, pollIntervalMs = 4000 } = {}) {
    if (!txHash || typeof txHash !== 'string') return false
    if (this._mockMode) return true
    if (!this.provider) return false
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const confirmed = await this.isTransactionConfirmed(txHash)
      if (confirmed) return true
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }
    return false
  }

  onAgentDeployed(callback) {
    return () => {}
  }

  onAccessPurchased(callback) {
    return () => {}
  }

  startAllListeners(prisma) {
    if (this._mockMode) {
      console.log('[CONTRACTS] Mock mode — no listeners')
      return
    }
    console.log('[CONTRACTS] ⚠️ Event listeners skipped (0G RPC lacks filter support). Polling active via resolverJob.')
  }

  async update0GPrice(priceWei) {
    if (this._mockMode) {
      console.log('[CONTRACTS] Mock mode — skipping update0GPrice')
      return { hash: `0xmock_oracle_${Date.now()}` }
    }
    if (!this.signer) {
      throw new Error('Signer required for update0GPrice — set PRIVATE_KEY with ORACLE_ROLE')
    }
    return await this.agentra.update0GPrice(priceWei)
  }

  async getCurrent0GPrice() {
    if (this._mockMode) return null
    try {
      return await this.agentra.current0GPriceUSD()
    } catch (err) {
      console.error('[CONTRACTS] getCurrent0GPrice error:', err.message)
      return null
    }
  }

  async resolveTransaction(txId) {
    if (this._mockMode) {
      console.log(`[CONTRACTS] Mock mode — skipping resolveTransaction(${txId})`)
      return { hash: `0xmock_resolve_${Date.now()}` }
    }
    if (!this.signer) throw new Error('Signer required for resolveTransaction — set PRIVATE_KEY with RESOLVER_ROLE')
    const tx = await this.agentra.resolveTransaction(txId)
    const receipt = await tx.wait(1)
    console.log(`[CONTRACTS] resolveTransaction(${txId}) ✅ tx: ${receipt.hash}`)
    return receipt
  }

  async refundTransaction(txId) {
    if (this._mockMode) {
      console.log(`[CONTRACTS] Mock mode — skipping refundTransaction(${txId})`)
      return { hash: `0xmock_refund_${Date.now()}` }
    }
    if (!this.signer) throw new Error('Signer required for refundTransaction — set PRIVATE_KEY with RESOLVER_ROLE')
    const tx = await this.agentra.refundTransaction(txId)
    const receipt = await tx.wait(1)
    console.log(`[CONTRACTS] refundTransaction(${txId}) ✅ tx: ${receipt.hash}`)
    return receipt
  }

  async getPendingTransaction(txId) {
    if (this._mockMode) return null
    try {
      const pTx = await this.agentra.pendingTransactions(txId)
      return {
        id: pTx[0], user: pTx[1], agentId: pTx[2], weiAmount: pTx[3],
        txType: pTx[4], period: pTx[5], status: pTx[6], timestamp: pTx[7],
      }
    } catch (err) {
      console.error(`[CONTRACTS] getPendingTransaction(${txId}) error:`, err.message)
      return null
    }
  }

  async getTxCounter() {
    if (this._mockMode) return 0n
    try {
      return await this.agentra.txCounter()
    } catch (err) {
      console.error('[CONTRACTS] getTxCounter error:', err.message)
      return 0n
    }
  }
}

export default new ContractManager()