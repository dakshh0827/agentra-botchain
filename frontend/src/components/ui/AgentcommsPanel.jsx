import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Network, Search, Zap, ArrowRight, CheckCircle,
  AlertCircle, Loader2, MessageCircle,
  Bot, Cpu, Activity
} from 'lucide-react'
import { formatUnits } from 'viem'
import { parseUnits } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { agentsAPI } from '../../api/agents'
import { CHAIN_CONFIG } from '../../config/chains.config'
import { MIN_PRIORITY_FEE_WEI, MAX_FEE_PER_GAS_WEI } from '../../config/custom-chains'
import RuntimeExecutionForm from '../execution/Runtimeexecutionform'
import OutputRenderer from './OutputRenderer'
import buildBinaryDownload from '../../utils/buildBinaryDownload'

const formatWeiToAgt = (weiValue) => {
  try {
    return Number(formatUnits(BigInt(weiValue || '0'), 18)).toFixed(4)
  } catch {
    return '0.0000'
  }
}

const extractReadableText = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload)
  if (Array.isArray(payload)) return payload.map(item => extractReadableText(item)).filter(Boolean).join('\n')

  if (payload?.isBinary && payload?.base64) return ''

  const candidates = [
    payload.message,
    payload.summary,
    payload.result,
    payload.output,
    payload.response,
    payload.answer,
    payload.text,
    payload.content,
    payload.data,
  ]

  for (const value of candidates) {
    const text = extractReadableText(value)
    if (text) return text
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return ''
  }

  // buildBinaryDownload is provided by ../../utils/buildBinaryDownload
}

// ── Agent Discovery Card ──────────────────────────────────────
function DiscoveryResult({ agent, onSelect, selected }) {
  return (
    <motion.div
     
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(agent)}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        selected?.agentId === agent.agentId
          ? 'border-primary-dark bg-[rgba(124,58,237,0.1)]'
          : 'border-border hover:border-border bg-bg-secondary'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-bg-secondary border border-border flex items-center justify-center shrink-0">
        <Bot size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm text-text-primary truncate">{agent.name}</div>
        <div className="text-xs font-mono text-text-dim flex items-center gap-2">
          <span className="text-primary">{agent.category}</span>
          <span>·</span>
          <span>{formatWeiToAgt(agent.commsPricePerCall)} token/call</span>
          <span>·</span>
          <span className="text-success">{agent.successRate}%</span>
        </div>
      </div>
      {selected?.agentId === agent.agentId && (
        <CheckCircle size={16} className="text-primary shrink-0" />
      )}
    </motion.div>
  )
}

// ── Result Renderer ───────────────────────────────────────────
function CallResultDisplay({ result }) {
  if (!result) return null
  const { targetAgent, sourceAgent, result: execResult, billing } = result
  // Support both object responses and stringified JSON responses that may include `isBinary`.
  let parsedBinary = null
  if (execResult?.response) {
    if (typeof execResult.response === 'string') {
      try {
        const parsed = JSON.parse(execResult.response)
        if (parsed && parsed.isBinary) parsedBinary = parsed
      } catch {
        parsedBinary = null
      }
    } else if (execResult.response.isBinary) {
      parsedBinary = execResult.response
    }
  }

  const binaryResponse = parsedBinary
  const [download, setDownload] = useState(null)

  useEffect(() => {
    if (!binaryResponse) {
      setDownload(null)
      return undefined
    }

    const nextDownload = buildBinaryDownload(binaryResponse)
    setDownload(nextDownload)

    return () => {
      if (nextDownload?.url) {
        URL.revokeObjectURL(nextDownload.url)
      }
    }
  }, [binaryResponse?.base64, binaryResponse?.filename, binaryResponse?.mimeType, binaryResponse?.size])

  const readableText = binaryResponse ? '' : extractReadableText(execResult?.response)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Chain visualization */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.2)]">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Cpu size={14} className="text-primary" />
          <span className="text-primary">{sourceAgent?.name || 'Source'}</span>
        </div>
        <ArrowRight size={16} className="text-text-dim shrink-0" />
        <div className="flex items-center gap-2 text-xs font-mono">
          <Bot size={14} className="text-success" />
          <span className="text-success">{targetAgent?.name}</span>
        </div>
        <span className="ml-auto text-xs font-mono text-text-dim">
          {execResult?.latency}ms
        </span>
      </div>

      {/* Response */}
      <div className="p-3 rounded-xl bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.2)]">
        <div className="text-xs font-mono text-text-dim mb-2">DELEGATION BILLING</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="rounded-lg p-2 bg-bg-secondary border border-border">
            <div className="text-text-dim text-xs">CHARGED</div>
            <div className="text-primary">{formatWeiToAgt(billing?.chargedWei)} token</div>
          </div>
          <div className="rounded-lg p-2 bg-bg-secondary border border-border">
            <div className="text-text-dim text-xs">CREATOR</div>
            <div className="text-success">{formatWeiToAgt(billing?.creatorAmountWei)} token</div>
          </div>
          <div className="rounded-lg p-2 bg-bg-secondary border border-border">
            <div className="text-text-dim text-xs">PLATFORM</div>
            <div className="text-text-secondary">{formatWeiToAgt(billing?.platformFeeWei)} token</div>
          </div>
        </div>
      </div>

      {readableText && (
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-border">
          <div className="text-xs font-mono text-text-dim mb-2">READABLE RESPONSE</div>
          <pre className="whitespace-pre-wrap wrap-break-word text-[12px] leading-relaxed text-text-secondary font-sans">{readableText}</pre>
        </div>
      )}

      {download && (
        <div className="p-3 rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.2)]">
          <div className="text-xs font-mono text-text-dim mb-2">DOWNLOADABLE FILE</div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">{download.filename}</div>
              <div className="text-xs font-mono text-text-dim">
                {download.mimeType}{download.size ? ` · ${download.size} bytes` : ''}
              </div>
            </div>
            <a
              href={download.url}
              download={download.filename}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-mono bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)] text-success hover:bg-[rgba(52,211,153,0.2)] transition-all cursor-pointer"
            >
              Download ZIP
            </a>
          </div>
        </div>
      )}

      {!binaryResponse && (
        <div className="p-3 rounded-xl bg-bg-secondary border border-border">
          <div className="text-xs font-mono text-text-dim mb-2">JSON RESPONSE</div>
          <OutputRenderer
            response={execResult?.response}
            agentName={targetAgent?.name}
            latency={execResult?.latency}
            success={execResult?.success}
          />
        </div>
      )}
    </motion.div>
  )
}

// ── Message History ───────────────────────────────────────────
function MessageHistory({ agentId }) {
  const [messages, setMessages] = useState(null)
  const [loading, setLoading] = useState(true)
 
  useEffect(() => {
    agentsAPI.getCommsMessages(agentId)
      .then(r => setMessages(r.data))
      .catch(() => setMessages(null))
      .finally(() => setLoading(false))
  }, [agentId])
 
  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={20} className="animate-spin text-primary" />
    </div>
  )
 
  if (!messages) return null
 
  const allMessages = [...(messages.sent || []), ...(messages.received || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
 
  if (allMessages.length === 0) return (
    <div className="text-center py-8">
      <MessageCircle size={28} className="mx-auto mb-2 text-text-dim opacity-20" />
      <div className="text-text-dim text-xs font-mono">No inter-agent messages yet</div>
    </div>
  )
 
  return (
    <div className="space-y-2">
      {allMessages.map(msg => {
        const isSent = msg.fromAgentId === messages.agentId
        const statusClass =
          msg.status === 'success'
            ? 'text-success bg-[rgba(52,211,153,0.1)]'
            : msg.status === 'failed'
            ? 'text-danger bg-[rgba(248,113,113,0.1)]'
            : msg.status === 'pending'
            ? 'text-warning bg-[rgba(251,191,36,0.1)]'
            : 'text-text-dim'
 
        return (
          <div key={msg.id} className={`p-3 rounded-lg border text-xs ${
            isSent
              ? 'border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)]'
              : 'border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.04)]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold ${isSent ? 'text-primary' : 'text-success'}`}>
                {isSent ? '→ SENT TO' : '← RECEIVED FROM'}
              </span>
              <span className="font-semibold text-xs text-text-dim">
                {isSent ? msg.toAgentId : msg.fromAgentId}
              </span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-mono ${statusClass}`}>
                {msg.status}
              </span>
            </div>
            <p className="text-text-muted truncate">{msg.task}</p>
            {msg.latency && <span className="text-xs font-mono text-text-dim">{msg.latency}ms</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Main AgentCommsPanel ──────────────────────────────────────
export default function AgentCommsPanel({ agentId, agentName, isOwner = false, commsEnabled = false, commsPricePerCall = '0', onCommsConfigSaved }) {
  const { isConnected, chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [tab, setTab] = useState('call') // 'call' | 'history'
  const [mode, setMode] = useState('manual') // 'manual' | 'discover'
  const [task, setTask] = useState('')
  const [manualAgents, setManualAgents] = useState([])
  const [manualAgentsLoading, setManualAgentsLoading] = useState(false)
  const [discoveryResults, setDiscoveryResults] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedAgentLoading, setSelectedAgentLoading] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [calling, setCalling] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [commsPending, setCommsPending] = useState(false)
  const [commsTxHash, setCommsTxHash] = useState(null)
  const [ownerCommsEnabled, setOwnerCommsEnabled] = useState(commsEnabled)
  const [ownerCommsPrice, setOwnerCommsPrice] = useState(formatWeiToAgt(commsPricePerCall || '0'))
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    setOwnerCommsEnabled(commsEnabled)
    setOwnerCommsPrice(formatWeiToAgt(commsPricePerCall || '0'))
  }, [commsEnabled, commsPricePerCall])

  useEffect(() => {
    if (mode !== 'manual') return

    let cancelled = false

    const loadManualAgents = async () => {
      setManualAgentsLoading(true)
      try {
        const res = await agentsAPI.getAll({ limit: 100, status: 'all', sortBy: 'newest' })
        const agents = (res.data?.agents || res.data || []).filter((agent) => agent.agentId !== agentId)
        if (!cancelled) {
          setManualAgents(agents)
        }
      } catch {
        if (!cancelled) {
          setManualAgents([])
        }
      } finally {
        if (!cancelled) {
          setManualAgentsLoading(false)
        }
      }
    }

    loadManualAgents()

    return () => {
      cancelled = true
    }
  }, [mode, agentId])

  const handleSaveCommsConfig = async () => {
    if (savingConfig) return

    if (ownerCommsEnabled && (!ownerCommsPrice || Number(ownerCommsPrice) <= 0)) {
      setError('Comms price must be greater than 0 token when enabled')
      return
    }

    setSavingConfig(true)
    setError(null)

    try {
      await agentsAPI.update(agentId, {
        commsEnabled: ownerCommsEnabled,
        commsPricePerCall: ownerCommsEnabled
          ? parseUnits(ownerCommsPrice, 18).toString()
          : '0',
      })

      onCommsConfigSaved?.()
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save comms settings')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleDiscover = async () => {
    if (!task.trim()) return
    setDiscovering(true)
    setError(null)
    try {
      const res = await agentsAPI.discoverForComms(task, agentId)
      setDiscoveryResults(res.data.agents || [])
    } catch (e) {
      setError('Discovery failed')
    } finally {
      setDiscovering(false)
    }
  }

  const loadSelectedTarget = async (target) => {
    if (!target?.agentId) return
    setSelectedAgentLoading(true)
    setError(null)
    try {
      const res = await agentsAPI.getById(target.agentId)
      setSelectedAgent(res.data)
      setDiscoveryResults([])
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load target agent details')
      setSelectedAgent(null)
    } finally {
      setSelectedAgentLoading(false)
    }
  }

  const handleLoadManualTarget = async () => {
    return null
  }

  const handleCall = async ({ task: runtimeTask, runtimePayload }) => {
  const activeTask = runtimeTask || task
  if (!activeTask.trim() || calling) return
  setCalling(true)
  setResult(null)
  setError(null)

  try {
    const contracts = chain?.id ? CHAIN_CONFIG[chain.id]?.contracts : null

    let target = selectedAgent
    if (!target?.name && mode === 'discover') {
      const discovery = await agentsAPI.discoverForComms(activeTask, agentId)
      const first = discovery.data?.agents?.[0]
      if (!first) throw new Error('No comms-enabled target found for this task')
      await loadSelectedTarget(first)
      target = first
    }

    if (!target?.name) throw new Error('Select a target agent first')
    if (target.status && target.status !== 'active') throw new Error('Target agent is not active')

    const rawPrice = BigInt(target.commsPricePerCall || '0')
    const shouldCharge = rawPrice > 0n

    let txHash = undefined
    if (shouldCharge) {
      if (!contracts?.Agentra) throw new Error('Smart contract not found for current network')

      // Get source agent contractAgentId
      const sourceRes = await agentsAPI.getCommsTarget({ targetAgentId: agentId })
      const source = sourceRes.data
      if (!source?.contractAgentId) throw new Error('Source agent is not registered on-chain')
      if (!target.contractAgentId) throw new Error('Target agent is not registered on-chain')

      const commsPriceUSDResult = await publicClient.readContract({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'agents',
        args: [BigInt(target.contractAgentId)],
      })
      const commsPriceUSD = commsPriceUSDResult[3]
      const requiredWei = await publicClient.readContract({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'getRequiredWei',
        args: [commsPriceUSD],
      })

      const buffered = requiredWei + (requiredWei * 2n) / 100n

      setCommsPending(true)
      const commsTx = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'initiateAgentComms',
        args: [BigInt(source.contractAgentId), BigInt(target.contractAgentId)],
        value: buffered,
        maxPriorityFeePerGas: MIN_PRIORITY_FEE_WEI,
        maxFeePerGas: MAX_FEE_PER_GAS_WEI,
      })
      txHash = commsTx

      setCommsTxHash(commsTx)
      setCommsPending(false)
    }

    const payloadBase = {
      task: activeTask,
      targetAgentName: target.name,
      targetAgentId: target.agentId,
      ...(txHash ? { txHash } : {}),
    }

    let res
    if (runtimePayload && Object.keys(runtimePayload.files || {}).length > 0) {
      const formData = new FormData()
      formData.append('task', activeTask)
      formData.append('targetAgentName', target.name)
      formData.append('targetAgentId', target.agentId)
      if (txHash) formData.append('txHash', txHash)
      formData.append('runtimePayload', JSON.stringify({
        headers: runtimePayload.headers,
        body: runtimePayload.body,
        contentType: runtimePayload.contentType,
        method: runtimePayload.method,
      }))
      for (const [key, file] of Object.entries(runtimePayload.files || {})) {
        if (file) formData.append(key, file)
      }
      res = await agentsAPI.callAgentMultipart(agentId, formData)
    } else if (runtimePayload) {
      res = await agentsAPI.callAgent(agentId, {
        ...payloadBase,
        runtimePayload,
      })
    } else {
      res = await agentsAPI.callAgent(agentId, payloadBase)
    }
    setResult(res.data)

    // The transaction has already been broadcast; do not keep the UI stuck
    // waiting for resolver/settlement while the delegated agent runs.
    setCommsPending(false)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Call failed')
      setCommsPending(false) // ✅ prevent stuck pending UI
    } finally {
      setCalling(false)
    }
}

  if (!isConnected) return (
    <div className="glass-card-landing rounded-xl p-6 text-center">
      <Network size={28} className="mx-auto mb-2 text-text-dim opacity-30" />
      <p className="text-text-muted text-sm font-mono">Connect wallet to use agent-to-agent communication</p>
    </div>
  )

  return (
    <div className="glass-card-landing rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'call', label: 'CALL AGENT', icon: Network },
          { id: 'history', label: 'MESSAGE LOG', icon: Activity },
        ].map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 font-semibold text-sm  border-b-2 transition-all cursor-pointer ${
                tab === t.id
                  ? 'border-primary text-primary bg-[rgba(124,58,237,0.05)]'
                  : 'border-transparent text-text-dim hover:text-text-secondary'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">
        {tab === 'call' && (
          <div className="space-y-5">
            {isOwner && (
              <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
                <div className="text-sm font-mono text-primary">OWNER COMMS SETTINGS</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-text-dim">Enable agent-to-agent delegation</span>
                  <button
                    onClick={() => setOwnerCommsEnabled(!ownerCommsEnabled)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-mono cursor-pointer ${
                      ownerCommsEnabled
                        ? 'border-success text-success bg-[rgba(52,211,153,0.1)]'
                        : 'border-border text-text-dim'
                    }`}
                  >
                    {ownerCommsEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                {ownerCommsEnabled && (
                  <div>
                    <label className="text-xs font-mono text-text-dim uppercase block mb-2">PRICE PER CALL (TOKEN)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={ownerCommsPrice}
                      onChange={(e) => setOwnerCommsPrice(e.target.value)}
                      className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                )}
                <button
                  onClick={handleSaveCommsConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-lg text-sm font-mono border border-primary-dark text-primary bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.16)] disabled:opacity-50 cursor-pointer"
                >
                  {savingConfig ? 'SAVING...' : 'SAVE COMMS CONFIG'}
                </button>
              </div>
            )}

            <div>
              <p className="text-text-muted text-xs leading-relaxed mb-4">
                <strong className="text-primary">{agentName}</strong> can delegate tasks to other agents on the marketplace.
                Select a target agent to load its execution schema, then submit the delegated request.
              </p>

              {/* Mode selector */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'manual', label: 'MANUAL TARGET' },
                  { id: 'discover', label: 'AUTO-DISCOVER' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setSelectedAgent(null); setDiscoveryResults([]) }}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm border transition-all cursor-pointer ${
                      mode === m.id
                        ? 'border-primary-dark bg-[rgba(124,58,237,0.1)] text-primary'
                        : 'border-border text-text-dim hover:border-border'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Manual: target agent ID input */}
              {mode === 'manual' && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-mono text-text-dim uppercase">Choose a target agent</div>
                    {manualAgentsLoading && (
                      <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
                        <Loader2 size={12} className="animate-spin" /> Loading agents...
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {manualAgents.map(agent => (
                      <DiscoveryResult
                        key={agent.agentId}
                        agent={agent}
                        selected={selectedAgent}
                        onSelect={(picked) => {
                          setSelectedAgent(picked)
                          setDiscoveryResults([])
                          setError(null)
                          setResult(null)
                        }}
                      />
                    ))}
                    {!manualAgentsLoading && manualAgents.length === 0 && (
                      <div className="text-xs font-mono text-text-dim p-3 rounded-lg border border-border bg-bg-secondary">
                        No other agents found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discover: search and results */}
              {mode === 'discover' && (
                <div className="mb-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleDiscover}
                      disabled={!task.trim() || discovering}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.06)] text-primary font-semibold text-base disabled:opacity-40 hover:bg-[rgba(124,58,237,0.12)] transition-all cursor-pointer"
                    >
                      {discovering ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      FIND AGENTS
                    </button>
                    {selectedAgent && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.25)] text-success font-semibold text-base">
                        <CheckCircle size={13} />
                        {selectedAgent.name}
                        <button onClick={() => { setSelectedAgent(null) }} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer">×</button>
                      </div>
                    )}
                  </div>

                  {discoveryResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {discoveryResults.map(agent => (
                        <DiscoveryResult
                          key={agent.agentId}
                          agent={agent}
                          selected={selectedAgent}
                          onSelect={async (selected) => {
                            setSelectedAgent(selected)
                            await loadSelectedTarget(selected)
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedAgent && selectedAgent.executionConfig && (
                <div className="mb-4 rounded-xl border border-border bg-bg-secondary p-4 space-y-2">
                  <div className="text-xs font-mono text-text-dim uppercase">TARGET READY</div>
                  <div className="text-sm font-semibold text-text-primary">{selectedAgent.name}</div>
                  <div className="text-xs text-text-dim font-mono">
                    Body and header fields are loaded from this agent&apos;s execution schema.
                  </div>
                </div>
              )}

              {selectedAgent?.executionConfig ? (
                <RuntimeExecutionForm
                  execConfig={selectedAgent.executionConfig}
                  task={task}
                  onTaskChange={setTask}
                  onSubmit={handleCall}
                  isExecuting={calling}
                  isConnected={isConnected}
                />
              ) : selectedAgentLoading ? (
                <div className="flex items-center gap-2 text-xs font-mono text-text-dim p-3 rounded-lg border border-border bg-bg-secondary">
                  <Loader2 size={13} className="animate-spin" /> Loading target schema...
                </div>
              ) : (
                <div className="text-xs font-mono text-text-dim p-3 rounded-lg border border-border bg-bg-secondary">
                  Select a target agent to load its execution schema before delegating.
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-danger text-xs p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] mb-4">
                  <AlertCircle size={13} /> {error}
                </div>
              )}
            </div>

            {/* Pending indicator */}
            {commsPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.25)]"
              >
                <Loader2 size={16} className="animate-spin text-warning shrink-0" />
                <div>
                  <div className="text-xs font-bold text-warning">COMMS TX PENDING</div>
                  <div className="text-xs font-mono text-text-dim">
                    Payment submitted — dispatching agent call...
                    {commsTxHash && <span className="ml-1 opacity-60">{commsTxHash.slice(0, 14)}...</span>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {result && <CallResultDisplay result={result} />}
          </div>
        )}

        {tab === 'history' && <MessageHistory agentId={agentId} />}
      </div>
    </div>
  )
}


