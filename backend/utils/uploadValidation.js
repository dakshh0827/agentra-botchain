const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg', 'audio/wav',
  'video/mp4',
])

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.py', '.js',
  '.php', '.rb', '.pl', '.jar', '.dll', '.so', '.dylib',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export function validateUpload(file) {
  if (!file) return

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw Object.assign(
      new Error(`File "${file.originalname}" exceeds 10 MB limit`),
      { status: 400 }
    )
  }

  // Validate extension
  const name = (file.originalname || '').toLowerCase()
  const ext = '.' + name.split('.').pop()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw Object.assign(
      new Error(`File extension "${ext}" is not allowed`),
      { status: 400 }
    )
  }

  // Validate mime (never trust client alone — multer provides server-side detection)
  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw Object.assign(
      new Error(`MIME type "${file.mimetype}" is not permitted`),
      { status: 400 }
    )
  }
}

export function validateUploads(files = {}) {
  for (const file of Object.values(files)) {
    if (Array.isArray(file)) {
      for (const f of file) validateUpload(f)
    } else {
      validateUpload(file)
    }
  }
}