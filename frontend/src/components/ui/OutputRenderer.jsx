import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Code, Image, Table, CheckCircle,
  Clock, Copy, ChevronDown, ChevronUp, ExternalLink,
  FileCode, FileJson, AlertCircle, Package
} from 'lucide-react'

// ── Code Block Component (VS Code Dark+ Theme) ──────────────────
function SyntaxCodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)

  const highlightSyntax = (text) => {
    if (!text) return ''
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const tokens = []
    let tokenIndex = 0

    // 1. Safely extract Comments
    escaped = escaped.replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match) => {
      const token = `__TOKEN_${tokenIndex++}__`
      tokens.push({ token, html: `<span style="color: #6A9955;">${match}</span>` })
      return token
    })

    // 2. Safely extract Strings
    escaped = escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|".*?"|'.*?')/g, (match) => {
      const token = `__TOKEN_${tokenIndex++}__`
      tokens.push({ token, html: `<span style="color: #ce9178;">${match}</span>` })
      return token
    })

    // 3. Highlight remaining code
    escaped = escaped
      // Control flow
      .replace(/\b(if|else|while|for|return|break|continue|switch|case|default|try|catch|finally|throw)\b/g, '<span style="color: #c586c0;">$1</span>')
      // Modifiers & Declarations
      .replace(/\b(public|private|protected|static|final|class|interface|enum|extends|implements|new|import|package|function|const|let|var|def)\b/g, '<span style="color: #569cd6;">$1</span>')
      // Primitives & Common Types
      .replace(/\b(void|int|boolean|double|float|char|long|short|byte|String|Object|System|Math)\b/g, '<span style="color: #4ec9b0;">$1</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span style="color: #b5cea8;">$1</span>')
      // Function/Method calls
      .replace(/([a-zA-Z0-9_]+)(?=\s*\()/g, '<span style="color: #dcdcaa;">$1</span>')

    // 4. Restore Strings and Comments
    tokens.forEach(({ token, html }) => {
      escaped = escaped.replace(token, html)
    })

    return escaped
  }

  return (
    <div className="my-4 rounded-xl border border-[#333333] overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#404040]">
        <span className="text-sm font-mono text-[#cccccc] uppercase ">{lang || 'CODE'}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono text-[#cccccc] hover:bg-[#404040] hover:text-white transition-all cursor-pointer"
        >
          {copied ? <CheckCircle size={12} className="text-[var(--color-success)]" /> : <Copy size={12} />}
          {copied ? 'COPIED' : 'COPY CODE'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#d4d4d4]">
        <code dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }} />
      </pre>
    </div>
  )
}

// ── Inline CSV Table Component ───────────────────────────────────
function InlineCsvTable({ content }) {
  const [copied, setCopied] = useState(false)
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))

  return (
    <div className="my-4 rounded-xl border border-border overflow-hidden bg-panel">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Table size={13} className="text-text-dim" />
          <span className="text-sm font-mono text-text-dim uppercase">Data table</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
        >
          {copied ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
          {copied ? 'COPIED' : 'COPY CSV'}
        </button>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-[12px] font-mono text-text-secondary">
          <thead className="sticky top-0 bg-panel-light border-b border-border">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 text-text-primary font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Type Detection ────────────────────────────────────────────
function detectOutputType(response) {
  if (!response) return 'empty'
  if (typeof response !== 'string') return 'json'

  const trimmed = response.trim()

  if (trimmed.startsWith('data:')) return 'datauri'
  if (/^https?:\/\/.+/.test(trimmed)) return 'url'

  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' ? 'json' : 'text'
  } catch { /* not json */ }

  if (trimmed.startsWith('```')) return 'code'

  if (trimmed.includes('\n') && (
    trimmed.includes('def ') || trimmed.includes('function ') ||
    trimmed.includes('const ') || trimmed.includes('import ') ||
    trimmed.includes('class ') || trimmed.includes('#!/')
  )) return 'code'

  const lines = trimmed.split('\n')
  if (lines.length > 2) {
    const firstLineCommas = (lines[0].match(/,/g) || []).length
    if (firstLineCommas >= 2 && lines.slice(0, 3).every(l => (l.match(/,/g) || []).length === firstLineCommas)) {
      return 'csv'
    }
  }

  if (trimmed.includes('# ') || trimmed.includes('**') || trimmed.includes('- ') || trimmed.includes('> ') || trimmed.includes('* ')) {
    return 'markdown'
  }

  return 'text'
}

function detectLanguage(code) {
  if (/def |import |print\(|class |\.py/.test(code)) return 'python'
  if (/const |let |var |function |=>|console\.log/.test(code)) return 'javascript'
  if (/<[a-z][\s\S]*>/.test(code)) return 'html'
  if (/SELECT|INSERT|UPDATE|FROM|WHERE/i.test(code)) return 'sql'
  if (/\{|\}|:|"/.test(code)) return 'json'
  return 'code'
}

// ── Renderers ─────────────────────────────────────────────────
function TextRenderer({ content }) {
  return (
    <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed whitespace-pre-wrap break-words font-body">
      {content}
    </div>
  )
}

function CodeRenderer({ content }) {
  const raw = content.replace(/^```[\w]*\n?/, '').replace(/```$/, '')
  const lang = detectLanguage(raw)
  return <SyntaxCodeBlock code={raw} lang={lang} />
}

function formatFieldLabel(key) {
  return String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())
}

function JsonValue({ value, depth }) {
  if (value === null || value === undefined) {
    return <span className="text-text-dim">—</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-dim">Empty list</span>
    if (value.every(v => typeof v !== 'object' || v === null)) {
      return (
        <ul className="space-y-1">
          {value.map((v, i) => (
            <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0 text-xs">&bull;</span>
              <span>{String(v)}</span>
            </li>
          ))}
        </ul>
      )
    }
    return (
      <div className="space-y-3">
        {value.map((v, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="text-xs font-mono text-text-dim uppercase mb-2">Item {i + 1}</div>
            <JsonValue value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return <span className="text-text-dim">Empty</span>
    return (
      <dl className={depth > 0 ? 'space-y-2' : 'divide-y divide-border'}>
        {entries.map(([k, v]) => {
          const isNested = typeof v === 'object' && v !== null
          return (
            <div key={k} className={depth > 0 ? '' : 'py-2.5 first:pt-0 last:pb-0'}>
              {isNested ? (
                <>
                  <dt className="text-xs font-mono text-text-dim uppercase tracking-wide mb-1">{formatFieldLabel(k)}</dt>
                  <dd className="text-sm text-text-primary"><JsonValue value={v} depth={depth + 1} /></dd>
                </>
              ) : (
                <dd className="text-sm text-text-primary">
                  <span className="text-xs font-mono text-text-dim uppercase tracking-wide">{formatFieldLabel(k)}:</span>{' '}
                  {String(v)}
                </dd>
              )}
            </div>
          )
        })}
      </dl>
    )
  }
  return <span>{String(value)}</span>
}

function JsonRenderer({ content }) {
  const [copied, setCopied] = useState(false)
  let parsed, formatted
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content
    formatted = JSON.stringify(parsed, null, 2)
  } catch {
    parsed = null
    formatted = typeof content === 'string' ? content : JSON.stringify(content)
  }

  return (
    <div className="rounded-xl border border-border bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <FileJson size={13} className="text-text-dim" />
          <span className="text-sm font-mono text-text-dim uppercase">Data</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(formatted)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1.5 text-sm font-mono text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
        >
          {copied ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <div className="p-4">
        {parsed !== null ? <JsonValue value={parsed} depth={0} /> : (
          <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{formatted}</p>
        )}
      </div>
    </div>
  )
}

function CsvRenderer({ content }) {
  return <InlineCsvTable content={content} />
}

function DataUriRenderer({ content }) {
  const mime = content.split(';')[0].split(':')[1] || 'application/octet-stream'
  const ext = mime.split('/')[1] || 'bin'
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-panel-light border-b border-[var(--color-border)] rounded-t-xl">
        <Package size={13} className="text-text-dim" />
        <span className="text-sm font-mono text-[var(--color-text-dim)] uppercase ">{mime}</span>
        <a
          href={content}
          download={`agent-output.${ext}`}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)] text-[var(--color-success)] hover:bg-[rgba(52,211,153,0.16)] transition-colors cursor-pointer"
        >
          <Download size={12} />
          DOWNLOAD .{ext.toUpperCase()}
        </a>
      </div>
      {isImage && (
        <div className="px-4 pb-4">
          <img src={content} alt="Agent output" className="max-w-full rounded-lg border border-[var(--color-border)]" />
        </div>
      )}
      {isPdf && (
        <div className="px-4 pb-4">
          <iframe src={content} className="w-full h-96 rounded-lg border border-[var(--color-border)]" title="PDF Output" />
        </div>
      )}
    </div>
  )
}

function UrlRenderer({ content }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(147,197,253,0.05)] border border-[rgba(147,197,253,0.2)]">
      <ExternalLink size={16} className="text-[var(--color-star-blue)] shrink-0" />
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-star-blue)] text-sm font-mono hover:underline break-all"
      >
        {content}
      </a>
    </div>
  )
}

function MarkdownRenderer({ content }) {
  const blocks = [];
  const lines = content.split('\n');
  let currentTextBlock = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block check
    const codeBlockMatch = line.trim().match(/^(`{1,3})([a-zA-Z]*)$/);
    if (codeBlockMatch) {
      if (currentTextBlock.length > 0) {
        blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
        currentTextBlock = [];
      }
      const delimiter = codeBlockMatch[1];
      const lang = codeBlockMatch[2];
      const codeLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== delimiter) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
      i++;
      continue;
    }

    // Markdown Table check
    const isMarkdownTable = line.trim().startsWith('|') && line.trim().endsWith('|');
    if (isMarkdownTable) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        j++;
      }
      if ((j - i) >= 2) {
        if (currentTextBlock.length > 0) {
          blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
          currentTextBlock = [];
        }
        // Extract to CSV format for rendering
        const csvContent = lines.slice(i, j).map(l => {
          return l.split('|').map(c => c.trim()).filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1).join(',');
        }).filter(l => !l.replace(/,/g, '').match(/^[-:]+$/)).join('\n');
        
        blocks.push({ type: 'csv', content: csvContent });
        i = j;
        continue;
      }
    }

    // CSV Table check
    const commas = (line.match(/,/g) || []).length;
    if (commas >= 1 && line.trim().length > 0) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '' && (lines[j].match(/,/g) || []).length === commas) {
        j++;
      }
      if ((j - i) >= 3) {
        if (currentTextBlock.length > 0) {
          blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
          currentTextBlock = [];
        }
        blocks.push({ type: 'csv', content: lines.slice(i, j).join('\n') });
        i = j;
        continue;
      }
    }

    currentTextBlock.push(line);
    i++;
  }
  
  if (currentTextBlock.length > 0) {
    blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
  }

  const formatText = (text) => {
    let html = text
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-[var(--color-text-primary)] mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-[var(--color-text-primary)] mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[var(--color-text-primary)] mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text-primary)]">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[rgba(124,58,237,0.12)] text-[var(--color-purple-pale)] font-semibold text-base">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-[var(--color-text-secondary)] text-sm"><span class="text-[var(--color-primary)] mt-1">·</span><span>$1</span></li>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[var(--color-primary-dark)] pl-3 text-[var(--color-text-muted)] italic text-sm">$1</blockquote>')
      .replace(/\n\n/g, '<br/><br/>')
    return html
  }

  return (
    <div className="text-sm leading-relaxed text-[var(--color-text-secondary)] prose-sm">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <SyntaxCodeBlock key={idx} code={block.content} lang={block.lang} />
        }
        if (block.type === 'csv') {
          return <InlineCsvTable key={idx} content={block.content} />
        }
        return (
          <div
            key={idx}
            dangerouslySetInnerHTML={{ __html: formatText(block.content) }}
          />
        )
      })}
    </div>
  )
}

// ── Main OutputRenderer ───────────────────────────────────────
export default function OutputRenderer({ response, agentName, latency, success }) {
  const [expanded, setExpanded] = useState(true)
  const type = useMemo(() => detectOutputType(response), [response])

  if (!response) return null

  const typeLabels = {
    text: { label: 'TEXT', icon: FileText, color: 'text-[var(--color-text-muted)]' },
    code: { label: 'CODE', icon: FileCode, color: 'text-[var(--color-primary)]' },
    json: { label: 'JSON', icon: FileJson, color: 'text-[var(--color-warning)]' },
    csv: { label: 'TABLE', icon: Table, color: 'text-[var(--color-star-blue)]' },
    datauri: { label: 'FILE', icon: Download, color: 'text-[var(--color-success)]' },
    url: { label: 'URL', icon: ExternalLink, color: 'text-[var(--color-star-blue)]' },
    markdown: { label: 'MARKDOWN', icon: FileText, color: 'text-[var(--color-text-muted)]' },
    empty: { label: 'EMPTY', icon: AlertCircle, color: 'text-[var(--color-text-dim)]' },
  }

  const meta = typeLabels[type] || typeLabels.text
  const MetaIcon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-xl border overflow-hidden bg-panel ${
        success !== false ? 'border-border' : 'border-[rgba(193,73,73,0.35)]'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {success !== false
            ? <CheckCircle size={14} className="text-[var(--color-success)]" />
            : <AlertCircle size={14} className="text-[var(--color-danger)]" />
          }
          <span className={`text-sm font-bold ${success !== false ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            {success !== false ? 'EXECUTION COMPLETE' : 'EXECUTION FAILED'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)]">
          <MetaIcon size={11} className={meta.color} />
          <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
        </div>

        {latency && (
          <div className="flex items-center gap-1 text-sm font-mono text-[var(--color-text-dim)]">
            <Clock size={11} />
            {latency}ms
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-sm font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {type === 'text' && <TextRenderer content={response} />}
              {type === 'code' && <CodeRenderer content={response} />}
              {type === 'json' && <JsonRenderer content={response} />}
              {type === 'csv' && <CsvRenderer content={response} />}
              {type === 'datauri' && <DataUriRenderer content={response} />}
              {type === 'url' && <UrlRenderer content={response} />}
              {type === 'markdown' && <MarkdownRenderer content={response} />}
              {type === 'empty' && (
                <div className="text-[var(--color-text-dim)] text-sm font-mono">No output returned</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


