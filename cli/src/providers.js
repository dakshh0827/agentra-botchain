function openAIStyleHeaders(key) {
  return { 'content-type': 'application/json', authorization: `Bearer ${key}` }
}

function openAIStyleBody(manifest, content, defaultModel) {
  const userContent = Array.isArray(content)
    ? content.map((block) => {
        if (block.type === 'text') return { type: 'text', text: block.text }
        if (block.type === 'image') return { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } }
        throw new Error(`Provider "${manifest.provider}" does not support "${block.type}" file inputs locally`)
      })
    : content
  return {
    model: manifest.model || defaultModel,
    max_tokens: manifest.maxTokens || 1024,
    messages: [
      ...(manifest.systemPrompt ? [{ role: 'system', content: manifest.systemPrompt }] : []),
      { role: 'user', content: userContent },
    ],
  }
}

function openAIStyleParse(data) {
  if (data.error) throw new Error(data.error.message || 'Provider request failed')
  return data.choices?.[0]?.message?.content ?? JSON.stringify(data)
}

export const PROVIDERS = {
  anthropic: {
    url: () => 'https://api.anthropic.com/v1/messages',
    headers: (key) => ({ 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    body: (manifest, content) => ({
      model: manifest.model || 'claude-opus-4-8',
      max_tokens: manifest.maxTokens || 1024,
      system: manifest.systemPrompt,
      messages: [{ role: 'user', content }],
    }),
    parse: (data) => {
      if (data.error) throw new Error(data.error.message || 'Provider request failed')
      return data.content?.map((b) => b.text).join('\n') ?? JSON.stringify(data)
    },
  },
  openai: {
    url: () => 'https://api.openai.com/v1/chat/completions',
    headers: openAIStyleHeaders,
    body: (manifest, content) => openAIStyleBody(manifest, content, 'gpt-4.1'),
    parse: openAIStyleParse,
  },
  groq: {
    url: () => 'https://api.groq.com/openai/v1/chat/completions',
    headers: openAIStyleHeaders,
    body: (manifest, content) => openAIStyleBody(manifest, content, 'llama-3.3-70b-versatile'),
    parse: openAIStyleParse,
  },
  'openai-compatible': {
    url: (manifest) => {
      if (!manifest.providerBaseUrl) throw new Error('Agent manifest is missing providerBaseUrl for a custom provider')
      return `${manifest.providerBaseUrl.replace(/\/$/, '')}/chat/completions`
    },
    headers: openAIStyleHeaders,
    body: (manifest, content) => openAIStyleBody(manifest, content, manifest.model || 'default'),
    parse: openAIStyleParse,
  },
}

export async function callLLM(manifest, { content, apiKey }) {
  console.log("\n========= CALL LLM =========");
  console.log("Manifest:");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("API Key Prefix:", apiKey?.substring(0, 8));

 const providerName = manifest.provider || "anthropic";
const def = PROVIDERS[providerName];

if (!def) {
  throw new Error(`Unknown provider "${providerName}"`);
}

console.log("Selected Provider:", providerName);
console.log("Request URL:", def.url(manifest));

  console.log("Headers:");
  console.log(def.headers(apiKey));

  console.log("\nBody:");
  console.log(JSON.stringify(def.body(manifest, content), null, 2));

  const res = await fetch(def.url(manifest), {
    method: "POST",
    headers: def.headers(apiKey),
    body: JSON.stringify(def.body(manifest, content)),
  });

  const data = await res.json();

  console.log("\n========= RESPONSE =========");
  console.log("Status:", res.status);
  console.log(JSON.stringify(data, null, 2));
  console.log("============================\n");

  if (!res.ok) {
    throw new Error(data?.error?.message || `Provider request failed (${res.status})`);
  }

  return def.parse(data);
}
