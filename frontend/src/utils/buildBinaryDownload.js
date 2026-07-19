export default function buildBinaryDownload(binaryPayload) {
  if (!binaryPayload) return null
  // if passed a stringified JSON, try parse
  let payload = binaryPayload
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      return null
    }
  }

  if (!payload?.isBinary || !payload?.base64) return null

  try {
    const byteChars = atob(payload.base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: payload.mimeType || 'application/octet-stream' })
    return {
      url: URL.createObjectURL(blob),
      filename: payload.filename || 'download.bin',
      mimeType: payload.mimeType || 'application/octet-stream',
      size: payload.size || byteArray.length,
    }
  } catch {
    return null
  }
}
