function setHeader(headers, key, value) {
  for (const existing of Object.keys(headers)) {
    if (existing.toLowerCase() === key.toLowerCase()) delete headers[existing]
  }
  headers[key] = value
}

export function buildLocalRequest(endpoint, executionConfig, values, task) {
  const method = (executionConfig?.method || 'POST').toUpperCase()
  const contentType = executionConfig?.contentType || 'json'
  const headers = { ...values.headers }
  const runtimePayload = {
    headers: { ...values.headers },
    body: { ...(values.body || {}) },
  }
  const directBody = { ...(values.body || {}) }
  let body

  if (contentType === 'form-data') {
    const form = new FormData()
    form.append('task', task || '')
    form.append('runtimePayload', JSON.stringify(runtimePayload))
    for (const [k, v] of Object.entries(directBody)) {
      if (v instanceof Uint8Array) form.append(k, new Blob([v]), values.fileNames?.[k] || k)
      else if (v !== undefined && v !== '') form.append(k, String(v))
    }
    body = form
  } else if (contentType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams()
    params.append('task', task || '')
    params.append('runtimePayload', JSON.stringify(runtimePayload))
    for (const [k, v] of Object.entries(directBody)) {
      if (v !== undefined && v !== '') params.append(k, String(v))
    }
    setHeader(headers, 'content-type', 'application/x-www-form-urlencoded')
    body = params.toString()
  } else {
    setHeader(headers, 'content-type', 'application/json')
    body = JSON.stringify({
      task: task || '',
      ...directBody,
      runtimePayload,
    })
  }

  return { url: endpoint, method, headers, body }
}
