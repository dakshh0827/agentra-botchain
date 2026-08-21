
import 'dotenv/config'
import prisma from '../lib/prisma.js'
import agentService from '../services/agentService.js'

const args = process.argv.slice(2)
const list = args.includes('--list')
const force = args.includes('--force')
const positional = args.filter((a) => !a.startsWith('--'))
const [target, endpoint] = positional


function agentLookup(value) {
  const clauses = [{ name: value }, { agentId: value }]
  if (/^[a-f\d]{24}$/i.test(value)) clauses.push({ id: value })
  return { OR: clauses }
}

async function listAgents() {
  const agents = await prisma.agent.findMany({
    select: { name: true, agentId: true, status: true, endpoint: true, isOfficial: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!agents.length) {
    console.log('No agents registered.')
    return
  }

  for (const agent of agents) {
    console.log(`  ${agent.name}${agent.isOfficial ? '  [official]' : ''}`)
    console.log(`    agentId  ${agent.agentId}`)
    console.log(`    status   ${agent.status}`)
    console.log(`    endpoint ${agent.endpoint || '(none)'}\n`)
  }
}

function checkShape(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    return `Not a URL: ${raw}`
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return `Endpoint must be http or https, got ${url.protocol}`
  }
  if (/\/(execute|apply)\/?$/.test(url.pathname)) {
    return `Drop the trailing ${url.pathname} - the orchestrator appends /execute itself.`
  }
  return null
}

async function setEndpoint() {
  const shapeError = checkShape(endpoint)
  if (shapeError) {
    console.error(shapeError)
    process.exitCode = 1
    return
  }

  const clean = endpoint.replace(/\/+$/, '')

  const agent = await prisma.agent.findFirst({ where: agentLookup(target) })
  if (!agent) {
    console.error(`No agent found matching "${target}".`)
    console.error('Pass the exact name, the agentId, or the database id. --list shows them.')
    process.exitCode = 1
    return
  }

  if (agent.endpoint === clean) {
    console.log(`"${agent.name}" already points at ${clean}. Nothing to do.`)
    return
  }


  const probe = await agentService.validateEndpoint(clean)
  if (probe.valid) {
    console.log(`Reachable: ${probe.url} answered ${probe.status}`)
  } else if (!force) {
    console.error(`Could not reach ${clean} (${probe.error}).`)
    console.error('If the service is asleep or still deploying this is expected.')
    console.error('Re-run with --force to save it anyway.')
    process.exitCode = 1
    return
  } else {
    console.log(`Could not reach ${clean} - saving anyway (--force).`)
  }

  await prisma.agent.update({ where: { id: agent.id }, data: { endpoint: clean } })
  console.log(`"${agent.name}"`)
  console.log(`  was  ${agent.endpoint || '(none)'}`)
  console.log(`  now  ${clean}`)
}

async function main() {
  if (list) {
    await listAgents()
    return
  }

  if (!target || !endpoint) {
    console.error('Usage: node scripts/set-endpoint.js <name|agentId|id> <url> [--force]')
    console.error('       node scripts/set-endpoint.js --list')
    process.exitCode = 1
    return
  }

  await setEndpoint()
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
