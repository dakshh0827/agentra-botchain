

import 'dotenv/config'
import prisma from '../lib/prisma.js'

const args = process.argv.slice(2)
const remove = args.includes('--remove')
const list = args.includes('--list')
const backfill = args.includes('--backfill')
const target = args.find((a) => !a.startsWith('--'))

async function backfillMissing() {
  const result = await prisma.$runCommandRaw({
    update: 'Agent',
    updates: [
      {
        q: { isOfficial: { $exists: false } },
        u: { $set: { isOfficial: false } },
        multi: true,
      },
    ],
  })

  const matched = result?.n ?? 0
  console.log(
    matched
      ? `Backfilled isOfficial=false on ${matched} existing agent document(s).`
      : 'Nothing to backfill — every agent already carries the field.',
  )
}

async function listOfficial() {
  const agents = await prisma.agent.findMany({
    where: { isOfficial: true },
    select: { name: true, agentId: true, status: true, calls: true, endpoint: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!agents.length) {
    console.log('No agents are marked official yet.')
    return
  }

  console.log(`${agents.length} official agent(s):\n`)
  for (const agent of agents) {
    console.log(`  ${agent.name}`)
    console.log(`    agentId  ${agent.agentId}`)
    console.log(`    status   ${agent.status}  ·  ${agent.calls} calls`)
    console.log(`    endpoint ${agent.endpoint || '—'}\n`)
  }
}


function agentLookup(value) {
  const clauses = [{ name: value }, { agentId: value }]
  if (/^[a-f\d]{24}$/i.test(value)) clauses.push({ id: value })
  return { OR: clauses }
}

async function setOfficial(value) {
  const agent = await prisma.agent.findFirst({ where: agentLookup(target) })

  if (!agent) {
    console.error(`No agent found matching "${target}".`)
    console.error('Pass the exact name, the agentId, or the database id.')
    process.exitCode = 1
    return
  }

  if (agent.isOfficial === value) {
    console.log(`"${agent.name}" is already ${value ? 'official' : 'not official'}. Nothing to do.`)
    return
  }

  await prisma.agent.update({ where: { id: agent.id }, data: { isOfficial: value } })
  console.log(`"${agent.name}" is now ${value ? 'marked official' : 'no longer official'}.`)
}

async function main() {
  if (backfill) {
    await backfillMissing()
    return
  }

  if (list) {
    await listOfficial()
    return
  }

  if (!target) {
    console.error('Usage: node scripts/mark-official.js [--remove] <name|agentId|id>')
    console.error('       node scripts/mark-official.js --list')
    process.exitCode = 1
    return
  }

  await setOfficial(!remove)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
