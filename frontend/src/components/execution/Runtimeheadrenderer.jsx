import React, { useState } from 'react'
import { Eye, EyeOff, Key } from 'lucide-react'

/**
 * Renders a single user-provided header field.
 * Secret headers render as password inputs with eye toggle.
 */
function HeaderField({ header, value, onChange, error }) {
  const [showSecret, setShowSecret] = useState(false)
  const isSecret = header.secret === true
  const baseClass = 'input-field w-full px-3 py-2.5 rounded-lg text-sm transition-all'
  const errorClass = error ? 'border-danger/60 focus:border-danger' : ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Key size={11} className="text-text-dim" />
        <label className="text-xs font-mono text-text-dim uppercase tracking-wide">
          {header.key}
        </label>
        {header.required && (
          <span className="text-[10px] text-danger font-mono">REQUIRED</span>
        )}
        {isSecret && (
          <span className="text-[10px] text-warning font-mono">SECRET</span>
        )}
      </div>

      {header.description && (
        <p className="text-xs text-text-dim leading-relaxed">{header.description}</p>
      )}

      <div className="relative">
        <input
          type={isSecret && !showSecret ? 'password' : 'text'}
          value={value ?? ''}
          onChange={e => onChange(header.key, e.target.value)}
          placeholder={header.placeholder || (isSecret ? '••••••••' : '')}
          className={`${baseClass} ${errorClass} ${isSecret ? 'pr-10' : ''}`}
          autoComplete={isSecret ? 'off' : 'on'}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShowSecret(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger font-mono">{error}</p>
      )}
    </div>
  )
}

/**
 * Renders all user-provided headers from executionConfig.headers.
 * Only renders headers where userProvided === true.
 */
export default function RuntimeHeaderRenderer({ headers, values, onChange, errors }) {
  const userHeaders = (headers || []).filter(h => h.userProvided === true)

  if (userHeaders.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="text-xs font-mono text-text-dim uppercase tracking-widest border-b border-border pb-2">
        Request Headers
      </div>
      {userHeaders.map(header => (
        <HeaderField
          key={header.key}
          header={header}
          value={values?.[header.key] ?? ''}
          onChange={onChange}
          error={errors?.[header.key]}
        />
      ))}
    </div>
  )
}