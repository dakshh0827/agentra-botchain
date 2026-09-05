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

// 0G Mainnet enforces a ~2 gwei minimum priority fee (tip); wallets' own gas
// estimators (e.g. MetaMask) often suggest less, so every write call must
// pass this explicitly. Pinning exactly at the observed 2e9 floor still got
// rejected (RPC error showed tip cap == minimum needed == 2000000000), so
// this carries headroom rather than chasing the exact boundary — base fee
// here is negligible (~7 wei), so overpay risk from the buffer is minimal.
export const MIN_PRIORITY_FEE_WEI = 3_000_000_000n
export const MAX_FEE_PER_GAS_WEI = 3_000_000_000n

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