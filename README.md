# 🚀 Agentra
### *You built the agent. We made it an asset.*

## 📌 Problem & Domain

AI agents are becoming genuinely useful, but the infrastructure around them is broken in three specific ways:

**Centralised gatekeeping.** If you build a capable AI agent, you publish it on a platform you do not control. That platform decides your pricing model, takes a large cut, and can delist you overnight, leaving no meaningful ownership of your work.

**No composability.** Agents from different providers cannot talk to each other or pay each other. Every multi-agent pipeline requires custom glue code, manual API key management, and bespoke billing integrations.

**No persistent identity.** When a platform shuts down or changes its API, every agent hosted there disappears, taking user history and creator reputation with it since the agent was never really owned by its creator.

**Themes Selected:**
- Developer Tools & Software Infrastructure

## 🎯 Objective

Agentra is a decentralised platform for AI agents built on the 0G Network. It lets developers publish AI agents as on-chain intelligent NFTs (iNFTs), set their own pricing, and start earning immediately, while users can discover, purchase access to, and execute those agents directly from the browser with payments settled on-chain and no intermediaries.

- **Target users:** AI agent developers who want to monetize and own their agents, and users who want to discover, purchase, and execute AI agents.
- **Pain point:** Centralised gatekeeping, lack of agent composability, and loss of persistent identity/reputation when platforms disappear.
- **Value provided:** Every agent is minted as an ERC-721 iNFT (true ownership), agents can delegate tasks and pay each other via the Model Context Protocol (composability), metadata is stored on 0G Storage so agents persist even if the platform goes offline (persistence), and a smart contract escrow system settles payments transparently on-chain (economics), with creators receiving 80% of every transaction.

## 🧠 Team & Approach

**Team Name:**
`Your team name here`

**Team Members:**
- [Daksh Thakran](https://github.com/dakshh0827) - Full-stack development, backend architecture, databases
- [Mohit Bharat](https://github.com/immohit64) - Blockchain development, smart contracts

**Your Approach:**
- Agentra started as a question: what would it take to turn an AI model into an on-chain asset that earns its creator money without any platform in the middle.
- Key challenges addressed: access control that works without a trusted server, payments that do not require a custodian, metadata that survives the frontend going offline, and agent communication that does not collapse into a centralised hub.
- Pivots/iterations/breakthroughs: the escrow pattern for payments came from realising a simple `transfer()` on access purchase would fail silently if the agent endpoint was down, which led to the resolver job. 0G Storage integration replaced IPFS after needing deterministic root hashes referenceable on-chain. The MCP routing layer replaced a custom protocol after realising the spec solved the discovery and invocation problem already being solved manually. The two-contract architecture came last, after thinking through how to upgrade payment logic without destroying already-deployed agents.

## 🛠️ Tech Stack

**Core Technologies Used:**
- **Frontend:** React 18, Vite, Tailwind CSS (v4), Framer Motion, Zustand, wagmi v2, viem, Web3Modal
- **Backend:** Node.js, Express
- **Database:** MongoDB via Prisma
- **APIs:** 0G Storage (`@0gfoundation/0g-ts-sdk`), 0G EVM, Model Context Protocol (MCP), CoinGecko (price oracle)
- **Hosting:** Render, Vercel

**Additional Technologies Used:**
- **AI / ML:** Model Context Protocol (MCP) for standardised AI agent communication
- **Web3 / Blockchain:** Solidity ^0.8.20, OpenZeppelin (ERC-721, AccessControl, Pausable, ReentrancyGuard), 0G Network (0G Storage, 0G EVM)

## ✨ Key Features

- ✅ **Agent Deployment (Deploy Studio):** Deploy AI agents as on-chain iNFTs with configurable pricing, schemas, and execution settings.
- ✅ **Agent Explorer:** Browse, search, and filter all deployed AI agents across the network.
- ✅ **Agent Detail and Execution:** A dynamic execution console with schema-based inputs and smart output rendering.
- ✅ **Agent-to-Agent Communication (A2A Comms):** Agents delegate tasks and transact with other agents automatically on-chain.
- ✅ **Revenue Dashboard:** Track revenue, usage, purchases, and analytics for deployed agents in real time.
- ✅ **Transaction Resolver Job:** Automatically resolves escrow payments and confirms agent liveness on-chain.

## 📽️ Demo & Deliverables

- **Demo Video Link (Mandatory):** https://youtu.be/JNYf9w4MvW4
- **Deployment Link (Recommended):** https://agentra.live
- **Pitch Deck / PPT (Optional):** [Paste link]

## ✅ Tasks & Bonus Checklist

- [ ] All team members completed the mandatory social task
- [ ] Bonus Task 1 – Badge sharing
- [ ] Bonus Task 2 – Blog/article

## 🧪 How to Run the Project

**Requirements:**
- Node.js 18+
- MongoDB (local or Atlas)
- A 0G-compatible wallet with some 0G tokens for deployment
- A WalletConnect project ID (from `cloud.walletconnect.com`)

**Local Setup:**

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
# Backend starts on http://localhost:5001

# Frontend
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

Create a `.env` file in `backend/` with `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL` (optional), `JWT_SECRET`, `BLOCKCHAIN_RPC_URL`, `PRIVATE_KEY`, `AGENTRA_CONTRACT_ADDRESS`, `OG_STORAGE_RPC_URL`, `OG_STORAGE_INDEXER_RPC`, `OG_STORAGE_PRIVATE_KEY`, and cron schedules.

Create a `.env` file in `frontend/` with `VITE_API_URL` and `VITE_WALLETCONNECT_PROJECT_ID`.

## 🧬 Future Scope

- 📈 **MigrationBridge contract** to move an agent's global registry record from Agentra V1 to a future V2, preserving global ID, access records, and on-chain history.
- 📈 **Agentra V2 contract** with subscription auto-renewal, tiered access levels, and on-chain governance of platform fee percentages.
- 🛡️ **Agent reputation staking**, letting creators stake 0G tokens as collateral against uptime guarantees, slashed if the resolver finds the endpoint consistently unreachable.
- 🌐 **Decentralised resolver** — a network of resolver nodes competing to confirm and resolve escrow transactions, rewarded with a portion of the platform fee.
- 📈 **Agent trading** — a dedicated secondary market UI for creators to list their ERC-721 agents for sale with automatic revenue stream transfer.
- 📈 **Agent bundles** — letting creators package multiple complementary agents as a single purchase.

## 📎 Resources / Credits

- `@0gfoundation/0g-ts-sdk` for 0G Storage integration
- OpenZeppelin contracts (ERC-721, AccessControl, Pausable, ReentrancyGuard)
- wagmi v2, viem, Web3Modal for wallet connection
- axios, Zod, node-cron, multer
- CoinGecko for 0G/USD price data
- Built during the 0G hackathon

## 🏁 Final Words

Agentra began as an idea to give AI agents true ownership. Through countless iterations, late nights, failed experiments, and breakthroughs, we transformed that vision into a decentralized ecosystem where every agent is an on-chain asset. This is just the beginning.
