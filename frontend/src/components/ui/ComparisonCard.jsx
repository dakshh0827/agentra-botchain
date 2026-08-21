import React from 'react'
import { FileSpreadsheet, Table2, ExternalLink, Trophy } from 'lucide-react'


const FORMATS = [
  { key: 'reportUrl', label: 'Comparison', hint: 'HTML', icon: ExternalLink },
  { key: 'excelUrl', label: 'Excel', hint: '.xlsx', icon: FileSpreadsheet },
  { key: 'csvUrl', label: 'Sheets', hint: '.csv', icon: Table2 },
]

export default function ComparisonCard({ comparison }) {
  if (!comparison?.rows?.length) return null

  const sites = comparison.sites || []
  const links = FORMATS.filter((f) => comparison[f.key])
  const unreachable = comparison.unreachable || []

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <Trophy size={14} className="text-[var(--color-primary)]" />
        <span className="font-semibold text-sm text-[var(--color-text-primary)]">
          {sites.join(' vs ')}
        </span>
      </div>

      {/* Wide tables must scroll inside their own box — the modal body must not scroll
          sideways because a comparison happened to name four sites. */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left font-semibold text-[10px] uppercase tracking-wide text-[var(--color-text-dim)] px-3 py-2 bg-[var(--color-bg-secondary)]">
                Signal
              </th>
              {sites.map((site) => (
                <th
                  key={site}
                  className="text-left font-semibold text-[11px] px-3 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] whitespace-nowrap"
                >
                  {site}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                  {row.label}
                </td>
                {(row.cells || []).map((cell, index) => (
                  <td
                    key={index}
                    className={[
                      'px-3 py-2 align-top',
                      // Marked rather than explained: a reader scanning eleven rows
                      // should not have to hold eleven comparisons in their head.
                      row.best === index
                        ? 'bg-[#F0FDF4] text-[#15803D] font-bold'
                        : 'text-[var(--color-text-primary)]',
                    ].join(' ')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unreachable.length > 0 && (
        <p className="px-4 py-2 text-[11px] text-[var(--color-warning)] border-t border-[var(--color-border)]">
          Could not reach {unreachable.join(', ')} — those columns are empty rather than
          estimated.
        </p>
      )}

      {links.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-[var(--color-border)]">
          {links.map(({ key, label, hint, icon: Icon }) => (
            <a
              key={key}
              href={comparison[key]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg
                         border border-[#d9c2f2] bg-[var(--color-accent-pink)] text-[var(--color-primary-deep)]
                         hover:border-primary transition-colors whitespace-nowrap"
            >
              <Icon size={13} />
              {label}
              <span className="text-[10px] font-normal opacity-70">{hint}</span>
            </a>
          ))}
        </div>
      )}

      {/* The honesty note travels with the table into every surface that shows it. */}
      {(comparison.notCompared || []).length > 0 && (
        <p className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          {comparison.notCompared[0]}
        </p>
      )}
    </div>
  )
}
