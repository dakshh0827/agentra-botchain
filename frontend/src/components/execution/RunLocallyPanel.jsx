import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Copy, CheckCircle, Download } from 'lucide-react'
import { agentsAPI } from '../../api/agents'
import NeonButton from '../ui/NeonButton'

const CLI_STEPS = (agentId) => [
  { label: 'Install the CLI (one-time)', cmd: 'npm install -g @agentra-dev/cli' },
  { label: 'Log in with your wallet (one-time)', cmd: 'agentra login' },
  { label: 'Activate this agent', cmd: `agentra agent activate ${agentId}` },
  { label: 'Run it — works offline from here on', cmd: `agentra agent run ${agentId} --task "your task"` },
]

export default function RunLocallyPanel({ agentId }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [license, setLicense] = useState(null) // { licenseKey, expiresAt }
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await agentsAPI.getLicenseKey(agentId)
      setLicense(res.data)
      setOpen(true)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to generate license')
    } finally {
      setLoading(false)
    }
  }

  const copyCmd = (cmd, idx) => {
    navigator.clipboard.writeText(cmd)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  return (
    <div className="glass-card-landing rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-sm text-[var(--color-text-dim)] uppercase flex items-center gap-2">
          <Terminal size={12} className="text-[var(--color-primary)]" /> RUN LOCALLY
        </h3>
        {!open && (
          <NeonButton icon={Download} onClick={handleGenerate} loading={loading}>
            GENERATE LOCAL LICENSE
          </NeonButton>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-400 font-mono">{error}</p>}

      <AnimatePresence>
        {open && license && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
            <p className="text-xs font-mono text-[var(--color-text-dim)] mb-4">
              License valid until <span className="text-[var(--color-success)]">{new Date(license.expiresAt).toLocaleDateString()}</span>.
              Run the steps below in your terminal — after activation, the agent runs fully offline.
            </p>
            <div className="space-y-2.5">
              {CLI_STEPS(agentId).map((step, i) => (
                <div key={i} className="rounded-lg border border-[var(--color-border)] bg-black/5 p-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1.5">{i + 1}. {step.label}</div>
                  <div className="flex items-center justify-between gap-2 font-mono text-xs text-[var(--color-primary)] bg-black/5 rounded px-2.5 py-2">
                    <code className="truncate">{step.cmd}</code>
                    <button onClick={() => copyCmd(step.cmd, i)} className="shrink-0 text-[var(--color-text-dim)] hover:text-[var(--color-primary)] cursor-pointer">
                      {copiedIdx === i ? <CheckCircle size={13} className="text-[var(--color-success)]" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
