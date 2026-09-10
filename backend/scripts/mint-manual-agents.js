// backend/scripts/mint-manual-agents.js
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const CONTRACT_ADDRESS = '0xbCe0947441772476De96f99CAADe48eb3cF5E0C4';
const RPC_URL = 'https://rpc.botchain.ai';
const TARGET_CHAIN_ID = 677; // BotChain Mainnet

// Use keywords to avoid exact-match typos
const TARGET_KEYWORDS = [
  "content", 
  "research", 
  "seo"
];

const ABI = [
  "function deployStandardAgent(uint256 _monthlyPriceUSD, string memory _metadataURI, bool _commsEnabled, uint256 _commsPricePerCallUSD, uint256 _listingFeeUSD) external payable returns (uint256)",
  "function deployProfessionalAgent(uint256 _monthlyPriceUSD, string memory _metadataURI, bool _commsEnabled, uint256 _commsPricePerCallUSD, uint256 _listingFeeUSD) external payable returns (uint256)",
  "function deployEnterpriseAgent(uint256 _monthlyPriceUSD, string memory _metadataURI, bool _commsEnabled, uint256 _commsPricePerCallUSD, uint256 _listingFeeUSD) external payable returns (uint256)",
  "event AgentDeployed(uint256 indexed agentId, address indexed creator, uint8 tier, uint256 listingFeePaidUSD)"
];

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log(`Connected with wallet: ${wallet.address}`);

  // Fetch all agents
  const allAgents = await prisma.agent.findMany();
  console.log(`\nTotal agents in DB: ${allAgents.length}`);
  
  // Debug: Print current DB state
  allAgents.forEach(a => console.log(` - "${a.name}" (Chain: ${a.chainId})`));

  // Filter ONLY for the agents containing our keywords.
  // We removed the `chainId !== 968` check to FORCE a redeploy for the new pricing.
  const agentsToMigrate = allAgents.filter(agent => {
    const agentNameLower = agent.name.toLowerCase();
    return TARGET_KEYWORDS.some(keyword => agentNameLower.includes(keyword));
  });

  if (agentsToMigrate.length === 0) {
    console.log("\nNo targeted agents found matching those keywords.");
    return;
  }

  console.log(`\nFound ${agentsToMigrate.length} targeted agent(s) to deploy on-chain...`);

  // Explicitly define BotChain gas requirements (20 Gwei minimum)
  const txOverrides = {
    maxPriorityFeePerGas: ethers.parseUnits("20", "gwei"),
    maxFeePerGas: ethers.parseUnits("25", "gwei")
  };

  for (const agent of agentsToMigrate) {
    console.log(`\nDeploying on-chain: ${agent.name}...`);

    try {
      // SET NEW PRICING: 0.02 Monthly
      const newMonthlyPriceWei = ethers.parseEther("0.02").toString(); 
      const metadataUri = agent.metadataUri || "ipfs://placeholder";
      const commsEnabled = agent.commsEnabled || false;
      const commsPrice = agent.commsPricePerCall || "0";

      let tx;
      if (agent.tier === 'Enterprise') {
        tx = await contract.deployEnterpriseAgent(newMonthlyPriceWei, metadataUri, commsEnabled, commsPrice, 0, txOverrides);
      } else if (agent.tier === 'Professional') {
        tx = await contract.deployProfessionalAgent(newMonthlyPriceWei, metadataUri, commsEnabled, commsPrice, 0, txOverrides);
      } else {
        tx = await contract.deployStandardAgent(newMonthlyPriceWei, metadataUri, commsEnabled, commsPrice, 0, txOverrides);
      }

      console.log(`Tx sent: ${tx.hash}`);
      console.log(`Waiting for confirmation...`);
      const receipt = await tx.wait();

      let newContractAgentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'AgentDeployed') {
            newContractAgentId = Number(parsed.args.agentId);
            break;
          }
        } catch {
          // ignore non-matching logs
        }
      }

      if (newContractAgentId === null) {
        console.error(`❌ Could not find AgentDeployed event for ${agent.name}`);
        continue;
      }

      // Update Database with new ID, Chain, and calculated prices
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          contractAgentId: newContractAgentId,
          txHash: tx.hash,
          chainId: TARGET_CHAIN_ID,
          status: 'active',
          pricing: newMonthlyPriceWei, // Saves 0.02 in Wei
          lifetimeMultiplier: 9        // 0.02 * 9 = 0.18 Yearly
        }
      });

      console.log(`✅ ${agent.name} is now LIVE on BotChain Testnet with Contract Agent ID: ${newContractAgentId}`);

    } catch (err) {
      console.error(`❌ Failed to deploy ${agent.name}:`, err.message);
    }
  }

  console.log("\nFinished processing targeted agents!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());