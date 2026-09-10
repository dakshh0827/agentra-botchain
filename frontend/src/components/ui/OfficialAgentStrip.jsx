import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ArrowUpRight } from 'lucide-react'
import { agentsAPI } from '../../api/agents'
import { getAgentExternalId } from '../../utils/helpers'
import { EXPLORER_CACHE_TTL_MS, ttlCached, ttlGet, ttlHas } from '../../utils/ttlCache'
import {
  detailsBtnClass,
  agentCardShellClass,
} from '../../utils/agentCardChrome'
import AgentAvatar from './AgentAvatar'

function CardActions({ id }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ebe3f4]">
      <Link to={`/agent/${id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-medium text-xs hover:bg-primary/90 transition-colors shadow-sm">
        Details
        <ArrowUpRight size={12} />
      </Link>
    </div>
  )
}

/**
 * Same chrome as Explorer marketplace cards — fonts, padding, footer actions —
 * so official agents do not look like a different product.
 */
function OfficialCard({ agent, variant, index }) {
  const navigate = useNavigate()
  const isHero = variant === 'hero'
  const id = getAgentExternalId(agent)

  const handleCardClick = (e) => {
    if (e.target.closest('a')) return
    navigate(`/agent/${id}`)
  }

  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="h-full"
      >
        <div 
          onClick={handleCardClick}
          className={`${agentCardShellClass} border-[#d9c2f2] cursor-pointer hover:border-primary/50 transition-colors`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="shrink-0 rounded-[13px] shadow-[0_3px_10px_rgba(111,53,178,0.30)]">
              <AgentAvatar agent={agent} size={52} />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-success/20 bg-success/10 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
              Live
            </span>
          </div>
          <h3
            className="font-bold text-lg text-text-primary mt-3 line-clamp-2 font-display"
            title={agent.name}
          >
            {agent.name}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">Built and run by Agentra</p>
          <p className="mt-2.5 text-sm leading-relaxed text-text-secondary flex-1 line-clamp-3">
            {agent.description || 'No description provided.'}
          </p>
          <CardActions id={id} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={handleCardClick}
      className={`${agentCardShellClass} cursor-pointer hover:border-primary/50 transition-colors`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a8f0] to-transparent opacity-80" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/[0.06] rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />

      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 rounded-[11px] overflow-hidden shadow-sm ring-1 ring-[#d9c2f2]">
            <AgentAvatar agent={agent} size={38} />
          </div>
          <h3
            className="font-bold text-lg text-text-primary line-clamp-2 group-hover:text-primary transition-colors font-display"
            title={agent.name}
          >
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 border border-success/20 rounded-lg text-success shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
          <span className="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
            Live
          </span>
        </div>
      </div>

      <p className="text-sm text-text-secondary line-clamp-2 mb-4 grow leading-relaxed">
        {agent.description || 'No description provided.'}
      </p>

      <div className="mb-4 p-2.5 bg-bg-secondary/80 rounded-xl border border-[#ebe3f4]">
        <div className="flex justify-between items-center mb-1">
          <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Operator</p>
          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">
            Official
          </span>
        </div>
        <p className="text-xs text-text-primary opacity-80">Built and run by Agentra</p>
      </div>

      <CardActions id={id} />
    </motion.div>
  )
}

/**
 * The agents Agentra built and operates.
 *
 * `hero` is the landing-page section, `compact` sits above the Explorer grid.
 */
export default function OfficialAgentStrip({ variant = 'compact', limit = 4 }) {
  const cacheKey = `agents:official:${limit}`
  const hasCache = ttlHas(cacheKey)
  const [agents, setAgents] = useState(() => {
    if (!hasCache) return []
    const cached = ttlGet(cacheKey)
    return Array.isArray(cached) ? cached : []
  })
  const [isLoading, setLoading] = useState(() => !hasCache)

  useEffect(() => {
    let active = true
    ttlCached(
      cacheKey,
      async () => {
        const res = await agentsAPI.getOfficial(limit)
        return res.data?.agents || []
      },
      EXPLORER_CACHE_TTL_MS,
    )
      .then((list) => {
        if (active) setAgents(list)
      })
      .catch(() => {
        if (active) setAgents([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [cacheKey, limit])

  if (isLoading || !agents.length) return null

  const isHero = variant === 'hero'

  return (
    <section className={isHero ? 'py-14' : 'mb-6'}>
      <div className={isHero ? 'text-center mb-8' : 'flex items-end justify-between gap-4 mb-4'}>
        <div className={isHero ? '' : 'min-w-0'}>
          <h2
            className={[
              'font-semibold text-text-primary inline-flex items-center gap-2',
              isHero ? 'text-2xl md:text-3xl' : 'text-base',
            ].join(' ')}
          >
            {isHero ? 'Agents we built and run' : 'Built by Agentra'}
          </h2>
          <p className={['text-text-muted mt-1', isHero ? 'text-sm' : 'text-xs'].join(' ')}>
            First-party agents - built by ourselves.
          </p>
        </div>
        {!isHero && (
          <span className="text-[10px] uppercase tracking-wide text-text-dim shrink-0">
            {agents.length} official
          </span>
        )}
      </div>

      <div
        className={[
          'grid gap-4',
          isHero
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
        ].join(' ')}
      >
        {agents.map((agent, index) => (
          <OfficialCard
            key={agent.id || agent.agentId}
            agent={agent}
            variant={variant}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}