import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Renders a single body field based on its schema type.
 * Handles: text, textarea, number, password, boolean
 * File is handled by RuntimeFileUpload.
 */
export default function RuntimeFieldRenderer({ field, value, onChange, error }) {
  const [showSecret, setShowSecret] = useState(false)

  const baseClass =
    'input-field w-full px-3 py-2.5 rounded-lg text-sm transition-all'
  const errorClass = error ? 'border-danger/60 focus:border-danger' : ''

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
            className={`${baseClass} ${errorClass} resize-none`}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            className={`${baseClass} ${errorClass}`}
          />
        )

      case 'password':
        return (
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={value ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              className={`${baseClass} ${errorClass} pr-10`}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowSecret(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )

      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => onChange(field.key, !value)}
            className={`px-4 py-2 rounded-lg border text-sm font-mono cursor-pointer transition-all ${
              value
                ? 'border-success text-success bg-[rgba(52,211,153,0.1)]'
                : 'border-border text-text-dim hover:border-border bg-bg-secondary'
            }`}
          >
            {value ? 'TRUE' : 'FALSE'}
          </button>
        )

      // 'text' is default
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            className={`${baseClass} ${errorClass}`}
          />
        )
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-mono text-text-dim uppercase tracking-wide">
          {field.key}
        </label>
        {field.required && (
          <span className="text-[10px] text-danger font-mono">REQUIRED</span>
        )}
        {field.type === 'password' && (
          <span className="text-[10px] text-warning font-mono">SECRET</span>
        )}
      </div>

      {field.description && (
        <p className="text-xs text-text-dim leading-relaxed">{field.description}</p>
      )}

      {renderInput()}

      {error && (
        <p className="text-xs text-danger font-mono">{error}</p>
      )}
    </div>
  )
}