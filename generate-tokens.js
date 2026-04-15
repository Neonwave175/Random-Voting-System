/**
 * Generates voter tokens and prints them to stdout.
 * Voter IDs are appended to data/voter-registry.json for participation tracking.
 *
 * Token format: base64url(voterId) + "." + base64url(HMAC-SHA256(tokenSecret, voterId))
 * The token is self-verifying — no server-side token list required.
 *
 * Usage:  node generate-tokens.js <count>
 * Example: node generate-tokens.js 50 > tokens.txt
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname      = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR       = path.join(__dirname, 'data')
const REGISTRY_PATH  = path.join(DATA_DIR, 'voter-registry.json')

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))

if (!config.tokenSecret || config.tokenSecret === 'CHANGE_THIS_TO_A_RANDOM_SECRET') {
  console.error('ERROR: Set tokenSecret in config.json before generating tokens.')
  process.exit(1)
}

const count = parseInt(process.argv[2], 10)
if (!count || count < 1 || count > 100_000) {
  console.error('Usage: node generate-tokens.js <count>  (1–100000)')
  process.exit(1)
}

fs.mkdirSync(DATA_DIR, { recursive: true })

const registry = []
try { registry.push(...JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'))) } catch { /* first run */ }

const tokens = []
for (let i = 0; i < count; i++) {
  const voterId = crypto.randomBytes(10).toString('base64url')  // 14-char unique ID
  const hmac    = crypto.createHmac('sha256', config.tokenSecret).update(voterId).digest('base64url')
  tokens.push(`${voterId}.${hmac}`)
  registry.push({ id: voterId, issuedAt: new Date().toISOString() })
}

fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2))

console.error(`Generated ${count} token(s). IDs saved to data/voter-registry.json`)
console.error('=== TOKENS — distribute exactly one per voter, keep confidential ===')
tokens.forEach(t => console.log(t))
