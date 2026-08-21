import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { X, Wallet, ShoppingCart } from 'lucide-react'
import AgentAvatar from './AgentAvatar'
import { getAgentExternalId } from '../../utils/helpers'
import { featuresForAgent } from '../../utils/agentFeatures'


export default function AgentPreviewModal({ agent, open, onClose }) {
  const { open: openWallet } = useWeb3Modal()
  const agentId = agent ? getAgentExternalId(agent) : null
  const features = featuresForAgent(agent)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!agent) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(28,18,36,0.5)] backdrop-blur-[3px] cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-preview-title"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md sm:max-w-lg max-h-[min(90vh,720px)] flex flex-col
                       rounded-3xl border border-[rgba(172,100,247,0.28)]
                       bg-[var(--color-panel)] overflow-hidden
                       shadow-[0_28px_70px_rgba(111,53,178,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-[var(--color-border)]
                            bg-gradient-to-br from-[rgba(172,100,247,0.14)] via-[rgba(255,248,241,0.6)] to-transparent">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 rounded-xl border border-[var(--color-border)]
                           bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-dim)]
                           hover:text-[var(--color-text-primary)] hover:border-primary cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-4 pr-10">
                <div className="rounded-2xl overflow-hidden ring-2 ring-[rgba(172,100,247,0.35)]
                                shadow-[0_8px_24px_rgba(111,53,178,0.28)] shrink-0">
                  <AgentAvatar agent={agent} size={72} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mb-1">
                    Feature preview
                  </p>
                  <h2
                    id="agent-preview-title"
                    className="font-display font-bold text-xl text-[var(--color-text-primary)] truncate"
                  >
                    {agent.name}
                  </h2>
                  {agent.category && (
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border
                                     border-[rgba(172,100,247,0.3)] bg-[rgba(172,100,247,0.1)]
                                     text-primary font-semibold">
                      {agent.category}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                {agent.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-3">
                What this agent does
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {features.map(({ icon: Icon, title, blurb, wrap }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)]
                               bg-[var(--color-bg)] px-3 py-3 shadow-sm"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${wrap} text-white flex items-center justify-center shrink-0 shadow-md`}
                    >
                      <Icon size={16} strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                        {title}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
                        {blurb}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-[var(--color-border)]
                            bg-gradient-to-t from-[rgba(172,100,247,0.08)] to-transparent">
              <p className="text-[11px] text-[var(--color-text-muted)] mb-3 text-center sm:text-left">
                Connect your wallet to try this agent, or open pricing to purchase access.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => openWallet()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                             text-xs font-bold bg-gradient-to-br from-[#AC64F7] to-[#6F35B2] text-white
                             hover:brightness-110 transition-all cursor-pointer
                             shadow-[0_6px_18px_rgba(111,53,178,0.35)]"
                >
                  <Wallet size={15} /> Connect wallet
                </button>
                <Link
                  to={`/agent/${agentId}`}
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                             text-xs font-bold border border-[var(--color-border)] bg-[var(--color-bg)]
                             text-[var(--color-text-primary)] hover:border-primary transition-colors"
                >
                  <ShoppingCart size={15} /> Pricing & purchase
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
