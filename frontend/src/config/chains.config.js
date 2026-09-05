import { zeroGTestnet, zeroGMainnet } from './custom-chains'
import deployments from '../deployments.json'

const deploymentMap = Array.isArray(deployments)
  ? Object.assign({}, ...deployments)
  : deployments

// Wagmi supports both Zero Gravity chains. Mainnet is first = default/enforced chain.
export const SUPPORTED_CHAINS = [zeroGMainnet, zeroGTestnet]

// Dynamic lookup map for all supported chains.
export const CHAIN_CONFIG = SUPPORTED_CHAINS.reduce((acc, chain) => {
  acc[chain.id] = {
    chain,
    contracts: deploymentMap[chain.id] || {},
  }
  return acc
}, {})