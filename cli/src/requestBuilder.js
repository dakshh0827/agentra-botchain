export function buildLocalRequest(endpoint, executionConfig, values, task) {
  const method = (executionConfig?.method || 'POST').toUpperCase()
  const contentType = executionConfig?.contentType || 'json'
  const headers = { ...values.headers }
  let body

  if (contentType === 'form-data') {
    const form = new FormData()
    form.append('task', task || '')
    for (const [k, v] of Object.entries(values.body || {})) {
      if (v instanceof Uint8Array) form.append(k, new Blob([v]), values.fileNames?.[k] || k)
      else if (v !== undefined && v !== '') form.append(k, String(v))
    }
    body = form // fetch sets multipart headers automatically for FormData
  } else if (contentType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams()
    params.append('task', task || '')
    for (const [k, v] of Object.entries(values.body || {})) {
      if (v !== undefined && v !== '') params.append(k, String(v))
    }
    headers['content-type'] = 'application/x-www-form-urlencoded'
    body = params.toString()
  } else {
    headers['content-type'] = 'application/json'
    body = JSON.stringify({ task: task || '', ...values.body })
  }

  return { url: endpoint, method, headers, body }
}
