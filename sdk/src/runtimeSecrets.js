export async function fetchRuntimeSecrets(baseUrl, agentId, licenseToken) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/$/, '')
  const res = await fetch(`${normalizedBaseUrl}/api/agents/${agentId}/runtime-secrets`, {
    method: 'POST',
    headers: { authorization: `Bearer ${licenseToken}` },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to fetch runtime secrets')
  return res.json() // { headerSecrets, bodySecrets }
}
