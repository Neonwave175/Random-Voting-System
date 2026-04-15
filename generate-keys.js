/**
 * Generates an RSA-2048 key pair for encrypting vote codes.
 * Run once before first use: npm run keys
 *
 * Output:
 *   data/private.pem  — server's private key (NEVER share or commit)
 *   data/public.pem   — server's public key
 *   data/public.jwk   — public key in JWK format (embedded in ballot.html via npm run build)
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = path.join(__dirname, 'data')
const PRIV_PATH = path.join(DATA_DIR, 'private.pem')

if (fs.existsSync(PRIV_PATH)) {
  console.error('ERROR: data/private.pem already exists.')
  console.error('Delete the data/ directory first only if you want to invalidate all issued ballots.')
  process.exit(1)
}

fs.mkdirSync(DATA_DIR, { recursive: true })

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

fs.writeFileSync(PRIV_PATH, privateKey, { mode: 0o600 })
fs.writeFileSync(path.join(DATA_DIR, 'public.pem'), publicKey)

const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
fs.writeFileSync(path.join(DATA_DIR, 'public.jwk'), JSON.stringify(jwk, null, 2))

console.log('RSA-2048 key pair generated:')
console.log('  data/private.pem  ← keep secret, server only')
console.log('  data/public.jwk   ← run "npm run build" to embed in ballot.html')
