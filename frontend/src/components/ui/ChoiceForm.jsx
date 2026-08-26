import React, { useMemo, useState } from 'react'


export function composeChoiceMessage(choices, selected, composeTemplate) {
  const parts = {}
  for (const group of choices || []) {
    if (group.type === 'text' || group.type === 'textarea') {
      const val = String(selected[group.id] || '').trim()
      if (val) parts[group.id] = val
      continue
    }
    const vals = selected[group.id] || []
    if (!Array.isArray(vals) || !vals.length) continue
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
    .join('\n')
}

function fieldFilled(group, selected) {
  if (group.type === 'text' || group.type === 'textarea') {
    return Boolean(String(selected[group.id] || '').trim())
  }
  return Array.isArray(selected[group.id]) && selected[group.id].length > 0
}

function sectionMeta(groups) {
  const order = []
  const map = new Map()
  for (const g of groups) {
    const key = g.section || '_flat'
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        label: g.sectionLabel || (key === '_flat' ? null : key),
        defaultOpen: g.sectionDefaultOpen !== false,
        fields: [],
      })
      order.push(key)
    }
    map.get(key).fields.push(g)
  }
  return order.map((id) => map.get(id))
}

function FieldBlock({
  group,
  selected,
  disabled,
  toggle,
  setText,
  chipClass,
  inputClass,
}) {
  return (
    <div>
      {group.label && (
        <div className="text-[10px] uppercase tracking-wide font-bold text-[var(--color-text-dim)] mb-1.5">
          {group.label}
          {group.required ? ' · required' : ''}
          {group.multi ? ' · multi' : ''}
        </div>
      )}

      {(group.type === 'text' || group.type === 'textarea') ? (
        group.type === 'textarea' ? (
          <textarea
            rows={group.rows || 2}
            disabled={disabled}
            value={selected[group.id] || ''}
            placeholder={group.placeholder || ''}
            onChange={(e) => setText(group.id, e.target.value)}
            className={inputClass + ' resize-y min-h-[52px]'}
          />
        ) : (
          <input
            type="text"
            disabled={disabled}
            value={selected[group.id] || ''}
            placeholder={group.placeholder || ''}
            onChange={(e) => setText(group.id, e.target.value)}
            className={inputClass}
          />
        )
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(group.options || []).map((opt) => {
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
      )}
    </div>
  )
}

export default function ChoiceForm({
  choices,
  quickReplies,
  composeTemplate,
  disabled,
  onSend,
}) {
  const groups = Array.isArray(choices)
    ? choices.filter((g) => g && (g.options?.length || g.type === 'text' || g.type === 'textarea'))
    : []
  const replies = Array.isArray(quickReplies) ? quickReplies.filter((r) => r?.send) : []
  const sections = useMemo(() => sectionMeta(groups), [groups])
  const hasSections = sections.some((s) => s.id !== '_flat' && s.label)

  const [selected, setSelected] = useState(() => {
    const init = {}
    for (const g of groups) {
      init[g.id] = g.type === 'text' || g.type === 'textarea' ? '' : []
    }
    return init
  })

  const [openSections, setOpenSections] = useState(() => {
    const init = {}
    for (const s of sections) {
      init[s.id] = s.defaultOpen
    }
    return init
  })

  const requiredGroups = useMemo(
    () => groups.filter((g) => g.required),
    [groups],
  )

  const hasSelection = useMemo(
    () => groups.some((g) => fieldFilled(g, selected)),
    [groups, selected],
  )

  const requiredMet = useMemo(
    () => requiredGroups.every((g) => fieldFilled(g, selected)),
    [requiredGroups, selected],
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

  const setText = (groupId, value) => {
    if (disabled) return
    setSelected((prev) => ({ ...prev, [groupId]: value }))
  }

  const chipClass = (on) =>
    [
      'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      on
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary/40',
    ].join(' ')

  const inputClass =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-primary/50 disabled:opacity-50'

  const sectionFilledCount = (section) =>
    section.fields.filter((f) => fieldFilled(f, selected)).length

  return (
    <div className="mt-2.5 space-y-2.5 border-t border-[var(--color-border)] pt-2.5">
      {hasSections ? (
        sections.map((section) => {
          const open = openSections[section.id] !== false
          const filled = sectionFilledCount(section)
          const total = section.fields.length
          return (
            <div
              key={section.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 overflow-hidden"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [section.id]: !open,
                  }))
                }
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg)]/80 transition-colors disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-[var(--color-text)] truncate">
                    {section.label || 'Details'}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-dim)]">
                    {filled}/{total} fields filled
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] shrink-0">
                  {open ? 'Collapse ▲' : 'Expand ▼'}
                </span>
              </button>
              {open && (
                <div className="space-y-2.5 px-3 pb-3 border-t border-[var(--color-border)] pt-2.5">
                  {section.fields.map((group) => (
                    <FieldBlock
                      key={group.id}
                      group={group}
                      selected={selected}
                      disabled={disabled}
                      toggle={toggle}
                      setText={setText}
                      chipClass={chipClass}
                      inputClass={inputClass}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })
      ) : (
        groups.map((group) => (
          <FieldBlock
            key={group.id}
            group={group}
            selected={selected}
            disabled={disabled}
            toggle={toggle}
            setText={setText}
            chipClass={chipClass}
            inputClass={inputClass}
          />
        ))
      )}

      {groups.length > 0 && (
        <button
          type="button"
          disabled={disabled || !hasSelection || !requiredMet}
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
