import React, { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  BarChart3, TrendingUp, Zap, DollarSign, Activity,
  Wallet, Sparkles, Clock, ShieldCheck, Cpu
} from 'lucide-react'
import { useAccount } from 'wagmi'
import MetricBadge from '../components/ui/MetricBadge'
import LoadingPulse from '../components/ui/LoadingPulse'
import AgentCard from '../components/ui/AgentCard'
import { analyticsAPI } from '../api/analytics'
import { agentsAPI } from '../api/agents'
import { useAgents } from '../hooks/useAgents'
import { Link } from 'react-router-dom'

/* ── FadeInSection ── */
function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel border border-[var(--color-border)] rounded-lg px-4 py-3 text-xs font-mono shadow-xl">
      <div className="text-[var(--color-text-secondary)] font-bold mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-text-muted)]">{p.name}:</span>
          <span style={{ color: p.color }} className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const formatRevenueTick = (value) => {
  if (!value) return ''
  const parts = String(value).split('-').map(Number)
  const parsed = parts.length === 3
    ? new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1)
    : new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

const formatActivityTimestamp = (createdAt) => {
  if (!createdAt) return ''
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Dashboard() {
  const { address: walletAddress, isConnected } = useAccount()

  const [loading, setLoading] = useState(true)
  const [dashData, setDashData] = useState(null)
  const [accessStates, setAccessStates] = useState({})
  const [accessLoading, setAccessLoading] = useState(false)
  const [hoveredMetric, setHoveredMetric] = useState(null)

  const { agents } = useAgents()

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchDashboard = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)

      try {
        const r = await analyticsAPI.getDashboard(walletAddress)
        if (!cancelled) setDashData(r.data)
      } catch (err) {
        if (!cancelled) console.error(err)
      } finally {
        if (!silent && !cancelled) setLoading(false)
      }
    }

    fetchDashboard()

    const intervalId = setInterval(() => {
      fetchDashboard({ silent: true })
    }, 15000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [walletAddress])

  // Agents owned by this user (from DB)
  const myAgents = (agents || []).filter(
    a => a.ownerWallet?.toLowerCase() === walletAddress?.toLowerCase()
  )

  const unlockedAgents = (agents || []).filter((agent) => {
    if (!agent?.agentId) return false
    if (agent.ownerWallet?.toLowerCase() === walletAddress?.toLowerCase()) return false
    return !!accessStates[agent.agentId]
  })

  useEffect(() => {
    let cancelled = false

    const loadAccessStates = async () => {
      if (!walletAddress || !(agents || []).length) {
        setAccessStates({})
        return
      }

      const candidates = (agents || []).filter(
        agent => agent.ownerWallet?.toLowerCase() !== walletAddress?.toLowerCase()
      )

      if (candidates.length === 0) {
        setAccessStates({})
        return
      }

      setAccessLoading(true)
      try {
        const results = await Promise.allSettled(
          candidates.map(async (agent) => {
            const res = await agentsAPI.checkAccess(agent.agentId)
            return [agent.agentId, !!res.data?.hasAccess]
          })
        )

        if (cancelled) return

        const nextAccessStates = {}
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const [agentId, hasAccess] = result.value
            nextAccessStates[agentId] = hasAccess
          }
        }
        setAccessStates(nextAccessStates)
      } catch {
        if (!cancelled) setAccessStates({})
      } finally {
        if (!cancelled) setAccessLoading(false)
      }
    }

    loadAccessStates()

    return () => {
      cancelled = true
    }
  }, [agents, walletAddress])

  if (!isConnected || !walletAddress) return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card-landing rounded-2xl p-10 sm:p-14 text-center max-w-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center mx-auto mb-6">
            <Wallet size={36} className="text-[var(--color-primary)] opacity-70" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[var(--color-text-primary)] mb-3">Connect Wallet</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-6 leading-relaxed">
            Connect your wallet via the top bar to view your personal analytics, revenue, and agent performance.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Revenue Tracking', 'Agent Metrics', 'Activity Feed'].map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-lg border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.04)] text-sm font-mono text-[var(--color-purple-pale)] ">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )

  if (loading) return <div className="p-6 max-w-7xl mx-auto"><LoadingPulse /></div>

  // dashData shape: { metrics, agents, revenueData, agentPerf, activityFeed, globalStats }
  const metrics = dashData?.metrics || {}
  const revenueData = dashData?.revenueData || []
  const agentPerf = dashData?.agentPerf || []
  const activityFeed = dashData?.activityFeed || []

  const totalRevenue = Number(metrics.totalRevenue ?? 0)
  const totalCalls = Number(metrics.totalCalls ?? 0)
  const totalPurchases = Number(metrics.totalPurchases ?? 0)
  const maxRevenuePoint = Math.max(...revenueData.map((point) => Number(point.eth || 0)), 0)
  const revenueAxisMax = maxRevenuePoint > 0 ? maxRevenuePoint * 1.25 : 1

  const metricCards = [
    { label: 'TOTAL REVENUE', value: `${totalRevenue.toFixed(4)} 0G`, color: 'green', icon: DollarSign, sublabel: 'All time earnings' },
    { label: 'TOTAL CALLS', value: totalCalls.toLocaleString(), color: 'blue', icon: Activity, sublabel: 'Total executions' },
    { label: 'MY AGENTS', value: myAgents.length, color: 'purple', icon: Zap, sublabel: 'Deployed on network' },
    { label: 'TOTAL PURCHASES', value: totalPurchases.toLocaleString(), color: 'yellow', icon: ShieldCheck, sublabel: 'Unique buyer unlocks' },
  ]

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 lg:px-8 py-5 lg:py-8">

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <p className="text-xs uppercase tracking-wide text-text-dim font-semibold">Directory</p>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[var(--color-text-primary)] leading-[1.1] tracking-tight">
            <span className="gradient-text-purple">REVENUE</span> CONTROL
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm sm:text-base font-body mt-3 max-w-xl">
            Track your agent performance, monitor revenue streams, and analyze execution metrics in real-time.
          </p>
        </motion.div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {metricCards.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              onMouseEnter={() => setHoveredMetric(m.label)} onMouseLeave={() => setHoveredMetric(null)} className="group">
              <div className={`glass-card-landing rounded-xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 ${hoveredMetric === m.label ? 'scale-[1.02]' : ''}`}>
                <div className="relative z-10"><MetricBadge {...m} /></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Revenue Chart */}
          <FadeInSection className="lg:col-span-2">
            <div className="glass-card-landing rounded-xl p-5 sm:p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-[var(--color-text-primary)] text-base sm:text-lg">Revenue Chart</h3>
                  <p className="text-[var(--color-text-dim)] text-sm font-mono tracking-wider mt-0.5">0G EARNINGS OVER TIME</p>
                </div>
              </div>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                    <XAxis dataKey="date" tickFormatter={formatRevenueTick} stroke="rgba(124,58,237,0.3)" tick={{ fontSize: 10, fontFamily: 'Space Mono', fill: 'var(--color-text-dim)' }} />
                    <YAxis
                      stroke="rgba(124,58,237,0.3)"
                      domain={[0, revenueAxisMax]}
                      tickCount={5}
                      allowDecimals
                      tickFormatter={(value) => (revenueAxisMax < 1 ? Number(value).toFixed(2) : Number(value).toFixed(0))}
                      tick={{ fontSize: 10, fontFamily: 'Space Mono', fill: 'var(--color-text-dim)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="eth" stroke="#a855f7" strokeWidth={2} fill="rgba(168,85,247,0.12)" name="0G" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <Sparkles size={28} className="text-[var(--color-primary)] opacity-30 mb-3" />
                  <div className="text-[var(--color-text-dim)] font-mono text-xs ">NO REVENUE DATA YET</div>
                  <Link to="/deploy" className="mt-3 text-[var(--color-primary)] text-sm font-mono hover:underline">DEPLOY AN AGENT →</Link>
                </div>
              )}
            </div>
          </FadeInSection>

          {/* Activity Feed */}
          <FadeInSection delay={0.1}>
            <div className="glass-card-landing rounded-xl p-5 sm:p-6 h-full">
              <div className="flex items-center gap-2 mb-5">
                <Clock size={14} className="text-[var(--color-primary)]" />
                <h3 className="font-display font-bold text-[var(--color-text-primary)] text-base sm:text-lg">Activity Feed</h3>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-52 pr-1">
                {activityFeed.length > 0 ? activityFeed.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                    whileHover={{ x: 4 }} className="flex items-start gap-3 pb-3 border-b border-[var(--color-border)] last:border-0 cursor-default group">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[var(--color-primary)] group-hover:scale-125 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors truncate">{item.text}</div>
                      <div className="text-[var(--color-text-dim)] text-xs font-mono mt-1">{formatActivityTimestamp(item.createdAt)}</div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity size={24} className="text-[var(--color-text-dim)] opacity-30 mb-2" />
                    <div className="text-[var(--color-text-dim)] text-xs font-mono ">NO RECENT ACTIVITY</div>
                  </div>
                )}
              </div>
            </div>
          </FadeInSection>
        </div>

        {/* Agent Grids */}
        <FadeInSection delay={0.2}>
          <div className="space-y-10 mb-10">
            {/* My Deployed Agents */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Cpu size={20} className="text-[var(--color-primary)]" />
                <h3 className="font-display font-bold text-[var(--color-text-primary)] text-xl sm:text-2xl">My Deployed Agents</h3>
              </div>
              {myAgents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {myAgents.map((agent, i) => (
                    <AgentCard key={agent.agentId || agent.id} agent={agent} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-card-landing rounded-xl p-10 text-center border-dashed border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.02)]">
                  <div className="text-[var(--color-text-dim)] font-mono text-xs  mb-3">NO AGENTS DEPLOYED YET</div>
                  <Link to="/deploy" className="text-[var(--color-primary)] text-xs font-mono hover:underline">LAUNCH YOUR FIRST AGENT →</Link>
                </div>
              )}
            </div>

            {/* Purchased / Unlocked Agents */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={20} className="text-[var(--color-success)]" />
                <h3 className="font-display font-bold text-[var(--color-text-primary)] text-xl sm:text-2xl">Unlocked Access</h3>
              </div>
              {unlockedAgents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {unlockedAgents.map((agent, i) => (
                    <AgentCard key={agent.agentId || agent.id} agent={agent} index={i} />
                  ))}
                </div>
              ) : (
                <div className="glass-card-landing rounded-xl p-10 text-center border-dashed border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.02)]">
                  <div className="text-[var(--color-text-dim)] font-mono text-xs  mb-3">NO UNLOCKED AGENTS YET</div>
                  <Link to="/explorer" className="text-[var(--color-success)] text-xs font-mono hover:underline">EXPLORE REGISTRY →</Link>
                </div>
              )}
            </div>
          </div>
        </FadeInSection>

        {/* Performance chart */}
        <FadeInSection delay={0.25}>
          <div className="glass-card-landing rounded-xl p-5 sm:p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-[var(--color-text-primary)] text-base sm:text-lg">Performance Metrics</h3>
                <p className="text-[var(--color-text-dim)] text-sm font-mono tracking-wider mt-0.5">CALLS VS REVENUE BY AGENT</p>
              </div>
              <div className="flex items-center gap-4 text-sm font-mono">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-[rgba(124,58,237,0.6)]" /><span className="text-[var(--color-text-dim)]">CALLS</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-[rgba(52,211,153,0.6)]" /><span className="text-[var(--color-text-dim)]">REVENUE</span></div>
              </div>
            </div>
            {agentPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentPerf} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(124,58,237,0.3)" tick={{ fontSize: 10, fontFamily: 'Space Mono', fill: 'var(--color-text-dim)' }} />
                  <YAxis stroke="rgba(124,58,237,0.3)" tick={{ fontSize: 10, fontFamily: 'Space Mono', fill: 'var(--color-text-dim)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="calls" fill="rgba(124,58,237,0.5)" stroke="#7c3aed" strokeWidth={1} radius={[4, 4, 0, 0]} name="Calls" />
                  <Bar dataKey="revenue" fill="rgba(52,211,153,0.4)" stroke="#34d399" strokeWidth={1} radius={[4, 4, 0, 0]} name="Revenue (0G)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <BarChart3 size={28} className="text-[var(--color-primary)] opacity-30 mb-3" />
                <div className="text-[var(--color-text-dim)] font-mono text-xs ">NO PERFORMANCE DATA</div>
                <p className="text-[var(--color-text-dim)] text-sm mt-2 max-w-xs">Deploy agents and receive executions to see performance metrics here.</p>
              </div>
            )}
          </div>
        </FadeInSection>
      </div>
    </div>
  )
}



