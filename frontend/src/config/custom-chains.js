// frontend/src/config/custom-chains.js

export const zeroGTestnet = {
  id: 16602,
  name: '0G Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' },
  },
}

// Update these constants to satisfy BotChain's 20 Gwei minimum requirement
export const MIN_PRIORITY_FEE_WEI = 20_000_000_000n; // 20 Gwei
export const MAX_FEE_PER_GAS_WEI =  25_000_000_000n; // 25 Gwei (gives headroom)

export const zeroGMainnet = {
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan.0g.ai' },
  },
}

export const botchainTestnet = {
  id: 968,
  name: 'BotChain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'BotChain Explorer', url: 'https://scan.bohr.life' },
  },
}

export const botchainMainnet = {
  id: 677,
  name: 'BotChain Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BotChain Explorer', url: 'https://scan.botchain.ai' },
  },
}