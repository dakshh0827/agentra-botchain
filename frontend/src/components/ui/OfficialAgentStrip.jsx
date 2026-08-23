import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BadgeCheck, LayoutGrid, ArrowUpRight } from 'lucide-react'
import { agentsAPI } from '../../api/agents'
import { getAgentExternalId } from '../../utils/helpers'
import {
  detailsBtnClass,
  tryBtnClass,
  featuresBtnClass,
  agentCardShellClass,
} from '../../utils/agentCardChrome'
import AgentAvatar from './AgentAvatar'
import TryAgentModal from './TryAgentModal'
import AgentPreviewModal from './AgentPreviewModal'

function CardActions({ id, agent, isConnected, onTry }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ebe3f4]">
      <Link to={`/agent/${id}`} className={detailsBtnClass}>
        Details
        <ArrowUpRight size={12} />
      </Link>
      <button
        type="button"
        onClick={() => onTry?.(agent)}
        className={isConnected ? tryBtnClass : featuresBtnClass}
      >
        {isConnected ? (
          'Try now →'
        ) : (
          <>
            <LayoutGrid size={12} /> Features
          </>
        )}
      </button>
    </div>
  )
}

/**
 * Same chrome as Explorer marketplace cards — fonts, padding, footer actions —
 * so official agents do not look like a different product.
 */
function OfficialCard({ agent, variant, index, onTry, isConnected }) {
  const isHero = variant === 'hero'
  const id = getAgentExternalId(agent)

  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="h-full"
      >
        <div className={`${agentCardShellClass} border-[#d9c2f2]`}>
          <div className="flex items-start justify-between gap-3">
            <div className="shrink-0 rounded-[13px] shadow-[0_3px_10px_rgba(111,53,178,0.30)]">
              <AgentAvatar agent={agent} size={52} />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#d9c2f2] bg-accent-pink text-primary-deep">
              <BadgeCheck size={10} /> Agentra
            </span>
          </div>
          <h3 className="font-bold text-lg text-text-primary mt-3 truncate font-display">{agent.name}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Built and run by Agentra</p>
          <p className="mt-2.5 text-sm leading-relaxed text-text-secondary flex-1 line-clamp-3">
            {agent.description || 'No description provided.'}
          </p>
          <CardActions id={id} agent={agent} isConnected={isConnected} onTry={onTry} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={(e) => {
        if (isConnected) return
        if (e.target.closest('a, button')) return
        onTry?.(agent)
      }}
      className={`${agentCardShellClass} ${!isConnected ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a8f0] to-transparent opacity-80" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/[0.06] rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />

      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 rounded-[11px] overflow-hidden shadow-sm ring-1 ring-[#d9c2f2]">
            <AgentAvatar agent={agent} size={38} />
          </div>
          <h3 className="font-bold text-lg text-text-primary line-clamp-1 group-hover:text-primary transition-colors font-display">
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-pink border border-[#d9c2f2] rounded-lg text-primary">
          <BadgeCheck size={10} />
          <span className="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
            Agentra
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

      <CardActions id={id} agent={agent} isConnected={isConnected} onTry={onTry} />
    </motion.div>
  )
}

/**
 * The agents Agentra built and operates.
 *
 * `hero` is the landing-page section, `compact` sits above the Explorer grid.
 */
export default function OfficialAgentStrip({ variant = 'compact', limit = 4 }) {
  const { isConnected } = useAccount()
  const [agents, setAgents] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [tryAgent, setTryAgent] = useState(null)

  useEffect(() => {
    let active = true
    agentsAPI
      .getOfficial(limit)
      .then((res) => {
        if (active) setAgents(res.data?.agents || [])
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
  }, [limit])

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
            {/* {!isHero && (
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#AC64F7] to-[#6F35B2] inline-flex items-center justify-center">
                <BadgeCheck size={12} className="text-white" />
              </span>
            )} */}
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
            onTry={setTryAgent}
            isConnected={isConnected}
          />
        ))}
      </div>

      <TryAgentModal
        agent={tryAgent}
        open={!!tryAgent && isConnected}
        onClose={() => setTryAgent(null)}
      />
      <AgentPreviewModal
        agent={tryAgent}
        open={!!tryAgent && !isConnected}
        onClose={() => setTryAgent(null)}
      />
    </section>
  )
}
