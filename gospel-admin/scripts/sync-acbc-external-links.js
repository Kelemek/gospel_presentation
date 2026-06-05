#!/usr/bin/env node
/**
 * @deprecated Use `npm run sync-acbc-links` (tsx scripts/sync-acbc-external-links.ts).
 */
const { spawnSync } = require('child_process')
const path = require('path')

const tsScript = path.join(__dirname, 'sync-acbc-external-links.ts')
const args = process.argv.slice(2)
const result = spawnSync('npx', ['tsx', tsScript, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
})
process.exit(result.status ?? 1)
