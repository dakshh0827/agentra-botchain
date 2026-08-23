import {
  Globe2, Type, Braces, Megaphone, ShieldCheck, Hash, Gauge, ListChecks,
  Terminal, MessageSquare, FileText, Code2, Bug, Database, Brain,
  Coins, LineChart, Cpu, Lock, Sparkles, Workflow, Search, BookOpen, Network,
  FileDown, FileSpreadsheet, Table2, Image, Download, Package,
} from 'lucide-react'

import { featuresForAgent, isSeoAgent } from './agentFeatures'


const ICONS = {
  globe: Globe2, type: Type, braces: Braces, megaphone: Megaphone,
  shield: ShieldCheck, hash: Hash, gauge: Gauge, checklist: ListChecks,
  terminal: Terminal, chat: MessageSquare, text: FileText, code: Code2,
  bug: Bug, database: Database, brain: Brain, coins: Coins,
  chart: LineChart, cpu: Cpu, lock: Lock, sparkles: Sparkles,
  workflow: Workflow, search: Search, book: BookOpen, network: Network,
  html: FileText, pdf: FileDown, excel: FileSpreadsheet, csv: Table2,
  image: Image, download: Download, package: Package,
}

export function iconFor(name, fallback = Sparkles) {
  return ICONS[String(name || '').toLowerCase()] || fallback
}


const WRAPS = ['bg-sky-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-500', 'bg-indigo-600']

const DELIVERABLE_TONES = {
  html: 'text-sky-700 bg-sky-50 border-sky-200',
  pdf: 'text-rose-700 bg-rose-50 border-rose-200',
  excel: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  csv: 'text-green-800 bg-green-50 border-green-200',
}
const DEFAULT_TONE = 'text-slate-700 bg-slate-50 border-slate-200'


const SEO_LEGACY = {
  multiRun: true,
  inputHint: 'e.g. crawl 10 pages on example.com · technical SEO only for mysite.com · compare a.com with b.com',
  readyMessage: 'Name a site to audit — then ask follow-ups about the report.',
  featuresTitle: 'What it checks',
  featuresBlurb: 'Measured from a live crawl — not invented rankings or backlinks.',
  deliverables: [
    { key: 'reportUrl', label: 'Report', hint: 'HTML', icon: 'html' },
    { key: 'pdfUrl', label: 'PDF', hint: 'Print', icon: 'pdf' },
    { key: 'excelUrl', label: 'Excel', hint: '.xlsx', icon: 'excel' },
    { key: 'csvUrl', label: 'Sheets', hint: '.csv', icon: 'csv' },
  ],
  report: {
    scoreField: 'overall',
    scoreMax: 100,
    titleField: 'host',
    subtitleField: 'pagesCrawled',
    subtitleLabel: 'page(s) crawled',
    countsField: 'counts',
    countsInclude: ['critical', 'warnings'],
    categoriesField: 'categories',
    noticeField: 'selfCheckFailed',
  },
}

const GENERIC_LEGACY = {
  multiRun: false,
  inputHint: 'Describe what you want this agent to do…',
  readyMessage: 'Send a concrete task to run.',
  featuresTitle: 'What this agent does',
  featuresBlurb: 'Derived from this agent’s category, tags, and description — not a shared template.',
  deliverables: [],
  report: { scoreMax: 100 },
}

function normalizeDeliverables(list) {
  return (list || []).map((d) => ({
    key: d.key,
    label: d.label,
    hint: d.hint || '',
    Icon: iconFor(d.icon, Download),
    tone: DELIVERABLE_TONES[String(d.icon || '').toLowerCase()] || DEFAULT_TONE,
  }))
}

function normalizeFeatures(declared, agent) {
  // A declaration replaces the heuristics wholesale; without one we keep deriving
  // cards from category and tags, which is still better than a shared template.
  if (!declared?.length) return featuresForAgent(agent)
  return declared.map((f, i) => ({
    icon: iconFor(f.icon),
    title: f.title,
    blurb: f.blurb || '',
    wrap: WRAPS[i % WRAPS.length],
  }))
}

/**
 * Resolve the UI contract for an agent. Always returns a usable object — callers
 * never need to null-check.
 */
export function capabilitiesFor(agent) {
  // Three tiers, most trustworthy first: what the agent said about itself, what its
  // own results showed us, and a guess from its name and category.
  const declared = agent?.capabilities || null
  const inferred = agent?.inferredCapabilities || null
  const legacy = isSeoAgent(agent) ? SEO_LEGACY : GENERIC_LEGACY

  // Inference reads result shape, never prose — it has no idea what the input hint
  // should say. So an inferred contract is layered *over* the legacy copy rather than
  // replacing it, or an agent would trade a wrong result card for wrong wording.
  // multiRun is held back for the same reason: only an author can answer it.
  const base = declared || (inferred ? { ...legacy, ...inferred, multiRun: legacy.multiRun } : legacy)

  return {
    declared: !!declared,
    inferred: !declared && !!inferred,
    multiRun: base.multiRun ?? false,
    inputHint: base.inputHint || legacy.inputHint || GENERIC_LEGACY.inputHint,
    readyMessage: base.readyMessage || legacy.readyMessage || GENERIC_LEGACY.readyMessage,
    featuresTitle: base.featuresTitle || legacy.featuresTitle || GENERIC_LEGACY.featuresTitle,
    featuresBlurb: base.featuresBlurb || legacy.featuresBlurb || GENERIC_LEGACY.featuresBlurb,
    deliverables: normalizeDeliverables(base.deliverables),
    report: { scoreMax: 100, ...(base.report || {}) },
    // Feature cards are copy too, so they keep coming from the heuristics unless an
    // author wrote them out.
    features: normalizeFeatures(declared?.features, agent),
  }
}

/**
 * Pull the display values out of a result payload using the agent's declared field
 * names. Keeps every "which key holds the score" decision in one place.
 */
export function readReport(report, shape) {
  if (!report) return null

  const pick = (field) => (field && report[field] !== undefined ? report[field] : undefined)
  const counts = pick(shape.countsField)
  const categories = pick(shape.categoriesField)
  const notice = pick(shape.noticeField)

  return {
    score: Number(pick(shape.scoreField) ?? NaN),
    scoreMax: shape.scoreMax || 100,
    title: pick(shape.titleField) ?? report.title ?? report.name ?? '',
    subtitle: pick(shape.subtitleField),
    subtitleLabel: shape.subtitleLabel || '',
    counts: counts && typeof counts === 'object' ? counts : null,
    countsInclude: Array.isArray(shape.countsInclude) ? shape.countsInclude : null,
    categories: Array.isArray(categories) ? categories : null,
    hasNotice: Array.isArray(notice) ? notice.length > 0 : !!notice,
    notice: typeof notice === 'string' ? notice : null,
  }
}

export { isSeoAgent }
