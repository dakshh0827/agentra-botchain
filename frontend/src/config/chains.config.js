// frontend/src/config/chains.config.js
import { botchainMainnet } from './custom-chains'
import deployments from '../deployments.json'

const deploymentMap = Array.isArray(deployments)
  ? Object.assign({}, ...deployments)
  : deployments

// Only expose BotChain Mainnet to the users for now
export const SUPPORTED_CHAINS = [botchainMainnet]

export const CHAIN_CONFIG = SUPPORTED_CHAINS.reduce((acc, chain) => {
  acc[chain.id] = {
    chain,
    contracts: deploymentMap[chain.id] || {},
  }
  return acc
}, {})

// Set the default to 677
export const DEFAULT_CHAIN_ID = botchainMainnet.id