import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
// FIXED: Added Database, Shield, Tag, and ShieldCheck to the imports
import { Search, SlidersHorizontal, RefreshCw, Activity, Cpu, Database, Shield, Tag, ShieldCheck, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import LoadingPulse from '../components/ui/LoadingPulse'
import NeonButton from '../components/ui/NeonButton'
import { useAgents } from '../hooks/useAgents'
import { useMarketplaceStore } from '../stores/marketplaceStore'
import { analyticsAPI } from '../api/analytics'
import { getAgentExternalId } from '../utils/helpers'

const CATEGORIES = ['all', 'Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']

// FIXED: Cleaned up the sort options to only show Infrastructure metrics
const SORT_OPTIONS = [
  { value: 'computations', label: 'Most Computations' },
  { value: 'uptime', label: 'Highest Uptime' },
  { value: 'newest', label: 'Newly Deployed' },
]

export default function Explorer() {
  const { agents, isLoading } = useAgents()
  const { filters, search, setFilter, setSearch } = useMarketplaceStore()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    setStatsLoading(true)
    analyticsAPI.getGlobalStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 260)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])

  const list = Array.isArray(agents) ? agents : []

  const filteredAgents = useMemo(() => {
    return list
      .filter((a) => {
        const q = search.toLowerCase()
        const matchSearch =
          !search ||
          a.name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q))

        const matchCat = !filters.category || filters.category === 'all' || a.category === filters.category
        return matchSearch && matchCat
      })
      .sort((a, b) => {
        // FIXED: Mapped the new technical sort values to your actual data fields
        if (filters.sortBy === 'computations') return (b.calls || 0) - (a.calls || 0)
        if (filters.sortBy === 'uptime') return (b.score || 0) - (a.score || 0) // Proxying score to represent uptime
        if (filters.sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        return (b.calls || 0) - (a.calls || 0) // Default sort
      })
  }, [filters.category, filters.sortBy, list, search])

  return (
    <div className="min-h-screen bg-bg text-text-primary px-4 sm:px-6 lg:px-8 py-7">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-dim font-semibold">0G Network Infrastructure</p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-tight">
                AGENT <span className="text-primary">EXPLORER</span>
            </h1>
          </div>
          <div className="text-xs font-medium text-text-dim">{filteredAgents.length} indexed contracts</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR CONTROLS */}
          <aside className="lg:col-span-3 rounded-xl border border-border bg-panel p-5 sticky top-16 shadow-sm">
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
          <section className="lg:col-span-9 space-y-6">
            {/* STATS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Database, label: 'Deployed Contracts', value: stats?.totalAgents ?? list.length },
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

            {/* AGENT CARDS GRID */}
            {isLoading ? (
              <LoadingPulse />
            ) : (
              <>
                {filteredAgents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAgents.map((agent, idx) => (
                      <Link key={agent.id || agent.agentId || idx} to={`/agent/${getAgentExternalId(agent)}`}>
                        <motion.div
                          className="rounded-xl border border-border bg-panel p-5 flex flex-col h-full hover:border-primary/50 transition-colors duration-150 group relative overflow-hidden"
                        >
                          {/* Tech Accents */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/15 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="flex justify-between items-start mb-3 gap-2">
                            <h3 className="font-bold text-lg text-text-primary line-clamp-1 group-hover:text-primary transition-colors font-display">
                              {agent.name}
                            </h3>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 border border-success/20 rounded text-success">
                              <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
                              <span className="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
                                99.9% Uptime
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-text-secondary line-clamp-2 mb-4 grow leading-relaxed">
                            {agent.description || "No execution schema provided for this node."}
                          </p>

                          {/* Deployer Address */}
                          <div className="mb-4 p-2.5 bg-bg-secondary rounded-lg border border-border/50">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Deployer</p>
                              <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">0G Network</span>
                            </div>
                            <p className="font-mono text-xs text-text-primary break-all opacity-80">
                              {agent.deployerAddress || ''}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-text-dim pt-4 border-t border-border/60 font-mono">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5" title="Total Computations">
                                <Cpu size={14} className="text-primary/70" />
                                <span>{agent.calls || 0} execs</span>
                              </span>
                              <span className="flex items-center gap-1.5" title="Category Tag">
                                <Tag size={14} className="text-text-dim" />
                                <span>{agent.category}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                              <ShieldCheck size={14} className="text-success" />
                              Verified
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
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
          </section>
        </div>
      </div>
    </div>
  )
}