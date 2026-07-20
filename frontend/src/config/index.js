import deployments from '../deployments.json'

const deploymentMap = Array.isArray(deployments)
  ? Object.assign({}, ...deployments)
  : deployments

// Re-export chain config
export { SUPPORTED_CHAINS, CHAIN_CONFIG } from './chains.config'

// Convenience: contracts for a given chainId
export function getContracts(chainId) {
  return deploymentMap[chainId] || {}
}

// Default config object (used in TopBar etc.)
const config = {
  contracts: {
    // Fallback to local hardhat addresses; overridden at runtime via CHAIN_CONFIG
    agentra: deploymentMap['16602']?.Agentra?.address || '',
    token: deploymentMap['16602']?.AgentToken?.address || '',
  },
}

export default config