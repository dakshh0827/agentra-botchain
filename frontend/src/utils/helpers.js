export const truncateAddress = (address, start = 6, end = 4) => {
  if (!address) return ''
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export const formatETH = (value, decimals = 4) => {
  return parseFloat(value).toFixed(decimals)
}

export const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export const generateAgentId = () => {
  return 'AGT-' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Used to address the backend (routes, execute/purchase/access calls) — never
// for on-chain contract reads, which should keep using agent.contractAgentId
// directly. contractAgentId is only unique per contract deployment: it resets
// to 0 every time the Agentra contract is redeployed, so a new agent can end
// up sharing the same contractAgentId as an old agent minted on the previous
// contract. agentId (DB cuid) is globally unique forever, so it's the only
// safe identifier for routing.
export const getAgentExternalId = (agent) => {
  if (!agent) return ''

  return String(agent.agentId || agent.id || agent._id || agent.contractAgentId || '')
}