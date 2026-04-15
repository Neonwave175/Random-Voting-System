#!/usr/bin/env node
/**
 * Vote Reader — decrypts vote codes and tallies ranked-choice results.
 *
 * Usage:
 *   node reader.js              Interactive mode (paste codes, see results)
 *   node reader.js --results    Print current results and exit
 *   node reader.js <code>       Process one code and exit
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname     = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR      = path.join(__dirname, 'data')
const PRIV_PATH     = path.join(DATA_DIR, 'private.pem')
const USED_PATH     = path.join(DATA_DIR, 'used-voters.json')
const VOTES_PATH    = path.join(DATA_DIR, 'votes.json')
const REGISTRY_PATH = path.join(DATA_DIR, 'voter-registry.json')

// ── Load config & key ─────────────────────────────────────────────────────────

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))

if (!config.tokenSecret || config.tokenSecret === 'CHANGE_THIS_TO_A_RANDOM_SECRET') {
  console.error('ERROR: Set tokenSecret in config.json first.')
  process.exit(1)
}

if (!fs.existsSync(PRIV_PATH)) {
  console.error('ERROR: data/private.pem not found. Run "npm run keys" first.')
  process.exit(1)
}

const privateKey = fs.readFileSync(PRIV_PATH, 'utf8')
const labelMap   = Object.fromEntries(config.options.map(o => [o.id, o.label]))
const optionIds  = config.options.map(o => o.id)

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadJSON(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch { return fallback }
}

function saveJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function verifyToken(token) {
  if (typeof token !== 'string') return null
  const dotIdx = token.trim().indexOf('.')
  if (dotIdx < 1) return null

  const voterId  = token.trim().substring(0, dotIdx)
  const hmacPart = token.trim().substring(dotIdx + 1)
  if (voterId.length > 64) return null

  const expectedHmac = crypto.createHmac('sha256', config.tokenSecret)
    .update(voterId).digest('base64url')

  // Constant-time comparison of the base64url HMAC strings
  const expected = Buffer.from(expectedHmac, 'utf8')
  const received = Buffer.from(hmacPart, 'utf8')

  if (expected.length !== received.length) return null
  if (!crypto.timingSafeEqual(expected, received)) return null
  return voterId
}

function decryptCode(code) {
  try {
    const ciphertext = Buffer.from(code.trim(), 'base64')
    const plaintext  = crypto.privateDecrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      ciphertext
    )
    return JSON.parse(plaintext.toString('utf8'))
  } catch { return null }
}

// ── Process a single vote code ────────────────────────────────────────────────

function processCode(code) {
  code = code.trim()
  if (!code) return { ok: false, msg: 'Empty input.' }

  const payload = decryptCode(code)
  if (!payload) return { ok: false, msg: 'Could not decrypt. Invalid or corrupted code.' }

  const { token, rankings } = payload

  const voterId = verifyToken(token)
  if (!voterId) return { ok: false, msg: 'Invalid voter token inside the code.' }

  const usedVoters = loadJSON(USED_PATH, {})
  if (usedVoters[voterId]) {
    return { ok: false, msg: `Duplicate — this voter already voted on ${usedVoters[voterId].usedAt}.` }
  }

  if (!Array.isArray(rankings) || rankings.length !== optionIds.length) {
    return { ok: false, msg: 'Bad rankings data inside the code.' }
  }

  const ids   = rankings.map(r => r.id)
  const ranks = rankings.map(r => Number(r.rank)).sort((a, b) => a - b)
  const expected = Array.from({ length: optionIds.length }, (_, i) => i + 1)

  if (!optionIds.every(id => ids.includes(id)) ||
      JSON.stringify(ranks) !== JSON.stringify(expected)) {
    return { ok: false, msg: 'Invalid vote data inside the code.' }
  }

  // Record
  usedVoters[voterId] = { usedAt: new Date().toISOString() }
  saveJSON(USED_PATH, usedVoters)

  const votes = loadJSON(VOTES_PATH, [])
  votes.push({ id: crypto.randomUUID(), rankings, timestamp: new Date().toISOString() })
  saveJSON(VOTES_PATH, votes)

  // Build ranked list for display
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank)
  const lines  = sorted.map(r => `     ${r.rank}. ${labelMap[r.id] ?? r.id}`)

  return {
    ok: true,
    msg: `Vote #${votes.length} recorded:\n${lines.join('\n')}`
  }
}

// ── IRV (instant-runoff voting) ───────────────────────────────────────────────

function runIRV(votes) {
  let remaining = [...optionIds]
  const rounds  = []

  while (remaining.length > 1) {
    const tally = Object.fromEntries(remaining.map(id => [id, 0]))

    for (const vote of votes) {
      const top = vote.rankings
        .filter(r => remaining.includes(r.id))
        .sort((a, b) => a.rank - b.rank)[0]
      if (top) tally[top.id]++
    }

    const total     = Object.values(tally).reduce((a, b) => a + b, 0)
    const winner    = remaining.find(id => tally[id] > total / 2)
    const minVotes  = Math.min(...Object.values(tally))
    const eliminated = winner ? null : remaining.find(id => tally[id] === minVotes)

    rounds.push({
      tally: Object.fromEntries(
        Object.entries(tally).map(([id, n]) => [labelMap[id] ?? id, n])
      ),
      eliminated: eliminated ? (labelMap[eliminated] ?? eliminated) : null,
      winner:     winner     ? (labelMap[winner] ?? winner)         : null
    })

    if (winner) return { rounds, winner: labelMap[winner] ?? winner }

    remaining = remaining.filter(id => id !== eliminated)
    if (remaining.length === 0) break
  }

  const finalWinner = remaining[0] ? (labelMap[remaining[0]] ?? remaining[0]) : null
  if (remaining.length === 1 && !rounds[rounds.length - 1]?.winner) {
    rounds[rounds.length - 1].winner = finalWinner
  }

  return { rounds, winner: finalWinner }
}

// ── Display results ───────────────────────────────────────────────────────────

function showResults() {
  const votes    = loadJSON(VOTES_PATH, [])
  const registry = loadJSON(REGISTRY_PATH, [])

  console.log()
  console.log(`  === ${config.title} — Results ===`)
  console.log()

  if (votes.length === 0) {
    console.log('  No votes recorded yet.')
    console.log()
    return
  }

  const issued = registry.length
  console.log(`  Votes cast: ${votes.length}` + (issued > 0 ? ` of ${issued} tokens issued (${Math.round(votes.length / issued * 100)}%)` : ''))
  console.log()

  // First-choice tally
  const firstChoice = Object.fromEntries(optionIds.map(id => [id, 0]))
  for (const vote of votes) {
    const top = vote.rankings.find(r => r.rank === 1)
    if (top) firstChoice[top.id]++
  }

  const maxVotes = Math.max(...Object.values(firstChoice), 1)

  console.log('  First-choice votes:')
  for (const id of optionIds) {
    const name  = (labelMap[id] ?? id).padEnd(20)
    const count = firstChoice[id]
    const bar   = '\u2588'.repeat(Math.round((count / maxVotes) * 20))
    console.log(`    ${name} ${bar.padEnd(20)}  ${count}`)
  }
  console.log()

  // IRV rounds
  const irv = runIRV(votes)

  console.log('  Instant-Runoff Voting:')
  for (const round of irv.rounds) {
    const ri = irv.rounds.indexOf(round) + 1
    const tallies = Object.entries(round.tally).map(([name, n]) => `${name}: ${n}`).join(', ')
    let line = `    Round ${ri}: ${tallies}`
    if (round.eliminated) line += `  ->  ${round.eliminated} eliminated`
    if (round.winner) line += `  ->  ${round.winner} wins`
    console.log(line)
  }

  console.log()
  console.log(`  WINNER:  ${irv.winner ?? 'No winner (tie)'}`)
  console.log()
}

// ── CLI entry point ───────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.includes('--results')) {
  showResults()
  process.exit(0)
}

if (args.length > 0 && !args[0].startsWith('--')) {
  const result = processCode(args.join(' '))
  console.log(result.ok ? `\n  OK  ${result.msg}\n` : `\n  FAIL  ${result.msg}\n`)
  process.exit(result.ok ? 0 : 1)
}

// ── Interactive mode ──────────────────────────────────────────────────────────

console.log()
console.log(`  ========================================`)
console.log(`   ${config.title}`)
console.log(`   Vote Reader`)
console.log(`  ========================================`)
console.log()
console.log('  Commands:')
console.log('    <paste code>     Process a vote code')
console.log('    results          Show current tally & IRV winner')
console.log('    quit             Exit')
console.log()

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
  prompt: '  > '
})

rl.prompt()

rl.on('line', line => {
  const input = line.trim()

  if (!input) {
    rl.prompt()
    return
  }

  if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
    console.log('  Goodbye.')
    process.exit(0)
  }

  if (input.toLowerCase() === 'results') {
    showResults()
    rl.prompt()
    return
  }

  // Treat everything else as a vote code
  const result = processCode(input)
  if (result.ok) {
    console.log(`\n  OK  ${result.msg}\n`)
  } else {
    console.log(`\n  FAIL  ${result.msg}\n`)
  }

  rl.prompt()
})

rl.on('close', () => {
  console.log('  Goodbye.')
  process.exit(0)
})
