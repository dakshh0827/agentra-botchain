import { ethers } from "ethers";
import config from "./config/config.js";

const RPC_URL = config.blockchain.rpcUrl;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CONTRACT_ADDRESS = "0xA051408E0bec3327ee5A4FC7c7FDb634261cd826";

// ORACLE_ROLE = keccak256("ORACLE_ROLE")
const ORACLE_ROLE =
  "0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1";

const BACKEND_ADDRESS =
  "0x4f5B0d937445d63346080FA209bA26C26366142B";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const abi = [
    "function grantRole(bytes32 role, address account)"
  ];

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

  console.log("Using wallet:", signer.address);

  const tx = await contract.grantRole(ORACLE_ROLE, BACKEND_ADDRESS);
  console.log("TX sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Role granted!");
}

main().catch(console.error);