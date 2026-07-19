import React from 'react'
import { FileText, Key, Package } from 'lucide-react'

/**
 * Shows a pre-execution summary.
 * NEVER renders secret field values.
 */
export default function RuntimeSummaryPanel({ payload, fileValues, execConfig }) {
  const headerCount = Object.keys(payload.headers || {}).length
  const bodyCount = Object.keys(payload.body || {}).length
  const fileCount = Object.keys(fileValues || {}).filter(k => fileValues[k]).length

  const secretHeaderKeys = (execConfig.headers || [])
    .filter(h => h.secret && h.userProvided)
    .map(h => h.key)

  const secretBodyKeys = (execConfig.bodyFields || [])
    .filter(f => f.type === 'password' && f.userProvided)
    .map(f => f.key)

  return (
    <div className="p-4 space-y-3 bg-bg text-xs font-mono">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-bg-secondary border border-border">
          <Key size={11} className="text-primary" />
          <div>
            <div className="text-text-dim">HEADERS</div>
            <div className="text-text-primary font-bold">{headerCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-bg-secondary border border-border">
          <FileText size={11} className="text-star-blue" />
          <div>
            <div className="text-text-dim">FIELDS</div>
            <div className="text-text-primary font-bold">{bodyCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-bg-secondary border border-border">
          <Package size={11} className="text-success" />
          <div>
            <div className="text-text-dim">FILES</div>
            <div className="text-text-primary font-bold">{fileCount}</div>
          </div>
        </div>
      </div>

      {/* Content type */}
      <div className="flex items-center justify-between text-text-dim">
        <span>Content-Type</span>
        <span className="text-text-secondary">{payload.contentType}</span>
      </div>

      {/* Headers preview — hide secret values */}
      {headerCount > 0 && (
        <div className="space-y-1">
          <div className="text-text-dim">Headers:</div>
          {Object.entries(payload.headers).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between pl-2 text-text-muted">
              <span className="text-primary">{k}</span>
              <span>{secretHeaderKeys.includes(k) ? '••••••••' : String(v).slice(0, 32)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Body preview — hide password values */}
      {bodyCount > 0 && (
        <div className="space-y-1">
          <div className="text-text-dim">Body fields:</div>
          {Object.entries(payload.body).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between pl-2 text-text-muted">
              <span className="text-star-blue">{k}</span>
              <span>{secretBodyKeys.includes(k) ? '••••••••' : String(v).slice(0, 32)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Files preview */}
      {fileCount > 0 && (
        <div className="space-y-1">
          <div className="text-text-dim">Files:</div>
          {Object.entries(fileValues)
            .filter(([, f]) => f)
            .map(([k, f]) => (
              <div key={k} className="flex items-center justify-between pl-2 text-text-muted">
                <span className="text-success">{k}</span>
                <span>{f.name} ({Math.round(f.size / 1024)}KB)</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}