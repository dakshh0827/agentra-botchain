import React from 'react'
import { ExternalLink } from 'lucide-react'

import { capabilitiesFor, readReport } from '../../utils/agentCapabilities'

function scoreTone(score) {
  if (score >= 90) return { text: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' }
  if (score >= 75) return { text: '#A16207', bg: '#FEFCE8', border: '#FDE68A' }
  if (score >= 60) return { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' }
  return { text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' }
}

/**
 * Renders whatever result shape the agent declared. Which field holds the score, the
 * title, or the download links is read from the agent's capability contract rather
 * than assumed, so a new agent gets a real card instead of a blank one.
 */
export default function ReportCard({ report, agent }) {
  if (!report?.reportId) return null

  const caps = capabilitiesFor(agent)
  const view = readReport(report, caps.report)
  if (!view) return null

  const hasScore = Number.isFinite(view.score)
  const tone = scoreTone(hasScore ? view.score : 0)
  const counts = view.counts || {}
  const links = caps.deliverables.filter((d) => report[d.key])

  // Counts are agent-defined, so they are labelled from their own keys rather than
  // from a fixed critical/warning vocabulary.
  // An agent can name the keys worth showing; otherwise fall back to every non-zero
  // one, which is the best guess available when it has told us nothing.
  const countEntries = view.countsInclude
    ? view.countsInclude.map((k) => [k, counts[k]])
    : Object.entries(counts)
  const countBits = countEntries
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .slice(0, 4)
    .map(([k, v]) => `${v} ${k}`)

  const subtitleBits = [
    view.subtitle !== undefined && view.subtitle !== null && view.subtitle !== ''
      ? `${view.subtitle}${view.subtitleLabel ? ` ${view.subtitleLabel}` : ''}`
      : null,
    ...countBits,
  ].filter(Boolean)

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-4 border-b border-[var(--color-border)]">
        {hasScore && (
          <div
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border"
            style={{ background: tone.bg, borderColor: tone.border }}
          >
            <span className="text-xl font-bold leading-none" style={{ color: tone.text }}>
              {view.score}
            </span>
            <span className="text-[9px] text-[var(--color-text-dim)] mt-0.5">/ {view.scoreMax}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
              {view.title || 'Result'}
            </span>
            {report.grade && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: tone.text, background: tone.bg, borderColor: tone.border }}
              >
                {report.grade}{report.label ? ` · ${report.label}` : ''}
              </span>
            )}
          </div>
          {subtitleBits.length > 0 && (
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              {subtitleBits.join(' · ')}
            </p>
          )}
        </div>
      </div>

      {view.categories && view.categories.length > 0 && (
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 border-b border-[var(--color-border)]">
          {view.categories.map((c) => {
            const t = scoreTone(Number(c.score))
            return (
              <div key={c.name} className="rounded-lg border border-[var(--color-border)] px-2.5 py-2">
                <div className="text-[10px] text-[var(--color-text-dim)] truncate">{c.name}</div>
                <div className="text-sm font-bold" style={{ color: t.text }}>{c.score}</div>
              </div>
            )
          })}
        </div>
      )}

      {links.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {links.map(({ key, label, hint, Icon }) => (
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
              {hint && <span className="text-[10px] font-normal opacity-70">{hint}</span>}
              <ExternalLink size={10} className="opacity-60" />
            </a>
          ))}
        </div>
      )}

      {/* The run's own verdict on itself, when it failed one of its checks. */}
      {view.hasNotice && (
        <p className="px-4 pb-3 text-[11px] text-[var(--color-warning)]">
          {view.notice || 'This run did not pass its own consistency checks — treat the result as provisional.'}
        </p>
      )}
    </div>
  )
}
