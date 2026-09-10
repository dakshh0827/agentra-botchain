import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, RefreshCw, Activity, Cpu, Database, Loader2, ArrowUpRight } from 'lucide-react'
import { useAccount, useSwitchChain } from 'wagmi'
import { Link, useNavigate } from 'react-router-dom'
import LoadingPulse from '../components/ui/LoadingPulse'
import NeonButton from '../components/ui/NeonButton'
import OfficialAgentStrip from '../components/ui/OfficialAgentStrip'
import { useAgents } from '../hooks/useAgents'
import { useMarketplaceStore } from '../stores/marketplaceStore'
import { analyticsAPI } from '../api/analytics'
import { getAgentExternalId } from '../utils/helpers'
import { ttlGet, ttlHas } from '../utils/ttlCache'
import {
  detailsBtnClass,
  agentCardShellClass,
} from '../utils/agentCardChrome'
import AgentAvatar from '../components/ui/AgentAvatar'

const CATEGORIES = ['All', 'Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']

// FIXED: Cleaned up the sort options to only show Infrastructure metrics
const SORT_OPTIONS = [
  { value: 'computations', label: 'Most Computations' },
  { value: 'uptime', label: 'Highest Uptime' },
  { value: 'newest', label: 'Newly Deployed' },
]

export default function Explorer() {
  const { chain } = useAccount()
  const navigate = useNavigate()
  const activeChainId = chain?.id || 677 // Fallback to BotChain Testnet if disconnected
  const { switchChainAsync } = useSwitchChain()
  const { agents, isLoading } = useAgents()
  const { filters, search, setFilter, setSearch } = useMarketplaceStore()
  const { isConnected } = useAccount()
  const cachedStats = ttlHas('analytics:global') ? ttlGet('analytics:global') : undefined
  const [stats, setStats] = useState(() =>
    cachedStats !== undefined ? cachedStats : null,
  )
  const [statsLoading, setStatsLoading] = useState(() => cachedStats === undefined)
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    let cancelled = false
    if (!ttlHas('analytics:global')) setStatsLoading(true)
    analyticsAPI
      .getGlobalStats()
      .then((r) => {
        if (!cancelled) setStats(r?.data ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 260)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])

  const list = useMemo(() => (Array.isArray(agents) ? agents : []), [agents])

  const filteredAgents = useMemo(() => {
    const q = String(search || '').toLowerCase()
    const category = filters?.category || 'all'
    const sortBy = filters?.sortBy || 'computations'

    return list
      .filter((a) => {
        if (!a || typeof a !== 'object') return false
        
        // 1. FILTER BY CHAIN ID (Fallback to 16602 for legacy agents if undefined)
        const agentChainId = a.chainId || 16602; 
        if (agentChainId !== activeChainId) return false;

        const matchSearch =
          !q ||
          String(a.name || '').toLowerCase().includes(q) ||
          String(a.description || '').toLowerCase().includes(q) ||
          (Array.isArray(a.tags) ? a.tags : []).some((t) =>
            String(t || '').toLowerCase().includes(q),
          )

        const matchCat = category === 'all' || a.category === category
        return matchSearch && matchCat && !a.isOfficial
      })
      .sort((a, b) => {
        if (sortBy === 'computations') return (b.calls || 0) - (a.calls || 0)
        if (sortBy === 'uptime') return (b.score || 0) - (a.score || 0)
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        }
        return (b.calls || 0) - (a.calls || 0)
      })
  }, [filters?.category, filters?.sortBy, list, search, activeChainId])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-7">
      <div className="max-w-7xl w-full mx-auto flex flex-col flex-1 min-h-0">
        {/* HEADER */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-dim font-semibold">Web3 Network Infrastructure</p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-tight">
                AGENT <span className="text-primary">EXPLORER</span>
            </h1>
          </div>
          <div className="text-xs font-medium text-text-dim">{filteredAgents.length} indexed contracts</div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SIDEBAR CONTROLS */}
          <aside className="lg:col-span-3 rounded-xl border border-border bg-panel p-5 shadow-sm overflow-y-auto min-h-0">
            <div className="flex items-center gap-2 text-sm font-bold mb-4">
              <SlidersHorizontal size={16} className="text-primary" /> Filters & Sort
            </div>

            <div className="relative mb-5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search contracts..."
                className="input-field rounded-lg pl-9 pr-3 py-2.5 w-full text-sm bg-bg-secondary border-border focus:border-primary transition-colors"
              />
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-text-dim uppercase tracking-wide mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter('category', cat)}
                    className={`text-xs rounded-lg px-3 py-1.5 border transition-all ${
                      (filters?.category || 'all') === cat
                        ? 'border-accent-pink bg-accent-pink/10 text-primary font-medium'
                        : 'border-border text-text-secondary bg-bg hover:bg-bg-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-text-dim uppercase tracking-wide mb-3">Sort By</p>
              <div className="space-y-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter('sortBy', opt.value)}
                    className={`w-full text-left text-xs rounded-lg px-3 py-2.5 border transition-all ${
                      (filters?.sortBy || 'computations') === opt.value
                        ? 'border-accent-pink bg-accent-pink/10 text-primary font-medium'
                        : 'border-border text-text-secondary bg-bg hover:bg-bg-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <NeonButton
              variant="ghost"
              icon={RefreshCw}
              size="sm"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setFilter('category', 'all')
                setFilter('sortBy', 'computations')
              }}
              className="w-full justify-center"
            >
              Reset Filters
            </NeonButton>
          </aside>

          {/* MAIN CONTENT AREA */}
          <section className="lg:col-span-9 flex flex-col min-h-0">
            {/* Fixed: these three stay while the agents below them scroll. */}
            <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Database, label: 'Deployed Agents', value: stats?.totalAgents ?? list.length },
                { icon: Activity, label: 'Live Endpoints', value: stats?.activeAgents ?? 0 },
                { icon: Cpu, label: 'Total Computations', value: stats?.totalCalls ?? 0 },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-xl border border-border bg-panel px-4 py-4 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-text-dim font-medium">{item.label}</div>
                      <Icon size={14} className="text-primary opacity-80" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono">
                      {statsLoading ? <Loader2 size={16} className="animate-spin text-primary" /> : String(item.value)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* The only scroller on the page: the agents themselves */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-6 space-y-6">
            <OfficialAgentStrip variant="compact" limit={4} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wide text-text-dim font-semibold shrink-0">Creator Agents</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* AGENT CARDS GRID */}
            {isLoading ? (
              <LoadingPulse />
            ) : (
              <>
                {filteredAgents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAgents.map((agent, idx) => {
                      const displayId = getAgentExternalId(agent)
                      return (
                        <motion.div
                          key={agent.id || agent.agentId || idx}
                          onClick={(e) => {
                            if (e.target.closest('a')) return
                            navigate(`/agent/${displayId}`)
                          }}
                          className={`${agentCardShellClass} cursor-pointer hover:border-primary/50 transition-colors`}
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a8f0] to-transparent opacity-70" />
                            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/[0.05] rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />

                            <div className="flex justify-between items-start mb-3 gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="shrink-0 rounded-[11px] overflow-hidden shadow-sm ring-1 ring-[#e6dcf2]">
                                  <AgentAvatar agent={agent} size={38} muted />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary line-clamp-1 group-hover:text-primary transition-colors font-display">
                                  {agent.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 border border-success/20 rounded-lg text-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
                                <span className="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
                                  Live
                                </span>
                              </div>
                            </div>

                            <p className="text-sm text-text-secondary line-clamp-2 mb-4 grow leading-relaxed">
                              {agent.description || "No execution schema provided for this node."}
                            </p>

                            <div className="mb-4 p-2.5 bg-bg-secondary/80 rounded-xl border border-[#ebe3f4]">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Deployer</p>
                                <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">Web3 Network</span>
                              </div>
                              <p className="font-mono text-xs text-text-primary break-all opacity-80">
                                {agent.deployerAddress || '—'}
                              </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ebe3f4]">
                                <Link
                                  to={`/agent/${displayId}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-medium text-xs hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                  Details
                                  <ArrowUpRight size={12} />
                                </Link>
                            </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-panel p-12 text-center flex flex-col items-center justify-center min-h-75">
                    <Search size={32} className="text-text-dim mb-4" />
                    <p className="text-xl font-semibold text-text-primary mb-2">No agents found</p>
                    <p className="text-sm text-text-secondary">Try adjusting your filters or search query to find what you're looking for.</p>
                    <NeonButton 
                      variant="outline" 
                      className="mt-6"
                      onClick={() => {
                        setSearchInput('')
                        setSearch('')
                        setFilter('category', 'all')
                      }}
                    >
                      Clear Filters
                    </NeonButton>
                  </div>
                )}
              </>
            )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}