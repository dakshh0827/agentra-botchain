// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentraRegistry.sol";
import "../src/Agentra.sol"; // TrustedOracleVerifier lives inside this file too

contract DeployAgentra is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.addr(deployerPrivateKey);
        address oracleSigner = vm.envAddress("ORACLE_SIGNER_ADDRESS");

        address existingRegistry = vm.envOr("EXISTING_REGISTRY_ADDRESS", address(0));
        address existingVerifier = vm.envOr("EXISTING_VERIFIER_ADDRESS", address(0));

        vm.startBroadcast(deployerPrivateKey);

        AgentraRegistry registry;
        if (existingRegistry != address(0)) {
            registry = AgentraRegistry(existingRegistry);
            console.log("Reusing EXISTING registry:", existingRegistry);
        } else {
            registry = new AgentraRegistry();
            console.log("!!! Deployed a NEW registry !!!");
        }

        IERC7857DataVerifier verifier;
        if (existingVerifier != address(0)) {
            verifier = IERC7857DataVerifier(existingVerifier);
            console.log("Reusing EXISTING verifier:", existingVerifier);
        } else {
            verifier = new TrustedOracleVerifier(oracleSigner);
            console.log("Deployed a NEW verifier");
        }

        Agentra agentra = new Agentra(feeCollector, address(registry), address(verifier));
        registry.authorizeContract(address(agentra));

        vm.stopBroadcast();

        string memory json = string.concat(
            "{",
            "\"Agentra\": \"", vm.toString(address(agentra)), "\",",
            "\"AgentraRegistry\": \"", vm.toString(address(registry)), "\",",
            "\"Verifier\": \"", vm.toString(address(verifier)), "\"",
            "}"
        );
        vm.writeFile("./temp_addresses.json", json);

        console.log("Agentra:", address(agentra));
        console.log("AgentraRegistry:", address(registry));
        console.log("Verifier:", address(verifier));
    }
}