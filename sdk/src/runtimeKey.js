export async function fetchRuntimeKey(baseUrl, agentId, licenseToken) {
  const res = await fetch(`${baseUrl}/api/agents/${agentId}/runtime-key`, {
    method: 'POST',
    headers: { authorization: `Bearer ${licenseToken}` },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to fetch runtime key')
  const { llmApiKey } = await res.json()
  return llmApiKey
}
