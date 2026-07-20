import readline from 'node:readline/promises'
import process from 'node:process'

export async function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : ''
    const answer = await rl.question(`${question}${suffix}: `)
    return String(answer || defaultValue || '').trim()
  } finally {
    rl.close()
  }
}