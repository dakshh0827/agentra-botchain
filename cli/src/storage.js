import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function getHomeDir() {
  return process.env.AGENTRA_HOME || path.join(os.homedir(), '.agentra')
}

function getConfigPath() {
  return path.join(getHomeDir(), 'config.json')
}

export async function loadConfig() {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function saveConfig(config) {
  const dir = getHomeDir()
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2) + '\n', 'utf8')
}

export async function clearConfig() {
  try {
    await fs.unlink(getConfigPath())
  } catch {
    // ignore missing config
  }
}

export function getConfigLocation() {
  return getConfigPath()
}

export function getWorkspaceRuntimeFiles(baseDir) {
  return {
    runtimeFile: path.join(baseDir, 'agentra.runtime.js'),
    manifestFile: path.join(baseDir, 'agentra.runtime.json'),
    dockerfile: path.join(baseDir, 'Dockerfile'),
    dockerignore: path.join(baseDir, '.dockerignore'),
  }
}