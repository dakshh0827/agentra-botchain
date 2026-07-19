import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const SECT8_MCP_HOST = 'sect8-mcp.onrender.com'
const SECT8_MCP_PATH = '/mcp'
const SECT8_TOOL_NAME = 'analyze_section8_deal'

function normalizeEndpoint(endpoint) {
  return String(endpoint || '').trim().replace(/\/+$/, '')
}

export function isSect8McpEndpoint(endpoint) {
  try {
    const url = new URL(normalizeEndpoint(endpoint))
    return url.hostname === SECT8_MCP_HOST && url.pathname === SECT8_MCP_PATH
  } catch {
    return false
  }
}

function buildHeaders() {
  return {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  }
}

function decodeResponseText(responseData) {
  if (Buffer.isBuffer(responseData)) {
    return responseData.toString('utf8')
  }

  if (ArrayBuffer.isView(responseData)) {
    return Buffer.from(responseData).toString('utf8')
  }

  if (responseData instanceof ArrayBuffer) {
    return Buffer.from(responseData).toString('utf8')
  }

  return String(responseData ?? '')
}

function parseSseMessage(responseData) {
  const text = decodeResponseText(responseData)
  const dataLine = text.split(/\r?\n/).find((line) => line.startsWith('data: '))

  if (!dataLine) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  const payloadText = dataLine.slice(6).trim()
  try {
    return JSON.parse(payloadText)
  } catch {
    return payloadText
  }
}

function postMcpMessage(endpoint, message, timeout) {
  return axios.post(endpoint, message, {
    timeout,
    responseType: 'arraybuffer',
    maxRedirects: 0,
    maxContentLength: 50 * 1024 * 1024,
    headers: buildHeaders(),
  })
}

function buildPrompt(task, runtimePayload) {
  const runtimeBody = runtimePayload?.body || {}
  const bodyPrompt = typeof runtimeBody.prompt === 'string' ? runtimeBody.prompt.trim() : ''

  if (bodyPrompt) return bodyPrompt
  if (typeof task === 'string' && task.trim()) return task.trim()

  const fields = Object.entries(runtimeBody)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)

  if (fields.length === 0) {
    return 'Analyze this Section 8 property request.'
  }

  return `Analyze this Section 8 property request using the following details:\n${fields.join('\n')}`
}

function selectTool(tools = []) {
  return tools.find((tool) => tool?.name === SECT8_TOOL_NAME) || tools[0] || null
}

function extractStructuredResult(parsedMessage) {
  const result = parsedMessage?.result || parsedMessage

  if (result?.structuredContent) {
    return result.structuredContent
  }

  const textContent = result?.content?.find((item) => item?.type === 'text')?.text
  if (textContent) {
    return {
      success: true,
      reply: textContent,
      memoryRoot: null,
      recordRoot: null,
      storageError: null,
    }
  }

  return result
}

async function callJsonRpc(endpoint, method, params, timeout) {
  const response = await postMcpMessage(endpoint, {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params,
  }, timeout)

  return {
    ...response,
    data: parseSseMessage(response.data),
  }
}

export async function callSect8McpAgent(endpoint, task, runtimePayload, timeout) {
  const normalizedEndpoint = normalizeEndpoint(endpoint)

  await callJsonRpc(
    normalizedEndpoint,
    'initialize',
    {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'agentra',
        version: '2.0',
      },
    },
    timeout
  )

  const toolsResponse = await callJsonRpc(normalizedEndpoint, 'tools/list', {}, timeout)
  const tools = toolsResponse.data?.result?.tools || []
  const selectedTool = selectTool(tools)

  if (!selectedTool) {
    throw new Error('Sect8 MCP agent did not expose any tools')
  }

  const argumentsPayload = {
    prompt: buildPrompt(task, runtimePayload),
  }

  const runtimeBody = runtimePayload?.body || {}
  for (const key of ['owner', 'recordRoot', 'memory']) {
    if (runtimeBody[key] !== undefined && runtimeBody[key] !== null && runtimeBody[key] !== '') {
      argumentsPayload[key] = runtimeBody[key]
    }
  }

  const toolResponse = await callJsonRpc(
    normalizedEndpoint,
    'tools/call',
    {
      name: selectedTool.name,
      arguments: argumentsPayload,
    },
    timeout
  )

  return {
    status: toolResponse.status,
    headers: toolResponse.headers,
    data: extractStructuredResult(toolResponse.data),
  }
}