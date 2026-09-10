// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentraRegistry.sol";
import "../src/Agentra.sol";

contract DeployAgentra is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // ── Step 1: Deploy Registry first ─────────────────────────────────────
        // This is the permanent backbone. If you ever need to redeploy Agentra
        // for any reason, you keep THIS address and just deploy a new Agentra
        // pointing to it. Never redeploy the Registry.
        AgentraRegistry registry = new AgentraRegistry();

        // ── Step 2: Deploy Agentra V1 with the Registry address ───────────────
        Agentra agentra = new Agentra(feeCollector, address(registry));

        // ── Step 3: Authorize Agentra in the Registry ─────────────────────────
        // Without this, Agentra cannot call registry.registerAgent()
        // Every new version (V2, V3...) also needs this call after deployment
        registry.authorizeContract(address(agentra));

        vm.stopBroadcast();

        // ── Write both addresses to temp_addresses.json ───────────────────────
        string memory json = string.concat(
            "{",
            "\"Agentra\": \"",         vm.toString(address(agentra)),   "\",",
            "\"AgentraRegistry\": \"", vm.toString(address(registry)),  "\"",
            "}"
        );
        vm.writeFile("./temp_addresses.json", json);

        console.log("=================================================");
        console.log("AgentraRegistry deployed at:", address(registry));
        console.log("Agentra (V1) deployed at:   ", address(agentra));
        console.log("=================================================");
        console.log("IMPORTANT: Save the Registry address permanently.");
        console.log("It is the canonical backbone. Never redeploy it.");
        console.log("=================================================");
    }
}