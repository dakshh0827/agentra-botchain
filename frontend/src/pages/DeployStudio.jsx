import React, { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Upload, ChevronRight, Check, Globe, Tag, DollarSign,
  Zap, Database, Link2, Sparkles, Rocket, AlertTriangle, Wallet, Info,
  Settings, Plus, Trash2, Eye, EyeOff, Lock, Key, FileText, Code
} from 'lucide-react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits, decodeEventLog } from 'viem'
import { CHAIN_CONFIG } from '../config/chains.config'
import NeonButton from '../components/ui/NeonButton'
import { agentsAPI } from '../api/agents'

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

const STEPS = [
  { id: 1, label: 'Mode', icon: Database, description: 'Deploy target' },
  { id: 2, label: 'Identity', icon: Zap, description: 'Name & category' },
  { id: 3, label: 'Endpoint', icon: Globe, description: 'MCP schema' },
  { id: 4, label: 'Metadata', icon: Tag, description: 'Tags & description' },
  { id: 5, label: 'Pricing', icon: DollarSign, description: 'Access prices' },
  { id: 6, label: 'Exec Config', icon: Settings, description: 'Request schema' },
  { id: 7, label: 'Deploy', icon: Upload, description: 'Publish agent' },
]

  const displayedSteps = STEPS

const CATEGORIES = ['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']

const TIER_OPTIONS = [
  { label: 'STANDARD', tier: 'Standard', tierIndex: 0, listingFee: '0.01 0G', listingFeeUSD: 0.01, desc: '...', suggestedMonthly: '1' },
  { label: 'PROFESSIONAL', tier: 'Professional', tierIndex: 1, listingFee: '0.1 0G', listingFeeUSD: 0.1, desc: '...', suggestedMonthly: '5' },
  { label: 'ENTERPRISE', tier: 'Enterprise', tierIndex: 2, listingFee: '1 0G', listingFeeUSD: 1, desc: '...', suggestedMonthly: '15' },
]

const DEPLOY_FUNCTION_BY_TIER = {
  Standard: 'deployStandardAgent',
  Professional: 'deployProfessionalAgent',
  Enterprise: 'deployEnterpriseAgent',
}

const InputField = ({ label, field, type = 'text', placeholder, rows, form, update }) => (
  <div>
    <label className="text-xs font-semibold text-text-primary block mb-2.5">{label}</label>
    {rows ? (
      <textarea
        value={form[field]}
        onChange={e => update(field, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input-field w-full px-4 py-3 rounded-lg text-base resize-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
    ) : (
      <input
        type={type}
        value={form[field]}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        className="input-field w-full px-4 py-3 rounded-lg text-base focus:ring-2 focus:ring-primary/30 transition-all"
      />
    )}
  </div>
)

// ── Execution Config Components ──────────────────────────────

const CONTENT_TYPES = [
  { value: 'json', label: 'JSON', desc: 'application/json' },
  { value: 'form-data', label: 'Form Data', desc: 'multipart/form-data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded', desc: 'application/x-www-form-urlencoded' },
]

const FIELD_TYPES = ['text', 'textarea', 'number', 'file', 'password', 'boolean']

const EMPTY_HEADER = { key: '', value: '', required: false, secret: false, userProvided: true, placeholder: '', description: '' }
const EMPTY_BODY_FIELD = { key: '', type: 'text', required: false, userProvided: true, placeholder: '', description: '' }

function validateExecConfig(config) {
  const errors = []
  const headerKeys = config.headers.map(h => h.key).filter(Boolean)
  const bodyKeys = config.bodyFields.map(f => f.key).filter(Boolean)

  if (new Set(headerKeys).size !== headerKeys.length) errors.push('Duplicate header keys detected')
  if (new Set(bodyKeys).size !== bodyKeys.length) errors.push('Duplicate body field keys detected')
  if (config.headers.length > 20) errors.push('Maximum 20 headers allowed')
  if (config.bodyFields.length > 30) errors.push('Maximum 30 body fields allowed')

  config.headers.forEach((h, i) => {
    if (h.required && !h.key) errors.push(`Header #${i + 1}: key cannot be empty when marked required`)
  })
  config.bodyFields.forEach((f, i) => {
    if (f.required && !f.key) errors.push(`Field #${i + 1}: key cannot be empty when marked required`)
    if (f.key && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.key)) errors.push(`Field #${i + 1}: "${f.key}" is not a valid identifier`)
  })

  return errors
}

function HeaderRow({ header, index, onChange, onRemove }) {
  const [showValue, setShowValue] = useState(false)
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-text-dim">HEADER #{index + 1}</span>
        <button onClick={onRemove} className="text-danger hover:text-red-400 p-1 rounded transition-colors cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-dim block mb-1">KEY</label>
          <input value={header.key} onChange={e => onChange('key', e.target.value)} placeholder="Authorization" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-text-dim block mb-1">DEFAULT VALUE</label>
          <div className="relative">
            <input type={header.secret && !showValue ? 'password' : 'text'} value={header.value} onChange={e => onChange('value', e.target.value)} placeholder={header.secret ? '••••••••' : 'Bearer token...'} className="input-field w-full px-3 py-2 rounded-lg text-sm pr-8" />
            {header.secret && (
              <button onClick={() => setShowValue(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary cursor-pointer">
                {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-dim block mb-1">PLACEHOLDER (shown to user)</label>
        <input value={header.placeholder} onChange={e => onChange('placeholder', e.target.value)} placeholder="e.g. Enter your API key" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-xs text-text-dim block mb-1">DESCRIPTION</label>
        <input value={header.description} onChange={e => onChange('description', e.target.value)} placeholder="What this header is used for" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { field: 'required', label: 'Required', color: 'text-warning' },
          { field: 'secret', label: 'Secret', color: 'text-danger', icon: Lock },
          { field: 'userProvided', label: 'User Provided', color: 'text-primary' },
        ].map(({ field, label, color, icon: Icon }) => (
          <button key={field} onClick={() => onChange(field, !header[field])}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-all ${header[field] ? `border-current ${color} bg-current/10` : 'border-border text-text-dim'}`}>
            {Icon && <Icon size={10} />}{label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BodyFieldRow({ field, index, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-text-dim">FIELD #{index + 1}</span>
        <button onClick={onRemove} className="text-danger hover:text-red-400 p-1 rounded transition-colors cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-text-dim block mb-1">KEY (identifier)</label>
          <input value={field.key} onChange={e => onChange('key', e.target.value)} placeholder="e.g. resume_file" className="input-field w-full px-3 py-2 rounded-lg text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-text-dim block mb-1">TYPE</label>
          <select value={field.type} onChange={e => onChange('type', e.target.value)} className="input-field w-full px-3 py-2 rounded-lg text-sm">
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-text-dim block mb-1">PLACEHOLDER</label>
        <input value={field.placeholder} onChange={e => onChange('placeholder', e.target.value)} placeholder="e.g. Upload your resume PDF" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-xs text-text-dim block mb-1">DESCRIPTION</label>
        <input value={field.description} onChange={e => onChange('description', e.target.value)} placeholder="What this field is used for" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { f: 'required', label: 'Required', color: 'text-warning' },
          { f: 'userProvided', label: 'User Provided', color: 'text-primary' },
        ].map(({ f, label, color }) => (
          <button key={f} onClick={() => onChange(f, !field[f])}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-all ${field[f] ? `border-current ${color} bg-current/10` : 'border-border text-text-dim'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExecConfigPreview({ config }) {
  const preview = {
    method: config.method,
    contentType: config.contentType,
    headers: config.headers.map(h => ({
      key: h.key || '<key>',
      required: h.required,
      secret: h.secret,
      userProvided: h.userProvided,
      ...(h.placeholder ? { placeholder: h.placeholder } : {}),
      ...(h.description ? { description: h.description } : {}),
    })),
    bodyFields: config.bodyFields.map(f => ({
      key: f.key || '<key>',
      type: f.type,
      required: f.required,
      userProvided: f.userProvided,
      ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      ...(f.description ? { description: f.description } : {}),
    })),
  }
  return (
    <div className="rounded-xl border border-border bg-[#1a1a1a] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#222] border-b border-[#333]">
        <Code size={12} className="text-primary" />
        <span className="text-xs font-mono text-text-dim">executionConfig PREVIEW</span>
      </div>
      <pre className="p-4 text-xs font-mono text-[#ce9178] overflow-x-auto max-h-64 leading-relaxed">
        {JSON.stringify(preview, null, 2)}
      </pre>
    </div>
  )
}

export default function DeployStudio() {
  const [step, setStep] = useState(1)
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [deployError, setDeployError] = useState('')

  const { chain, address: walletAddress, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [form, setForm] = useState({
    deployMode: '',
    name: '',
    category: '',
    endpoint: '',
    mcpSchema: '',
    description: '',
    tags: '',
    tier: '',
    tierIndex: 0,
    monthlyPrice: '',
    commsEnabled: false,
    commsPricePerCall: '',
    testPassed: false,
    executionConfig: {
      method: 'POST',
      contentType: 'json',
      headers: [],
      bodyFields: [],
    },
  })

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const isBlockchain = form.deployMode === 'blockchain'

  const selectedTier = TIER_OPTIONS.find(t => t.tier === form.tier)

  // Derived pricing display
  const monthlyNum = parseFloat(form.monthlyPrice) || 0
  const yearlyNum = monthlyNum * 12
  const creatorMonthly = (monthlyNum * 0.8).toFixed(4)
  const platformMonthly = (monthlyNum * 0.2).toFixed(4)
  const creatorYearly = (yearlyNum * 0.8).toFixed(4)

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const normalizeTxHash = (txResult, label) => {
    const hash = typeof txResult === 'string'
      ? txResult
      : txResult?.hash || txResult?.transactionHash

    if (!/^0x[a-fA-F0-9]{64}$/.test(String(hash || ''))) {
      throw new Error(`${label} transaction hash is missing or invalid.`)
    }

    return hash
  }

  const waitForReceiptWithRetry = async (hash, label, maxAttempts = 8) => {
    let lastError = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await publicClient.waitForTransactionReceipt({
          hash,
          pollingInterval: 3000,
          timeout: 180000,
        })
      } catch (error) {
        lastError = error
        const message = String(error?.shortMessage || error?.message || '').toLowerCase()
        const isTransientReceiptDelay =
          message.includes('receipt') &&
          (message.includes('could not be found') || message.includes('not be processed on a block yet') || message.includes('not found') || message.includes('timed out'))

        if (!isTransientReceiptDelay || attempt === maxAttempts) {
          throw error
        }

        await sleep(Math.min(12000, 1500 * attempt))
      }
    }

    throw lastError || new Error(`${label} receipt could not be found`)
  }

  const handleDeploy = async () => {
    if (!isConnected) return
    setDeploying(true)
    setDeployError('')
    let draftId = null

    try {
      let parsedSchema = null
      if (form.mcpSchema.trim()) {
        try { parsedSchema = JSON.parse(form.mcpSchema) }
        catch { throw new Error('Invalid MCP Schema JSON — please fix it before deploying.') }
      }

      if (!form.monthlyPrice || parseFloat(form.monthlyPrice) < 0) {
        throw new Error('Please set a monthly access price (can be 0 for free).')
      }

      if (form.commsEnabled && (!form.commsPricePerCall || parseFloat(form.commsPricePerCall) <= 0)) {
        throw new Error('Set a comms price per call greater than 0 0G when agent communication is enabled.')
      }

      // Monthly price in 0G-denominated units (stored as 18-decimal integers)
      const pricingWei = parseUnits(form.monthlyPrice || '0', 18).toString()

        const hasExecConfig =
        form.executionConfig.headers.length > 0 ||
        form.executionConfig.bodyFields.length > 0

      const payload = {
        name: form.name,
        category: form.category,
        endpoint: form.endpoint,
        mcpSchema: parsedSchema,
        description: form.description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        tier: form.tier,
        pricing: pricingWei,
        commsEnabled: !!form.commsEnabled,
        commsPricePerCall: form.commsEnabled
          ? parseUnits(form.commsPricePerCall || '0', 18).toString()
          : '0',
        deployMode: form.deployMode,
        executionConfig: hasExecConfig ? form.executionConfig : undefined,
      }

      // ── DATABASE ONLY ──
      if (!isBlockchain) {
        await agentsAPI.deploy(payload)
        setDeployed(true)
        return
      }

      // ── BLOCKCHAIN + DB ──
      const currentNetwork = chain?.id ? CHAIN_CONFIG[chain.id] : null
      if (!currentNetwork?.contracts) {
        throw new Error('Smart contracts not found for Zero Gravity Chain. Please reconnect on 0G.')
      }

      const { Agentra } = currentNetwork.contracts
      if (!Agentra) {
        throw new Error('Agentra contract not found for Zero Gravity Chain. Please reconnect on 0G.')
      }

      const selectedTierConfig = selectedTier || TIER_OPTIONS[0]
      const deployFunctionName = DEPLOY_FUNCTION_BY_TIER[selectedTierConfig.tier] || DEPLOY_FUNCTION_BY_TIER.Standard

      // Step 1: Create DB draft to get metadata URI
      console.log('💾 Creating database draft...')
      const draftRes = await agentsAPI.deploy({ ...payload, deployMode: 'blockchain' })
      draftId = draftRes.data.id
      const metadataURI = draftRes.data.metadataUri || `0g://pending-${draftId}`
      console.log('✓ Draft created. Metadata URI:', metadataURI)

      // Step 2: Get listing fee requirement
      console.log('📋 Fetching listing fee requirement...')
      console.log('  Requesting wei equivalent of USD:', selectedTierConfig.listingFeeUSD)
      
      // Convert decimal USD to integer (multiply by 100 to preserve cents as integers for BigInt)
      const listingFeeUSDAsInteger = Math.round(parseFloat(selectedTierConfig.listingFeeUSD) * 100)
      console.log('  Converted to integer cents:', listingFeeUSDAsInteger)
      
      const requiredWei = await publicClient.readContract({
        address: Agentra.address,
        abi: Agentra.abi,
        functionName: 'getRequiredWei',
        args: [BigInt(listingFeeUSDAsInteger)],
      })
      if (!requiredWei) {
        throw new Error('Failed to get listing fee. Please check contract is deployed.')
      }
      
      // Log raw value and type
      console.log('  Raw requiredWei returned:', requiredWei, 'Type:', typeof requiredWei)
      const requiredWeiBN = typeof requiredWei === 'bigint' ? requiredWei : BigInt(requiredWei)
      console.log('  Converted to BigInt:', requiredWeiBN.toString())
      
      // Add 2% buffer
      const bufferPercent = requiredWeiBN / 50n // 2% = 1/50
      const bufferedFee = requiredWeiBN + bufferPercent
      console.log('✓ Listing fee calculated:')
      console.log('  Base fee (wei):', requiredWeiBN.toString())
      console.log('  2% buffer (wei):', bufferPercent.toString())
      console.log('  Total fee to send (wei):', bufferedFee.toString())

      // Step 3: Prepare pricing arguments
      const monthlyPriceUSD = parseUnits(form.monthlyPrice || '0', 18)
      const commsPriceUSD = form.commsEnabled
        ? parseUnits(form.commsPricePerCall || '0', 18)
        : 0n

      // Step 4: IMPORTANT - Trigger wallet approval
      // This is where MetaMask modal opens
      console.log('🔐 Opening MetaMask for transaction approval...')
      console.log('📝 Transaction details:')
      console.log('  Function:', deployFunctionName)
      console.log('  Monthly Price (wei):', monthlyPriceUSD.toString())
      console.log('  Metadata URI:', metadataURI)
      console.log('  Comms Enabled:', !!form.commsEnabled)
      console.log('  Comms Price (wei):', commsPriceUSD.toString())
      console.log('  Listing Fee (USD):', selectedTierConfig.listingFeeUSD)
      console.log('  Total Fee Value (wei):', bufferedFee.toString())

      let deployTxHash = null
      try {
        console.log('⏳ Waiting for user to confirm in MetaMask...')
        const deployTxResult = await writeContractAsync({
          address: Agentra.address,
          abi: Agentra.abi,
          functionName: deployFunctionName,
          args: [monthlyPriceUSD, metadataURI, !!form.commsEnabled, commsPriceUSD, BigInt(listingFeeUSDAsInteger)],
          value: bufferedFee,
        })
        
        deployTxHash = typeof deployTxResult === 'string'
          ? deployTxResult
          : deployTxResult?.hash

        if (!deployTxHash) {
          throw new Error('MetaMask: Transaction was initiated but hash not returned. Please check MetaMask for details.')
        }
        console.log('✓ Transaction submitted to network:', deployTxHash)
      } catch (walletError) {
        const walletMsg = walletError?.shortMessage || walletError?.message || String(walletError)
        console.error('❌ MetaMask/Wallet Error:', walletMsg)
        
        // User rejected or transaction failed at wallet level
        if (walletMsg.toLowerCase().includes('user rejected') || walletMsg.toLowerCase().includes('denied') || walletMsg.toLowerCase().includes('cancelled')) {
          throw new Error('You cancelled the transaction. Your draft has been saved and you can resume later.')
        }
        
        // Contract/validation errors from MetaMask simulation
        if (walletMsg.toLowerCase().includes('execution reverted') || walletMsg.toLowerCase().includes('reason:')) {
          throw new Error(`Contract validation failed: ${walletMsg}`)
        }
        
        throw new Error(`MetaMask error: ${walletMsg}`)
      }

      // Step 5: Wait for transaction to be mined
      console.log('⏳ Waiting for transaction to be mined on blockchain...')
      const receipt = await waitForReceiptWithRetry(deployTxHash, 'Deployment')
      console.log('✓ Transaction confirmed on chain! Receipt:', receipt.blockNumber)

      // Step 6: Parse AgentDeployed event
      console.log('🔍 Parsing blockchain event...')
      let contractAgentId = null
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: Agentra.abi, data: log.data, topics: log.topics })
          if (decoded.eventName === 'AgentDeployed') {
            contractAgentId = decoded.args.agentId?.toString()
            console.log('✓ AgentDeployed event found! Contract Agent ID:', contractAgentId)
            break
          }
        } catch { /* skip non-matching logs */ }
      }

      if (!contractAgentId) {
        throw new Error('Transaction succeeded on-chain, but AgentDeployed event not emitted. Please contact support with tx hash: ' + deployTxHash)
      }

      // Step 7: Confirm deployment in backend
      console.log('🔗 Confirming deployment in database...')
      await agentsAPI.confirmDeploy(draftId, deployTxHash, contractAgentId)
      console.log('✅ Deployment complete! Agent is live.')
      setDeployed(true)

    } catch (error) {
      console.error('❌ Deploy pipeline error:', error)
      const msg = error?.shortMessage || error?.message || String(error)
      setDeployError(msg)
      
      // Only attempt rollback if we have a draft ID and a clear blockchain failure
      if (draftId && isBlockchain) {
        const shouldRollback = !msg.toLowerCase().includes('draft has been saved')
        if (shouldRollback) {
          console.log('🔄 Attempting to cancel draft...')
          await agentsAPI.cancelDraft(draftId).catch(e => {
            console.error('⚠️ Draft cancellation failed:', e)
          })
        }
      }
    } finally {
      setDeploying(false)
    }
  }

  const canProceedFromStep1 = !!form.deployMode && isConnected
  const canDeploy = isConnected && form.name && form.category && form.tier && form.monthlyPrice !== ''

  return (
    <div className="relative min-h-screen bg-bg">
      <div className="relative z-10 p-5 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          {/* <div className="flex items-center gap-2.5 mb-3"> */}
          <p className="text-xs uppercase tracking-wide text-text-dim font-semibold">Directory</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-tight">
            DEPLOY YOUR <span className="text-primary">AGENT</span>
          </h1>
          <p className="text-text-secondary text-lg sm:text-xl mt-3 max-w-2xl">List your AI agent on the Agentra marketplace and earn from every execution</p>
        </motion.div>

        {/* Step indicator */}
        <FadeInSection className="mb-8">
          <div className="glass-card-landing rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {displayedSteps.map((s, i) => {
                const Icon = s.icon
                const stepIndex = i + 1
                const isActive = step === stepIndex
                const isDone = step > stepIndex
                return (
                  <React.Fragment key={`${s.label}-${i}`}>
                    <motion.div
                      whileHover={isDone ? { y: -2, scale: 1.02 } : {}}
                      onClick={() => isDone && setStep(stepIndex)}
                      className={`relative flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all shrink-0 ${isDone ? 'cursor-pointer' : ''} ${
                        isActive
                          ? 'bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.4)] text-primary'
                          : isDone
                          ? 'bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.25)] text-success'
                          : 'text-text-dim border border-transparent'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-[rgba(124,58,237,0.2)]' : isDone ? 'bg-[rgba(52,211,153,0.15)]' : 'bg-bg-secondary'
                      }`}>
                        {isDone ? <Check size={14} /> : <Icon size={14} />}
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-sm font-semibold text-text-primary">{s.label}</div>
                        <div className="text-xs text-text-dim">{s.description}</div>
                      </div>
                      {isActive && (
                        <motion.div layoutId="step-indicator" className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                    </motion.div>
                    {i < displayedSteps.length - 1 && (
                      <div className={`h-px w-4 sm:w-6 shrink-0 mx-0.5 transition-colors duration-300 ${step > stepIndex ? 'bg-[rgba(52,211,153,0.4)]' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            <div className="mt-4 h-1 bg-bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((step - 1) / (displayedSteps.length - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        </FadeInSection>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            <div className="glass-card-landing rounded-2xl p-6 sm:p-8">

              {/* ── STEP 1: DEPLOY MODE ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-2 flex items-center gap-3">
                        <Sparkles size={20} className="text-primary" />
                      Deployment Target
                    </h2>
                      <p className="text-text-muted text-sm leading-relaxed">
                      Choose whether your agent is registered on-chain (trustless payments) or database-only (free listing, no gas fees).
                    </p>
                  </div>

                  {!isConnected && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3.5 p-4 sm:p-5 rounded-xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.25)]">
                      <div className="w-9 h-9 rounded-lg bg-[rgba(251,191,36,0.1)] flex items-center justify-center shrink-0">
                        <Wallet size={16} className="text-warning" />
                      </div>
                      <div>
                        <div className="text-warning text-[11px] font-bold mb-1">WALLET REQUIRED</div>
                        <div className="text-text-muted text-xs leading-relaxed">
                          Connect your wallet via the top bar before deploying.
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:gap-5">
                    {/* Blockchain */}
                    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.99 }}
                      onClick={() => update('deployMode', 'blockchain')}
                      className={`relative p-5 sm:p-6 rounded-2xl border text-left transition-all cursor-pointer overflow-hidden ${
                        isBlockchain ? 'bg-[rgba(124,58,237,0.1)] border-[rgba(124,58,237,0.5)]' : 'border-border hover:border-[rgba(124,58,237,0.3)] bg-bg-secondary'
                      }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isBlockchain ? 'bg-[rgba(124,58,237,0.15)] border-[rgba(124,58,237,0.4)]' : 'bg-bg-secondary border-border'}`}>
                          <Link2 size={20} className={isBlockchain ? 'text-primary' : 'text-text-dim'} />
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${isBlockchain ? 'text-primary' : 'text-text-secondary'}`}>BLOCKCHAIN + DB</div>
                          <div className="text-xs font-mono mt-0.5 text-text-dim">ON-CHAIN · 0G FEE</div>
                        </div>
                        {isBlockchain && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check size={14} className="text-white" /></motion.div>}
                      </div>
                      <p className="text-xs leading-relaxed text-text-muted">
                        Agent registered on-chain. Trustless access control, buyers pay via wallet (80% to you / 20% platform), immutable ownership.
                      </p>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: IDENTITY ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-6 flex items-center gap-3">
                    <Zap size={20} className="text-primary" /> Agent Identity
                  </h2>
                  <InputField label="AGENT NAME" field="name" placeholder="e.g. DataSynth-X" form={form} update={update} />
                  <div>
                    <label className="text-xs font-mono text-text-dim uppercase block mb-3">CATEGORY</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {CATEGORIES.map(cat => (
                        <motion.button key={cat} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => update('category', cat)}
                          className={`py-2.5 px-4 rounded-xl text-sm font-mono border transition-all cursor-pointer ${
                            form.category === cat
                              ? 'bg-[rgba(124,58,237,0.12)] border-primary-dark text-primary'
                              : 'border-border text-text-dim hover:border-border'
                          }`}>
                          {cat.toUpperCase()}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: ENDPOINT ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-6 flex items-center gap-3">
                    <Globe size={20} className="text-primary" /> MCP Endpoint
                  </h2>
                  <InputField label="ENDPOINT URL" field="endpoint" placeholder="https://your-agent.example.com" form={form} update={update} />
                  <InputField label="MCP SCHEMA (JSON — optional)" field="mcpSchema" rows={8} placeholder={'{\n  "name": "my-agent",\n  "version": "1.0.0",\n  "tools": []\n}'} form={form} update={update} />
                </div>
              )}

              {/* ── STEP 4: METADATA ── */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-6 flex items-center gap-3">
                    <Tag size={20} className="text-primary" /> Metadata
                  </h2>
                  <InputField label="DESCRIPTION" field="description" rows={4} placeholder="Describe what your agent does..." form={form} update={update} />
                  <InputField label="TAGS (comma separated)" field="tags" placeholder="e.g. analysis, data, ml" form={form} update={update} />
                </div>
              )}

              {/* ── STEP 5: PRICING ── */}
              {step === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-2 flex items-center gap-3">
                      <DollarSign size={20} className="text-primary" /> Tier & Pricing
                    </h2>
                    <p className="text-text-muted text-sm">
                      Choose your tier (one-time listing fee to platform) and set your access prices. Users pay you 80%, platform takes 20%.
                    </p>
                  </div>

                  {/* Tier selection */}
                  <div>
                    <label className="text-xs font-mono text-text-dim uppercase block mb-3">SELECT TIER</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {TIER_OPTIONS.map(tier => (
                        <motion.button key={tier.tier} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            update('tier', tier.tier)
                            update('tierIndex', tier.tierIndex)
                            if (!form.monthlyPrice) update('monthlyPrice', tier.suggestedMonthly)
                          }}
                          className={`p-5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                            form.tier === tier.tier ? 'bg-[rgba(124,58,237,0.1)] border-primary-dark' : 'border-border hover:border-border bg-bg-secondary'
                          }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className={`text-sm font-bold ${form.tier === tier.tier ? 'text-primary' : 'text-text-secondary'}`}>{tier.label}</div>
                            {isBlockchain && (
                              <div className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                {tier.listingFee} fee
                              </div>
                            )}
                          </div>
                          <div className="text-sm opacity-60 mt-1 text-text-muted">{tier.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Monthly price */}
                  <div>
                    <label className="text-xs font-mono text-text-dim uppercase block mb-2.5">
                      MONTHLY ACCESS PRICE (0G) — You receive 80%
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.monthlyPrice}
                        onChange={e => update('monthlyPrice', e.target.value)}
                        placeholder="e.g. 5"
                        className="input-field w-full px-4 py-3 rounded-xl text-sm pr-20"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim text-xs font-mono">0G/mo</span>
                    </div>
                    {form.monthlyPrice && parseFloat(form.monthlyPrice) > 0 && (
                      <div className="mt-2 flex gap-4 text-sm font-mono">
                        <span className="text-success">You: {creatorMonthly} 0G/mo</span>
                        <span className="text-primary">Platform: {platformMonthly} 0G/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing preview */}
                  {form.monthlyPrice && parseFloat(form.monthlyPrice) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.2)]"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Info size={12} className="text-success" />
                        <span className="text-sm font-mono text-success">PRICING SUMMARY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded-lg bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.15)]">
                          <div className="text-xs font-mono text-text-dim mb-1">MONTHLY (30 DAYS)</div>
                          <div className="text-lg font-bold font-display text-primary">{parseFloat(form.monthlyPrice).toFixed(4)} 0G</div>
                          <div className="text-xs font-mono text-success mt-1">→ {creatorMonthly} 0G to you</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)]">
                          <div className="text-xs font-mono text-text-dim mb-1">YEARLY (365 DAYS)</div>
                          <div className="text-lg font-bold font-display text-success">{yearlyNum.toFixed(4)} 0G</div>
                          <div className="text-xs font-mono text-success mt-1">→ {creatorYearly} 0G to you</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Agent-to-agent comms pricing */}
                  <div className="rounded-xl border border-border bg-bg-secondary p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-primary">AGENT-TO-AGENT COMMUNICATION</div>
                        <p className="text-[11px] text-text-dim mt-1">
                          Let other agents delegate tasks to your agent for a per-call fee.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => update('commsEnabled', !form.commsEnabled)}
                        className={`px-3 py-2 rounded-lg border text-sm font-mono tracking-wider cursor-pointer transition-all ${
                          form.commsEnabled
                            ? 'border-success text-success bg-[rgba(52,211,153,0.1)]'
                            : 'border-border text-text-dim'
                        }`}
                      >
                        {form.commsEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    {form.commsEnabled && (
                      <div>
                        <label className="text-xs font-mono text-text-dim uppercase block mb-2.5">
                          COMMS PRICE PER CALL (0G)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={form.commsPricePerCall}
                            onChange={e => update('commsPricePerCall', e.target.value)}
                            placeholder="e.g. 0.5"
                            className="input-field w-full px-4 py-3 rounded-xl text-sm pr-20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim text-xs font-mono">0G/call</span>
                        </div>
                        <p className="text-sm font-mono text-text-dim mt-2">
                          Recommended: keep this lower than full monthly purchase price for better marketplace conversion.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 6: EXECUTION CONFIG ── */}
              {step === 6 && (() => {
                const ec = form.executionConfig
                const updateEc = (key, val) => update('executionConfig', { ...ec, [key]: val })
                const addHeader = () => updateEc('headers', [...ec.headers, { ...EMPTY_HEADER }])
                const removeHeader = (i) => updateEc('headers', ec.headers.filter((_, idx) => idx !== i))
                const updateHeader = (i, field, val) => {
                  const next = ec.headers.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
                  updateEc('headers', next)
                }
                const addBodyField = () => updateEc('bodyFields', [...ec.bodyFields, { ...EMPTY_BODY_FIELD }])
                const removeBodyField = (i) => updateEc('bodyFields', ec.bodyFields.filter((_, idx) => idx !== i))
                const updateBodyField = (i, field, val) => {
                  const next = ec.bodyFields.map((f, idx) => idx === i ? { ...f, [field]: val } : f)
                  updateEc('bodyFields', next)
                }
                const ecErrors = validateExecConfig(ec)
                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-2 flex items-center gap-3">
                        <Settings size={20} className="text-primary" /> Execution Config
                      </h2>
                      <p className="text-text-muted text-sm leading-relaxed">
                        Define the HTTP schema your agent expects. This lets users provide headers, body fields, and API keys at runtime — no hardcoding required.
                      </p>
                    </div>

                    {ecErrors.length > 0 && (
                      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 space-y-1">
                        {ecErrors.map((e, i) => (
                          <div key={i} className="text-xs text-danger font-mono flex items-center gap-2">
                            <AlertTriangle size={11} /> {e}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content Type */}
                    <div>
                      <label className="text-xs font-mono text-text-dim uppercase block mb-3">REQUEST CONTENT TYPE</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {CONTENT_TYPES.map(ct => (
                          <button key={ct.value} onClick={() => updateEc('contentType', ct.value)}
                            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${ec.contentType === ct.value ? 'bg-primary/10 border-primary-dark text-primary' : 'border-border text-text-dim hover:border-border bg-bg-secondary'}`}>
                            <div className="font-bold text-sm">{ct.label}</div>
                            <div className="text-xs opacity-60 mt-0.5 font-mono">{ct.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Headers */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-mono text-text-dim uppercase flex items-center gap-2">
                          <Key size={11} /> HEADERS ({ec.headers.length}/20)
                        </label>
                        <button onClick={addHeader} disabled={ec.headers.length >= 20}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-mono hover:bg-primary/10 disabled:opacity-40 transition-all cursor-pointer">
                          <Plus size={12} /> Add Header
                        </button>
                      </div>
                      <div className="space-y-3">
                        {ec.headers.map((h, i) => (
                          <HeaderRow key={i} header={h} index={i}
                            onChange={(field, val) => updateHeader(i, field, val)}
                            onRemove={() => removeHeader(i)} />
                        ))}
                        {ec.headers.length === 0 && (
                          <div className="text-center py-6 text-text-dim text-xs font-mono border border-dashed border-border rounded-xl">
                            No headers defined — click Add Header to start
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Body Fields */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-mono text-text-dim uppercase flex items-center gap-2">
                          <FileText size={11} /> BODY FIELDS ({ec.bodyFields.length}/30)
                        </label>
                        <button onClick={addBodyField} disabled={ec.bodyFields.length >= 30}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-mono hover:bg-primary/10 disabled:opacity-40 transition-all cursor-pointer">
                          <Plus size={12} /> Add Field
                        </button>
                      </div>
                      <div className="space-y-3">
                        {ec.bodyFields.map((f, i) => (
                          <BodyFieldRow key={i} field={f} index={i}
                            onChange={(field, val) => updateBodyField(i, field, val)}
                            onRemove={() => removeBodyField(i)} />
                        ))}
                        {ec.bodyFields.length === 0 && (
                          <div className="text-center py-6 text-text-dim text-xs font-mono border border-dashed border-border rounded-xl">
                            No body fields defined — click Add Field to start
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Preview */}
                    {(ec.headers.length > 0 || ec.bodyFields.length > 0) && (
                      <ExecConfigPreview config={ec} />
                    )}

                    <div className="rounded-xl border border-border bg-bg-secondary p-4 text-xs font-mono text-text-dim space-y-1">
                      <div className="text-text-secondary font-bold mb-2">ℹ️ This step is optional</div>
                      <div>• Skip this step if your agent only needs a simple task text input</div>
                      <div>• Secret fields are never persisted in plaintext — only the schema is stored</div>
                      <div>• Users will be prompted to fill required fields at execution time</div>
                    </div>
                  </div>
                )
              })()}

              {/* ── STEP 6: REVIEW & DEPLOY ── */}
              {step === 7 && (
                <div className="space-y-6">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-6 flex items-center gap-3">
                    <Upload size={20} className="text-primary" /> Review & Deploy
                  </h2>

                  <div className="space-y-0 rounded-xl overflow-hidden border border-border bg-bg-secondary">
                    {[
                      { label: 'DEPLOY MODE', value: isBlockchain ? 'BLOCKCHAIN + DB' : 'DATABASE ONLY', highlight: isBlockchain ? 'purple' : 'success' },
                      { label: 'OWNER WALLET', value: walletAddress ? `${walletAddress.slice(0, 18)}...` : '—', highlight: 'purple' },
                      { label: 'NAME', value: form.name || '—' },
                      { label: 'CATEGORY', value: form.category || '—' },
                      { label: 'TIER', value: form.tier || '—' },
                      { label: 'ENDPOINT', value: form.endpoint || '—' },
                      { label: 'MONTHLY PRICE', value: form.monthlyPrice ? `${form.monthlyPrice} 0G/mo` : '—' },
                      { label: 'YEARLY PRICE', value: form.monthlyPrice ? `${yearlyNum.toFixed(4)} 0G/year` : '—', highlight: 'success' },
                      { label: 'AGENT COMMS', value: form.commsEnabled ? 'ENABLED' : 'DISABLED', highlight: form.commsEnabled ? 'success' : undefined },
                      { label: 'COMMS PRICE PER CALL', value: form.commsEnabled && form.commsPricePerCall ? `${form.commsPricePerCall} 0G/call` : '—' },
                      { label: 'YOUR MONTHLY CUT (80%)', value: form.monthlyPrice ? `${creatorMonthly} 0G` : '—', highlight: 'success' },
                      ...(isBlockchain && selectedTier ? [{ label: 'LISTING FEE (ONE-TIME)', value: `${selectedTier.listingFee} USD → Platform (paid in 0G)`, highlight: 'warning' }] : []),
                      { label: 'EXEC CONTENT TYPE', value: form.executionConfig.headers.length > 0 || form.executionConfig.bodyFields.length > 0 ? form.executionConfig.contentType : 'Not configured (text-only)' },
                      { label: 'EXEC HEADERS', value: form.executionConfig.headers.length > 0 ? `${form.executionConfig.headers.length} defined` : '—' },
                      { label: 'EXEC BODY FIELDS', value: form.executionConfig.bodyFields.length > 0 ? `${form.executionConfig.bodyFields.length} defined` : '—' },
                    ].map((row, i) => (
                      <motion.div key={row.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className={`flex justify-between items-center px-5 py-3.5 ${i % 2 === 0 ? 'bg-bg' : ''}`}>
                        <span className="text-text-dim font-semibold text-sm">{row.label}</span>
                        <span className={`font-mono text-sm truncate max-w-[55%] text-right font-medium ${
                          row.highlight === 'success' ? 'text-success'
                          : row.highlight === 'purple' ? 'text-primary'
                          : row.highlight === 'warning' ? 'text-warning'
                          : 'text-text-primary'
                        }`}>{row.value}</span>
                      </motion.div>
                    ))}
                  </div>

                  {!isConnected && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3.5 p-4 sm:p-5 rounded-xl bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.3)]">
                      <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <div className="text-danger text-[11px] font-bold mb-1">WALLET NOT CONNECTED</div>
                        <div className="text-text-muted text-xs">Connect your wallet to deploy.</div>
                      </div>
                    </motion.div>
                  )}

                  {deployError && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3.5 p-4 rounded-xl bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.3)]">
                      <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <div className="text-danger text-[11px] font-bold mb-1">DEPLOY FAILED</div>
                        <div className="text-text-muted text-xs font-mono">{deployError}</div>
                      </div>
                    </motion.div>
                  )}

                  {!deployed ? (
                    <div className="space-y-4 pt-2">
                      {isBlockchain && (
                        <NeonButton size="lg" onClick={handleDeploy} loading={deploying} disabled={!canDeploy} className="w-full justify-center py-4 text-sm">
                          <Link2 size={17} />
                          {deploying
                            ? 'AWAITING WALLET TX...'
                            : isConnected
                            ? `⚡ DEPLOY ON-CHAIN (2 TXs — ${selectedTier?.listingFee || '?'} fee)`
                            : 'CONNECT WALLET TO DEPLOY'}
                        </NeonButton>
                      )}
                    </div>
                  ) : (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className={`p-8 rounded-2xl border text-center relative overflow-hidden ${
                        isBlockchain ? 'bg-[rgba(124,58,237,0.08)] border-[rgba(124,58,237,0.35)]' : 'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.35)]'
                      }`}>
                      <div className="relative z-10">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                          className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                            isBlockchain ? 'bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)]' : 'bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.3)]'
                          }`}>
                          <Check size={32} className={isBlockchain ? 'text-primary' : 'text-success'} />
                        </motion.div>
                        <div className={`font-display font-bold text-xl sm:text-2xl mb-2 ${isBlockchain ? 'text-primary' : 'text-success'}`}>
                          AGENT DEPLOYED!
                        </div>
                        <p className="text-text-muted text-sm mb-2">
                          Your agent is now registered on-chain and live.
                        </p>
                        <p className="text-text-dim text-xs font-mono mb-4">
                          Monthly: {form.monthlyPrice} 0G · Yearly: {yearlyNum.toFixed(4)} 0G
                        </p>
                        <div className="text-text-dim text-[11px] font-mono px-3 py-2 rounded-lg bg-bg-secondary border border-border inline-block">
                          OWNER: {walletAddress?.slice(0, 18)}...
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!deployed && (
          <FadeInSection delay={0.1}>
            <div className="flex justify-between mt-6 gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <NeonButton variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || deploying}>
                  ← BACK
                </NeonButton>
              </motion.div>
              {step < 7 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <NeonButton
                    icon={ChevronRight}
                    onClick={() => setStep(s => Math.min(7, s + 1))}
                    disabled={(step === 1 && !canProceedFromStep1) || deploying}
                  >
                    NEXT STEP
                  </NeonButton>
                </motion.div>
              )}
            </div>
          </FadeInSection>
        )}
      </div>
    </div>
  )
}
