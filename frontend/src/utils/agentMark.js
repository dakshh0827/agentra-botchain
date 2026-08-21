import {
  Activity, Bot, Braces, Code2, Cpu, Database, Globe, HeartPulse,
  Mail, PenLine, Search, Shield, Sparkles,
} from 'lucide-react'


const NAME_MARKS = [
  [/\bseo\b|search|crawl/i, Search],
  [/\bses\b|mail|email|newsletter/i, Mail],
  [/secur|audit|guard|pentest/i, Shield],
  [/diet|health|fitness|nutri|medic/i, HeartPulse],
  [/cod(e|er|ing)|dev\b|engineer|architect/i, Code2],
  [/data|analytic|report|insight/i, Database],
  [/writ|content|copy|blog/i, PenLine],
  [/nlp|llm|language|chat|gpt/i, Sparkles],
  [/web3|chain|token|nft|wallet/i, Globe],
  [/schema|json|api\b/i, Braces],
]

const CATEGORY_MARKS = {
  Analysis: Activity,
  Development: Code2,
  Security: Shield,
  Data: Database,
  NLP: Sparkles,
  Web3: Globe,
  Other: Bot,
}

export function markFor(agent) {
  const name = agent?.name || ''
  for (const [pattern, Icon] of NAME_MARKS) {
    if (pattern.test(name)) return Icon
  }
  return CATEGORY_MARKS[agent?.category] || Cpu
}


export function usageLabel(agent) {
  const calls = agent?.calls || 0
  if (calls >= 1000) return `${(calls / 1000).toFixed(1)}k runs`
  if (calls > 0) return `${calls} run${calls === 1 ? '' : 's'}`
  return 'Newly deployed'
}
