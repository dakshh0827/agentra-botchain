import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Activity, ArrowUpRight, Shield, Star, TrendingUp, Zap, ChevronDown, ExternalLink, LayoutGrid } from 'lucide-react'
import { formatUnits } from 'viem'
import { getAgentExternalId } from '../../utils/helpers'
import {
  detailsBtnClass,
  tryBtnClass,
  featuresBtnClass,
  agentCardShellClass,
} from '../../utils/agentCardChrome'
import TryAgentModal from './TryAgentModal'
import AgentPreviewModal from './AgentPreviewModal'

const categoryTone = {
  Analysis: { bg: '#e8f0fb', text: '#486c97', border: '#c4d7ee' },
  Development: { bg: '#f7e1ef', text: '#8f3ca3', border: '#dfbed5' },
  Security: { bg: '#f8e1e1', text: '#a54242', border: '#e4bebe' },
  Data: { bg: '#f7ecd9', text: '#9c6b2f', border: '#e7d1af' },
  NLP: { bg: '#e4f2ea', text: '#3f7a5d', border: '#c7e0d1' },
  Web3: { bg: '#f2e2f4', text: '#9346a2', border: '#dcc0e0' },
  Other: { bg: '#ece5df', text: '#6e5c58', border: '#d9cbc0' },
}

function formatPricing(pricing) {
  if (!pricing) return '0'
  try {
    const num = BigInt(pricing)
    if (num > 1000000000000000n) return Number(formatUnits(num, 18)).toFixed(4)
    return Number(pricing).toFixed(4)
  } catch {
    return Number(pricing || 0).toFixed(4)
  }
}

export default function AgentCard({ agent, index = 0 }) {
  const { isConnected } = useAccount()
  const tone = categoryTone[agent.category] || categoryTone.Other
  const displayId = getAgentExternalId(agent)
  const isOnChain = !!agent.contractAgentId
  const [isHovered, setIsHovered] = React.useState(false)
  const [tryOpen, setTryOpen] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className="h-full"
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${agentCardShellClass} px-4 py-4`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent-pink border border-[#d9b6c9] flex items-center justify-center shrink-0">
              <Zap size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-sm truncate">{agent.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full border"
                  style={{ background: tone.bg, color: tone.text, borderColor: tone.border }}
                >
                  {agent.category}
                </span>
                {isOnChain ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#d9b6c9] bg-accent-pink text-primary inline-flex items-center gap-1">
                    <Shield size={9} /> Chain
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <Link to={`/agent/${displayId}`} className={`${detailsBtnClass} !px-2.5 !py-1.5 text-[11px]`}>
            Details
            <ArrowUpRight size={11} />
          </Link>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-text-secondary line-clamp-2">
          {agent.description || 'No description provided.'}
        </p>

        <div className="mt-4 pt-3 border-t border-[#ebe3f4] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
              <Star size={10} /> {(agent.rating || 0).toFixed(1)}
            </div>
            <div className="text-[10px] text-text-dim uppercase tracking-wide mt-0.5">Rating</div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-star-blue text-xs font-semibold">
              <Activity size={10} /> {((agent.calls || 0) / 1000).toFixed(1)}k
            </div>
            <div className="text-[10px] text-text-dim uppercase tracking-wide mt-0.5">Calls</div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-success text-xs font-semibold">
              <TrendingUp size={10} /> {(agent.successRate || 0).toFixed(0)}%
            </div>
            <div className="text-[10px] text-text-dim uppercase tracking-wide mt-0.5">Success</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-primary">
            {formatPricing(agent.pricing)} 0G <span className="text-[11px] text-text-dim font-medium">/ month</span>
          </div>
          <button
            type="button"
            onClick={() => setTryOpen(true)}
            className={isConnected ? `${tryBtnClass} !px-2.5 !py-1.5 text-[11px]` : `${featuresBtnClass} !px-2.5 !py-1.5 text-[11px]`}
          >
            {isConnected ? (
              'Try now →'
            ) : (
              <>
                <LayoutGrid size={11} /> Features
              </>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-lg border border-[rgba(124,58,237,0.16)] bg-[rgba(124,58,237,0.04)] px-3 py-3 space-y-3">
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-wider text-text-dim">
                  <span>Expanded Details</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <ChevronDown size={10} /> Hover reveal
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-border bg-bg-secondary px-2.5 py-2">
                    <div className="text-[9px] uppercase tracking-wide text-text-dim">Status</div>
                    <div className="mt-0.5 font-mono text-text-primary capitalize">{agent.status || 'active'}</div>
                  </div>
                  <div className="rounded-md border border-border bg-bg-secondary px-2.5 py-2">
                    <div className="text-[9px] uppercase tracking-wide text-text-dim">Category</div>
                    <div className="mt-0.5 font-mono text-text-primary">{agent.category || 'Other'}</div>
                  </div>
                  <div className="rounded-md border border-border bg-bg-secondary px-2.5 py-2 col-span-2">
                    <div className="text-[9px] uppercase tracking-wide text-text-dim">Contract</div>
                    <div className="mt-0.5 font-mono text-text-primary break-all">
                      {agent.contractAddress || agent.deployerAddress || 'Not available'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-dim">
                  <Link to={`/agent/${displayId}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                    <ExternalLink size={10} /> Open full profile
                  </Link>
                  <span className="text-primary">{displayId}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TryAgentModal
        agent={agent}
        open={tryOpen && isConnected}
        onClose={() => setTryOpen(false)}
      />
      <AgentPreviewModal
        agent={agent}
        open={tryOpen && !isConnected}
        onClose={() => setTryOpen(false)}
      />
    </motion.div>
  )
}
