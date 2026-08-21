import React from 'react'
import { FileText, FileSpreadsheet, FileDown, Table2, ExternalLink } from 'lucide-react'


const FORMATS = [
  { key: 'reportUrl', label: 'Report', hint: 'HTML', icon: FileText },
  { key: 'pdfUrl', label: 'PDF', hint: 'Print', icon: FileDown },
  { key: 'excelUrl', label: 'Excel', hint: '.xlsx', icon: FileSpreadsheet },
  { key: 'csvUrl', label: 'Sheets', hint: '.csv', icon: Table2 },
]

function scoreTone(score) {
  if (score >= 90) return { text: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' }
  if (score >= 75) return { text: '#A16207', bg: '#FEFCE8', border: '#FDE68A' }
  if (score >= 60) return { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' }
  return { text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' }
}

export default function ReportCard({ report }) {
  if (!report?.reportId) return null

  const score = Number(report.overall ?? 0)
  const tone = scoreTone(score)
  const counts = report.counts || {}
  const links = FORMATS.filter((f) => report[f.key])

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--color-border)]">
        <div
          className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border"
          style={{ background: tone.bg, borderColor: tone.border }}
        >
          <span className="text-xl font-bold leading-none" style={{ color: tone.text }}>
            {score}
          </span>
          <span className="text-[9px] text-[var(--color-text-dim)] mt-0.5">/ 100</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
              {report.host}
            </span>
            {report.grade && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: tone.text, background: tone.bg, borderColor: tone.border }}
              >
                {report.grade} · {report.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            {report.pagesCrawled} page(s) crawled
            {counts.critical ? ` · ${counts.critical} critical` : ''}
            {counts.warnings ? ` · ${counts.warnings} warning(s)` : ''}
          </p>
        </div>
      </div>

      {/* Every finding is a measurement, so the categories can be shown as-is. */}
      {Array.isArray(report.categories) && report.categories.length > 0 && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 border-b border-[var(--color-border)]">
          {report.categories.map((c) => {
            const t = scoreTone(c.score)
            return (
              <div key={c.name} className="rounded-lg border border-[var(--color-border)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--color-text-dim)] truncate">{c.name}</div>
                <div className="text-sm font-bold" style={{ color: t.text }}>{c.score}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 py-3 flex flex-wrap gap-2">
        {links.map(({ key, label, hint, icon: Icon }) => (
          <a
            key={key}
            href={report[key]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg
                       border border-[#d9c2f2] bg-[var(--color-accent-pink)] text-[var(--color-primary-deep)]
                       hover:border-primary transition-colors whitespace-nowrap"
          >
            <Icon size={13} />
            {label}
            <span className="text-[10px] font-normal opacity-70">{hint}</span>
            <ExternalLink size={10} className="opacity-60" />
          </a>
        ))}
      </div>

      {/* The audit's own verdict on itself, when it failed one of its checks. */}
      {Array.isArray(report.selfCheckFailed) && report.selfCheckFailed.length > 0 && (
        <p className="px-4 pb-3 text-[11px] text-[var(--color-warning)]">
          This run did not pass its own consistency checks — treat the score as provisional.
        </p>
      )}
    </div>
  )
}
