import React, { useState, useEffect, useRef, useCallback } from 'react'
import AgentAvatar from '../components/ui/AgentAvatar'
import { useParams, Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import {
  ArrowLeft, Zap, Star, Activity, TrendingUp,
  Shield, Send, ThumbsUp,
  ExternalLink, Copy, CheckCircle, Terminal, Download,
  Gauge, Sparkles, MessageSquare, Network, AlertCircle,
  Lock, ShoppingCart, Loader2, DollarSign
} from 'lucide-react'
import NeonButton from '../components/ui/NeonButton'
import MetricBadge from '../components/ui/MetricBadge'
import LoadingPulse from '../components/ui/LoadingPulse'
import ReviewSection from '../components/ui/ReviewSection'
import AgentCommsPanel from '../components/ui/AgentcommsPanel'
import OutputRenderer from '../components/ui/OutputRenderer'
import { useInteractionStore } from '../stores/interactionStore'
import RuntimeExecutionForm from '../components/execution/Runtimeexecutionform'
import RunLocallyPanel from '../components/execution/RunLocallyPanel'
import { agentsAPI } from '../api/agents'
import { CHAIN_CONFIG } from '../config/chains.config'
import { getAgentExternalId } from '../utils/helpers'
import buildBinaryDownload from '../utils/buildBinaryDownload'

function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}>
      {children}
    </motion.div>
  )
}

const TABS = [
  { id: 'execute', label: 'EXECUTE', icon: Terminal },
  { id: 'local', label: 'RUN LOCALLY', icon: Download },
  { id: 'comms', label: 'AGENT COMMS', icon: Network },
  { id: 'reviews', label: 'REVIEWS', icon: MessageSquare },
]

// ─────────────────────────────────────────────────────────────
// PURCHASE PANELS
// ─────────────────────────────────────────────────────────────

function DbPurchasePanel({ agent, onSuccess, pendingTx }) {
  const { chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseType, setPurchaseType] = useState('monthly') // monthly | yearly
  const [error, setError] = useState('')
  const contracts = chain?.id ? CHAIN_CONFIG[chain.id]?.contracts : null

  const [requiredWei, setRequiredWei] = useState({ monthly: 0n, yearly: 0n })
  const [priceLoading, setPriceLoading] = useState(false)

  useEffect(() => {
    if (!contracts?.Agentra?.address || !agent.contractAgentId) return
    setPriceLoading(true)

    ;(async () => {
      try {
        const agentInfo = await publicClient.readContract({
          address: contracts.Agentra.address,
          abi: contracts.Agentra.abi,
          functionName: 'agents',
          args: [BigInt(agent.contractAgentId)],
        })

        const monthlyPriceUSD = agentInfo[1]
        const yearlyPriceUSD = monthlyPriceUSD * 12n

        const [weiMonthly, weiYearly] = await Promise.all([
          publicClient.readContract({
            address: contracts.Agentra.address,
            abi: contracts.Agentra.abi,
            functionName: 'getRequiredWei',
            args: [monthlyPriceUSD],
          }),
          publicClient.readContract({
            address: contracts.Agentra.address,
            abi: contracts.Agentra.abi,
            functionName: 'getRequiredWei',
            args: [yearlyPriceUSD],
          }),
        ])

        setRequiredWei({ monthly: weiMonthly, yearly: weiYearly })
      } catch (e) {
        console.error('Price fetch failed', e)
      } finally {
        setPriceLoading(false)
      }
    })()
  }, [contracts?.Agentra?.address, contracts?.Agentra?.abi, agent.contractAgentId, publicClient])

  const monthlyEth = parseFloat(formatUnits(requiredWei.monthly ?? 0n, 18)).toFixed(6)
  const yearlyEth = parseFloat(formatUnits(requiredWei.yearly ?? 0n, 18)).toFixed(6)

  const handlePurchase = async () => {
    if (agent.contractAgentId == null) {
      setError('This agent is not registered on-chain yet — purchase is unavailable until deploy is confirmed.')
      return
    }
    if (!contracts?.Agentra) { setError('Smart contracts not found for current network'); return }
    if (!publicClient) { setError('Wallet client unavailable'); return }

    setIsPurchasing(true)
    setError('')

    try {
      const isYearly = purchaseType === 'yearly'
      const baseWei = isYearly ? requiredWei.yearly : requiredWei.monthly
      if (!baseWei || baseWei === 0n) {
        setError('On-chain price could not be loaded for this agent.')
        return
      }
      const buffered = baseWei + (baseWei * 2n) / 100n
      const period = isYearly ? 1 : 0

      const txHash = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'purchaseAccess',
        args: [BigInt(agent.contractAgentId), period],
        value: buffered,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      await agentsAPI.purchaseAccess(
        getAgentExternalId(agent),
        false, // ❗ always false now (no lifetime)
        receipt.transactionHash
      )

      onSuccess()
    } catch (e) {
      setError(e?.shortMessage || e?.response?.data?.error || e.message || 'Purchase failed')
    } finally {
      setIsPurchasing(false)
    }
  }

  const notOnChain = agent.contractAgentId == null

  return <PurchasePanelUI
    purchaseType={purchaseType}
    setPurchaseType={setPurchaseType}
    monthlyEth={priceLoading ? '...' : monthlyEth}
    yearlyEth={priceLoading ? '...' : yearlyEth}
    onPurchase={handlePurchase}
    isPurchasing={isPurchasing}
    pendingTx={pendingTx}
    error={error || (notOnChain ? 'Agent not registered on-chain — confirm deploy first (missing contractAgentId).' : '')}
    currency="0G"
    purchaseDisabled={notOnChain}
  />
}

function BlockchainPurchasePanel({ agent, onSuccess, pendingTx }) {
  const { chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseType, setPurchaseType] = useState('monthly') // monthly | yearly
  const [error, setError] = useState('')
  const contracts = chain?.id ? CHAIN_CONFIG[chain.id]?.contracts : null

  const [requiredWei, setRequiredWei] = useState({ monthly: 0n, yearly: 0n })
  const [priceLoading, setPriceLoading] = useState(false)

  useEffect(() => {
    if (!contracts?.Agentra?.address || !agent.contractAgentId) return
    setPriceLoading(true)

    ;(async () => {
      try {
        const agentInfo = await publicClient.readContract({
          address: contracts.Agentra.address,
          abi: contracts.Agentra.abi,
          functionName: 'agents',
          args: [BigInt(agent.contractAgentId)],
        })

        const monthlyPriceUSD = agentInfo[1]
        const yearlyPriceUSD = monthlyPriceUSD * 12n

        const [weiMonthly, weiYearly] = await Promise.all([
          publicClient.readContract({
            address: contracts.Agentra.address,
            abi: contracts.Agentra.abi,
            functionName: 'getRequiredWei',
            args: [monthlyPriceUSD],
          }),
          publicClient.readContract({
            address: contracts.Agentra.address,
            abi: contracts.Agentra.abi,
            functionName: 'getRequiredWei',
            args: [yearlyPriceUSD],
          }),
        ])

        setRequiredWei({ monthly: weiMonthly, yearly: weiYearly })
      } catch (e) {
        console.error('Price fetch failed', e)
      } finally {
        setPriceLoading(false)
      }
    })()
  }, [contracts?.Agentra?.address, contracts?.Agentra?.abi, agent.contractAgentId, publicClient])

  const monthlyEth = parseFloat(formatUnits(requiredWei.monthly ?? 0n, 18)).toFixed(6)
  const yearlyEth = parseFloat(formatUnits(requiredWei.yearly ?? 0n, 18)).toFixed(6)

  const handlePurchase = async () => {
    if (!contracts?.Agentra) { setError('Smart contracts not found'); return }
    if (!agent.contractAgentId) { setError('Agent not registered on-chain'); return }

    setIsPurchasing(true)
    setError('')

    try {
      const isYearly = purchaseType === 'yearly'
      const baseWei = isYearly ? requiredWei.yearly : requiredWei.monthly
      const buffered = baseWei + (baseWei * 2n) / 100n
      const period = isYearly ? 1 : 0

      const txHash = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'purchaseAccess',
        args: [BigInt(agent.contractAgentId), period],
        value: buffered,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      await agentsAPI.purchaseAccess(
        getAgentExternalId(agent),
        false, // ❗ always false now
        receipt.transactionHash
      )

      onSuccess()
    } catch (e) {
      setError(e?.shortMessage || e?.response?.data?.error || e.message || 'Transaction failed')
    } finally {
      setIsPurchasing(false)
    }
  }

  return <PurchasePanelUI
    purchaseType={purchaseType}
    setPurchaseType={setPurchaseType}
    monthlyEth={priceLoading ? '...' : monthlyEth}
    yearlyEth={priceLoading ? '...' : yearlyEth}
    onPurchase={handlePurchase}
    isPurchasing={isPurchasing}
    pendingTx={pendingTx}
    error={error}
    currency="0G"
  />
}

function PurchasePanelUI({ purchaseType, setPurchaseType, monthlyEth, yearlyEth, onPurchase, isPurchasing, error, pendingTx, purchaseDisabled = false }) {
  const { isConnected } = useAccount()
  const cannotBuy = !isConnected || purchaseDisabled
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-6">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center mb-6">
        <Lock size={32} className="text-[var(--color-primary)]" />
      </div>
      <h2 className="font-display font-bold text-2xl text-[var(--color-text-primary)] mb-2">ACCESS REQUIRED</h2>
      <p className="text-[var(--color-text-muted)] text-sm max-w-sm mb-4">
        Purchase a license to unlock. 80% goes to creator, 20% to platform.
      </p>

      {/* Pending escrow badge */}
      {pendingTx && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)]"
        >
          <Loader2 size={14} className="animate-spin text-[var(--color-warning)] shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-[var(--color-warning)]">ESCROW PENDING</div>
            <div className="text-xs text-[var(--color-text-dim)] font-mono">
              Payment submitted — resolver confirming... Timeout refund available in {pendingTx.hoursUntilRefund}h
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full mb-6">
        {[
          { id: 'monthly', label: '30 DAYS', price: monthlyEth, period: 0, color: 'purple' },
          { id: 'yearly', label: '365 DAYS', price: yearlyEth, period: 1, color: 'success' },
        ].map(opt => (
          <motion.button key={opt.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPurchaseType(opt.id)}
            className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${purchaseType === opt.id ? opt.color === 'purple' ? 'bg-[rgba(124,58,237,0.15)] border-[var(--color-primary)]' : 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)]' : 'border-[var(--color-border)] bg-black/20'}`}>
            <div className="text-sm font-mono text-[var(--color-text-dim)] mb-2">{opt.label}</div>
            <div className={`text-xl font-bold font-display ${opt.color === 'purple' ? 'text-[var(--color-primary)]' : 'text-[var(--color-success)]'}`}>
              {opt.price} <span className="text-xs">0G</span>
            </div>
          </motion.button>
        ))}
      </div>
      {error && <div className="flex items-center gap-2 text-[var(--color-danger)] text-xs p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] mb-4 w-full text-left"><AlertCircle size={13} className="shrink-0" /> {error}</div>}
      <NeonButton icon={ShoppingCart} onClick={onPurchase} loading={isPurchasing} disabled={cannotBuy} className="w-full justify-center">
        {!isConnected
          ? 'CONNECT WALLET'
          : purchaseDisabled
            ? 'ON-CHAIN DEPLOY REQUIRED'
            : isPurchasing
              ? 'AWAITING WALLET...'
              : `PURCHASE ${purchaseType === 'monthly' ? 'MONTHLY' : 'YEARLY'} ACCESS`}
      </NeonButton>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// UPVOTE BUTTON
// ─────────────────────────────────────────────────────────────

function UpvoteButton({ agentId, ownerWallet, initialUpvotes, walletAddress, isConnected }) {
  // New contract has no upvote() function — track upvotes DB-only
  // Still require wallet connection but no on-chain tx needed
  const [hasUpvoted, setHasUpvoted] = useState(false)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [upvoteCount, setUpvoteCount] = useState(initialUpvotes || 0)
  const [error, setError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const isOwner = !!(walletAddress && ownerWallet && walletAddress.toLowerCase() === ownerWallet.toLowerCase())

  useEffect(() => {
    if (!walletAddress || !agentId) { setHasUpvoted(false); return }
    let cancelled = false
    setStatusLoading(true)
    agentsAPI.checkUpvoteStatus(agentId)
      .then(r => { if (!cancelled) setHasUpvoted(r.data.hasUpvoted) })
      .catch(() => { if (!cancelled) setHasUpvoted(false) })
      .finally(() => { if (!cancelled) setStatusLoading(false) })
    return () => { cancelled = true }
  }, [agentId, walletAddress])

  const handleUpvote = async () => {
    if (!isConnected || isOwner || hasUpvoted || isUpvoting) return
    setIsUpvoting(true)
    setError('')
    try {
      // DB-only upvote — no on-chain tx required in new contract
      await agentsAPI.upvote(agentId, null)
      setHasUpvoted(true)
      setUpvoteCount(prev => prev + 1)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Upvote failed')
    } finally {
      setIsUpvoting(false)
    }
  }

  return (
    <div className="glass-card-landing rounded-xl p-5 sm:p-6">
      <h3 className="font-semibold text-sm text-[var(--color-text-dim)] uppercase mb-3">UPVOTE AGENT</h3>
      <p className="text-xs font-mono text-[var(--color-text-dim)] mb-3 leading-relaxed">
        * Support this agent by upvoting.
      </p>
      {error && (
        <div className="flex items-center gap-2 text-[var(--color-danger)] text-xs p-2 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] mb-3">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}
      <motion.button
        whileHover={!hasUpvoted && !isOwner && isConnected ? { scale: 1.02 } : {}}
        whileTap={!hasUpvoted && !isOwner && isConnected ? { scale: 0.98 } : {}}
        onClick={handleUpvote}
        disabled={isUpvoting || hasUpvoted || isOwner || !isConnected || statusLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-mono text-xs cursor-pointer disabled:cursor-not-allowed ${
          hasUpvoted
            ? 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)] text-[var(--color-success)]'
            : isOwner
            ? 'border-[var(--color-border)] text-[var(--color-text-dim)] opacity-40'
            : !isConnected
            ? 'border-[var(--color-border)] text-[var(--color-text-dim)] opacity-40'
            : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[rgba(52,211,153,0.4)] hover:text-[var(--color-success)]'
        }`}>
        {statusLoading
          ? <><Loader2 size={15} className="animate-spin" /> CHECKING...</>
          : isUpvoting
          ? <><Loader2 size={15} className="animate-spin" /> UPVOTING...</>
          : hasUpvoted
          ? <><CheckCircle size={15} /> UPVOTED ({upvoteCount})</>
          : <><ThumbsUp size={15} /> UPVOTE ({upvoteCount})</>
        }
      </motion.button>
      {isOwner && <p className="text-xs font-mono text-[var(--color-text-dim)] text-center mt-2">You own this agent — cannot upvote</p>}
      {!isConnected && !isOwner && <p className="text-xs font-mono text-[var(--color-text-dim)] text-center mt-2">Connect wallet to upvote</p>}
    </div>
  )
}

function EndpointEditor({ agent, onRefresh }) {
  const agentKey = getAgentExternalId(agent)
  const [endpoint, setEndpoint] = useState(agent?.endpoint || '')
  const [saving, setSaving] = useState(false)
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [probeNote, setProbeNote] = useState('')

  useEffect(() => {
    setEndpoint(agent?.endpoint || '')
  }, [agent?.endpoint])

  const cleanEndpoint = (raw) => {
    const trimmed = (raw || '').trim().replace(/\/+$/, '')
    if (!trimmed) return { error: 'Endpoint is required' }
    let url
    try {
      url = new URL(trimmed)
    } catch {
      return { error: 'Not a valid URL' }
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { error: 'Endpoint must start with http:// or https://' }
    }
    if (/\/(execute|apply)\/?$/i.test(url.pathname)) {
      return { error: 'Drop /execute or /apply — Agentra appends that itself.' }
    }
    return { value: trimmed }
  }

  const handleProbe = async () => {
    const checked = cleanEndpoint(endpoint)
    if (checked.error) {
      setError(checked.error)
      setProbeNote('')
      return
    }
    setProbing(true)
    setError('')
    setProbeNote('')
    try {
      const res = await agentsAPI.validateEndpoint(checked.value)
      if (res.data?.valid) {
        setProbeNote(`Reachable — ${res.data.url || checked.value} answered ${res.data.status}`)
      } else {
        setProbeNote(res.data?.error || 'Endpoint unreachable (service may be asleep)')
      }
    } catch (e) {
      setProbeNote(e?.response?.data?.error || e?.message || 'Probe failed')
    } finally {
      setProbing(false)
    }
  }

  const handleSave = async ({ force = false } = {}) => {
    const checked = cleanEndpoint(endpoint)
    if (checked.error) {
      setError(checked.error)
      setSuccess('')
      return
    }
    if (checked.value === (agent?.endpoint || '').replace(/\/+$/, '')) {
      setSuccess('Already pointing at this URL')
      setError('')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (!force) {
        const probe = await agentsAPI.validateEndpoint(checked.value)
        if (!probe.data?.valid) {
          setError(
            `${probe.data?.error || 'Unreachable'}. Fix the URL, or save anyway if the service is still waking up.`,
          )
          setSaving(false)
          return
        }
        setProbeNote(`Reachable — ${probe.data.url || checked.value} answered ${probe.data.status}`)
      }

      await agentsAPI.update(agentKey, { endpoint: checked.value })
      setSuccess('Endpoint updated')
      onRefresh?.()
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="text-xs font-mono text-[var(--color-text-dim)] uppercase">Agent endpoint</div>
      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
        Public base URL of the running agent (no trailing <span className="font-mono">/execute</span>).
        Report downloads are served from this host.
      </p>
      <input
        type="url"
        value={endpoint}
        onChange={(e) => {
          setEndpoint(e.target.value)
          setError('')
          setSuccess('')
        }}
        placeholder="https://your-agent.example.com"
        className="input-field w-full px-3 py-2 rounded-lg text-sm font-mono"
      />
      {probeNote && (
        <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">{probeNote}</p>
      )}
      {error && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-[var(--color-danger)] text-xs p-2 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
            <AlertCircle size={12} className="shrink-0 mt-0.5" /> {error}
          </div>
          {/unreachable|asleep|waking|Could not reach|timed out/i.test(error) && (
            <button
              type="button"
              onClick={() => handleSave({ force: true })}
              disabled={saving}
              className="text-[11px] font-mono text-amber-300/90 underline underline-offset-2 cursor-pointer disabled:opacity-40"
            >
              Save anyway
            </button>
          )}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-[var(--color-success)] text-xs p-2 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
          <CheckCircle size={12} className="shrink-0" /> {success}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleProbe}
          disabled={probing || saving || !endpoint.trim()}
          className="flex-1 min-w-28 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--color-border)]
                     text-[var(--color-text-secondary)] text-xs font-mono hover:border-primary hover:text-primary
                     disabled:opacity-40 transition-all cursor-pointer"
        >
          {probing ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
          {probing ? 'CHECKING…' : 'TEST HEALTH'}
        </button>
        <button
          type="button"
          onClick={() => handleSave({ force: false })}
          disabled={saving || probing || !endpoint.trim()}
          className="flex-1 min-w-28 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--color-primary)]
                     text-[var(--color-primary)] text-xs font-mono hover:bg-[rgba(124,58,237,0.1)]
                     disabled:opacity-40 transition-all cursor-pointer"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
          {saving ? 'SAVING…' : 'SAVE ENDPOINT'}
        </button>
      </div>
    </div>
  )
}

function OwnerControlsPanel({ agent, contracts, publicClient, writeContractAsync, onRefresh }) {
  const [monthlyUSD, setMonthlyUSD] = useState('')
  const [commsUSD, setCommsUSD] = useState('')
  const [commsEnabled, setCommsEnabled] = useState(agent?.commsEnabled ?? false)
  const [saving, setSaving] = useState(false)
  const [savingComms, setSavingComms] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setCommsEnabled(agent?.commsEnabled ?? false)
  }, [agent?.commsEnabled])

  if (!agent?.contractAgentId) {
    return (
      <div className="glass-card-landing rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-[var(--color-text-dim)] uppercase flex items-center gap-2">
          <Shield size={13} className="text-[var(--color-primary)]" /> Owner Controls
        </h3>
        <p className="text-xs text-[var(--color-text-dim)] font-mono">
          Database-only agent — endpoint updates here; on-chain pricing is not available.
        </p>
        <EndpointEditor agent={agent} onRefresh={onRefresh} />
      </div>
    )
  }
 
  const handleUpdatePricing = async () => {
    if (!contracts?.Agentra || !monthlyUSD) return
    setSaving(true); setError(''); setSuccess('')

    try {
      const newMonthlyUSD = parseUnits(monthlyUSD, 18)
      const newCommsUSD = commsUSD ? parseUnits(commsUSD, 18) : 0n

      const txHash = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'updateAgentPricing',
        args: [BigInt(agent.contractAgentId), newMonthlyUSD, newCommsUSD],
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      // ✅ STATIC import usage
      await agentsAPI.update(agent.agentId, {
        pricing: parseUnits(monthlyUSD, 18).toString(),
        commsPricePerCall: commsUSD
          ? parseUnits(commsUSD, 18).toString()
          : agent.commsPricePerCall,
      })

      setSuccess('Pricing updated on-chain ✓')
      onRefresh?.()
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }
 
  const handleToggleComms = async () => {
    if (!contracts?.Agentra) return
    setSavingComms(true); setError(''); setSuccess('')
    try {
      const newState = !commsEnabled
      const txHash = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'toggleAgentComms',
        args: [BigInt(agent.contractAgentId), newState],
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })
 
      // const { agentsAPI } = await import('../api/agents')
      await agentsAPI.update(agent.agentId, { commsEnabled: newState })
 
      setCommsEnabled(newState)
      setSuccess(`Agent comms ${newState ? 'enabled' : 'disabled'} ✓`)
      onRefresh?.()
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Toggle failed')
    } finally {
      setSavingComms(false)
    }
  }
 
  return (
    <div className="glass-card-landing rounded-xl p-5 sm:p-6 space-y-5">
      <h3 className="font-semibold text-sm text-[var(--color-text-dim)] uppercase flex items-center gap-2">
        <Shield size={13} className="text-[var(--color-primary)]" /> Owner Controls
      </h3>
 
      {error && (
        <div className="flex items-center gap-2 text-[var(--color-danger)] text-xs p-2 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-[var(--color-success)] text-xs p-2 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
          <CheckCircle size={12} className="shrink-0" /> {success}
        </div>
      )}

      <EndpointEditor agent={agent} onRefresh={onRefresh} />

      {/* Update pricing */}
      <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
        <div className="text-xs font-mono text-[var(--color-text-dim)] uppercase">Update Pricing (USD, 18 dec)</div>
        <input
          type="number" min="0" step="0.01"
          value={monthlyUSD}
          onChange={e => setMonthlyUSD(e.target.value)}
          placeholder="Monthly price in USD (e.g. 5)"
          className="input-field w-full px-3 py-2 rounded-lg text-sm"
        />
        <input
          type="number" min="0" step="0.01"
          value={commsUSD}
          onChange={e => setCommsUSD(e.target.value)}
          placeholder="Comms price per call in USD (e.g. 0.5)"
          className="input-field w-full px-3 py-2 rounded-lg text-sm"
        />
        <button
          onClick={handleUpdatePricing}
          disabled={saving || !monthlyUSD}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-mono hover:bg-[rgba(124,58,237,0.1)] disabled:opacity-40 transition-all cursor-pointer"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
          {saving ? 'UPDATING...' : 'UPDATE PRICING ON-CHAIN'}
        </button>
      </div>
 
      {/* Toggle comms */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
        <div>
          <div className="text-xs font-mono text-[var(--color-text-dim)] uppercase">Agent Comms</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Currently: <span className={commsEnabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-dim)]'}>{commsEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
        <button
          onClick={handleToggleComms}
          disabled={savingComms}
          className={`px-3 py-2 rounded-lg border text-xs font-mono cursor-pointer disabled:opacity-40 transition-all ${
            commsEnabled
              ? 'border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[rgba(248,113,113,0.08)]'
              : 'border-[var(--color-success)] text-[var(--color-success)] hover:bg-[rgba(52,211,153,0.08)]'
          }`}
        >
          {savingComms ? <Loader2 size={12} className="animate-spin inline" /> : (commsEnabled ? 'DISABLE' : 'ENABLE')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function AgentDetail() {
  const { id } = useParams()
  const { addLog, clearLogs, isExecuting, setExecuting, executionResult, setResult } = useInteractionStore()
  const { address, isConnected, chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const contracts = chain?.id ? CHAIN_CONFIG[chain.id]?.contracts : null

  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState('')
  const [activeTab, setActiveTab] = useState('execute')
  const [toastMessage, setToastMessage] = useState(null)
  const [hasValidAccess, setHasValidAccess] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
  // Trial allowance from the backend, so the page can say how many runs are left
  const [freeRuns, setFreeRuns] = useState(null)
  const [pendingTx, setPendingTx] = useState(null)
  const pollIntervalRef = useRef(null)

const accessGrantedForWallet = useRef(null)

  const getAccessCacheKey = useCallback((agentData, walletAddr) => {
    const agentKey = getAgentExternalId(agentData)
    const walletKey = String(walletAddr || '').toLowerCase()
    if (!agentKey || !walletKey) return null
    return `agent-access:${agentKey}:${walletKey}`
  }, [])

  const readCachedAccess = useCallback((agentData, walletAddr) => {
    const cacheKey = getAccessCacheKey(agentData, walletAddr)
    if (!cacheKey) return false

    try {
      return localStorage.getItem(cacheKey) === '1'
    } catch {
      return false
    }
  }, [getAccessCacheKey])

  const writeCachedAccess = useCallback((agentData, walletAddr, granted) => {
    const cacheKey = getAccessCacheKey(agentData, walletAddr)
    if (!cacheKey) return

    try {
      if (granted) {
        localStorage.setItem(cacheKey, '1')
      } else {
        localStorage.removeItem(cacheKey)
      }
    } catch {
      // Ignore storage failures.
    }
  }, [getAccessCacheKey])

  // Stage 3: derived executionConfig — null for legacy text-only agents
  const execConfig = agent?.executionConfig || null
  const ownerWallet = agent?.ownerWallet?.toLowerCase()
  const currentWallet = address?.toLowerCase()
  const isOwner = !!(currentWallet && ownerWallet && currentWallet === ownerWallet)
  const isBlockchainAgent = agent?.contractAgentId !== null && agent?.contractAgentId !== undefined
  const externalAgentId = getAgentExternalId(agent)

  const userHasAccess = (hasValidAccess && accessGrantedForWallet.current === currentWallet) || isOwner

  const showToast = (msg, type = 'error') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchAgentDetails = async () => {
    try {
      const response = await agentsAPI.getById(id)
      setAgent(response.data.agent || response.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const checkAccess = useCallback(async (agentData, walletAddr) => {
    if (!agentData || !walletAddr) return

    const normalized = walletAddr.toLowerCase()
    const cachedAccess = readCachedAccess(agentData, normalized)

    if (agentData.ownerWallet?.toLowerCase() === normalized) {
      setHasValidAccess(true)
      accessGrantedForWallet.current = normalized
      writeCachedAccess(agentData, normalized, true)
      return
    }

    // Restore immediately from local cache to prevent relock flicker after wallet reconnect.
    if (cachedAccess) {
      setHasValidAccess(true)
      accessGrantedForWallet.current = normalized
    } else {
      setHasValidAccess(false)
      accessGrantedForWallet.current = null
    }

    setAccessLoading(true)
    try {
      const res = await agentsAPI.checkAccess(getAgentExternalId(agentData))
      const granted = res.data?.hasAccess || false
      const stillSameWallet = address?.toLowerCase() === normalized
      if (stillSameWallet) {
        setFreeRuns(res.data?.freeRuns || null)
        setHasValidAccess(granted)
        accessGrantedForWallet.current = granted ? normalized : null
        writeCachedAccess(agentData, normalized, granted)
      }
    } catch {
      // Preserve cached access until a successful re-check can happen.
      if (!cachedAccess) {
        setHasValidAccess(false)
        accessGrantedForWallet.current = null
      }
    } finally {
      setAccessLoading(false)
    }
  }, [address, readCachedAccess, writeCachedAccess])

  const checkPendingTx = useCallback(async (agentData) => {
  if (!address || !agentData) return
  try {
    const res = await agentsAPI.getPendingTransactions()
    const agentExId = getAgentExternalId(agentData)

    const match = res.data?.pending?.find(tx =>
      tx.agentId === agentExId || tx.agentId === agentData.agentId
    )

    setPendingTx(match || null)
  } catch {
    setPendingTx(null)
  }
}, [address])

const startAccessPolling = useCallback((agentData) => {
  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

  pollIntervalRef.current = setInterval(async () => {
    const res = await agentsAPI.checkAccess(getAgentExternalId(agentData)).catch(() => null)

    if (res?.data?.hasAccess) {
      setHasValidAccess(true)
      accessGrantedForWallet.current = address?.toLowerCase()
      setPendingTx(null)
      clearInterval(pollIntervalRef.current)
    }

    // also refresh pending tx
    await checkPendingTx(agentData)
  }, 5000)
}, [address, checkPendingTx])

  useEffect(() => {
    clearLogs()
    setResult(null)
    setTask('')
    setLoading(true)
    setAgent(null)
    setHasValidAccess(false)
    accessGrantedForWallet.current = null
    fetchAgentDetails()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!agent) return

    const wallet = address || null

    if (!wallet) {
      setHasValidAccess(false)
      accessGrantedForWallet.current = null
      return
    }

    checkAccess(agent, wallet)
    checkPendingTx(agent)
  }, [agent, address, checkAccess, checkPendingTx])

  useEffect(() => {
  return () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
  }
}, [])

const handlePurchaseSuccess = async () => {
  showToast('Purchase submitted! Awaiting resolver confirmation...', 'success')

  if (agent && address) {
    writeCachedAccess(agent, address, true)
    await checkPendingTx(agent)
    startAccessPolling(agent)
  }
}

const handleExecute = async (opts = {}) => {
    const activeTask = opts.task ?? task
    const hasRuntimePayload =
      opts.runtimePayload &&
      (
        Object.keys(opts.runtimePayload.body || {}).length > 0 ||
        Object.keys(opts.runtimePayload.files || {}).length > 0 ||
        Object.keys(opts.runtimePayload.headers || {}).length > 0
      )

    if ((!activeTask?.trim() && !hasRuntimePayload) || !isConnected) {
      return
    }
    setExecuting(true); setResult(null)
    addLog({ level: 'system', message: `Initiating execution: ${agent.name}` })
    addLog({ level: 'info', message: `Task: ${activeTask}` })
    if (opts.runtimePayload) {
      const { headers, body, files, contentType } = opts.runtimePayload
      addLog({ level: 'info', message: `Schema-driven: ${Object.keys(headers).length} headers, ${Object.keys(body).length} body fields, ${Object.keys(files).length} files, content-type: ${contentType}` })
    }
    try {
      addLog({ level: 'info', message: 'Routing to agent endpoint...' })
      // Stage 3: payload is prepared but execution engine still uses task text
      // Future stage will pass full runtimePayload to backend
      console.log('\n========== FRONTEND EXECUTION ==========')
console.log('TASK:', activeTask)

if (opts.runtimePayload) {
  console.log(
    'HEADERS:',
    opts.runtimePayload.headers
  )

  console.log(
    'BODY:',
    opts.runtimePayload.body
  )

  console.log(
    'FILES:',
    Object.entries(opts.runtimePayload.files || {}).map(
      ([k, f]) => ({
        field: k,
        name: f?.name,
        size: f?.size,
        type: f?.type,
      })
    )
  )
}

console.log('========================================\n')
      let response
      const payloadContentType = opts.runtimePayload?.contentType || 'json'
      if (opts.runtimePayload && payloadContentType === 'form-data') {
        // Multipart submission is driven by the selected content type.
        const formData = new FormData()
        formData.append('task', activeTask)
        formData.append('runtimePayload', JSON.stringify({
          headers: opts.runtimePayload.headers,
          body: opts.runtimePayload.body,
          contentType: opts.runtimePayload.contentType,
          method: opts.runtimePayload.method,
        }))
        for (const [key, file] of Object.entries(opts.runtimePayload.files || {})) {
          if (file) formData.append(key, file)
        }
        response = await agentsAPI.executeMultipart(externalAgentId, formData)
      } else if (opts.runtimePayload) {
        const jsonRuntimePayload = {
          headers: opts.runtimePayload.headers,
          body: opts.runtimePayload.body,
          contentType: payloadContentType,
          method: opts.runtimePayload.method,
        }
        response = await agentsAPI.executeWithPayload(externalAgentId, activeTask, jsonRuntimePayload)
      } else {
        response = await agentsAPI.execute(externalAgentId, activeTask)
      }
      addLog({ level: 'success', message: 'Agent responded successfully' })
      const data = response.data

      // If backend returned binary data metadata, prepare downloadable blob URL
      const download = buildBinaryDownload(data?.response)
      if (download) {
        setResult({ output: `Binary file ready: ${download.filename}`, latency: data.latency || 0, success: true, download: { url: download.url, filename: download.filename } })
      } else {
        setResult({ output: data.response || data.output || data.result || data || `Task completed.\n\n${new Date().toISOString()}`, latency: data.latency || Math.floor(Math.random() * 500) + 100, success: true })
      }
    } catch (error) {
      const errData = error?.response?.data
      const errMsg = errData?.error || errData?.message || error.message
      const errCode = errData?.code

      let userMsg = errMsg
      if (errCode === 'UNKNOWN_FIELD') userMsg = `Schema validation: ${errMsg}`
      else if (errCode === 'UNKNOWN_HEADER') userMsg = `Header validation: ${errMsg}`
      else if (errCode === 'MISSING_REQUIRED_FIELD' || errCode === 'MISSING_REQUIRED_FILE') userMsg = `Required field missing: ${errMsg}`
      else if (errCode === 'RESTRICTED_HEADER') userMsg = `Security: ${errMsg}`
      else if (errCode === 'INVALID_FILE_FIELD') userMsg = `File upload error: ${errMsg}`
      else if (error?.response?.status === 413) userMsg = 'Payload too large — reduce file sizes or body size'
      else if (error?.response?.status === 429) userMsg = 'Rate limit exceeded — please wait before retrying'
      else if (errMsg?.toLowerCase().includes('timeout')) userMsg = 'Agent timed out — the agent endpoint did not respond in time'
      else if (errMsg?.toLowerCase().includes('redirect')) userMsg = 'Execution blocked — SSRF protection triggered'

      addLog({ level: 'error', message: `Failed: ${userMsg}` })
      setResult({ output: `Error: ${userMsg}`, latency: 0, success: false })
    } finally { setExecuting(false); setTask('') }
  }

  const monthlyEth = agent?.pricing ? parseFloat(formatUnits(BigInt(agent.pricing), 18)).toFixed(4) : '0'

  if (loading) return <div className="p-6 max-w-7xl mx-auto"><LoadingPulse /></div>
  if (!agent) return (
    <div className="relative min-h-[60vh] flex items-center justify-center p-6">
      <div className="glass-card-landing rounded-2xl p-10 text-center">
        <Zap size={40} className="mx-auto mb-4 text-[var(--color-primary)] opacity-40" />
        <div className="text-[var(--color-text-muted)] text-lg font-display font-bold mb-2">AGENT NOT FOUND</div>
        <Link to="/explorer" className="text-[var(--color-primary)] text-xs font-mono hover:underline">← BACK TO EXPLORER</Link>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      {toastMessage && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-lg backdrop-blur-md ${toastMessage.type === 'success' ? 'bg-[rgba(52,211,153,0.15)] border border-[var(--color-success)] text-[var(--color-success)]' : 'bg-[rgba(248,113,113,0.15)] border border-[var(--color-danger)] text-[var(--color-danger)]'}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toastMessage.msg}
        </motion.div>
      )}

      <div className="fixed top-20 right-10 w-[500px] h-[400px] rounded-full pointer-events-none opacity-25 bg-[var(--color-bg-secondary)]" />

      <div className="relative z-10 p-5 lg:p-8 max-w-7xl mx-auto">
        <Link to="/explorer">
          <motion.div whileHover={{ x: -4 }} className="inline-flex items-center gap-2 text-[var(--color-text-dim)] hover:text-[var(--color-primary)] text-[11px] font-mono  mb-6 transition-colors cursor-pointer group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            BACK TO EXPLORER
          </motion.div>
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="p-6 sm:p-8 relative">
            <div className="absolute top-0 right-0 w-[300px] h-[200px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start gap-6">
              <motion.div whileHover={{ scale: 1.05 }} className="rounded-2xl overflow-hidden shrink-0 shadow-[0_4px_16px_rgba(111,53,178,0.22)]">
                <AgentAvatar agent={agent} size={80} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-primary)] tracking-tight">{agent.name}</h1>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] pulse-dot" />
                    <span className="text-sm font-mono text-[var(--color-success)]  font-bold">{(agent.status || 'ACTIVE').toUpperCase()}</span>
                  </div>
                  {isBlockchainAgent && <span className="px-2 py-1 rounded text-xs font-mono bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[var(--color-primary)]">ON-CHAIN</span>}
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm sm:text-base mb-4 leading-relaxed max-w-2xl">{agent.description}</p>
                {/* <div className="flex flex-wrap gap-2 mb-5">
                  {(agent.tags || []).map(tag => <span key={tag} className="px-3 py-1 rounded-lg text-sm font-mono bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.15)] text-[var(--color-purple-pale)]">#{tag}</span>)}
                </div> */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-[var(--color-text-dim)]">
                  <span>OWNER: <span className="text-[var(--color-primary)]">{agent.ownerWallet?.slice(0, 12) || '0xUNKNOWN'}...</span></span>
                  <span>CATEGORY: <span className="text-[var(--color-text-muted)]">{agent.category || 'N/A'}</span></span>
                  <span>MONTHLY: <span className="text-[var(--color-primary)]">{monthlyEth} 0G</span></span>
                </div>
              </div>
            </div>
            {/* <div className="relative z-10 mt-6 flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[var(--color-border)] font-semibold text-base">
              <ExternalLink size={13} className="text-[var(--color-text-dim)] shrink-0" />
              <span className="text-[var(--color-text-muted)] flex-1 truncate">
                {userHasAccess ? agent.endpoint : '****** (LOCKED — purchase access to reveal) ******'}
              </span>
              {userHasAccess && (
                <button onClick={copyEndpoint} className="text-[var(--color-text-dim)] hover:text-[var(--color-primary)] transition-colors cursor-pointer p-1">
                  {copied ? <CheckCircle size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
                </button>
              )}
            </div> */}
          </div>
        </motion.div>

        {/* Metrics */}
        <FadeInSection className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'RATING', value: `${agent.rating || 0}/5.0`, color: 'yellow', icon: Star },
              { label: 'TOTAL CALLS', value: (agent.calls || 0).toLocaleString(), color: 'blue', icon: Activity },
              { label: 'SUCCESS RATE', value: `${agent.successRate || 0}%`, color: 'green', icon: TrendingUp },
              { label: 'MONTHLY PRICE', value: `${monthlyEth} 0G`, color: 'purple', icon: Shield },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <div className="glass-card-landing rounded-xl p-4 sm:p-5"><MetricBadge {...m} /></div>
              </motion.div>
            ))}
          </div>
        </FadeInSection>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 glass-card-landing rounded-xl overflow-hidden border border-[var(--color-border)]">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-semibold text-sm  border-b-2 transition-all cursor-pointer ${activeTab === tab.id ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[rgba(124,58,237,0.08)]' : 'border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'}`}>
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ─── EXECUTE TAB ──────────────────────────────────────── */}
        {activeTab === 'execute' && (
          <div className="space-y-5">

            {/* TOP SECTION — 2-column grid (always visible) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">

              {/* LEFT: Execution Console + Execution Logs stacked */}
              <div className="lg:col-span-3 space-y-5">

                {/* Execution Console */}
                <FadeInSection>
                  <div className="glass-card-landing rounded-xl p-5 sm:p-6 min-h-[300px]">
                    <AnimatePresence mode="wait">
                      {accessLoading ? (
                        <motion.div key="loading" className="flex items-center justify-center py-12">
                          <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
                        </motion.div>
                      ) : userHasAccess ? (
                        <motion.div key="execute" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                          <h2 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-primary)] mb-5 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
                              <Terminal size={16} className="text-[var(--color-primary)]" />
                            </div>
                            EXECUTION CONSOLE
                            {execConfig && (
                              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] text-[var(--color-primary)]">
                                DYNAMIC SCHEMA
                              </span>
                            )}
                          </h2>

                          {freeRuns && freeRuns.remaining > 0 && (
                            <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)]">
                              <Sparkles size={13} className="text-[var(--color-primary)] shrink-0" />
                              <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                                Free trial — <span className="text-[var(--color-primary)] font-bold">{freeRuns.remaining}</span> of {freeRuns.allowance} run(s) left. Purchase to keep going after that.
                              </span>
                            </div>
                          )}

                          {execConfig ? (
                            /* Stage 3: Dynamic schema-driven execution UI */
                            <RuntimeExecutionForm
                              execConfig={execConfig}
                              task={task}
                              onTaskChange={setTask}
                              onSubmit={handleExecute}
                              isExecuting={isExecuting}
                              isConnected={isConnected}
                            />
                          ) : (
                            /* Legacy: text-only task textarea */
                            <>
                              <div className="mb-5">
                                <label className="text-xs font-mono text-[var(--color-text-dim)] uppercase block mb-2">TASK INPUT</label>
                                <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Describe the task for this agent..." rows={4} className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none" />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm font-mono text-[var(--color-text-dim)]">
                                  STATUS: <span className="text-[var(--color-success)] font-bold text-sm">UNLOCKED</span>
                                  {isOwner && <span className="ml-2 text-[var(--color-primary)]">(OWNER)</span>}
                                </div>
                                <NeonButton icon={Send} onClick={handleExecute} loading={isExecuting} disabled={!isConnected || !task.trim()}>
                                  {isConnected ? 'EXECUTE' : 'CONNECT WALLET'}
                                </NeonButton>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div key="paywall" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                          {isBlockchainAgent
                            ? <BlockchainPurchasePanel agent={agent} onSuccess={handlePurchaseSuccess} pendingTx={pendingTx} />
                            : <DbPurchasePanel agent={agent} onSuccess={handlePurchaseSuccess} pendingTx={pendingTx} />
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeInSection>

              </div>

              {/* RIGHT: Capabilities + Upvote + Performance stacked */}
              <div className="lg:col-span-2 space-y-5">

                <FadeInSection delay={0.1}>
                  <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                    <h3 className="font-semibold text-sm  text-[var(--color-text-dim)] uppercase mb-4 flex items-center gap-2">
                      <Sparkles size={12} className="text-[var(--color-primary)]" /> CAPABILITIES
                    </h3>
                    <div className="space-y-2.5">
                      {['Natural Language Processing', 'Real-time Analysis', 'Multi-format Input', 'Streaming Output', 'Context Window 128K', 'Agent Composition'].map((cap, i) => (
                        <motion.div key={cap} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="flex items-center gap-2.5 text-xs text-[var(--color-text-muted)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                          {cap}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </FadeInSection>

                <FadeInSection delay={0.15}>
                  <UpvoteButton
                    agentId={externalAgentId}
                    ownerWallet={agent.ownerWallet}
                    initialUpvotes={agent.upvotes}
                    walletAddress={address}
                    isConnected={isConnected}
                  />
                </FadeInSection>

                {isOwner && (
                  <FadeInSection delay={0.18}>
                    <OwnerControlsPanel
                      agent={agent}
                      contracts={contracts}
                      publicClient={publicClient}
                      writeContractAsync={writeContractAsync}
                      onRefresh={fetchAgentDetails}
                    />
                  </FadeInSection>
                )}

                <FadeInSection delay={0.2}>
                  <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                    <h3 className="font-semibold text-sm  text-[var(--color-text-dim)] uppercase mb-5 flex items-center gap-2">
                      <Gauge size={12} className="text-[var(--color-star-blue)]" /> PERFORMANCE
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Avg Latency', value: `${agent.metrics?.avgLatency || 234}ms`, bar: 80, color: 'from-blue-500 to-blue-400' },
                        { label: 'Uptime', value: '99.9%', bar: 99, color: 'from-emerald-500 to-emerald-400' },
                        { label: 'Success Rate', value: `${agent.successRate || 0}%`, bar: agent.successRate || 0, color: 'from-purple-500 to-purple-400' },
                      ].map((stat, i) => (
                        <div key={stat.label}>
                          <div className="flex justify-between text-sm font-mono mb-1.5">
                            <span className="text-[var(--color-text-dim)]">{stat.label}</span>
                            <span className="text-[var(--color-text-muted)] font-bold">{stat.value}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-nebula-deep)] rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${stat.bar}%` }} transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }} className="h-full rounded-full bg-[var(--color-primary)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeInSection>

              </div>
            </div>

            {/* BOTTOM SECTION — full-width results (only after execution) */}
            <AnimatePresence>
              {userHasAccess && executionResult && (
                <motion.div
                  key="execution-results"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="space-y-5"
                >
                  {/* Downloadable binary (if present) */}
                  {executionResult.download && (
                    <div className="mb-3">
                      <a href={executionResult.download.url} download={executionResult.download.filename} className="inline-block px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm">Download {executionResult.download.filename}</a>
                    </div>
                  )}

                  {/* Execution output — full width */}
                  <OutputRenderer
                    response={executionResult.output}
                    latency={executionResult.latency}
                    success={executionResult.success}
                    agentName={agent.name}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

        {activeTab === 'local' && (
          <FadeInSection>
            {userHasAccess ? (
              <RunLocallyPanel agentId={externalAgentId} />
            ) : (
              <div className="glass-card-landing rounded-xl p-8 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">Purchase access from the Execute tab to generate a local license.</p>
              </div>
            )}
          </FadeInSection>
        )}

        {activeTab === 'comms' && (
          <FadeInSection>
            <AgentCommsPanel
              agentId={externalAgentId}
              agentName={agent.name}
              isOwner={isOwner}
              commsEnabled={agent.commsEnabled}
              commsPricePerCall={agent.commsPricePerCall}
              onCommsConfigSaved={fetchAgentDetails}
            />
          </FadeInSection>
        )}

        {activeTab === 'reviews' && (
          <FadeInSection>
            <div className="glass-card-landing rounded-xl p-5 sm:p-6">
              <ReviewSection agentId={externalAgentId} />
            </div>
          </FadeInSection>
        )}
      </div>
    </div>
  )
}



