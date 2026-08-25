import React, { useMemo, useState } from 'react'


export function composeChoiceMessage(choices, selected, composeTemplate) {
  const parts = {}
  for (const group of choices || []) {
    const vals = selected[group.id] || []
    if (!vals.length) continue
    parts[group.id] = vals.join(', ')
  }
  if (composeTemplate && Object.keys(parts).length) {
    let out = composeTemplate
    for (const [key, value] of Object.entries(parts)) {
      out = out.replaceAll(`{${key}}`, value)
    }
    // Drop unused placeholders rather than sending braces to the agent.
    out = out.replace(/\{[a-zA-Z0-9_]+\}/g, '').replace(/\s{2,}/g, ' ').trim()
    if (out) return out
  }
  return Object.entries(parts)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}

export default function ChoiceForm({
  choices,
  quickReplies,
  composeTemplate,
  disabled,
  onSend,
}) {
  const groups = Array.isArray(choices) ? choices.filter((g) => g?.options?.length) : []
  const replies = Array.isArray(quickReplies) ? quickReplies.filter((r) => r?.send) : []
  const [selected, setSelected] = useState(() => {
    const init = {}
    for (const g of groups) init[g.id] = []
    return init
  })

  const hasSelection = useMemo(
    () => Object.values(selected).some((v) => Array.isArray(v) && v.length > 0),
    [selected],
  )

  if (!groups.length && !replies.length) return null

  const toggle = (group, value) => {
    if (disabled) return
    setSelected((prev) => {
      const cur = prev[group.id] || []
      if (group.multi) {
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
        return { ...prev, [group.id]: next }
      }
      return { ...prev, [group.id]: cur[0] === value ? [] : [value] }
    })
  }

  const chipClass = (on) =>
    [
      'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      on
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary/40',
    ].join(' ')

  return (
    <div className="mt-2.5 space-y-2.5 border-t border-[var(--color-border)] pt-2.5">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label && (
            <div className="text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)] mb-1.5">
              {group.label}
              {group.multi ? ' · multi' : ''}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((opt) => {
              const value = opt.value ?? opt.label
              const on = (selected[group.id] || []).includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(group, value)}
                  className={chipClass(on)}
                >
                  {opt.label || value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <button
          type="button"
          disabled={disabled || !hasSelection}
          onClick={() => {
            const msg = composeChoiceMessage(groups, selected, composeTemplate)
            if (msg) onSend?.(msg)
          }}
          className="btn-primary inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      )}

      {replies.length > 0 && (
        <div>
          {groups.length > 0 && (
            <div className="text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)] mb-1.5">
              Or try
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {replies.map((r) => (
              <button
                key={r.send}
                type="button"
                disabled={disabled}
                onClick={() => onSend?.(r.send)}
                className={chipClass(false)}
              >
                {r.label || r.send}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
