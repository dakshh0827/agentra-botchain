import {
  Globe2, Type, Braces, Megaphone, ShieldCheck, Hash, Gauge, ListChecks,
  Terminal, MessageSquare, FileText, Code2, Bug, Database, Brain,
  Coins, LineChart, Salad, Stethoscope, Cpu, Lock, Sparkles, Workflow,
  Search, BookOpen, Network,
} from 'lucide-react'

function blobOf(agent) {
  return `${agent?.name || ''} ${agent?.description || ''} ${(agent?.tags || []).join(' ')}`.toLowerCase()
}

function isSeoAgent(agent) {
  return /\bseo\b/i.test(blobOf(agent))
}

const SEO_FEATURES = [
  { icon: Globe2, title: 'Live crawl', blurb: 'robots.txt, sitemap, sampled pages', wrap: 'bg-sky-500' },
  { icon: Type, title: 'On-page SEO', blurb: 'Titles, meta, H1s, alt text', wrap: 'bg-amber-500' },
  { icon: Braces, title: 'Schema markup', blurb: 'JSON-LD & structured data', wrap: 'bg-teal-600' },
  { icon: Megaphone, title: 'Social tags', blurb: 'Open Graph & Twitter cards', wrap: 'bg-rose-500' },
  { icon: ShieldCheck, title: 'Tech signals', blurb: 'noindex, lang, internal links', wrap: 'bg-indigo-600' },
  { icon: Hash, title: 'Topic phrases', blurb: 'From titles & headings', wrap: 'bg-emerald-600' },
  { icon: Gauge, title: 'Core Web Vitals', blurb: 'LCP / CLS when measured', wrap: 'bg-orange-500' },
  { icon: ListChecks, title: 'Scored report', blurb: 'Category scores + fix plan', wrap: 'bg-slate-700' },
]

/** Category packs — first signal when the agent is not SEO. */
const BY_CATEGORY = {
  Analysis: [
    { icon: LineChart, title: 'Pattern analysis', blurb: 'Finds trends and anomalies in input data', wrap: 'bg-sky-600' },
    { icon: Search, title: 'Deep inspection', blurb: 'Breaks problems into measurable signals', wrap: 'bg-indigo-600' },
    { icon: FileText, title: 'Insight report', blurb: 'Structured findings you can act on', wrap: 'bg-slate-700' },
    { icon: Brain, title: 'Reasoned output', blurb: 'Explains why a conclusion was reached', wrap: 'bg-violet-600' },
  ],
  Development: [
    { icon: Code2, title: 'Code generation', blurb: 'Writes and scaffolds implementation work', wrap: 'bg-emerald-600' },
    { icon: Bug, title: 'Review & debug', blurb: 'Spots faults and suggests fixes', wrap: 'bg-rose-500' },
    { icon: Workflow, title: 'Multi-language', blurb: 'Works across common stacks and formats', wrap: 'bg-sky-600' },
    { icon: Terminal, title: 'Task execution', blurb: 'Runs concrete build / refactor prompts', wrap: 'bg-slate-700' },
  ],
  Security: [
    { icon: ShieldCheck, title: 'Threat scan', blurb: 'Looks for risky patterns and exposures', wrap: 'bg-rose-600' },
    { icon: Lock, title: 'Hardening tips', blurb: 'Practical fixes ranked by severity', wrap: 'bg-amber-600' },
    { icon: Bug, title: 'Audit checklist', blurb: 'Maps findings to common security baselines', wrap: 'bg-slate-700' },
    { icon: Search, title: 'Contract / code review', blurb: 'Inspects logic paths callers miss', wrap: 'bg-indigo-600' },
  ],
  Data: [
    { icon: Database, title: 'Data shaping', blurb: 'Cleans, joins, and structures raw inputs', wrap: 'bg-teal-600' },
    { icon: LineChart, title: 'Metric summaries', blurb: 'Turns tables into readable takeaways', wrap: 'bg-sky-600' },
    { icon: Braces, title: 'Schema aware', blurb: 'Respects fields and types when present', wrap: 'bg-indigo-600' },
    { icon: FileText, title: 'Export-ready output', blurb: 'Results formatted for downstream tools', wrap: 'bg-slate-700' },
  ],
  NLP: [
    { icon: Brain, title: 'Language understanding', blurb: 'Parses intent, tone, and entities', wrap: 'bg-violet-600' },
    { icon: BookOpen, title: 'Summaries & rewrite', blurb: 'Compresses or restyles long text', wrap: 'bg-sky-600' },
    { icon: MessageSquare, title: 'Conversational replies', blurb: 'Answers follow-ups in context', wrap: 'bg-emerald-600' },
    { icon: Hash, title: 'Topic extraction', blurb: 'Pulls themes and keywords from copy', wrap: 'bg-amber-600' },
  ],
  Web3: [
    { icon: Network, title: 'On-chain aware', blurb: 'Works with wallet and network context', wrap: 'bg-indigo-600' },
    { icon: Coins, title: 'DeFi / token logic', blurb: 'Strategies, balances, and risk framing', wrap: 'bg-amber-600' },
    { icon: ShieldCheck, title: 'Contract signals', blurb: 'Highlights risky calls and approvals', wrap: 'bg-rose-500' },
    { icon: LineChart, title: 'Market framing', blurb: 'Positions advice against live conditions', wrap: 'bg-teal-600' },
  ],
  Other: [
    { icon: Sparkles, title: 'Specialized skill', blurb: 'Tuned for this agent’s stated job', wrap: 'bg-violet-600' },
    { icon: Terminal, title: 'Task execution', blurb: 'Runs prompts against its endpoint', wrap: 'bg-slate-700' },
    { icon: MessageSquare, title: 'Follow-ups', blurb: 'Continue after a finished run', wrap: 'bg-sky-600' },
    { icon: FileText, title: 'Deliverables', blurb: 'Returns text or downloadable artifacts', wrap: 'bg-emerald-600' },
  ],
}

/** Tag / keyword overlays — swapped in when the blob matches. */
const TAG_OVERLAYS = [
  {
    test: /\b(diet|nutrition|food|calorie|meal)\b/i,
    features: [
      { icon: Salad, title: 'Meal guidance', blurb: 'Plans and swaps based on your goals', wrap: 'bg-emerald-600' },
      { icon: Stethoscope, title: 'Health-aware tips', blurb: 'Flags obvious dietary cautions', wrap: 'bg-rose-500' },
      { icon: LineChart, title: 'Macro tracking help', blurb: 'Breaks intake into usable numbers', wrap: 'bg-sky-600' },
      { icon: BookOpen, title: 'Habit coaching', blurb: 'Simple routines you can keep', wrap: 'bg-amber-600' },
    ],
  },
  {
    test: /\b(architect|architecture|system design|software)\b/i,
    features: [
      { icon: Cpu, title: 'System design', blurb: 'Structures services, APIs, and trade-offs', wrap: 'bg-indigo-600' },
      { icon: Workflow, title: 'Architecture review', blurb: 'Stress-tests scaling and coupling', wrap: 'bg-sky-600' },
      { icon: Code2, title: 'Tech choices', blurb: 'Compares stacks for the problem', wrap: 'bg-emerald-600' },
      { icon: FileText, title: 'Design notes', blurb: 'Clear diagrams-in-words for the team', wrap: 'bg-slate-700' },
    ],
  },
  {
    test: /\b(coder|code|dev|programming|llm)\b/i,
    features: [
      { icon: Code2, title: 'Write code', blurb: 'Implements features from a brief', wrap: 'bg-emerald-600' },
      { icon: Bug, title: 'Fix & review', blurb: 'Debugs and tightens existing code', wrap: 'bg-rose-500' },
      { icon: Brain, title: 'LLM-assisted reasoning', blurb: 'Explains approaches before shipping', wrap: 'bg-violet-600' },
      { icon: Terminal, title: 'Promptable tasks', blurb: 'Takes concrete engineering asks', wrap: 'bg-slate-700' },
    ],
  },
  {
    test: /\b(defi|yield|liquidity|token)\b/i,
    features: [
      { icon: Coins, title: 'Yield strategies', blurb: 'Frames pools, APYs, and risk bands', wrap: 'bg-amber-600' },
      { icon: LineChart, title: 'Position outlook', blurb: 'Summarizes upside vs drawdown', wrap: 'bg-sky-600' },
      { icon: ShieldCheck, title: 'Risk flags', blurb: 'Calls out leverage and smart-contract risk', wrap: 'bg-rose-500' },
      { icon: Network, title: 'Chain context', blurb: 'Keeps advice tied to the network you use', wrap: 'bg-indigo-600' },
    ],
  },
  {
    test: /\b(nlp|language|chat|translate)\b/i,
    features: [
      { icon: Brain, title: 'NLP pipeline', blurb: 'Understands and transforms language', wrap: 'bg-violet-600' },
      { icon: BookOpen, title: 'Summarize / rewrite', blurb: 'Shortens or restyles long text', wrap: 'bg-sky-600' },
      { icon: Hash, title: 'Entity & topics', blurb: 'Extracts people, places, themes', wrap: 'bg-amber-600' },
      { icon: MessageSquare, title: 'Dialogue ready', blurb: 'Handles multi-turn questions', wrap: 'bg-emerald-600' },
    ],
  },
]

function uniqueByTitle(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (seen.has(item.title)) return false
    seen.add(item.title)
    return true
  })
}

/**
 * Feature cards for preview / Features tab — per agent, not one generic list.
 */
export function featuresForAgent(agent) {
  if (!agent) return BY_CATEGORY.Other

  if (isSeoAgent(agent)) return SEO_FEATURES

  const blob = blobOf(agent)
  const category = agent.category && BY_CATEGORY[agent.category] ? agent.category : 'Other'

  for (const overlay of TAG_OVERLAYS) {
    if (overlay.test.test(blob)) {
      return uniqueByTitle(overlay.features).slice(0, 6)
    }
  }

  const base = [...(BY_CATEGORY[category] || BY_CATEGORY.Other)]

  // Fold tags into blurbs so two "Analysis" agents still feel distinct.
  const tags = (agent.tags || []).filter(Boolean).slice(0, 3)
  if (tags.length && base[0]) {
    base[0] = {
      ...base[0],
      blurb: `${base[0].blurb} · tags: ${tags.join(', ')}`,
    }
  }

  const name = (agent.name || 'This agent').trim()
  base.push({
    icon: Sparkles,
    title: `${name.split(/\s+/)[0]} specialty`,
    blurb: (agent.description || 'Specialized execution for this marketplace agent.').slice(0, 90),
    wrap: 'bg-violet-600',
  })

  return uniqueByTitle(base).slice(0, 6)
}

export { isSeoAgent, SEO_FEATURES }
