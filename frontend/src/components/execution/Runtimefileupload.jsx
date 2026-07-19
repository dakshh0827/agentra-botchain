import React, { useRef, useState } from 'react'
import { Upload, X, File, AlertCircle } from 'lucide-react'

/**
 * Drag-and-drop file upload for a single field.
 * Files are stored in frontend state only (no upload yet).
 */
export default function RuntimeFileUpload({ field, file, onChange, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

const MAX_SIZE = 200 * 1024 * 1024 // 10MB
  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    if (selectedFile.size > MAX_SIZE) {
      alert(`File "${selectedFile.name}" exceeds the 10MB upload limit.`)
      return
    }
    onChange(field.key, selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  const handleRemove = () => {
    onChange(field.key, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        <span className="text-[10px] text-star-blue font-mono">FILE</span>
      </div>

      {field.description && (
        <p className="text-xs text-text-dim leading-relaxed">{field.description}</p>
      )}

      {file ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-success/30 bg-[rgba(52,211,153,0.05)]">
          <File size={16} className="text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-text-primary truncate">{file.name}</div>
            <div className="text-xs text-text-dim">{formatSize(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-text-dim hover:text-danger transition-colors cursor-pointer p-1 rounded"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
            dragging
              ? 'border-primary bg-[rgba(124,58,237,0.08)]'
              : error
              ? 'border-danger/40 bg-[rgba(248,113,113,0.04)]'
              : 'border-border hover:border-primary/40 hover:bg-[rgba(124,58,237,0.04)]'
          }`}
        >
          <Upload
            size={20}
            className={dragging ? 'text-primary' : 'text-text-dim'}
          />
          <div className="text-xs text-text-dim text-center">
            <span className="text-primary font-mono">Click to upload</span> or drag and drop
          </div>
          {field.placeholder && (
            <div className="text-xs text-text-dim opacity-70">{field.placeholder}</div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] || null)}
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-danger font-mono">
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  )
}