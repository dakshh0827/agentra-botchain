import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Code2,
  Cpu,
  Database,
  Network,
  Rocket,
  Shield,
  TrendingUp,
  Store,
  Terminal,
  LayoutDashboard,
  Users,
  Globe,
  Lock,
  ChevronDown,
  Twitter,
  Github,
  MessageCircle,
  FileText,
  Gem,
  Loader2,
  Mail
} from 'lucide-react'
import { analyticsAPI } from '../api/analytics'
import { IconBuild, IconDeploy, IconMint, IconRoute, IconExecute, IconSettle } from '../components/WorkflowScrollSection'

const capabilities = [
  { 
    title: 'Verifiable Agent Network', 
    icon: Bot, 
    body: 'Ask query to any on-chain AI agent. Discover models via their tags and transparent execution rules indexed completely without centralised gatekeepers.' 
  },
  { 
    title: 'MCP-Powered Routing', 
    icon: Network, 
    body: 'Connect AI agents to different MCP-compatible services. It manages permissions, usage limits, and automatic failover behind the scenes requests keep working smoothly.'
  },
  { 
    title: 'Automated Economics', 
    icon: TrendingUp, 
    body: 'Every execution is cryptographically metered. Creators and their agents earn tokens per call instantly, with no intermediaries. Full billing history is transparent and auditable.' 
  },
  { 
    title: '0G Storage Backbone', 
    icon: Database, 
    body: 'Heavy metadata, agent configurations, and execution logs are anchored to the 0G storage network ensuring censorship resistance without bloating EVM gas limits.' 
  },
  { 
    title: 'iNFT Asset Standard', 
    icon: Gem, 
    body: 'Every deployed agent is minted as an iNFT (Intelligent NFT). Ownership is wallet-native and fully composable, transforming your AI models into tradeable, revenue-generating assets.' 
  },
  { 
    title: 'Agent-Agent Comms', 
    icon: Cpu, 
    body: 'Build multi-agent pipelines. Deployed agents can independently hire, communicate, and pay each other on-chain to resolve complex tasks without manual orchestration.' 
  },
]

// ── Animated SVG components ────────────────────────────────────────────────

const SVGMarketplace = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
    <defs>
      <linearGradient id="mkt-card1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f7c8e0" />
        <stop offset="100%" stopColor="#e8b4d0" />
      </linearGradient>
      <linearGradient id="mkt-card2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ede4f5" />
        <stop offset="100%" stopColor="#d9c8ef" />
      </linearGradient>
      <linearGradient id="mkt-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0d0e8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#e8d0f5" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Grid background */}
    {[0,1,2,3].map(r => [0,1,2,3,4].map(c => (
      <rect key={`${r}-${c}`} x={20 + c*60} y={10 + r*52} width={52} height={44} rx="8"
        fill={r===1&&c===1 ? 'url(#mkt-card1)' : r===2&&c===3 ? 'url(#mkt-card2)' : '#f5f0f8'}
        stroke="#e8d8f0" strokeWidth="1"
        opacity={r===1&&c===1||r===2&&c===3 ? 1 : 0.5}
      />
    )))}
    {/* Highlighted cards with pulse */}
    <motion.rect x="80" y="62" width="52" height="44" rx="8" fill="url(#mkt-card1)" stroke="#d4a0c4" strokeWidth="1.5"
      animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '106px 84px' }}
    />
    <motion.rect x="200" y="114" width="52" height="44" rx="8" fill="url(#mkt-card2)" stroke="#b8a0d8" strokeWidth="1.5"
      animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      style={{ transformOrigin: '226px 136px' }}
    />
    {/* Bot icons */}
    <text x="96" y="90" fontSize="18" textAnchor="middle" dominantBaseline="middle">🤖</text>
    <text x="216" y="142" fontSize="18" textAnchor="middle" dominantBaseline="middle">⚡</text>
    {/* Floating star badges */}
    <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
      <rect x="84" y="54" width="24" height="12" rx="6" fill="#f9e0f0" stroke="#e0b0d0" strokeWidth="1" />
      <text x="96" y="60" fontSize="7" textAnchor="middle" dominantBaseline="middle" fill="#a06080">★ 4.9</text>
    </motion.g>
    <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
      <rect x="204" y="106" width="24" height="12" rx="6" fill="#ece0f9" stroke="#c8b0e8" strokeWidth="1" />
      <text x="216" y="112" fontSize="7" textAnchor="middle" dominantBaseline="middle" fill="#7050a0">★ 4.8</text>
    </motion.g>
    {/* Search bar */}
    <rect x="30" y="195" width="260" height="18" rx="9" fill="#f0ecf8" stroke="#d8ccea" strokeWidth="1" />
    <text x="44" y="204" fontSize="8" dominantBaseline="middle" fill="#a090b8">Search agents by capability, price, chain…</text>
    <motion.circle cx="280" cy="204" r="5" fill="#d4a8e0"
      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
    />
  </svg>
)

const SVGDeployStudio = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
    <defs>
      <linearGradient id="dep-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f5f0fd" />
        <stop offset="100%" stopColor="#ede4fa" />
      </linearGradient>
    </defs>
    {/* Terminal window */}
    <rect x="20" y="20" width="280" height="160" rx="12" fill="url(#dep-bg)" stroke="#d8ccea" strokeWidth="1.5" />
    {/* Title bar */}
    <rect x="20" y="20" width="280" height="28" rx="12" fill="#e8ddf5" />
    <rect x="20" y="34" width="280" height="14" fill="#e8ddf5" />
    <circle cx="38" cy="34" r="5" fill="#f4a8b8" />
    <circle cx="54" cy="34" r="5" fill="#f8d080" />
    <circle cx="70" cy="34" r="5" fill="#a8d8b0" />
    <text x="155" y="38" fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="#9080b0">deploy-studio - agentra</text>
    {/* Code lines */}
    {[
      { y: 66, w: 140, c: '#c8a8e8', text: '$ agentra deploy ./my-agent' },
      { y: 82, w: 200, c: '#a8c8e8', text: '  ✓ Uploading metadata on chain...' },
      { y: 98, w: 160, c: '#a8c8e8', text: '  ✓ Minting agent NFT...' },
      { y: 114, w: 180, c: '#a8d8b0', text: '  ✓ Agent live at endpoint' },
    ].map((l, i) => (
      <motion.text key={i} x="32" y={l.y} fontSize="9" fill={l.c} fontFamily="monospace"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.6, duration: 0.4, repeat: Infinity, repeatDelay: 3 }}
      >{l.text}</motion.text>
    ))}
    {/* Blinking cursor */}
    <motion.rect x="32" y="128" width="6" height="10" rx="1" fill="#c0a0d8"
      animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}
    />
    {/* Launch rocket */}
    <motion.text x="270" y="155" fontSize="28" textAnchor="middle"
      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >🚀</motion.text>
  </svg>
)

const SVGAgentComms = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
    <defs>
      <linearGradient id="pkt-a" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e0b0d8" />
        <stop offset="100%" stopColor="#b8a0e0" />
      </linearGradient>
      <linearGradient id="pkt-b" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b8a0e0" />
        <stop offset="100%" stopColor="#e0b0d8" />
      </linearGradient>
    </defs>
    {/* Device A */}
    <rect x="20" y="60" width="80" height="100" rx="12" fill="#f5f0fd" stroke="#d0c0ea" strokeWidth="1.5" />
    <rect x="28" y="72" width="64" height="48" rx="6" fill="#ede4f8" />
    <text x="60" y="96" fontSize="20" textAnchor="middle" dominantBaseline="middle">🤖</text>
    <text x="60" y="128" fontSize="8" textAnchor="middle" fill="#9080b0">Agent A</text>
    <rect x="36" y="140" width="48" height="6" rx="3" fill="#d8ccea" />
    <rect x="36" y="150" width="32" height="4" rx="2" fill="#e8d8f8" />
    {/* Device B */}
    <rect x="220" y="60" width="80" height="100" rx="12" fill="#f5f0fd" stroke="#d0c0ea" strokeWidth="1.5" />
    <rect x="228" y="72" width="64" height="48" rx="6" fill="#ede4f8" />
    <text x="260" y="96" fontSize="20" textAnchor="middle" dominantBaseline="middle">⚙️</text>
    <text x="260" y="128" fontSize="8" textAnchor="middle" fill="#9080b0">Agent B</text>
    <rect x="236" y="140" width="48" height="6" rx="3" fill="#d8ccea" />
    <rect x="236" y="150" width="32" height="4" rx="2" fill="#e8d8f8" />
    {/* Data packets A→B */}
    {[0, 0.4, 0.8].map((delay, i) => (
      <motion.g key={`ab-${i}`}
        animate={{ x: [0, 120, 120], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: delay, ease: 'easeInOut' }}
      >
        <rect x="105" y="100" width="14" height="8" rx="4" fill="url(#pkt-a)" />
        <text x="112" y="104" fontSize="6" textAnchor="middle" dominantBaseline="middle" fill="white">0G</text>
      </motion.g>
    ))}
    {/* Data packets B→A */}
    {[0.9, 1.3].map((delay, i) => (
      <motion.g key={`ba-${i}`}
        animate={{ x: [120, 0, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: delay, ease: 'easeInOut' }}
      >
        <rect x="105" y="114" width="14" height="8" rx="4" fill="url(#pkt-b)" />
        <text x="112" y="118" fontSize="6" textAnchor="middle" dominantBaseline="middle" fill="white">OK</text>
      </motion.g>
    ))}
    {/* Connection line */}
    <line x1="100" y1="110" x2="220" y2="110" stroke="#d8ccea" strokeWidth="1" strokeDasharray="6 4" />
    {/* Label */}
    <text x="160" y="188" fontSize="8" textAnchor="middle" fill="#b0a0c8">A2A Protocol · On-chain billing</text>
  </svg>
)

const SVGDashboard = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
    <defs>
      <linearGradient id="bar-grad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#d4a0e0" />
        <stop offset="100%" stopColor="#f0c0e8" />
      </linearGradient>
    </defs>
    {/* Window */}
    <rect x="16" y="16" width="288" height="188" rx="14" fill="#f8f4fe" stroke="#e0d0f0" strokeWidth="1.5" />
    {/* Title bar */}
    <rect x="16" y="16" width="288" height="30" rx="14" fill="#ede4f8" />
    <rect x="16" y="31" width="288" height="15" fill="#ede4f8" />
    <text x="160" y="31" fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="#9080b0">Command Dashboard</text>
    {/* Stat chips */}
    {[
      { x: 24, label: 'Calls', value: '12,480' },
      { x: 120, label: 'Revenue', value: '3,240 Token' },
      { x: 216, label: 'Agents', value: '6 Live' },
    ].map((s) => (
      <g key={s.label}>
        <rect x={s.x} y="54" width="88" height="36" rx="8" fill="#ede4f8" stroke="#d8ccea" strokeWidth="1" />
        <text x={s.x + 44} y="67" fontSize="7" textAnchor="middle" fill="#a090b8">{s.label}</text>
        <text x={s.x + 44} y="80" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#6040a0">{s.value}</text>
      </g>
    ))}
    {/* Bar chart */}
    {[30, 55, 42, 70, 58, 82, 65].map((h, i) => (
      <motion.rect key={i} x={28 + i * 38} y={155 - h} width="24" height={h} rx="4"
        fill="url(#bar-grad)" opacity="0.85"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ delay: i * 0.1, duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        style={{ transformOrigin: `${28 + i * 38 + 12}px 155px` }}
      />
    ))}
    {/* Axis */}
    <line x1="24" y1="155" x2="296" y2="155" stroke="#d8ccea" strokeWidth="1" />
  </svg>
)

const platformFeatures = [
  {
    title: 'Decentralised Agent Explorer',
    desc: 'Query any decentralised, on-chain registered AI agent. Filter by contract hashes, total computations, and on-chain verifications. Every agent is an iNFT with immutable provenance before delegating tasks. No confusing and black-box algorithms.',
    icon: Network, // Consider importing Network from lucide-react instead of Store
    link: '/explorer',
    linkText: 'View Explorer',
    svg: <SVGMarketplace />, // You can keep the SVG, but maybe rename the component later
  },
  {
    title: 'Deploy Studio',
    desc: 'Publish your agent in minutes. Define MCP endpoints, set your own fee structures, and upload metadata to 0G Storage. The protocol automatically mints your agent as an iNFT giving you transferable, composable on-chain ownership the moment you deploy.',
    icon: Terminal,
    link: '/deploy',
    linkText: 'Deploy Agent',
    svg: <SVGDeployStudio />,
  },
  {
    title: 'Agent Communication (A2A Comms)',
    desc: 'Enable native Agent-to-Agent communication. Let deployed agents dynamically hire and pay each other via the on-chain billing layer to complete complex, multi-step tasks no manual orchestration code required, everything is automated.',
    icon: Users,
    link: 'deploy',
    linkText: 'Deploy Agent',
    svg: <SVGAgentComms />,
  },
  {
    title: 'Personal Dashboard',
    desc: 'Monitor your entire agent portfolio in one place. Track total calls, real-time revenue, delegation health, and API key provisioning. Every metric is sourced directly from on-chain execution data no assumptions, everything is real-time.',
    icon: LayoutDashboard,
    link: '/dashboard',
    linkText: 'View Dashboard',
    svg: <SVGDashboard />,
  },
]

const faqs = [
  {
    q: "How does Agentra use 0G Storage?",
    a: "All agent metadata, configuration files, and execution logs are stored on the 0G decentralised storage network. This ensures censorship resistance and permanent availability without bloating the EVM execution layer with heavy data."
  },
  {
    q: "What is the MCP Protocol?",
    a: "The Model Context Protocol (MCP) is a standardised interface for agent communication and task execution. Agentra acts as the routing, access-control, and billing layer on top of any MCP-compatible endpoint you already operate."
  },
  {
    q: "How are agents converted into iNFTs?",
    a: "When you deploy via Deploy Studio, a smart contract automatically mints an ERC-721 NFT representing your agent. This gives the agent real on-chain identity it can be transferred, sold, or licensed just like any digital asset, with ownership history fully verifiable on-chain."
  },
  {
    q: "How do agent payments work?",
    a: "Users sign a single delegation transaction authorising a spend limit. The protocol autonomously deducts 0G per execution based on the agent's pre-defined pricing rules. Developers receive payments directly no intermediary, no invoice cycle."
  },
  {
    q: "What is Agent-to-Agent (A2A) communication?",
    a: "A2A lets your deployed agents autonomously sub-contract tasks to other agents in the registry. Billing flows on-chain between agents in real time, meaning complex multi-agent workflows can be orchestrated and settled without any manual coordination."
  }
]

function Counter({ value }) {
  const numeric = Number(value || 0)
  const [count, setCount] = useState(0)
  useEffect(() => {
    let current = 0
    const target = Number.isFinite(numeric) ? numeric : 0
    const step = Math.max(1, Math.round(target / 40))
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(current)
    }, 22)
    return () => clearInterval(timer)
  }, [numeric])
  return <>{count.toLocaleString()}</>
}

// ── Workflow ───────────────────────────────────────────────────────────────

// ── 1. Workflow Roadmap — a horizontal, winding road with 6 stops ────────
// Icons are the hand-drawn set shared with WorkflowScrollSection, so the
// marker on the road always matches what the step actually does instead of
// a generic lucide glyph.
const ROADMAP_STEPS = [
  {
    Icon: IconBuild, title: 'Build', desc: 'Configure prompts, models & tools in Deploy Studio.',
    points: ['Pick a base model or bring your own', 'Wire up MCP tool access', 'Test runs before going live'],
  },
  {
    Icon: IconDeploy, title: 'Deploy', desc: 'Push the agent live with a single click.',
    points: ['Metadata uploaded to 0G Storage', 'Agent gets a live MCP endpoint', 'Set your own fee structure'],
  },
  {
    Icon: IconMint, title: 'Mint iNFT', desc: 'ERC-7857 mints immutable on-chain ownership.',
    points: ['Provenance recorded on 0G Chain', 'Ownership is transferable & verifiable', 'Fully auditable, no black box'],
  },
  {
    Icon: IconRoute, title: 'Route', desc: 'MCP endpoints handle secure agent access.',
    points: ['Requests authenticated per endpoint', 'Swarms & agents can call each other', 'Rate limits enforced on-chain'],
  },
  {
    Icon: IconExecute, title: 'Execute', desc: 'Users & swarms invoke inferences in real time.',
    points: ['Streaming responses over MCP', 'A2A calls composable in workflows', 'Usage logged for settlement'],
  },
  {
    Icon: IconSettle, title: 'Settle', desc: '0G network meters usage and clears funds.',
    points: ['Pay-per-call billing, no subscriptions', 'Creators paid automatically', 'Full history on your Dashboard'],
  },
]

// The road runs left → right but stays inside one viewport-width — sized
// close to the rendered container (max-w-7xl) so it fits at a scale where
// card text is still legible without any horizontal scrolling.
const ROAD_W = 1380
const SIDE_PADDING = 160
const ROAD_H = 875
const CARD_W = 265
const CARD_H = 240
const MARKER_R = 41
const CONNECT_GAP = 20
const TOP_Y = 345
const BOT_Y = 530
const MARKER_PAD = 11

// Stops alternate top/bottom, evenly spaced along x — a plain, compact
// zigzag with no loops or twists.
const ROAD_POINTS = [
  { x: SIDE_PADDING + 0,    y: TOP_Y },
  { x: SIDE_PADDING + 207,  y: BOT_Y },
  { x: SIDE_PADDING + 414,  y: TOP_Y },
  { x: SIDE_PADDING + 621,  y: BOT_Y },
  { x: SIDE_PADDING + 828,  y: TOP_Y },
  { x: SIDE_PADDING + 1035, y: BOT_Y },
]

// Smooth S-curve through the points. Control points share their endpoint's
// own x, which keeps the curve's x always between the two endpoints — a
// clean zigzag, no bulging loops.
const CURVE = 140 // controls smoothness

const ROAD_PATH = ROAD_POINTS.slice(1).reduce((d, p, i) => {
  const prev = ROAD_POINTS[i]

  return `${d} C 
    ${prev.x + CURVE} ${prev.y}, 
    ${p.x - CURVE} ${p.y}, 
    ${p.x} ${p.y}`
}, `M ${ROAD_POINTS[0].x} ${ROAD_POINTS[0].y}`)

// Doodles read as a "liquid" — small clusters of bonded circles packed
// close together — rather than a "gas" of single specks drifting far apart.
// Molecule is the workhorse; Sparkle/Grass just add texture between clusters.
const Molecule = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.55"
    stroke="var(--color-border-bright)" strokeWidth="2" fill="var(--color-bg-tertiary)">
    <line x1="0" y1="0" x2="20" y2="-12" />
    <line x1="0" y1="0" x2="-16" y2="10" />
    <line x1="20" y1="-12" x2="30" y2="4" />
    <line x1="-16" y1="10" x2="-10" y2="26" />
    <circle cx="0" cy="0" r="7" />
    <circle cx="20" cy="-12" r="5.5" />
    <circle cx="-16" cy="10" r="5" />
    <circle cx="30" cy="4" r="4" />
    <circle cx="-10" cy="26" r="4" />
  </g>
)

const Sparkle = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round">
    <path d="M0 -12v8M0 4v8M-12 0h8M4 0h8M-7 -7l4 4M3 3l4 4M-7 7l4 -4M3 -3l4 -4" />
  </g>
)

const Orbit = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-primary)" strokeWidth="2" fill="none">
    <ellipse cx="0" cy="0" rx="18" ry="8" transform="rotate(-20)" />
    <circle cx="0" cy="0" r="3.5" fill="var(--color-primary)" stroke="none" />
    <circle cx="17" cy="2" r="3" fill="var(--color-bg-tertiary)" />
  </g>
)

const Cube = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-border-bright)" strokeWidth="2" strokeLinejoin="round" fill="var(--color-bg-tertiary)">
    <path d="M0 -14L14 -7V7L0 14L-14 7V-7Z" />
    <path d="M0 -14V0M0 0L14 -7M0 0L-14 -7" />
  </g>
)

const Cloud = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-text-dim)" strokeWidth="2" fill="none" strokeLinecap="round">
    <path d="M-16 6a8 8 0 0 1 2-15.7 10 10 0 0 1 19-2A7 7 0 0 1 16 6Z" />
  </g>
)

const Wave = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-primary)" strokeWidth="2.4" fill="none" strokeLinecap="round">
    <path d="M-20 0C-14 -10 -6 -10 0 0S14 10 20 0" />
  </g>
)

const Ring = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-success)" strokeWidth="2" fill="none">
    <circle cx="0" cy="0" r="14" />
    <circle cx="0" cy="0" r="7" />
  </g>
)

const Coin = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-primary)" strokeWidth="2" fill="var(--color-bg-tertiary)">
    <circle cx="0" cy="0" r="12" />
    <path d="M0 -6V6M-4 -3h6a3 3 0 0 1 0 6h-6M-4 3h7" strokeWidth="1.6" fill="none" />
  </g>
)

const Triangle = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-text-dim)" strokeWidth="2" strokeLinejoin="round" fill="none">
    <path d="M0 -14L14 10H-14Z" />
  </g>
)

const Zigzag = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-border-bright)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-18 8L-9 -8L0 8L9 -8L18 8" />
  </g>
)

const PlusGrid = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-text-dim)" strokeWidth="1.6" strokeLinecap="round">
    {[-12, 0, 12].map((dx) =>
      [-12, 0, 12].map((dy) => (
        <g key={`${dx}-${dy}`} transform={`translate(${dx} ${dy})`}>
          <path d="M-2.5 0h5M0 -2.5v5" />
        </g>
      ))
    )}
  </g>
)

const Diamond = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" fill="var(--color-bg-tertiary)">
    <path d="M0 -14L11 0L0 14L-11 0Z" />
  </g>
)

const Orbit2 = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9"
    stroke="var(--color-success)" strokeWidth="2" fill="none">
    <ellipse cx="0" cy="0" rx="16" ry="16" strokeDasharray="4 5" />
  </g>
)

const Grass = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.9" stroke="var(--color-success)" strokeWidth="2.4" strokeLinecap="round" fill="none">
    <path d="M-8 10C-9 0 -6 -8 -4 -12" />
    <path d="M0 10C0 -2 1 -9 3 -13" />
    <path d="M8 10C9 1 7 -6 5 -11" />
  </g>
)

const Flag = ({ x, y, checkered = false }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 30V0" stroke="var(--color-text-dim)" strokeWidth="2.4" strokeLinecap="round" />
    {checkered ? (
      <g>
        <rect x="0" y="0" width="22" height="16" fill="var(--color-text-primary)" opacity="0.85" />
        {[0, 1, 2, 3].flatMap((r) =>
          [0, 1].map((c) =>
            (r + c) % 2 === 0 ? <rect key={`${r}-${c}`} x={c * 11} y={r * 4} width="11" height="4" fill="var(--color-bg)" /> : null
          )
        )}
      </g>
    ) : (
      <path d="M0 2c8-4 14-4 22 0v14c-8-4-14-4-22 0Z" fill="var(--color-primary)" opacity="0.85" />
    )}
  </g>
)

const DOODLE_FIELD = [
  { type: 'molecule', x: 60,   y: 90,  scale: 0.6 },
  { type: 'molecule', x: 480,  y: 80,  scale: 0.7 },
  { type: 'molecule', x: 920,  y: 90,  scale: 0.85 },
  { type: 'molecule', x: 160,  y: 470, scale: 0.4 },

  { type: 'sparkle', x: 220,  y: 60,  scale: 1 },
  { type: 'sparkle', x: 640,  y: 60,  scale: 0.6 },
  { type: 'sparkle', x: 1150, y: 90,  scale: 0.9 },
  { type: 'sparkle', x: 980,  y: 470, scale: 0.7 },

  { type: 'grass', x: 100,  y: 700, scale: 0.9 },
  { type: 'grass', x: 420,  y: 630, scale: 1 },
  { type: 'grass', x: 780,  y: 200, scale: 0.5 },
  { type: 'grass', x: 1160, y: 690, scale: 0.75 },

  { type: 'orbit', x: 300,  y: 150, scale: 0.8 },
  { type: 'orbit', x: 860,  y: 620, scale: 0.6 },

  { type: 'cube', x: 40,   y: 620, scale: 0.6 },
  { type: 'cube', x: 700,  y: 90,  scale: 0.5 },
  { type: 'cube', x: 1100, y: 300, scale: 0.7 },

  { type: 'cloud', x: 380,  y: 700, scale: 0.7 },
  { type: 'cloud', x: 1000, y: 130, scale: 0.6 },

  { type: 'wave', x: 200,  y: 350, scale: 0.9 },
  { type: 'wave', x: 950,  y: 700, scale: 0.7 },

  { type: 'ring', x: 560,  y: 200, scale: 0.6 },
  { type: 'ring', x: 40,   y: 300, scale: 0.5 },

  { type: 'coin', x: 620,  y: 690, scale: 0.6 },
  { type: 'coin', x: 1180, y: 500, scale: 0.5 },

  { type: 'triangle', x: 360, y: 90,  scale: 0.5 },
  { type: 'triangle', x: 820, y: 660, scale: 0.6 },

  { type: 'zigzag', x: 500,  y: 640, scale: 0.6 },
  { type: 'zigzag', x: 1050, y: 600, scale: 0.5 },

  { type: 'plusgrid', x: 260, y: 650, scale: 0.5 },
  { type: 'plusgrid', x: 1150, y: 200, scale: 0.4 },

  { type: 'diamond', x: 460,  y: 350, scale: 0.5 },
  { type: 'diamond', x: 900,  y: 320, scale: 0.55 },

  { type: 'orbit2', x: 140,  y: 550, scale: 0.7 },
  { type: 'orbit2', x: 1020, y: 60,  scale: 0.6 },
]

const DOODLE_COMPONENTS = {
  molecule: Molecule,
  sparkle: Sparkle,
  grass: Grass,
  orbit: Orbit,
  cube: Cube,
  cloud: Cloud,
  wave: Wave,
  ring: Ring,
  coin: Coin,
  triangle: Triangle,
  zigzag: Zigzag,
  plusgrid: PlusGrid,
  diamond: Diamond,
  orbit2: Orbit2,
}

const DoodleField = () => (
  <g opacity="0.35">
    {DOODLE_FIELD.map((d, i) => {
      const Comp = DOODLE_COMPONENTS[d.type]
      return Comp ? <Comp key={i} x={d.x} y={d.y} scale={d.scale} /> : null
    })}
  </g>
)

const WorkflowRoadmap = () => {
  return (
    <div className="relative">
      {/* Desktop / laptop — the full horizontal road. It's wider than the
          viewport by design, so this shell scrolls sideways natively; below
          `lg` there's no room for that interaction to feel intentional, so
          that breakpoint falls back to a plain stacked list instead. */}
      <div className="hidden lg:block">
        {/* <p className="text-center text-xs uppercase tracking-[0.2em] text-text-dim mb-3">Scroll to follow the road →</p> */}
        <div className="w-full pb-2 px-5">
          <svg 
            viewBox={`0 0 ${ROAD_W} ${ROAD_H}`} 
            className="w-full h-auto block"
            preserveAspectRatio="xMidYMid meet"
          >
            <DoodleField />

            {/* road bed */}
            <path d={ROAD_PATH} fill="none" stroke="var(--color-border-bright)" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            {/* highlighted route, drawn in on scroll */}
            <motion.path
              d={ROAD_PATH}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2.4, ease: 'easeInOut' }}
            />

            <Flag x={2660} y={690} checkered />

            {ROADMAP_STEPS.map((step, i) => {
              const p = ROAD_POINTS[i]
              const isTop = i % 2 === 0
              const cardX = p.x - CARD_W / 2
              const cardY = isTop ? p.y - MARKER_R - CONNECT_GAP - CARD_H : p.y + MARKER_R + CONNECT_GAP
              const lineY1 = isTop ? p.y - MARKER_R : p.y + MARKER_R
              const lineY2 = isTop ? cardY + CARD_H : cardY
              const Icon = step.Icon
              return (
                <g key={step.title}>
                  <line x1={p.x} y1={lineY1} x2={p.x} y2={lineY2} stroke="var(--color-border-bright)" strokeWidth="2" strokeDasharray="3 4" />
                  <foreignObject
                    x={p.x - MARKER_R - MARKER_PAD}
                    y={p.y - MARKER_R - MARKER_PAD}
                    width={MARKER_R * 2 + MARKER_PAD * 2}
                    height={MARKER_R * 2 + MARKER_PAD * 2}
                  >
                    <div className="w-full h-full flex items-center justify-center overflow-visible">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                        className="w-16 h-16 rounded-full bg-bg border-2 border-primary shadow-soft flex items-center justify-center text-primary relative"
                      >
                        <Icon className="w-7 h-7" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                      </motion.div>
                    </div>
                  </foreignObject>
                  <foreignObject x={cardX} y={cardY} width={CARD_W} height={CARD_H}>
                    <motion.div
                      initial={{ opacity: 0, y: isTop ? 20 : -20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 + 0.1, duration: 0.5 }}
                      className="workflow-card h-full rounded-2xl bg-panel p-5 flex flex-col justify-center"
                    >
                      <span className="text-xs font-mono tracking-[0.2em] uppercase text-text-dim mb-1.5">Step {i + 1}</span>
                      <h4 className="text-xl font-display font-bold text-text-primary mb-2 leading-snug">{step.title}</h4>
                      <p className="text-sm text-text-secondary leading-relaxed mb-3">{step.desc}</p>
                      <ul className="space-y-2 w-full">
                        {step.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm text-text-secondary leading-snug">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Tablet / mobile fallback — no room for the road, just the stops */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROADMAP_STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="workflow-card rounded-2xl bg-panel p-5 flex flex-col items-start"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary relative">
              <step.Icon className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
            </div>
            <h4 className="text-base font-display font-bold text-text-primary mb-1">{step.title}</h4>
            <p className="text-xs text-text-secondary leading-relaxed mb-2.5">{step.desc}</p>
            <ul className="space-y-1.5 w-full">
              {step.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-text-secondary leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── 2. The New Tech Stack Diagram Component ──────────────────────────────
const TechStackDiagram = () => {
  return (
    <div className="relative w-full aspect-square max-w-md mx-auto perspective-1000">
      <div className="absolute inset-0 rounded-3xl glass-panel overflow-hidden border border-border shadow-panel">
        <div className="absolute inset-0 line-grid opacity-30 pointer-events-none" />
        
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 p-8">
          
          {/* Layer 1: Client App */}
          <motion.div 
            animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full max-w-[280px] bg-bg/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-soft text-center z-30"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <LayoutDashboard size={14} className="text-text-dim" />
              <p className="font-mono text-xs font-semibold tracking-wide text-text-secondary uppercase">Access Layer</p>
            </div>
            <p className="text-sm font-bold text-text-primary">Agentra Explorer & Client UI</p>
          </motion.div>

          {/* Animated Data Links */}
          <div className="w-px h-8 bg-gradient-to-b from-border via-primary/50 to-border relative">
            <motion.div animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute left-1/2 -translate-x-1/2 w-1.5 h-3 bg-primary rounded-full blur-[1px]" />
          </div>

          {/* Layer 2: Orchestrator */}
          <motion.div 
            animate={{ y: [4, -4, 4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full max-w-[320px] bg-accent-pink/80 backdrop-blur-md border border-primary/30 p-5 rounded-2xl shadow-[0_8px_32px_rgba(172,100,247,0.15)] text-center z-20 relative overflow-hidden"
          >
            <div className="absolute inset-0 dot-grid opacity-20" />
            <div className="flex items-center justify-center gap-2 mb-2 relative z-10">
              <Cpu size={16} className="text-primary-dark" />
              <p className="font-mono text-xs font-bold tracking-widest text-primary-dark uppercase">Orchestration Layer</p>
            </div>
            <p className="text-base font-display font-bold text-text-primary relative z-10">Agentra MCP Router</p>
          </motion.div>

          {/* Animated Data Links */}
          <div className="w-full max-w-[280px] flex justify-between px-6 relative h-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-px h-full bg-gradient-to-b from-border via-primary/30 to-border relative">
                <motion.div animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }} transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }} className="absolute left-1/2 -translate-x-1/2 w-1 h-2 bg-primary-light rounded-full" />
              </div>
            ))}
          </div>

          {/* Layer 3: Base Primitives */}
          <motion.div 
            animate={{ y: [-2, 2, -2] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full max-w-[360px] flex justify-between gap-3 z-10"
          >
            {/* Box 1 */}
            <div className="flex-1 bg-bg-secondary border border-border p-3 rounded-xl shadow-soft text-center flex flex-col items-center justify-center">
              <Database size={16} className="text-text-dim mb-1" />
              <p className="font-mono text-[10px] font-bold text-text-secondary">0G STORAGE</p>
            </div>
            {/* Box 2 */}
            <div className="flex-1 bg-bg-secondary border border-border p-3 rounded-xl shadow-soft text-center flex flex-col items-center justify-center">
              <Gem size={16} className="text-text-dim mb-1" />
              <p className="font-mono text-[10px] font-bold text-text-secondary">iNFT REGISTRY</p>
            </div>
            {/* Box 3 */}
            <div className="flex-1 bg-bg-secondary border border-border p-3 rounded-xl shadow-soft text-center flex flex-col items-center justify-center">
              <Lock size={16} className="text-text-dim mb-1" />
              <p className="font-mono text-[10px] font-bold text-text-secondary">EVM BILLING</p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}


// const PastelWaveBackground = () => (
//   <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
//     <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
//       xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
//       <defs>
//         <linearGradient id="wave-pink" x1="0" y1="0" x2="1" y2="0">
//           <stop offset="0%" stopColor="#f8cfe8" stopOpacity="0.46" />
//           <stop offset="55%" stopColor="#efc6ec" stopOpacity="0.3" />
//           <stop offset="100%" stopColor="#f8cfe8" stopOpacity="0.08" />
//         </linearGradient>
//         <linearGradient id="wave-purple" x1="0" y1="0" x2="1" y2="0">
//           <stop offset="0%" stopColor="#e5cffc" stopOpacity="0.5" />
//           <stop offset="50%" stopColor="#dcc6f8" stopOpacity="0.32" />
//           <stop offset="100%" stopColor="#e5cffc" stopOpacity="0.06" />
//         </linearGradient>
//         <linearGradient id="wave-mix" x1="0" y1="0" x2="1" y2="0">
//           <stop offset="0%" stopColor="#f2cbe9" stopOpacity="0.28" />
//           <stop offset="50%" stopColor="#ddc6f5" stopOpacity="0.22" />
//           <stop offset="100%" stopColor="#efc8ed" stopOpacity="0.12" />
//         </linearGradient>
//         <filter id="ribbon-blur">
//           <feGaussianBlur stdDeviation="28" />
//         </filter>
//       </defs>

//       {/* Prism-like dispersion waves in pink/purple pastels only */}
//       <path d="M -180 120 C 120 40, 340 220, 620 130 C 860 56, 1120 210, 1620 110"
//         stroke="url(#wave-pink)" strokeWidth="140" strokeLinecap="round" fill="none" filter="url(#ribbon-blur)" />
//       <path d="M -200 310 C 130 186, 380 430, 670 300 C 925 186, 1180 370, 1640 250"
//         stroke="url(#wave-purple)" strokeWidth="120" strokeLinecap="round" fill="none" filter="url(#ribbon-blur)" />
//       <path d="M -160 528 C 190 420, 412 690, 730 554 C 980 444, 1260 660, 1660 538"
//         stroke="url(#wave-mix)" strokeWidth="130" strokeLinecap="round" fill="none" filter="url(#ribbon-blur)" />
//       <path d="M -220 760 C 110 640, 360 880, 640 746 C 900 620, 1180 790, 1600 694"
//         stroke="url(#wave-purple)" strokeWidth="96" strokeLinecap="round" fill="none" filter="url(#ribbon-blur)" />
//     </svg>
//   </div>
// )

// ── FAQ ─────────────────────────────────────────────────────────────────────

const FAQItem = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="glass-panel rounded-xl overflow-hidden transition-all duration-300 mb-3">
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none">
        <span className="font-semibold text-[1.05rem] text-text-primary">{faq.q}</span>
        <ChevronDown className={`transform transition-transform duration-300 text-primary ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </button>
      <div className={`px-6 text-text-secondary text-base leading-relaxed overflow-hidden transition-all duration-300 ease-in-out text-left ${isOpen ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
        {faq.a}
      </div>
    </div>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="relative z-10 border-t border-border mt-4 bg-bg-secondary/60">
    <div className="max-w-7xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-3 gap-10">
      {/* Brand */}
      <div className="col-span-2 md:col-span-1">
        <p className="text-lg font-semibold uppercase tracking-widest text-primary mb-3">Agentra</p>
        <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
          The open infrastructure for building, publishing, and monetising AI agents powered by Blockchain, 0G Storage, and iNFTs ownership.
        </p>
        <div className="flex gap-3 mt-5">
          {[
            { icon: Twitter, href: 'https://x.com/Agentra69', label: 'Twitter' },
            { icon: Github, href: 'https://github.com/dakshh0827/agentra-0G', label: 'GitHub' },
            { icon: Mail, href: 'https://mail.google.com/mail/?view=cm&fs=1&to=agentra69@gmail.com', label: 'Mail' },
            { icon: FileText, href: 'https://docs.0g.ai', label: 'Docs' },
          ].map(({ icon: Icon, href, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-primary hover:border-border-bright hover:text-text-primary transition-colors">
              <Icon size={14} />
            </a>
          ))}
        </div>
      </div>

      {/* Product */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-4">Product</p>
        <ul className="space-y-2.5">
          {[
            { name: 'Explorer', to: '/explorer' },
            { name: 'Deploy Studio', to: '/deploy' },
            { name: 'Dashboard', to: '/dashboard' },
          ].map(link => (
            <li key={link.name}>
              {link.to.startsWith('/') ? (
                <Link to={link.to} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  {link.name}
                </Link>
              ) : (
                <a href={link.to} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  {link.name}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Developers */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-4">Developers</p>
        <ul className="space-y-2.5">
          {[
            { name: 'Documentation', href: 'https://docs.0g.ai/' },
            { name: 'MCP Protocol', href: 'https://modelcontextprotocol.io/docs/getting-started/intro' },
            { name: '0G Storage', href: 'https://docs.0g.ai/concepts/storage' }
          ].map(link => (
            <li key={link.name}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-border px-5 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-xs text-text-dim">© {new Date().getFullYear()} Agentra. All rights reserved.</p>
      <div className="flex gap-6">
        {['Privacy', 'Terms', 'Cookies'].map(l => (
          <a key={l} href="#" className="text-xs text-text-dim hover:text-text-secondary transition-colors">{l}</a>
        ))}
      </div>
    </div>
  </footer>
)

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  useEffect(() => {
    setStatsLoading(true)
    analyticsAPI.getGlobalStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const quickStats = useMemo(() => ([
    { label: 'Agents Deployed', value: stats?.totalAgents ?? 0, suffix: '+' },
    { label: 'Total Calls', value: stats?.totalCalls ?? 0, suffix: '+' },
    { label: 'Live Agents', value: stats?.activeAgents ?? 0, suffix: '' },
    { label: 'Chain', value: 'Token', suffix: '' },
  ]), [stats])

  return (
    <div className="relative min-h-screen bg-bg text-text-primary overflow-hidden">
      {/* Pastel gradient wave background */}
      {/* <PastelWaveBackground /> */}

      {/* Floating Blobs */}
      <motion.div className="absolute -top-16 left-[8%] w-28 h-28 rounded-full bg-accent-pink border border-[#ddc0d0]"
        animate={{ y: [0, 16, 0], x: [0, 10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[32%] right-[7%] w-20 h-20 rounded-full bg-[#f3e3d8] border border-[#e6d2c2]"
        animate={{ y: [0, -14, 0], x: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-24 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="lg:col-span-8 glass-panel rounded-2xl px-7 py-10 text-left relative overflow-hidden">
            {/* Subtle background texture */}
            <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
            
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Web3 Network Infrastructure on BOT Chain</p>
              <h1 className="text-5xl sm:text-6xl font-display font-semibold leading-[1.05] tracking-tight text-text-primary text-left">
                You built the Agent. <br/><span className="gradient-text-purple">We made it an Asset.</span>
              </h1>
              <p className="mt-5 text-lg text-text-secondary max-w-2xl text-left font-body">
                Agentra is the infrastructure where creators deploy AI agents as iNFTs, allowing users to seamlessly interact with these on-chain machines. We turn agents into assets. Pure execution, platform where both creators and their agents get paid.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/explorer" className="btn-primary px-7 py-3.5 rounded-xl inline-flex items-center gap-2 text-sm tracking-wide">
                  Explore the Network <ArrowRight size={16} />
                </Link>
                <Link to="/deploy" className="btn-outline-glow px-7 py-3.5 rounded-xl inline-flex items-center gap-2 text-sm tracking-wide">
                  <Code2 size={16} /> Deploy Agent
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Video / Visual Hero side */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
            className="lg:col-span-4 rounded-2xl border border-border bg-bg-secondary p-2 shadow-soft">
            <div className="w-full h-full rounded-xl overflow-hidden relative">
               {/* Ensure your video looks good on light mode, or use a lighter placeholder */}
              <video autoPlay loop muted playsInline className="w-full h-full object-cover mix-blend-multiply opacity-80">
                <source src="/videos/earth.mp4" type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((item, idx) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="glass-card-landing rounded-xl px-5 py-6 text-left">
              <div className="text-3xl font-display font-semibold tracking-tight gradient-text-purple">
                {statsLoading ? <Loader2 size={24} className="animate-spin text-primary" /> : (typeof item.value === 'number' ? <Counter value={item.value} /> : item.value)}{statsLoading ? '' : item.suffix}
              </div>
              <div className="mt-2 text-xs uppercase tracking-widest text-text-dim font-medium">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SCROLL STRIP — faster, slimmer */}
      <section className="relative z-10 py-3 border-y border-border bg-bg-secondary overflow-hidden">
        <motion.div className="flex whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
                  {[...Array(2)].map((_, i) => (
            <div key={i} className="inline-flex items-center gap-6 min-w-full justify-around px-4">
              {['MCP Protocol', 'iNFT Ownership', 'Delegation Billing', 'Agent Swarms', 'On-chain Access', '0G Storage', 'BOT Revenue', 'A2A Comms'].map(t => (
                <span key={t} className="text-xs font-medium text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-pink inline-block" />{t}
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </section>

      {/* CAPABILITIES */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 py-16">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
          <div className="text-left">
            <h2 className="text-3xl font-semibold tracking-tight">Agentra Capabilities</h2>
            <p className="mt-2 text-text-secondary">The core features powering the Agentra infrastructure.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {capabilities.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div key={item.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.32, delay: idx * 0.05 }}
                className="rounded-xl border border-border bg-panel px-5 py-5 hover:border-border-bright transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-accent-pink border border-[#d9b6c9] flex items-center justify-center mb-4">
                  <Icon size={17} className="text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-md text-text-secondary leading-relaxed">{item.body}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

              {/* WORKFLOW */}
        <section className="relative z-10 w-full border-t border-border section-light">
          <div className="max-w-[84rem] mx-auto px-5 py-20">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl font-display font-semibold tracking-tight mb-3">Protocol Lifecycle</h2>
            <p className="text-text-secondary text-lg">How agents, creators, and users exchange value inside the Agentra network.</p>
          </div>
          <WorkflowRoadmap />
        </div>
      </section>

      {/* THE PLATFORM — alternating layout */}
      <section className="relative z-10 w-full border-t border-border section-cream">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <div className="max-w-2xl mb-16 text-left">
            <h2 className="text-3xl font-display font-semibold tracking-tight">Deepdive into AGENTRA</h2>
            <p className="mt-3 text-lg text-text-secondary">
              Everything you need "to launch, manage, and scale AI agents" is built into a single, cohesive infrastructure provided by AGENTRA.
            </p>
          </div>

          <div className="flex flex-col gap-24">
            {platformFeatures.map((feat, i) => {
              const isEven = i % 2 === 0
              return (
                <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.45 }}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-10 lg:gap-16`}>
                  {/* Text side */}
                  <div className="flex-1 text-left">
                    <div className="w-12 h-12 rounded-xl bg-accent-pink border border-primary-light flex items-center justify-center mb-6 shadow-soft">
                      <feat.icon size={20} className="text-primary-dark" />
                    </div>
                    <h3 className="text-3xl font-display font-bold mb-4 text-text-primary">{feat.title}</h3>
                    <p className="text-text-secondary text-lg leading-relaxed mb-6">{feat.desc}</p>
                    <Link to={feat.link} className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
                      {feat.linkText} <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </div>
                  {/* SVG side */}
                  <div className="flex-1 w-full flex items-center justify-center min-h-55">
                    {feat.svg}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TECHNICAL INFRASTRUCTURE */}
      <section className="relative z-10 w-full py-20 border-t border-border section-light">
        <div className="max-w-7xl mx-auto px-5">
          <div className="section-highlight rounded-3xl border border-border p-8 lg:p-14 shadow-panel">
            <div className="flex flex-col lg:flex-row items-center gap-14">
              <div className="lg:w-1/2 text-left">
                <h2 className="text-3xl font-display font-semibold tracking-tight mb-4 text-text-primary">Powered by 0G & Web3</h2>
                <p className="text-text-secondary mb-10 text-lg">
                  Agentra leverages decentralised features so you never depend on a centralised orchestrator holding your API keys or Agent IP.
                </p>
                <ul className="space-y-8">
                  <li className="flex gap-4">
                    <div className="shrink-0 mt-1"><Globe className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h4 className="font-semibold text-lg text-text-primary text-left">0G Storage Integration</h4>
                      <p className="text-base text-text-secondary mt-1 text-left">Agent metadata, configurations, and execution logs are pinned to the 0G network all verifiable, permanent, and gas-free on the execution layer.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="shrink-0 mt-1"><Lock className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h4 className="font-semibold text-lg text-text-primary text-left">Smart Contract Delegation</h4>
                      <p className="text-base text-text-secondary mt-1 text-left">Users sign once to authorise a spend limit. The protocol autonomously meters and bills each execution on-chain, paying developers in real time.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="shrink-0 mt-1"><Gem className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h4 className="font-semibold text-lg text-text-primary text-left">Agents as iNFTs</h4>
                      <p className="text-base text-text-secondary mt-1 text-left">Every deployed agent is minted as an ERC-721 iNFT. Ownership is wallet-native, fully transferable, and composable a real, tradeable on-chain asset.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="lg:w-1/2 relative w-full flex items-center justify-center">
                <TechStackDiagram /> {/* <--- REPLACED HERE */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 w-full py-20 border-t border-border section-cream">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-3xl font-display font-semibold tracking-tight text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => <FAQItem key={idx} faq={faq} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      {/* <section className="relative z-10 max-w-7xl mx-auto px-5 pb-16">
        <div className="rounded-2xl border border-border-bright bg-panel px-6 py-7 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
          <div className="text-left">
            <h3 className="text-2xl font-semibold tracking-tight">Ship your first revenue-ready agent today.</h3>
            <p className="mt-1 text-sm text-text-secondary">Deploy from Studio, mint your agent NFT, and start earning 0G in minutes.</p>
          </div>
          <Link to="/deploy" className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2 text-sm shadow-md hover:shadow-lg transition-shadow">
            <Rocket size={14} /> Start Building
          </Link>
        </div>
      </section> */}

      {/* FOOTER */}
      <Footer />
    </div>
  )
}
