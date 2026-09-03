
# Agentra
### *You built the agent. We made it an asset.*

**A permissionless, natively reactive infrastructure protocol that lets developers monetize AI agents on-chain, where every user action triggers instant, trustless, decentralized reactions. Pure on-chain autonomy.**

<br/>

[🚀 Live Demo](https://agentra.live) &nbsp;·&nbsp; [🎬 Watch Demo](https://youtu.be/JNYf9w4MvW4) &nbsp;·&nbsp; [📦 GitHub Repo](https://github.com/dakshh0827/agentra-0G.git) &nbsp;·&nbsp;

</div>

https://github.com/user-attachments/assets/32b90b15-3b08-49c3-829d-b9fb302124b3

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [The Journey](#the-journey)
- [Stats](#stats)
- [Features](#features)
- [System Architecture](#system-architecture)
- [0G Component Usage](#0g-component-usage)
- [Contract Architecture](#contract-architecture)
- [Why Two Contracts](#why-two-contracts)
- [Technical Details](#technical-details)
- [Folder Structure](#folder-structure)
- [Setup Guide](#setup-guide)
- [Test Account & Testnet Faucet Instructions](#test-account--testnet-faucet-instructions)
- [Future Enhancements](#future-enhancements)
- [Team](#team)

---

## Overview

Agentra is a decentralised platform for AI agent built on the 0G Network. It lets developers publish their AI agents as on-chain intelligent NFTs (iNFTs), set their own pricing, and start earning immediately. Users can discover, purchase access to, and execute those agents directly from the browser. Payments are settled on-chain with no intermediaries.

The platform sits at the intersection of three primitives: 0G Storage for censorship-resistant metadata, the 0G EVM for trustless billing and ownership, and the Model Context Protocol (MCP) for standardised agent communication. Together they form a closed loop where every agent is an asset, every execution is metered, and every payment is transparent.

<img width="1280" height="800" alt="landing" src="https://github.com/user-attachments/assets/d7909ac5-61e5-45e5-b0e8-b0dd879c7c8c" />

---

## The Problem

AI agents are becoming genuinely useful but the infrastructure around them is broken in three specific ways.

**Centralised gatekeeping.** Today, if you build a capable AI agent, you publish it on a platform you do not control. That platform decides your pricing model, takes a large cut, and can delist you overnight. There is no ownership of your work in any meaningful sense.

**No composability.** Agents from different providers cannot talk to each other or pay each other. Every multi-agent pipeline requires custom glue code, manual API key management, and bespoke billing integrations. None of it is interoperable.

**No persistent identity.** When a platform shuts down or changes its API, every agent hosted there disappears. Users lose their history, creators lose their reputation, and there is no recovery path because the agent was never really yours to begin with.

These are not niche concerns. They are structural flaws that prevent AI agents from becoming the building blocks of a real economy.

---

## Our Solution

Agentra solves each of those problems with a specific technical choice.

**For ownership**, every agent is minted as an ERC-721 iNFT on the 0G EVM at deployment time. The token is yours, transferable, and composable. No platform can revoke it.

**For composability**, the platform implements the Model Context Protocol as its routing layer. Any two agents in the registry can delegate tasks to each other and settle payments on-chain automatically through the Agent-to-Agent (A2A) communication system.

**For persistence**, all agent metadata, execution configurations, and schemas are uploaded to 0G Storage at deployment time. The on-chain record points to this content-addressed data, so even if the Agentra frontend disappeared tomorrow, the agents and their data would remain.

**For economics**, a smart contract escrow system holds payments until the agent endpoint confirms liveness. Creators receive 80% of every transaction. The platform takes 20%. Everything is auditable on-chain.

<img width="4096" height="2560" alt="deployStudio" src="https://github.com/user-attachments/assets/ad12652c-35f7-40c7-802a-c1ed4b493a0d" />

---


## The Journey

Agentra started as a question: what would it actually take to turn an AI model into an on-chain asset that earns its creator money without any platform in the middle?

The first prototype was a simple endpoint registry, nothing more than a list of URLs with a Solidity contract tracking ownership. That turned out to be the easy part. The hard part was everything around it: access control that works without a trusted server, payments that do not require a custodian, metadata that survives the frontend going offline, and agent communication that does not collapse into a centralised hub.

We worked through each of those in sequence. The escrow pattern for payments came from realising that a simple `transfer()` on access purchase would fail silently if the agent endpoint was down. The resolver job was born from that. 0G Storage integration replaced IPFS after we needed deterministic root hashes we could reference on-chain. The MCP routing layer replaced a custom protocol after reading through the spec and realising it solved exactly the discovery and invocation problem we were already solving manually.

The two-contract architecture (described below) came last, after thinking seriously about what happens when we need to upgrade the payment logic without destroying every agent that has already been deployed.

By the end we had something that feels genuinely different from a "wrapper around an API with a crypto payment bolt-on." Every component has a reason for being the way it is.

<img width="1911" height="952" alt="dashboard" src="https://github.com/user-attachments/assets/d2b2ff57-da11-4a05-b1e7-148cb887ee62" />

---

## Stats

> Verified on-chain. Proof screenshots below.

| Metric | Count |
|---|---|
| Total Transactions | 100+ |
| Deployed Agents | 5+ |
| Supported Networks | 2 (0G Testnet, 0G Mainnet) |
| Smart Contracts | 2 |

**Proof of transactions:**

<img width="1280" height="800" alt="transactions" src="https://github.com/user-attachments/assets/543b13ab-5f4a-4c3e-93e6-e12265c53699" />

**Proof of deployed agents:**

<img width="1280" height="800" alt="explorer" src="https://github.com/user-attachments/assets/1bf9c01c-47d8-4acd-aa1e-46638cf7b6a3" />

---

## Features

### Agent Deployment (Deploy Studio)
Deploy AI agents as on-chain iNFTs with configurable pricing, schemas, and execution settings.

### Agent Explorer
Browse, search, and filter all deployed AI agents across the network.

### Agent Detail and Execution
Access a dynamic execution console with schema-based inputs and smart output rendering.

### Agent-to-Agent Communication (A2A Comms)
Enable agents to delegate tasks and transact with other agents automatically on-chain.

### Revenue Dashboard
Track revenue, usage, purchases, and analytics for deployed agents in real time.

### Transaction Resolver Job
Automatically resolve escrow payments and confirm agent liveness on-chain.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│   React 18 + Vite + Tailwind CSS (v4) + Framer Motion           │
│   wagmi v2 + viem + Web3Modal (wallet connection)                │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST API / Multipart
┌────────────────────────────▼─────────────────────────────────────┐
│                       EXPRESS BACKEND                            │
│                   Node.js / Express (ESM)                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  Auth MW    │  │  Rate Limit │  │   Execution Orchestrator  │ │
│  │ (wallet sig)│  │  (per role) │  │   (schema-driven + retry) │ │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  SSRF Guard │  │Upload Valid.│  │   Runtime Payload Validat.│ │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
│                                                                  │
│  Background Jobs:                                                │
│  ├── Resolver Job (every 2 min) — scans on-chain escrow txs     │
│  ├── Oracle Job   (every 10 min) — updates 0G/USD price         │
│  ├── Leaderboard Job (every 5 min) — recalculates agent scores  │
│  └── Health Check Job (every 2 min) — pings agent endpoints     │
└───────────┬──────────────────────┬───────────────────────────────┘
            │                      │
┌───────────▼──────┐   ┌───────────▼───────────────────────────────┐
│  MongoDB (Prisma)│   │          0G NETWORK LAYER                 │
│                  │   │                                           │
│  Users           │   │  ┌─────────────────────────────────────┐ │
│  Agents          │   │  │  0G Storage (Decentralised Storage)  │ │
│  Transactions    │   │  │  • Agent metadata JSON               │ │
│  Interactions    │   │  │  • Execution configs & MCP schemas   │ │
│  AgentAccess     │   │  │  • Content-addressed via root hash   │ │
│  AgentPurchase   │   │  │  • SDK: @0gfoundation/0g-ts-sdk      │ │
│  Reviews         │   │  └─────────────────────────────────────┘ │
│  Leaderboard     │   │                                           │
│  ExecutionMetrics│   │  ┌─────────────────────────────────────┐ │
└──────────────────┘   │  │  0G EVM (Smart Contracts)            │ │
                       │  │                                       │ │
                       │  │  AgentraRegistry (permanent backbone) │ │
                       │  │  0xbCe094...C4 (Mainnet)              │ │
                       │  │  • Global agent IDs (never change)   │ │
                       │  │  • Ownership resolution across vers. │ │
                       │  │                                       │ │
                       │  │  Agentra V1 (logic layer)             │ │
                       │  │  0xA05140...826 (Mainnet)             │ │
                       │  │  • ERC-721 iNFT minting               │ │
                       │  │  • Escrow payment handling            │ │
                       │  │  • Access control registry            │ │
                       │  │  • Agent-to-agent comms billing       │ │
                       │  └─────────────────────────────────────┘ │
                       └───────────────────────────────────────────┘
                                        │
                       ┌────────────────▼────────────────────────┐
                       │         AI AGENT ENDPOINTS               │
                       │  Any HTTP endpoint (Hugging Face,        │
                       │  Render, custom servers) reachable via   │
                       │  MCP or direct POST. Agentra brokers     │
                       │  access and settles payment on their     │
                       │  behalf — agents never hold keys.        │
                       └─────────────────────────────────────────┘
```

### Data Flow — Agent Execution

```
User → Frontend (connects wallet, purchases access via on-chain escrow tx)
     → Backend  (verifies wallet sig, checks AgentAccess in DB + on-chain)
     → Orchestrator (builds schema-driven request from executionConfig)
     → Agent Endpoint (POST /execute or multipart/form-data)
     → Response (text / JSON / binary / markdown — auto-detected)
     → Frontend (renders OutputRenderer with syntax highlighting)

Resolver Job (background):
  → Polls on-chain pendingTransactions every 2 min
  → PINGs agent endpoint for liveness
  → If alive → resolveTransaction() (80% creator / 20% platform)
  → If dead  → refundTransaction() (100% returned to user)
```

---

## 0G Component Usage

Agentra integrates two distinct 0G primitives, each solving a specific infrastructure problem:

### 1. 0G Storage — Censorship-Resistant Agent Metadata

**SDK Used:** `@0gfoundation/0g-ts-sdk` v1.2.4

**Integration file:** `backend/services/storageService.js`

**What it solves:**

Traditional AI marketplaces store agent metadata (name, description, pricing, execution schemas, MCP tool definitions) in a centralised database. If the company shuts down, all agent configuration is gone. Developers lose their reputation, users lose their history, and no recovery path exists.

Agentra solves this by uploading all agent metadata to 0G Storage at deploy time. The resulting content-addressed root hash is stored in the on-chain `AgentraRegistry`, so the metadata is permanently retrievable regardless of whether Agentra's servers are running.

**How it works:**

```js
// backend/services/storageService.js
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import { ethers } from 'ethers'

export async function uploadAgentMetadata(metadata) {
  // 1. Serialize metadata to bytes
  const payload = encoder.encode(JSON.stringify(metadata))
  const memData = new MemData(payload)

  // 2. Build Merkle tree for content addressing
  const [tree, treeError] = await memData.merkleTree()

  // 3. Upload to 0G Storage network via Indexer RPC
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  const indexer = new Indexer(indexerRpc)
  const [tx, uploadError] = await indexer.upload(memData, rpcUrl, signer)

  // 4. Return content-addressed URI stored on-chain
  const rootHash = normalizeRootHash(tx, tree)
  return {
    metadataUri: `0g://${rootHash}`,  // ← stored in AgentraRegistry
    rootHash,
    txHash: tx?.txHash || null,
  }
}
```

**What is stored:**
- Agent name, description, category, tags
- API endpoint URL
- MCP tool schema (JSON)
- Execution config (headers, body fields, content type)
- Pricing configuration
- Comms settings

**Environment variables required:**
```env
OG_STORAGE_RPC_URL=https://evmrpc.0g.ai
OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OG_STORAGE_PRIVATE_KEY=0x...your-32-byte-hex-key
```

**Fallback:** In development with no storage key configured, the service falls back to a local deterministic URI so the rest of the stack keeps working.

---

### 2. 0G EVM — Trustless Payments, Ownership, and Access Control

**Networks:**

| Network | Chain ID | RPC |
|---|---|---|
| 0G Mainnet | 16661 | `https://evmrpc.0g.ai` |
| 0G Testnet | 16602 | `https://evmrpc-testnet.0g.ai` |

**Contract interaction file:** `backend/blockchain/contracts.js`

**What it solves:**

Without a blockchain layer, access control requires a trusted server (a single point of failure and censorship), payments require a payment processor with a cut, and agent ownership is a database row that can be deleted. The 0G EVM provides the trustless settlement layer that removes all three dependencies.

**How the payment escrow works:**

```
User calls purchaseAccess(agentId, period) with native 0G token
  → Contract holds funds in escrow (PendingTx)
  → TxPending event emitted

Resolver Job (backend, RESOLVER_ROLE) runs every 2 min:
  → Reads all on-chain PendingTx with status=Pending
  → PINGs the agent's HTTP endpoint
  → If endpoint responds: resolveTransaction(txId)
      → 80% → agent creator wallet
      → 20% → platform fee collector
      → accessRegistry[agentId][user] = block.timestamp + 30 days
      → AgentAccessGranted event emitted
  → If endpoint unreachable: refundTransaction(txId)
      → 100% returned to user

User can also call claimTimeoutRefund(txId) after 24h with no action
```

**Key on-chain reads used by backend:**

```js
// Check if user has valid access (contract manager)
const exp = await agentra.accessRegistry(agentId, userAddress)
const hasAccess = Number(exp) > Math.floor(Date.now() / 1000)

// Get required wei for a USD amount (oracle-driven)
const requiredWei = await agentra.getRequiredWei(usdAmount)

// Count total escrow transactions
const count = await agentra.txCounter()
```

**Oracle integration:** The `update0GPrice(priceWei)` function (ORACLE_ROLE) is called to keep the on-chain USD→wei conversion accurate as the 0G token price changes. The backend oracle job fetches from CoinGecko and writes on-chain every 10 minutes.

---

## Contract Architecture

### AgentraRegistry

**Purpose:** Permanent backbone. Deployed once. Never upgraded. Never replaced.

**Address (0G Mainnet):** `0xbCe0947441772476De96f99CAADe48eb3cF5E0C4`

Every Agentra version registers its agents here. Global agent IDs are canonical across all contract versions. Functions:

- `registerAgent(localTokenId, version)` - called by Agentra V1, V2, etc. at mint time, returns a globally unique `globalAgentId`
- `updateRecord(globalAgentId, newContract, newLocalTokenId, newVersion)` - called by a MigrationBridge to update where an agent lives after a contract upgrade
- `ownerOf(globalAgentId)` - universal ownership lookup that works regardless of which contract version the agent currently lives on
- `resolveGlobalId(contract, localTokenId)` - reverse lookup from contract + token to global ID

### Agentra (V1)

**Purpose:** The agent NFT contract, payment escrow, and access registry.

**Address (0G Mainnet):** `0xA051408E0bec3327ee5A4FC7c7FDb634261cd826`

Key responsibilities:

- Mints agents as ERC-721 tokens via `deployStandardAgent`, `deployProfessionalAgent`, `deployEnterpriseAgent`
- Registers each newly minted token with `AgentraRegistry` at mint time
- Manages an `accessRegistry` mapping of `agentId => userAddress => expiry timestamp`
- Handles escrow via `purchaseAccess` and `initiateAgentComms`, both of which create a `PendingTx` record and emit `TxPending`
- `resolveTransaction` (RESOLVER_ROLE only) releases funds 80/20 to creator and platform, extends access, emits `AgentAccessGranted`
- `refundTransaction` (RESOLVER_ROLE only) returns funds to the user
- `claimTimeoutRefund` (anyone, after 24 hours) lets users self-rescue stuck escrow
- `update0GPrice` (ORACLE_ROLE only) updates the native token price used for wei conversion
- `getRequiredWei(usdAmount)` converts a USD amount to the required native wei using the current oracle price
- Pausable by DEFAULT_ADMIN_ROLE

---

## Why Two Contracts

This is a deliberate architectural decision made for long-term sustainability.

A single monolithic contract is a trap. The moment you need to fix a bug in the payment logic, add a new access period type, or change the fee structure, you face a brutal choice: leave existing agents on the broken contract forever, or force every agent creator to re-deploy their agent (losing their transaction history, access records, and reputation in the process).

We solved this by splitting identity from logic.

The `AgentraRegistry` is the identity layer. It holds the canonical global agent ID and a pointer to whichever contract currently owns that agent. It is simple, has no payment logic, and will never need to change. It is designed to be deployed once and forgotten.

The `Agentra` contract is the logic layer. It handles minting, pricing, escrow, and access. When we build V2 with improved payment mechanics or new access models, it will call `registry.registerAgent()` at mint time just like V1 does. For agents that exist on V1 and need to migrate forward, a `MigrationBridge` contract (to be built) will call `registry.updateRecord()` to point their global ID at the new contract.

From the user's perspective, their global agent ID never changes. Their access records are preserved. Their on-chain history is intact. The registry is the single source of truth.

From the developer's perspective, building against the registry's `ownerOf(globalAgentId)` means your integration does not need to know which version of the Agentra contract an agent lives on. It just works.

This pattern was inspired by the proxy upgrade patterns used in production DeFi protocols, but applied specifically to the problem of agent identity persistence across contract upgrades rather than proxy delegation.

<!-- Placeholder: Architecture diagram showing AgentraRegistry as the permanent backbone with V1, V2, MigrationBridge pointing into it -->

---

## Technical Details

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS (v4), Framer Motion |
| State management | Zustand |
| Blockchain interaction | wagmi v2, viem, Web3Modal |
| Backend | Node.js, Express |
| Database | MongoDB via Prisma |
| Smart contracts | Solidity ^0.8.20, OpenZeppelin (ERC-721, AccessControl, Pausable, ReentrancyGuard) |
| Storage | 0G Storage (via `@0gfoundation/0g-ts-sdk`) |
| HTTP client | axios |
| Validation | Zod |
| Job scheduling | node-cron |
| File uploads | multer (memory storage) |
| Auth | Wallet-address header + nonce signature |

### Networks

| Network | Chain ID | RPC |
|---|---|---|
| 0G Mainnet | 16661 | `https://evmrpc.0g.ai` |
| 0G Testnet | 16602 | `https://evmrpc-testnet.0g.ai` |

### API Rate Limits

| Endpoint type | Window | Max requests |
|---|---|---|
| Global | 60 seconds | 100 |
| Execution | 60 seconds | 20 |
| Deploy | 60 minutes | 10 |
| Auth | 15 minutes | 50 |
| Multipart upload | 60 seconds | 10 |

### Execution Timeout

Agent execution requests wait up to 10 minutes for a response. This accommodates Hugging Face Spaces models that can take several minutes to load and run inference on cold starts.

### Score Formula

```
score = 0.35 * min(100, upvotes)
      + 0.30 * min(100, calls / 1000)
      + 0.20 * min(100, revenueIn0G / 100)
      + 0.05 * min(100, purchaseCount / 100)
      + 0.10 * successRate
```

### Escrow Split

- Creator: 80% of `weiAmount`
- Platform: 20% of `weiAmount`
- Applied uniformly to access purchases, comms calls, and direct call revenue

### Access Expiry Logic

- Monthly: 30 days from resolution
- Yearly: 365 days from resolution
- If the user already has non-expired access, the new duration is added on top of the remaining time
- Lifetime access uses `type(uint256).max` as the expiry sentinel

---

## Folder Structure

```
agentra/
├── backend/
│   ├── blockchain/
│   ├── config/
│   ├── controllers/
│   ├── jobs/
│   ├── lib/
│   ├── middlewares/
│   ├── orchestrator/
│   ├── prisma/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── index.js                 
│   └── package.json
├── contracts/
│   └── src/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── execution/
│   │   │   ├── layouts/
│   │   │   └── ui/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── utils/
│   │   ├── deployments.json       # Contract addresses and ABIs per chain ID
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- A 0G-compatible wallet with some 0G tokens for deployment
- A WalletConnect project ID (from `cloud.walletconnect.com`)

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL=mongodb://localhost:27017/agentra

# Redis (optional, not required for core functionality)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here

# Blockchain
BLOCKCHAIN_RPC_URL=https://evmrpc.0g.ai
PRIVATE_KEY=0x...your-private-key-with-resolver-and-oracle-roles
AGENTRA_CONTRACT_ADDRESS=0xA051408E0bec3327ee5A4FC7c7FDb634261cd826

# 0G Storage
OG_STORAGE_RPC_URL=https://evmrpc.0g.ai
OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OG_STORAGE_PRIVATE_KEY=0x...your-storage-private-key

# Optional: Cron schedules (defaults shown)
ORACLE_CRON_SCHEDULE=*/10 * * * *
RESOLVER_CRON_SCHEDULE=*/2 * * * *
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5001/api
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to MongoDB (creates collections and indexes)
npx prisma db push

# Start development server
npm run dev
```

The backend starts on `http://localhost:5001`. Health check: `http://localhost:5001/health`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend starts on `http://localhost:5173`.

### Contract Deployment

The contracts in `contracts/src/` are standard Hardhat/Foundry Solidity. Deploy sequence:

1. Deploy `AgentraRegistry.sol` first. Note its address.
2. Deploy `Agentra.sol` with `(feeCollector, registryAddress)` as constructor arguments.
3. Call `registry.authorizeContract(agentraAddress)` so the Agentra contract can register agents.
4. Grant `RESOLVER_ROLE` to your backend wallet: `agentra.grantRole(RESOLVER_ROLE_HASH, backendWallet)`.
5. Grant `ORACLE_ROLE` to your oracle wallet if you want automatic price updates.
6. Set the initial 0G price: `agentra.update0GPrice(initialPriceInWei)`.
7. Update `frontend/src/deployments.json` with the new addresses.

### Running in Production

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Frontend (build static files, serve via nginx or similar)
cd frontend
npm run build
# serve dist/ with your preferred static file server
```

---

## Test Account & Testnet Faucet Instructions

Judges can interact with Agentra on the **0G Testnet (Chain ID: 16602)** without spending real tokens.

### Step 1 — Get a Wallet

Install [MetaMask](https://metamask.io/) or any EVM-compatible wallet browser extension.

### Step 2 — Add 0G Testnet to Your Wallet

Add the network manually with the following parameters:

| Field | Value |
|---|---|
| Network Name | 0G Testnet |
| RPC URL | `https://evmrpc-testnet.0g.ai` |
| Chain ID | `16602` |
| Currency Symbol | `A0GI` |
| Block Explorer | `https://chainscan-galileo.0g.ai` |

Or visit the [0G Testnet page](https://0g.ai) and use the one-click "Add to MetaMask" button.

### Step 3 — Get Testnet Tokens (A0GI)

Request free testnet A0GI tokens from the official 0G faucet:

**Faucet URL:** [https://faucet.0g.ai](https://faucet.0g.ai)

1. Navigate to the faucet URL above.
2. Paste your wallet address.
3. Complete the captcha and submit.
4. Tokens arrive within ~30 seconds.

> If the primary faucet is unavailable, try the community faucet at the [0G Discord server](https://discord.gg/0gai) in the `#testnet-faucet` channel.

### Step 4 — Interact with Agentra on Testnet

1. Open [https://agentra.live](https://agentra.live)
2. Click **Connect Wallet** in the top bar.
3. Select MetaMask and approve the connection.
4. The **Network Enforcer** will detect you are not on 0G and offer a one-click switch — click it.
5. You are now ready to browse agents, purchase access, deploy your own agent, or upvote.

### What You Can Test Without Spending Tokens

- Browsing the Agent Explorer (no wallet required)
- Viewing agent details, reviews, and leaderboard (no wallet required)
- Connecting your wallet and viewing your dashboard

### What Requires Testnet A0GI

| Action | Approx Cost |
|---|---|
| Deploy a Standard agent | listing fee + gas |
| Purchase monthly access to an agent | agent's monthly price + gas |
| Upvote an agent | gas only (upvote is DB-based, very cheap) |
| Agent-to-agent comms call | target agent's comms price + gas |

### Pre-funded Demo Account (Read-Only Reference)

> The following address has been used for testnet transactions visible in the block explorer. Do **not** use this private key for any real funds.

**Testnet Contract Addresses (Chain ID 16602):**

These are the same contracts but deployed on testnet for local judge testing. To test against your own local deployment, update `frontend/src/deployments.json` with your own contract addresses after running the deploy sequence above.

For a fully working testnet experience using the live deployment, use the **0G Mainnet** contracts already present in `deployments.json` and obtain mainnet 0G tokens via the [0G ecosystem](https://0g.ai).

---

## Future Enhancements

**MigrationBridge contract.** A contract that can be called to move an agent's global registry record from Agentra V1 to a future V2, preserving the global ID, all access records, and on-chain history. This is the completion of the two-contract architecture described above.

**Agentra V2 contract.** An upgraded payment contract with support for subscription auto-renewal, tiered access levels within a single agent, and on-chain governance of platform fee percentages.

**Agent reputation staking.** Allow agent creators to stake 0G tokens as collateral against their agent's uptime guarantees. Staked tokens are slashed if the resolver finds the endpoint consistently unreachable, creating a real economic incentive for reliability.

**Decentralised resolver.** The current resolver is a centralised cron job operated by the platform. A network of resolver nodes competing to confirm and resolve escrow transactions, rewarded with a portion of the platform fee, would remove this centralisation risk.

**Agent trading.** Because agents are ERC-721 tokens, they can already be transferred. A dedicated secondary market UI where creators can list their agents for sale, with automatic revenue stream transfer on NFT transfer, is a natural extension.

**Agent bundles.** Let creators package multiple complementary agents as a single purchase. A "data science bundle" might include a data cleaning agent, a visualisation agent, and an analysis agent, all accessible with one transaction.

---

## Team

Built during the 0G hackathon.

- [Daksh Thakran](https://github.com/dakshh0827) - Full-stack development, backend architecture, databases
- [Mohit Bharat](https://github.com/immohit64) - Blockchain development, smart contracts

---

*You built the agent. We made it an asset.*
