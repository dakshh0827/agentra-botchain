import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import {
  X, Send, Loader2, ExternalLink, MessageSquare, Terminal, AlertCircle,
  History, LayoutGrid, CheckCircle2, Trash2, Wallet, ShoppingCart, Lock,
} from 'lucide-react'
import { agentsAPI } from '../../api/agents'
import { streamSSE } from '../../api/stream'
import AgentAvatar from './AgentAvatar'
import ReportCard from './ReportCard'
import ComparisonCard from './ComparisonCard'
import ChoiceForm from './ChoiceForm'
import { getAgentExternalId } from '../../utils/helpers'
import { capabilitiesFor } from '../../utils/agentCapabilities'

function choiceFieldsFrom(payload) {
  if (!payload || typeof payload !== 'object') return null
  const choices = Array.isArray(payload.choices) ? payload.choices : null
  const quickReplies = Array.isArray(payload.quickReplies) ? payload.quickReplies : null
  if (!choices?.length && !quickReplies?.length) return null
  return {
    choices: choices || undefined,
    quickReplies: quickReplies || undefined,
    composeTemplate: payload.composeTemplate || undefined,
  }
}

const COMPARE_INTENT = /\b(compare|versus|vs\.?|against|competitor)\b/i
const AUDIT_INTENT = /\b(audit|re-?audit|crawl|scan|seo\s+check|check\s+(this\s+)?site)\b/i
const BARE_HOST = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:\/\S*)?/gi
const FULL_URL = /https?:\/\/[^\s<>"']+/gi

function normalizeHost(value) {
  if (!value) return ''
  try {
    const raw = String(value).trim()
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(withProto).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return String(value).replace(/^www\./i, '').toLowerCase()
  }
}

function hostsInText(text) {
  const found = []
  const seen = new Set()
  for (const re of [FULL_URL, BARE_HOST]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(text || ''))) {
      const host = normalizeHost(match[0])
      if (!host || host.endsWith('.jpg') || host.endsWith('.png') || host.endsWith('.pdf')) continue
      if (seen.has(host)) continue
      seen.add(host)
      found.push(host)
    }
  }
  return found
}


function wantsFreshRun(text, report) {
  const hosts = hostsInText(text)
  const structuredBrief = /\b(brand\s*name|website\s*[:=-]|keywords?\s+(?:for\s+)?blog|topic\s*[:=-])\b/i.test(
    text || '',
  )
  const blogJob = /\b(blog|article|long[- ]?form)\b/i.test(text || '')

  // Structured brand/website/topic brief → always a new content job.
  if (structuredBrief && (hosts.length || blogJob || (text || '').length > 60)) {
    return true
  }

  if (!hosts.length) {
    // New blog ask without a URL still leaves the previous Canvas-style report.
    if (blogJob && report && (report.title || report.summary || report.reportId)) {
      const prior = `${report.title || ''} ${report.summary || ''} ${report.query || ''}`.toLowerCase()
      const brandMatch = text.match(/(?:brand\s*name|company)\s*[-:=]\s*(.+)/i)
      if (brandMatch && brandMatch[1] && !prior.includes(brandMatch[1].trim().toLowerCase().slice(0, 24))) {
        return true
      }
    }
    return false
  }
  if (COMPARE_INTENT.test(text)) return false

  const current = normalizeHost(report?.host || report?.url || report?.query || '')
  if (!current) return true
  if (hosts.some((h) => h !== current && !current.includes(h) && !h.includes(current))) return true
  if (AUDIT_INTENT.test(text)) return true

  // Message is basically just a site URL → treat as a new run of that site.
  const compact = text.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return hosts.length === 1 && compact.length <= hosts[0].length + 12
}

// One flat chip style for every deliverable. The per-format colours these replaced
// competed with the agent's own content for attention.
const deliverableTone = 'text-[var(--color-text-secondary)] bg-[var(--color-bg)] border-[var(--color-border)]'

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
  { id: 'features', label: 'Features', icon: LayoutGrid },
]

function FeatureGrid({ caps }) {
  const { features, deliverables } = caps

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)] mb-1">
          {caps.featuresTitle}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-3.5 leading-relaxed">
          {caps.featuresBlurb}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, blurb, wrap, tone, iconWrap }) => (
            <div
              key={title}
              className={`group relative overflow-hidden flex items-start gap-3.5 rounded-2xl border
                          px-3.5 py-3.5 transition-colors duration-150
                          ${tone || 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                            ${iconWrap || `${wrap || 'bg-primary'} text-white`}`}
              >
                <Icon size={18} strokeWidth={2.25} />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">
                  {title}
                </div>
                <div className="text-[11.5px] text-[var(--color-text-muted)] mt-1 leading-snug">
                  {blurb}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deliverables.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)] mb-1">
            You get
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3.5">
            Downloadable after a successful run that produces them.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {deliverables.map(({ key, label, Icon }) => (
              <span
                key={key}
                className={`inline-flex flex-col items-center justify-center gap-1.5 px-3 py-3
                            rounded-xl border text-xs font-bold ${deliverableTone}`}
              >
                <Icon size={18} strokeWidth={2.2} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryPanel({ messages, loading, onJumpToChat, onClearLocal }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-xs text-[var(--color-text-dim)] font-mono">
        <Loader2 size={14} className="animate-spin text-primary" /> Loading history…
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <History size={28} className="text-[var(--color-text-dim)] mb-3 opacity-60" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">No saved chats yet</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs">
          Runs and follow-ups are stored for this wallet + agent once you connect and execute.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-text-muted)]">
          {messages.length} saved message{messages.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onJumpToChat}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Open in chat →
          </button>
          {onClearLocal && (
            <button
              type="button"
              onClick={onClearLocal}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-danger)] cursor-pointer"
              title="Clear this session view only"
            >
              <Trash2 size={11} /> Clear view
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            className={`rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'border-[#d9c2f2] bg-[var(--color-accent-pink)] ml-6'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)] mr-6'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)]">
                {m.role === 'user' ? 'You' : 'Agent'}
              </span>
              {m.createdAt && (
                <span className="text-[10px] font-mono text-[var(--color-text-dim)]">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">
              {m.content || m.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Large try-panel over Explorer — Agentra theme, execute-first.
 * Tabs for chat, saved history, and feature overview.
 */
export default function TryAgentModal({ agent, open, onClose }) {
  const { isConnected } = useAccount()
  const { open: openWallet } = useWeb3Modal()
  const [tab, setTab] = useState('features')
  const [task, setTask] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [turns, setTurns] = useState([])
  const [report, setReport] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [reportId, setReportId] = useState(null)
  const [canChat, setCanChat] = useState(false)
  const [phase, setPhase] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  // Trial allowance for this wallet on this agent, refreshed after every run
  const [freeRuns, setFreeRuns] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const agentId = agent ? getAgentExternalId(agent) : null
  const caps = useMemo(() => capabilitiesFor(agent), [agent])

  const loadAccess = useCallback(async () => {
    if (!agentId || !isConnected) {
      setFreeRuns(null)
      return
    }
    try {
      const res = await agentsAPI.checkAccess(agentId)
      setFreeRuns(res.data?.freeRuns || null)
    } catch {
      setFreeRuns(null)
    }
  }, [agentId, isConnected])

  const loadHistory = useCallback(async () => {
    if (!agentId || !isConnected) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    try {
      const res = await agentsAPI.getConversation(agentId)
      setHistory(res.data?.messages || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [agentId, isConnected])

  useEffect(() => {
    if (!open) return
    setTab(isConnected ? 'chat' : 'features')
    setTask('')
    setError(null)
    setBusy(false)
    setReport(null)
    setComparison(null)
    setReportId(null)
    setCanChat(false)
    setTurns(
      isConnected
        ? [
            {
              role: 'system',
              showLabel: true,
              text: `${agent?.name || 'Agent'} is ready. ${caps.readyMessage}`,
            },
          ]
        : [],
    )

    let active = true
    loadAccess()
    if (agentId && isConnected) {
      agentsAPI
        .getConversation(agentId)
        .then((res) => {
          const prior = res.data?.messages || []
          if (!active) return
          setHistory(prior)
          if (!prior.length) return
          setTurns((current) => [
            ...current,
            { role: 'system', text: `Restored ${prior.length} earlier message(s) — see History tab` },
            ...prior.slice(-6).map((m) => ({
              role: m.role === 'user' ? 'user' : 'agent',
              text: m.content,
              old: true,
            })),
            { role: 'divider', text: 'This session' },
          ])
          setCanChat(true)
        })
        .catch(() => {})
    } else {
      setHistory([])
    }

    const t = setTimeout(() => {
      if (isConnected) inputRef.current?.focus()
    }, 180)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [open, agent, agentId, isConnected, caps, loadAccess])

  // After connect while modal is open, land on chat ready to run
  useEffect(() => {
    if (!open || !isConnected) return
    setTab((prev) => (prev === 'features' ? 'chat' : prev))
  }, [isConnected, open])

  useEffect(() => {
    if (!open || tab !== 'history') return
    loadHistory()
  }, [open, tab, loadHistory])

  useEffect(() => {
    if (!open || tab !== 'chat') return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, report, comparison, open, tab])

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

  const run = useCallback(async ({ forceNewRun = false, text: override } = {}) => {
    const text = String(override ?? task).trim()
    if (!text || !agentId || busy) return

    if (!isConnected) {
      setError('Connect your wallet to run this agent.')
      return
    }

    // Prior turns only — current message is `task`, not duplicated in history.
    const priorHistory = turns
      .filter((t) => (t.role === 'user' || t.role === 'agent') && String(t.text || '').trim())
      .slice(-10)
      .map((t) => ({
        role: t.role === 'agent' ? 'assistant' : 'user',
        content: String(t.text).slice(0, 2000),
      }))

    setTab('chat')
    setError(null)
    setBusy(true)
    // New user message retires any open choice forms on prior agent turns.
    setTurns((prev) => [
      ...prev.map((t) =>
        t.role === 'agent' && (t.choices || t.quickReplies)
          ? { ...t, choicesUsed: true }
          : t,
      ),
      { role: 'user', text },
    ])
    setTask('')

    try {
      // Detect a new brand/URL/blog brief so prior Canvas (or any) context does not bleed in.
      const freshRun = forceNewRun || wantsFreshRun(text, report)
      if (reportId && canChat && !freshRun) {
        let streamed = ''
        setTurns((prev) => [...prev, { role: 'agent', text: '' }])

        await streamSSE(
          `/agents/${agentId}/chat/stream`,
          { question: text, reportId },
          (event) => {
            if (event.type === 'comparison') {
              setComparison(event.payload)
              return
            }
            if (event.type === 'token') {
              streamed += event.text || ''
            } else if (event.type === 'done' && event.answer) {
              streamed = event.answer
            } else if (event.type === 'error') {
              throw new Error(event.error)
            }
            setTurns((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'agent', text: streamed }
              return next
            })
          },
        )
        loadHistory()
        return
      }

      if (freshRun) {
        setReportId(null)
        setReport(null)
        setComparison(null)
        setCanChat(false)
      }

      let streamedResult = null
      let spokenText = ''
      let agentSaid = null

      try {
        setTurns((prev) => [...prev, { role: 'agent', text: '' }])
        await streamSSE(
          `/agents/${agentId}/execute/stream`,
          {
            task: text,
            // Fresh brand/site jobs must not inherit Canvas Client (or any prior) context.
            history: freshRun || !priorHistory.length ? undefined : priorHistory,
          },
          (event) => {
            if (event.type === 'phase') {
              setPhase(
                event.total
                  ? `${event.message} (${event.done}/${event.total})`
                  : event.message,
              )
            } else if (event.type === 'token') {
              spokenText += event.text || ''
              setTurns((prev) => {
                const next = [...prev]
                next[next.length - 1] = { role: 'agent', text: spokenText }
                return next
              })
            } else if (event.type === 'result') {
              streamedResult = event.payload
            } else if (event.type === 'error') {
              agentSaid = event.error
            }
          },
        )
      } catch (streamErr) {
        setTurns((prev) => (prev[prev.length - 1]?.text === '' ? prev.slice(0, -1) : prev))
        if (streamedResult === null && !spokenText && !agentSaid) {
          console.info('Streaming unavailable, using plain execute:', streamErr?.message)
        } else {
          throw streamErr
        }
      } finally {
        setPhase(null)
      }

     
      if (
        agentSaid &&
        !streamedResult &&
        !spokenText &&
        /does not support streaming/i.test(agentSaid)
      ) {
        agentSaid = null
        setTurns((prev) => (prev[prev.length - 1]?.text === '' ? prev.slice(0, -1) : prev))
        console.info('Agent lacks stream support, using plain execute')
      }

      if (agentSaid && !streamedResult && !spokenText) {
        setTurns((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'agent', text: agentSaid }
          return next
        })
        loadHistory()
        return
      }
      if (spokenText && !streamedResult) {
        loadHistory()
        return
      }

      if (streamedResult) {
        setReportId(streamedResult.reportId || null)
        setCanChat(!!streamedResult.canChat)
        if (streamedResult.reportId) setReport(streamedResult)
        if (streamedResult.comparisonId) setComparison(streamedResult)

        const extras = choiceFieldsFrom(streamedResult)
        // An agent can finish with a result payload but never stream a token, which
        // leaves the placeholder bubble blank and the run looking like it failed.
        const said =
          spokenText ||
          streamedResult.spokenSummary ||
          streamedResult.summary ||
          (streamedResult.reportId ? 'Run finished — see the report below.' : 'Run finished.')
        setTurns((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'agent') {
            next[next.length - 1] = {
              role: 'agent',
              text: last.text || said,
              ...(extras || {}),
              choicesUsed: false,
            }
          }
          return next
        })

        loadHistory()
        return
      }

      const fallbackTask = (!freshRun && priorHistory.length)
        ? [
            'Prior chat context (use for NGO/platform/tone — do not invent):',
            ...priorHistory.map((h) => `${h.role}: ${h.content}`),
            '',
            `Latest request: ${text}`,
          ].join('\n')
        : text
      const response = await agentsAPI.execute(agentId, fallbackTask)
      const data = response.data || {}
      const output = data.response ?? data.output ?? data.result ?? data
      const success = data.success !== false && !data.error

      if (data.error && (output === data || output == null)) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Execution failed')
      }

      let summary = 'Run finished. See the result below.'
      if (typeof output === 'object' && output?.summary) {
        summary = output.summary
      } else if (typeof output === 'string') {
        try {
          const parsed = JSON.parse(output)
          if (parsed?.summary) summary = parsed.summary
          else summary = output.slice(0, 280)
        } catch {
          summary = output.slice(0, 280)
        }
      } else if (!success) {
        summary = 'Run finished with an error.'
      }

      const spoken = typeof output === 'object' ? output?.spokenSummary : null
      const rid = typeof output === 'object' ? output?.reportId : null
      if (rid) setReportId(rid)
      if (typeof output === 'object' && output?.canChat) setCanChat(true)

      const extras = typeof output === 'object' ? choiceFieldsFrom(output) : null
      setTurns((prev) => [
        ...prev,
        {
          role: 'agent',
          text: spoken || summary,
          ...(extras || {}),
          choicesUsed: false,
        },
      ])
      if (rid && typeof output === 'object') setReport(output)
      if (typeof output === 'object' && output?.comparisonId) setComparison(output)
      loadHistory()
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Execution failed'
      setError(msg)
      setTurns((prev) => [...prev, { role: 'agent', text: `Could not run: ${msg}` }])
      setReport(null)
    } finally {
      setBusy(false)
      setPhase(null)
      loadAccess()
    }
  }, [task, agentId, busy, isConnected, reportId, canChat, loadHistory, loadAccess, caps, report, turns])

  const sendChoice = useCallback(
    (message) => {
      if (!message?.trim() || busy) return
      run({ text: message })
    },
    [run, busy],
  )
  const liveCount = useMemo(
    () => turns.filter((t) => t.role === 'user' || t.role === 'agent').length,
    [turns],
  )

  if (!agent) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(28,18,36,0.55)] backdrop-blur-[4px] cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="try-agent-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-6xl h-[min(94vh,900px)] flex flex-col rounded-3xl
                       border border-[var(--color-border)]
                       bg-[var(--color-panel)]
                       overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header band */}
            <div className="shrink-0 relative overflow-hidden border-b border-[var(--color-border)]">
              <div className="relative px-5 sm:px-7 pt-5 pb-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="rounded-2xl overflow-hidden shrink-0 border border-[var(--color-border)]">
                    <AgentAvatar agent={agent} size={52} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id="try-agent-title"
                        className="font-display font-bold text-xl sm:text-2xl text-[var(--color-text-primary)] truncate"
                      >
                        {agent.name}
                      </h2>
                      {agent.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(172,100,247,0.35)]
                                         bg-[rgba(172,100,247,0.12)] text-primary font-semibold">
                          {agent.category}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-border)]
                                       text-[var(--color-text-dim)] font-mono inline-flex items-center gap-1">
                        <Terminal size={9} /> Execute
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 line-clamp-2 max-w-3xl">
                      {agent.description || 'No description provided.'}
                    </p>
                    {caps.deliverables.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {caps.deliverables.map(({ key, label, Icon }) => (
                          <span
                            key={key}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${deliverableTone}`}
                          >
                            <Icon size={12} />
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/agent/${agentId}`}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                                 border border-[var(--color-border)] text-[var(--color-text-secondary)]
                                 hover:border-primary hover:text-primary transition-colors bg-[var(--color-bg)]"
                      onClick={onClose}
                    >
                      Full page <ExternalLink size={11} />
                    </Link>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-10 h-10 rounded-xl border border-[var(--color-border)] flex items-center justify-center
                                 text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)] hover:border-primary
                                 transition-colors cursor-pointer bg-[var(--color-bg)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-5 flex items-end gap-1 overflow-x-auto">
                  {TABS.map(({ id, label, icon: Icon }) => {
                    const active = tab === id
                    const badge =
                      id === 'history' && history.length
                        ? history.length
                        : id === 'chat' && liveCount
                          ? liveCount
                          : null
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl
                                    transition-colors cursor-pointer whitespace-nowrap ${
                                      active
                                        ? 'text-primary bg-[var(--color-bg)] border border-b-0 border-[var(--color-border)]'
                                        : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]'
                                    }`}
                      >
                        <Icon size={13} />
                        {label}
                        {badge != null && (
                          <span className={`min-w-4 h-4 px-1 rounded-full text-[9px] flex items-center justify-center ${
                            active ? 'bg-primary text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                          }`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-[var(--color-bg)]">
              {tab === 'chat' && (
                <div className="px-5 sm:px-7 py-5 space-y-3 min-h-full">
                  {!isConnected ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)]
                                    p-6 sm:p-8 text-center max-w-lg mx-auto my-6">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mb-4">
                        <Lock size={20} />
                      </div>
                      <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                        Connect to run this agent
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                        Browse features freely. Running audits, chat history, and purchases need a
                        connected wallet on.
                      </p>
                      <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => openWallet()}
                          className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                                     transition-colors cursor-pointer"
                        >
                          <Wallet size={14} /> Connect wallet
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab('features')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                                     border border-[var(--color-border)] bg-[var(--color-bg)]
                                     text-[var(--color-text-primary)] hover:border-primary transition-colors cursor-pointer"
                        >
                          <LayoutGrid size={14} /> See features
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  {turns.map((turn, i) =>
                    turn.role === 'divider' ? (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                        <span className="text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)]">
                          {turn.text}
                        </span>
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>
                    ) : (
                      <div
                        key={i}
                        className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} ${
                          turn.old ? 'opacity-65' : ''
                        }`}
                      >
                        <div
                          className={`max-w-[92%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            turn.role === 'user'
                              ? 'bg-[var(--color-accent-pink)] border border-[#d9c2f2] text-[var(--color-text-primary)]'
                              : turn.role === 'system'
                                ? 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
                                : 'bg-[var(--color-panel)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {turn.role === 'system' && turn.showLabel && (
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)] mb-1">
                              <CheckCircle2 size={10} /> Ready
                            </div>
                          )}
                          {turn.role === 'agent' && (
                            <div className="text-[10px] uppercase tracking-wide font-bold text-primary mb-1">
                              Agent
                            </div>
                          )}
                          {turn.text}
                          {turn.role === 'agent' &&
                            !turn.choicesUsed &&
                            (turn.choices?.length || turn.quickReplies?.length) && (
                              <ChoiceForm
                                choices={turn.choices}
                                quickReplies={turn.quickReplies}
                                composeTemplate={turn.composeTemplate}
                                disabled={busy}
                                onSend={sendChoice}
                              />
                            )}
                        </div>
                      </div>
                    ),
                  )}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] font-mono">
                      <Loader2 size={13} className="animate-spin text-primary" />
                      <span className="truncate">{phase || 'Running agent…'}</span>
                    </div>
                  )}

                  {report && <ReportCard report={report} agent={agent} />}
                  {comparison && <ComparisonCard comparison={comparison} />}

                  {error && !busy && (
                    <div className="flex items-start gap-2 text-xs text-[var(--color-danger)] bg-[rgba(193,73,73,0.07)]
                                    border border-[rgba(193,73,73,0.22)] rounded-xl px-3 py-2">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div ref={bottomRef} />
                    </>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div className="px-5 sm:px-7 py-5">
                  {!isConnected ? (
                    <div className="text-center py-14 px-4 max-w-sm mx-auto">
                      <p className="text-sm text-[var(--color-text-muted)] mb-4">
                        Connect your wallet to load saved conversations for this agent.
                      </p>
                      <button
                        type="button"
                        onClick={() => openWallet()}
                        className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Wallet size={14} /> Connect wallet
                      </button>
                    </div>
                  ) : (
                    <HistoryPanel
                      messages={history}
                      loading={historyLoading}
                      onJumpToChat={() => setTab('chat')}
                      onClearLocal={() => {
                        setTurns([
                          {
                            role: 'system',
                            showLabel: true,
                            text: 'Session view cleared. Saved history is still on the server — refresh History to see it.',
                          },
                        ])
                      }}
                    />
                  )}
                </div>
              )}

              {tab === 'features' && (
                <div className="px-5 sm:px-7 py-6 space-y-4">
                  {!isConnected && (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3.5 py-3
                                    flex flex-col sm:flex-row sm:items-center gap-3">
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">
                        Preview mode — explore what this agent does. Connect to run it or purchase access.
                      </p>
                      <button
                        type="button"
                        onClick={() => openWallet()}
                        className="btn-primary shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                   text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Wallet size={12} /> Connect
                      </button>
                    </div>
                  )}
                  <FeatureGrid caps={caps} />
                </div>
              )}
            </div>

            {/* Composer / gate CTA */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-panel)]">
              {!isConnected ? (
                <div className="rounded-2xl border border-[var(--color-border)]
                                bg-[var(--color-bg-secondary)]
                                p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[var(--color-text-primary)]">
                        Ready when you are
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        Connect your wallet to try this agent, or open the full page to purchase access.
                      </p>
                    </div>
                    <div className="flex flex-col xs:flex-row sm:flex-row gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openWallet()}
                        className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                                   transition-colors cursor-pointer"
                      >
                        <Wallet size={14} /> Connect wallet
                      </button>
                      <Link
                        to={`/agent/${agentId}`}
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                                   border border-[var(--color-border)] bg-[var(--color-bg)]
                                   text-[var(--color-text-primary)] hover:border-primary transition-colors"
                      >
                        <ShoppingCart size={14} /> Pricing & purchase
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {tab !== 'chat' && (
                <button
                  type="button"
                  onClick={() => setTab('chat')}
                  className="mb-2 text-[11px] font-semibold text-primary cursor-pointer hover:underline"
                >
                  ← Back to chat to run
                </button>
              )}
              {reportId && canChat && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-[10px] text-[var(--color-text-dim)]">
                    Follow-ups continue this run.
                  </span>
                  <button
                    type="button"
                    onClick={() => run({ forceNewRun: true })}
                    disabled={busy || !task.trim()}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary
                               disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:underline"
                    title={task.trim() ? 'Run this as a new task' : 'Type a task first'}
                  >
                    <Terminal size={10} /> Start a new run instead
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-[rgba(172,100,247,0.35)]
                              bg-[var(--color-bg)] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(172,100,247,0.12)]
                              transition-all px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onFocus={() => setTab('chat')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      run()
                    }
                  }}
                  placeholder={
                    reportId && canChat
                      ? (caps.multiRun
                          ? 'Ask about this result — or name another target for a fresh run'
                          : 'Ask a follow-up about this result')
                      : caps.inputHint
                  }
                  className="flex-1 resize-none bg-transparent border-0 outline-none text-sm
                             text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)]
                             max-h-28 py-2.5 px-1"
                />
                <button
                  type="button"
                  onClick={() => run()}
                  disabled={busy || !task.trim()}
                  className="btn-primary shrink-0 w-11 h-11 rounded-full
                             flex items-center justify-center disabled:opacity-40
                             transition-colors cursor-pointer"
                  aria-label="Run"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 px-1">
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  {freeRuns && freeRuns.remaining > 0 ? (
                    <>
                      <span className="text-primary font-semibold">
                        {freeRuns.remaining} of {freeRuns.allowance} free run(s) left
                      </span>
                      {' · '}
                    </>
                  ) : null}
                  Enter to send · Esc to close · History saves per wallet
                </span>
                <Link
                  to={`/agent/${agentId}`}
                  onClick={onClose}
                  className="sm:hidden text-[10px] font-semibold text-primary"
                >
                  Full page →
                </Link>
              </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
