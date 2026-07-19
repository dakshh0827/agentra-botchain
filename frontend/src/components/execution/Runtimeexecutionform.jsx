import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import RuntimeFieldRenderer from './Runtimefieldrenderer'
import RuntimeHeaderRenderer from './Runtimeheadrenderer'
import RuntimeFileUpload from './Runtimefileupload'
import RuntimeSummaryPanel from './Runtimesummarypanel'

/**
 * Validates runtime form values against executionConfig schema.
 * Returns an errors object keyed by field/header key.
 */
function validateRuntimeForm(execConfig, headerValues, bodyValues, fileValues) {
  const errors = {}

  // Validate required user-provided headers
  const userHeaders = (execConfig.headers || []).filter(h => h.userProvided)
  for (const h of userHeaders) {
    if (h.required && !headerValues[h.key]?.toString().trim()) {
      errors[`header_${h.key}`] = `${h.key} is required`
    }
  }

  // Validate body fields
  for (const f of execConfig.bodyFields || []) {
    if (!f.userProvided) continue

    if (f.type === 'file') {
      if (f.required && !fileValues[f.key]) {
        errors[f.key] = `${f.key} file is required`
      }
      continue
    }

    const val = bodyValues[f.key]
    if (f.required) {
      if (f.type === 'boolean') continue // booleans always have a value
      if (val === undefined || val === null || val.toString().trim() === '') {
        errors[f.key] = `${f.key} is required`
      }
    }

    if (f.type === 'number' && val !== '' && val !== undefined && val !== null) {
      if (isNaN(Number(val))) {
        errors[f.key] = `${f.key} must be a number`
      }
    }
  }

  return errors
}

/**
 * Builds the runtime execution payload from form state.
 * This payload is transport-agnostic — the execution engine decides how to send it.
 */
export function buildRuntimePayload(execConfig, headerValues, bodyValues, fileValues) {
  const userHeaders = (execConfig.headers || []).filter(h => h.userProvided)

  // Build headers map — never include secret values that are empty
  const headers = {}
  for (const h of userHeaders) {
    if (headerValues[h.key] !== undefined && headerValues[h.key] !== '') {
      headers[h.key] = headerValues[h.key]
    }
  }

  // Build body fields map
  const body = {}
  for (const f of (execConfig.bodyFields || [])) {
    if (!f.userProvided || f.type === 'file') continue
    const val = bodyValues[f.key]
    if (val !== undefined && val !== null && val !== '') {
      body[f.key] = f.type === 'number' ? Number(val) : val
    }
  }

  // Build files map
  const files = {}
  for (const [key, file] of Object.entries(fileValues)) {
    if (file) files[key] = file
  }

  return {
    headers,
    body,
    files,
    contentType: execConfig.contentType || 'json',
    method: execConfig.method || 'POST',
  }
}

/**
 * Main dynamic execution form.
 * Rendered when agent.executionConfig exists and userHasAccess is true.
 */
export default function RuntimeExecutionForm({
  execConfig,
  task,
  onTaskChange,
  onSubmit,
  isExecuting,
  isConnected,
}) {
  const [headerValues, setHeaderValues] = useState({})
  const [bodyValues, setBodyValues] = useState({})
  const [fileValues, setFileValues] = useState({})
  const [errors, setErrors] = useState({})
  const [showSummary, setShowSummary] = useState(false)

  const handleHeaderChange = useCallback((key, value) => {
    setHeaderValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[`header_${key}`]; return next })
  }, [])

  const handleBodyChange = useCallback((key, value) => {
    setBodyValues(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }, [])

  const handleFileChange = useCallback((key, file) => {
    setFileValues(prev => ({ ...prev, [key]: file }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }, [])

  const handleSubmit = () => {
    const validationErrors = validateRuntimeForm(execConfig, headerValues, bodyValues, fileValues)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    const runtimePayload = buildRuntimePayload(execConfig, headerValues, bodyValues, fileValues)
    onSubmit({ task, runtimePayload })
  }

  const userHeaders = (execConfig.headers || []).filter(h => h.userProvided)
  const fileFields = (execConfig.bodyFields || []).filter(f => f.type === 'file' && f.userProvided)
  const regularFields = (execConfig.bodyFields || []).filter(f => f.type !== 'file' && f.userProvided)
  const hasSecrets = userHeaders.some(h => h.secret) || (execConfig.bodyFields || []).some(f => f.type === 'password')

  const headerErrors = {}
  const bodyErrors = {}
  for (const [k, v] of Object.entries(errors)) {
    if (k.startsWith('header_')) headerErrors[k.replace('header_', '')] = v
    else bodyErrors[k] = v
  }

  // Runtime payload for summary (strip file objects, replace with metadata)
  const summaryPayload = buildRuntimePayload(execConfig, headerValues, bodyValues, fileValues)

  return (
    <div className="space-y-6">
      {/* Task input — always present even with execConfig */}
      <div>
        <label className="text-xs font-mono text-text-dim uppercase block mb-2">
          TASK / INSTRUCTION
        </label>
        <textarea
          value={task}
          onChange={e => onTaskChange(e.target.value)}
          placeholder="Describe the task for this agent..."
          rows={3}
          className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none"
        />
      </div>

      {/* Dynamic Headers Section */}
      {userHeaders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-bg-secondary p-4 space-y-4"
        >
          <RuntimeHeaderRenderer
            headers={execConfig.headers}
            values={headerValues}
            onChange={handleHeaderChange}
            errors={headerErrors}
          />
        </motion.div>
      )}

      {/* Dynamic Body Fields Section */}
      {(regularFields.length > 0 || fileFields.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-bg-secondary p-4 space-y-4"
        >
          <div className="text-xs font-mono text-text-dim uppercase tracking-widest border-b border-border pb-2">
            Request Body — {execConfig.contentType || 'json'}
          </div>

          {regularFields.map(field => (
            <RuntimeFieldRenderer
              key={field.key}
              field={field}
              value={bodyValues[field.key]}
              onChange={handleBodyChange}
              error={bodyErrors[field.key]}
            />
          ))}

          {fileFields.map(field => (
            <RuntimeFileUpload
              key={field.key}
              field={field}
              file={fileValues[field.key] || null}
              onChange={handleFileChange}
              error={bodyErrors[field.key]}
            />
          ))}
        </motion.div>
      )}

      {/* Security reminder */}
      {hasSecrets && (
        <div className="flex items-start gap-2 text-xs text-warning/80 font-mono p-3 rounded-lg bg-[rgba(191,122,47,0.06)] border border-[rgba(191,122,47,0.2)]">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          Secret fields are not stored or logged. They are sent directly to the agent endpoint.
        </div>
      )}

      {/* Validation errors summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-[rgba(248,113,113,0.06)] p-3 space-y-1">
          {Object.values(errors).map((err, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-danger font-mono">
              <AlertCircle size={11} /> {err}
            </div>
          ))}
        </div>
      )}

      {/* Pre-execution Summary Panel */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono text-text-dim hover:text-text-secondary transition-colors cursor-pointer bg-bg-secondary"
        >
          <span>EXECUTION SUMMARY</span>
          {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showSummary && (
          <RuntimeSummaryPanel
            payload={summaryPayload}
            fileValues={fileValues}
            execConfig={execConfig}
          />
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-mono text-text-dim">
          STATUS: <span className="text-success font-bold text-sm">UNLOCKED</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isExecuting || !isConnected || Object.keys(errors).length > 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-dark hover:bg-primary text-white font-semibold text-sm disabled:opacity-40 transition-all cursor-pointer"
          title={Object.keys(errors).length > 0 ? 'Fix validation errors before executing' : ''}
        >
          {isExecuting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              EXECUTING...
            </>
          ) : Object.keys(errors).length > 0 ? (
            'FIX ERRORS'
          ) : (
            'EXECUTE'
          )}
        </button>
      </div>
    </div>
  )
}