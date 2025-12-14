#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

function findClientDir() {
  const candidates = [path.resolve('./client'), path.resolve('../client')]
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir
    } catch (e) {
      // ignore
    }
  }
  return null
}

function run(cmd, args, opts = {}) {
  let res
  if (process.platform === 'win32') {
    const parts = [cmd, ...args]
    res = spawnSync('cmd', ['/c', ...parts], { stdio: 'inherit', ...opts })
  } else {
    res = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  }
  if (res && res.error) throw res.error
  if (res && res.status !== 0) {
    const err = new Error(`Command ${cmd} ${args.join(' ')} failed with exit code ${res.status}`)
    err.code = res.status
    throw err
  }
}

const clientDir = findClientDir()
if (!clientDir) {
  console.log('No client/package.json found, skipping client build')
  process.exit(0)
}

console.log('Found client at', clientDir)

const useCi = fs.existsSync(path.join(clientDir, 'package-lock.json'))

try {
  if (useCi) {
    try {
      console.log('Running npm ci in', clientDir)
      run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: clientDir })
    } catch (e) {
      console.warn('npm ci failed, falling back to npm install:', e && e.message)
      try {
        run('npm', ['install', '--no-audit', '--no-fund'], { cwd: clientDir })
      } catch (ie) {
        console.warn('npm install also failed:', ie && ie.message)
        console.warn('Skipping client build due to install errors; continuing server install')
        process.exit(0)
      }
    }
  } else {
    console.log('No package-lock.json, running npm install in', clientDir)
    try {
      run('npm', ['install', '--no-audit', '--no-fund'], { cwd: clientDir })
    } catch (ie) {
      console.warn('npm install failed:', ie && ie.message)
      console.warn('Skipping client build due to install errors; continuing server install')
      process.exit(0)
    }
  }

  console.log('Building client')
  try {
    run('npm', ['run', 'build'], { cwd: clientDir })
  } catch (be) {
    console.warn('Client build failed:', be && be.message)
    console.warn('Skipping client build; continuing server install')
    process.exit(0)
  }
} catch (err) {
  console.error('Unexpected error in client build script:', err)
  process.exit(1)
}
