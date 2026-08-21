import { extractWalletFromStorage } from './axios'

/**

 * @param {string} path      API path, e.g. `/agents/abc/chat/stream`
 * @param {object} body      JSON request body
 * @param {(event: object) => void} onEvent  called per parsed frame
 * @param {AbortSignal} [signal]
 */
export async function streamSSE(path, body, onEvent, signal) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

  const wallet = extractWalletFromStorage()

  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(wallet ? { 'x-wallet-address': wallet } : {}),
    },
    body: JSON.stringify(body),
  })


  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      message = data?.error || message
    } catch {
      // not JSON — keep the status message 
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

  
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() || ''

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(6)))
      } catch {
        /* a keep-alive or a malformed frame — nothing to hand on */
      }
    }
  }
}
