import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import {
  ArrowLeft, Zap, Star, Activity, TrendingUp,
  Shield, Send, ThumbsUp,
  ExternalLink, Copy, CheckCircle, Cpu, Terminal,
  Gauge, Sparkles, MessageSquare, Network, FileText, AlertCircle,
  Table, Lock, ShoppingCart, Loader2, DollarSign
} from 'lucide-react'
import NeonButton from '../components/ui/NeonButton'
import TerminalBox from '../components/ui/TerminalBox'
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
  { id: 'comms', label: 'AGENT COMMS', icon: Network },
  { id: 'reviews', label: 'REVIEWS', icon: MessageSquare },
]

// ─────────────────────────────────────────────────────────────
// VS CODE SYNTAX HIGHLIGHTER
// ─────────────────────────────────────────────────────────────

function highlightSyntax(text) {
  if (!text) return ''
  let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const tokens = []
  let idx = 0
  escaped = escaped.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, (match) => {
    const t = `__T${idx++}__`
    tokens.push({ t, html: `<span style="color:#6A9955;font-style:italic">${match}</span>` })
    return t
  })
  escaped = escaped.replace(/(`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (match) => {
    const t = `__T${idx++}__`
    tokens.push({ t, html: `<span style="color:#ce9178">${match}</span>` })
    return t
  })
  escaped = escaped
    .replace(/\b(if|else|while|for|return|break|continue|switch|case|default|try|catch|finally|throw|await|async|yield|typeof|instanceof|in|of|new|delete|void)\b/g, '<span style="color:#c586c0">$1</span>')
    .replace(/\b(function|const|let|var|class|interface|enum|extends|implements|import|export|from|default|type|static|public|private|protected|final)\b/g, '<span style="color:#569cd6">$1</span>')
    .replace(/\b(def|lambda|with|as|pass|raise|except|elif|print|True|False|None|self)\b/g, '<span style="color:#569cd6">$1</span>')
    .replace(/\b(string|number|boolean|any|void|never|int|float|double|char|bool)\b/g, '<span style="color:#4ec9b0">$1</span>')
    .replace(/\b(console|Math|Object|Array|String|Number|Promise|Error|Map|Set|JSON|window|document|process)\b/g, '<span style="color:#4ec9b0">$1</span>')
    .replace(/\b(0x[0-9a-fA-F]+|\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>')
    .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span style="color:#dcdcaa">$1</span>')
    .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/g, '<span style="color:#9cdcfe">$1</span>')
  tokens.forEach(({ t, html }) => { escaped = escaped.split(t).join(html) })
  return escaped
}

function detectLang(code) {
  if (/^\s*(def |import |from .+ import|class .+:|print\()/.test(code)) return 'python'
  if (/pragma solidity|contract |uint256|address public/.test(code)) return 'solidity'
  if (/<\/?[a-z][\s\S]*>/i.test(code) && !/{/.test(code)) return 'html'
  if (/SELECT|INSERT|UPDATE|FROM|WHERE/i.test(code)) return 'sql'
  if (/fn |let mut|impl |use std::/.test(code)) return 'rust'
  if (/func |package main|fmt\.Print/.test(code)) return 'go'
  if (/const |let |var |=>|console\./.test(code)) return 'javascript'
  return 'code'
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  const detectedLang = lang || detectLang(code)
  const langColors = { python: '#3572A5', javascript: '#f1e05a', solidity: '#AA6746', html: '#e34c26', sql: '#e38c00', rust: '#dea584', go: '#00ADD8', java: '#b07219', json: '#40c4ff', code: '#9e9e9e' }
  return (
    <div className="my-4 rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid #2d2d2d' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1e1e1e', borderBottom: '1px solid #2d2d2d' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#28ca41' }} />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-2 h-2 rounded-full" style={{ background: langColors[detectedLang] || '#9e9e9e' }} />
            <span className="text-sm font-mono uppercase " style={{ color: '#858585' }}>{detectedLang}</span>
          </div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono transition-all cursor-pointer"
          style={{ color: copied ? '#4ec9b0' : '#858585' }}>
          {copied ? <><CheckCircle size={12} /> COPIED</> : <><Copy size={12} /> COPY CODE</>}
        </button>
      </div>
      <div className="overflow-x-auto" style={{ background: '#1e1e1e' }}>
        <table className="w-full border-collapse">
          <tbody>
            {code.split('\n').map((line, i) => (
              <tr key={i} style={{ lineHeight: '1.6' }}>
                <td className="select-none text-right pr-4 pl-3 text-[12px] font-mono" style={{ color: '#4a4a4a', minWidth: '2.8rem', userSelect: 'none', borderRight: '1px solid #2d2d2d', verticalAlign: 'top' }}>{i + 1}</td>
                <td className="pl-4 pr-4 text-[13px] font-mono" style={{ color: '#d4d4d4', whiteSpace: 'pre' }}>
                  <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line) || '&nbsp;' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableBlock({ rows, isMarkdown }) {
  const [copied, setCopied] = useState(false)
  if (!rows || rows.length === 0) return null
  const parseRow = (row) => isMarkdown
    ? row.split('|').map(c => c.trim()).filter((_, i, a) => i !== 0 && i !== a.length - 1)
    : row.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
  const headers = parseRow(rows[0])
  const dataRows = isMarkdown ? rows.slice(1).filter(r => !/^\s*\|[\s\-:|]+\|\s*$/.test(r)) : rows.slice(1)
  return (
    <div className="my-4 rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid #2d2d2d' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1e1e1e', borderBottom: '1px solid #2d2d2d' }}>
        <div className="flex items-center gap-2">
          <Table size={13} style={{ color: '#4ec9b0' }} />
          <span className="text-sm font-mono uppercase " style={{ color: '#858585' }}>DATA TABLE — {dataRows.length} rows</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText([rows[0], ...dataRows].join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono transition-all cursor-pointer"
          style={{ color: copied ? '#4ec9b0' : '#858585' }}>
          {copied ? <><CheckCircle size={12} /> COPIED</> : <><Copy size={12} /> COPY CSV</>}
        </button>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto" style={{ background: '#1e1e1e' }}>
        <table className="w-full text-[12px] font-mono">
          <thead style={{ position: 'sticky', top: 0, background: '#252526', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #2d2d2d' }}>
              {headers.map((h, i) => <th key={i} className="text-left px-4 py-2.5 whitespace-nowrap font-bold" style={{ color: '#4ec9b0', borderRight: i < headers.length - 1 ? '1px solid #2d2d2d' : 'none' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => {
              const cells = parseRow(row)
              return (
                <tr key={ri} style={{ borderBottom: '1px solid #2a2a2a' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2a2d2e'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {cells.map((cell, ci) => <td key={ci} className="px-4 py-2 whitespace-nowrap" style={{ color: '#d4d4d4', borderRight: ci < cells.length - 1 ? '1px solid #2a2a2a' : 'none' }}>{cell}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// READABLE OUTPUT
// ─────────────────────────────────────────────────────────────

function inlineFormat(text) {
  const parts = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[0].startsWith('**')) parts.push(<strong key={match.index} className="text-[var(--color-text-primary)] font-semibold">{match[2]}</strong>)
    else if (match[0].startsWith('*')) parts.push(<em key={match.index} className="italic text-[var(--color-text-muted)]">{match[3]}</em>)
    else parts.push(<code key={match.index} className="px-1.5 py-0.5 rounded font-semibold text-base" style={{ background: 'rgba(124,58,237,0.15)', color: '#c084fc' }}>{match[4]}</code>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
}

function parseOutputToBlocks(raw) {
  if (!raw) return []
  const text = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '')
  const lines = text.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { blocks.push({ type: 'spacer' }); i++; continue }
    const fenceMatch = trimmed.match(/^```(\w*)$/)
    if (fenceMatch) {
      const lang = fenceMatch[1] || ''
      const codeLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') { codeLines.push(lines[i]); i++ }
      i++
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') })
      continue
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) { tableRows.push(lines[i]); i++ }
      const meaningful = tableRows.filter(r => !/^\s*\|[\s\-:|]+\|\s*$/.test(r))
      if (meaningful.length >= 1) blocks.push({ type: 'table', rows: meaningful, isMarkdown: true })
      continue
    }
    const commas = (trimmed.match(/,/g) || []).length
    if (commas >= 2) {
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '' && (lines[j].match(/,/g) || []).length === commas) j++
      if (j - i >= 3) { blocks.push({ type: 'table', rows: lines.slice(i, j), isMarkdown: false }); i = j; continue }
    }
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) { blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] }); i++; continue }
    if (/^[-*_]{3,}$/.test(trimmed)) { blocks.push({ type: 'hr' }); i++; continue }
    if (trimmed.startsWith('> ')) { blocks.push({ type: 'quote', text: trimmed.slice(2) }); i++; continue }
    if (/^[-*•]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*•]\s+/, '')); i++ }
      blocks.push({ type: 'ul', items }); continue
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++ }
      blocks.push({ type: 'ol', items }); continue
    }
    blocks.push({ type: 'paragraph', text: trimmed })
    i++
  }
  return blocks
}

function extractText(response) {
  if (!response) return ''
  if (typeof response === 'string') {
    const trimmed = response.trim()
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null) {
        const field = parsed.response ?? parsed.message ?? parsed.output ?? parsed.text ?? parsed.content ?? parsed.result ?? parsed.answer ?? parsed.summary ?? parsed.data
        if (field && typeof field === 'string') return field.trim()
        return Object.entries(parsed).map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}:** ${typeof v === 'object' ? JSON.stringify(v, null, 2) : v}`).join('\n')
      }
    } catch { /* not json */ }
    return trimmed
  }
  if (typeof response === 'object' && response !== null) {
    const field = response.response ?? response.message ?? response.output ?? response.text ?? response.content
    if (field && typeof field === 'string') return field.trim()
    return JSON.stringify(response, null, 2)
  }
  return String(response)
}

function ReadableOutput({ response, success }) {
  const [copied, setCopied] = useState(false)
  const raw = extractText(response)
  if (!raw) return null
  const blocks = parseOutputToBlocks(raw)
  const plainText = raw.replace(/\\n/g, '\n').replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '')

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className={`rounded-xl border overflow-hidden ${success !== false ? 'border-[rgba(147,197,253,0.2)] bg-[rgba(147,197,253,0.02)]' : 'border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.02)]'}`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[rgba(0,0,0,0.35)]">
        <FileText size={13} className="text-[var(--color-star-blue)]" />
        <span className="text-sm font-bold text-[var(--color-star-blue)] ">READABLE OUTPUT</span>
        <button onClick={() => { navigator.clipboard.writeText(plainText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] transition-all cursor-pointer">
          {copied ? <><CheckCircle size={12} className="text-[var(--color-success)]" /> COPIED</> : <><Copy size={12} /> COPY ALL</>}
        </button>
      </div>
      <div className="p-5 space-y-1">
        {blocks.map((block, i) => {
          switch (block.type) {
            case 'spacer': return <div key={i} className="h-2" />
            case 'hr': return <div key={i} className="my-4 h-px" style={{ background: 'rgba(124,58,237,0.2)' }} />
            case 'heading': {
              const sizes = { 1: 'text-xl font-extrabold mt-6 mb-3', 2: 'text-lg font-bold mt-5 mb-2', 3: 'text-base font-bold mt-4 mb-1.5', 4: 'text-[13px] font-bold mt-3 mb-1' }
              const colors = { 1: 'text-[var(--color-text-primary)]', 2: 'text-[var(--color-text-primary)]', 3: 'text-[var(--color-primary)]', 4: 'text-[var(--color-purple-pale)]' }
              return <div key={i} className={`font-display ${sizes[block.level] || sizes[3]} ${colors[block.level] || colors[3]}`}>{inlineFormat(block.text)}</div>
            }
            case 'paragraph': return <p key={i} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{inlineFormat(block.text)}</p>
            case 'quote': return <blockquote key={i} className="border-l-2 pl-4 my-3 text-sm italic text-[var(--color-text-muted)]" style={{ borderColor: 'rgba(124,58,237,0.5)' }}>{inlineFormat(block.text)}</blockquote>
            case 'ul': return <ul key={i} className="my-2 space-y-1.5 ml-1">{block.items.map((item, j) => <li key={j} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] leading-relaxed"><span className="text-[var(--color-primary)] mt-0.5 shrink-0 text-xs">❖</span><span>{inlineFormat(item)}</span></li>)}</ul>
            case 'ol': return <ol key={i} className="my-2 space-y-1.5 ml-1 list-none">{block.items.map((item, j) => <li key={j} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)] leading-relaxed"><span className="font-semibold text-base text-[var(--color-primary)] mt-0.5 shrink-0 min-w-[1.2rem]">{j + 1}.</span><span>{inlineFormat(item)}</span></li>)}</ol>
            case 'code': return <CodeBlock key={i} code={block.content} lang={block.lang} />
            case 'table': return <TableBlock key={i} rows={block.rows} isMarkdown={block.isMarkdown} />
            default: return null
          }
        })}
      </div>
    </motion.div>
  )
}

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
  }, [contracts?.Agentra?.address, agent.contractAgentId, publicClient])

  const monthlyEth = parseFloat(formatUnits(requiredWei.monthly ?? 0n, 18)).toFixed(6)
  const yearlyEth = parseFloat(formatUnits(requiredWei.yearly ?? 0n, 18)).toFixed(6)

  const handlePurchase = async () => {
    if (!contracts?.Agentra) { setError('Smart contracts not found for current network'); return }
    if (!publicClient) { setError('Wallet client unavailable'); return }

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
  }, [contracts?.Agentra?.address, agent.contractAgentId, publicClient])

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

function PurchasePanelUI({ purchaseType, setPurchaseType, monthlyEth, yearlyEth, onPurchase, isPurchasing, error, pendingTx }) {
  const { isConnected } = useAccount()
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
      <NeonButton icon={ShoppingCart} onClick={onPurchase} loading={isPurchasing} disabled={!isConnected} className="w-full justify-center">
        {!isConnected ? 'CONNECT WALLET' : isPurchasing ? 'AWAITING WALLET...' : `PURCHASE ${purchaseType === 'monthly' ? 'MONTHLY' : 'YEARLY'} ACCESS`}
      </NeonButton>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// UPVOTE BUTTON
// ─────────────────────────────────────────────────────────────

function UpvoteButton({ agentId, contractAgentId, ownerWallet, initialUpvotes, walletAddress, isConnected }) {
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
    // DB-only agent — update via API only
    return (
      <div className="glass-card-landing rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-[var(--color-text-dim)] uppercase flex items-center gap-2">
          <Shield size={13} className="text-[var(--color-primary)]" /> Owner Controls
        </h3>
        <p className="text-xs text-[var(--color-text-dim)] font-mono">
          This is a database-only agent. Update pricing and comms via the agent settings.
        </p>
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
 
      {/* Update pricing */}
      <div className="space-y-3">
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
  const { logs, addLog, clearLogs, isExecuting, setExecuting, executionResult, setResult } = useInteractionStore()
  const { address, isConnected, chain } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const contracts = chain?.id ? CHAIN_CONFIG[chain.id]?.contracts : null

  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('execute')
  const [toastMessage, setToastMessage] = useState(null)
  const [hasValidAccess, setHasValidAccess] = useState(false)
  const [accessLoading, setAccessLoading] = useState(false)
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

  const copyEndpoint = () => {
    navigator.clipboard.writeText(agent?.endpoint || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <div className="glass-card-landing rounded-2xl p-6 sm:p-8 relative overflow-hidden ">
            <div className="absolute top-0 right-0 w-[300px] h-[200px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start gap-6">
              <motion.div whileHover={{ scale: 1.05 }} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-accent-pink)] border border-[#d9b6c9] flex items-center justify-center shrink-0">
                <Cpu size={32} className="text-[var(--color-primary)]" />
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
                <div className="flex flex-wrap gap-2 mb-5">
                  {(agent.tags || []).map(tag => <span key={tag} className="px-3 py-1 rounded-lg text-sm font-mono bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.15)] text-[var(--color-purple-pale)]">#{tag}</span>)}
                </div>
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

                {/* Execution Logs */}
                <FadeInSection delay={0.1}>
                  <TerminalBox logs={logs} title={userHasAccess ? 'EXECUTION LOG' : 'SYSTEM LOGS'} />
                </FadeInSection>

                {userHasAccess && (
                  <FadeInSection delay={0.15}>
                    <RunLocallyPanel agentId={externalAgentId} />
                  </FadeInSection>
                )}

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
                    contractAgentId={agent.contractAgentId}
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

                  {/* Readable Output — full width */}
                  <ReadableOutput response={executionResult.output} success={executionResult.success} />

                  {/* Execution complete JSON — full width */}
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



