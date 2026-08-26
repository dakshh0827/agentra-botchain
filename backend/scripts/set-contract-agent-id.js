
import 'dotenv/config'
import prisma from '../lib/prisma.js'

const [target, idArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const contractAgentId = Number.parseInt(idArg, 10)

function agentLookup(value) {
  const clauses = [{ name: value }, { agentId: value }]
  if (/^[a-f\d]{24}$/i.test(value)) clauses.push({ id: value })
  return { OR: clauses }
}

async function main() {
  if (!target || !Number.isInteger(contractAgentId) || contractAgentId < 0) {
    console.error('Usage: node scripts/set-contract-agent-id.js <name|agentId|id> <contractAgentId>')
    process.exitCode = 1
    return
  }

  const agent = await prisma.agent.findFirst({ where: agentLookup(target) })
  if (!agent) {
    console.error(`No agent found matching "${target}".`)
    process.exitCode = 1
    return
  }

  const clash = await prisma.agent.findFirst({
    where: { contractAgentId, NOT: { id: agent.id } },
    select: { name: true, agentId: true },
  })
  if (clash) {
    console.error(
      `contractAgentId ${contractAgentId} already used by "${clash.name}" (${clash.agentId}).`,
    )
    process.exitCode = 1
    return
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { contractAgentId },
  })

  console.log(`"${agent.name}" → contractAgentId = ${contractAgentId}`)
  console.log(`  was  ${agent.contractAgentId ?? '(null)'}`)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
