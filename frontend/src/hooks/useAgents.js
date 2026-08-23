import { useEffect } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { agentsAPI } from '../api/agents'
import { EXPLORER_CACHE_TTL_MS, ttlCached } from '../utils/ttlCache'

export function useAgents(params = {}) {
  const { setAgents, setLoading, setError, agents, isLoading, error } = useAgentStore()

  useEffect(() => {
    let cancelled = false
    const cacheKey = `agents:list:${JSON.stringify(params)}`

    const fetchAgents = async () => {
      // Keep showing prior list while we decide — only spin if we have nothing.
      if (!useAgentStore.getState().agents?.length) {
        setLoading(true)
      }
      try {
        const agentsData = await ttlCached(
          cacheKey,
          async () => {
            const res = await agentsAPI.getAll(params)
            const list = res?.data?.agents || res?.data || []
            return Array.isArray(list) ? list : []
          },
          EXPLORER_CACHE_TTL_MS,
        )
        if (!cancelled) {
          setAgents(agentsData)
          setError(null)
        }
      } catch (err) {
        console.error('useAgents error:', err)
        if (!cancelled) {
          setError(err?.response?.data?.error || err.message)
          // Only fall back to mocks when the store is empty.
          if (!useAgentStore.getState().agents?.length) {
            setAgents(MOCK_AGENTS)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAgents()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  return { agents, isLoading, error }
}

// ✅ Mock data aligned with Prisma schema
export const MOCK_AGENTS = [
  {
    id: 'mock1',
    agentId: 'AGT-MOCK001',
    name: 'DataSynth-7',
    description: 'Advanced data synthesis and pattern recognition agent with neural processing capabilities.',
    metadataUri: '',
    endpoint: 'https://api.datasynth.ai',
    ownerWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
    tier: 'Standard',
    pricing: '50000000000000000',
    upvotes: 12,
    category: 'Analysis',
    tags: ['data', 'analysis', 'ml'],
    status: 'active',
    rating: 4.8,
    ratingCount: 312,
    calls: 12847,
    successRate: 99.2,
    revenue: '642000000000000000000',
    score: 87.4,
    contractAgentId: null,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock2',
    agentId: 'AGT-MOCK002',
    name: 'CodeForge-X',
    description: 'Autonomous code generation, review and optimization agent. Supports 40+ languages.',
    metadataUri: '',
    endpoint: 'https://api.codeforge.dev',
    ownerWallet: '0xdef0123456789abcdef0123456789abcdef01234',
    tier: 'Professional',
    pricing: '80000000000000000',
    upvotes: 30,
    category: 'Development',
    tags: ['code', 'dev', 'automation'],
    status: 'active',
    rating: 4.9,
    ratingCount: 891,
    calls: 28341,
    successRate: 97.8,
    revenue: '2267000000000000000000',
    score: 94.1,
    contractAgentId: null,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock3',
    agentId: 'AGT-MOCK003',
    name: 'NeuralVault',
    description: 'On-chain security analysis, smart contract auditing, and threat detection agent.',
    metadataUri: '',
    endpoint: 'https://api.neuralvault.io',
    ownerWallet: '0x9876543210abcdef9876543210abcdef98765432',
    tier: 'Enterprise',
    pricing: '120000000000000000',
    upvotes: 18,
    category: 'Security',
    tags: ['security', 'audit', 'web3'],
    status: 'active',
    rating: 4.7,
    ratingCount: 204,
    calls: 5621,
    successRate: 98.5,
    revenue: '675000000000000000000',
    score: 82.7,
    contractAgentId: null,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock4',
    agentId: 'AGT-MOCK004',
    name: 'ChainMind',
    description: 'Autonomous DeFi strategy agent — yield optimization, liquidity management, risk assessment.',
    metadataUri: '',
    endpoint: 'https://api.chainmind.finance',
    ownerWallet: '0x9876543210abcdef9876543210abcdef98765432',
    tier: 'Enterprise',
    pricing: '150000000000000000',
    upvotes: 45,
    category: 'Web3',
    tags: ['defi', 'yield', 'web3'],
    status: 'active',
    rating: 4.9,
    ratingCount: 389,
    calls: 8902,
    successRate: 98.1,
    revenue: '1335000000000000000000',
    score: 96.8,
    contractAgentId: null,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
