# Random-Voting-System
a system for not serious votes

An encrypted ranked-choice voting system. Voters get a standalone HTML ballot that works **offline** — no internet needed. They rank candidates, and the ballot generates an encrypted vote code (a text string) they send via WhatsApp, SMS, or any messaging app. The organizer pastes the codes into a reader script to decrypt and tally results using instant-runoff voting (IRV).

## How It Works

```
┌─────────────┐          ┌──────────────┐          ┌──────────────┐
│  ballot.html│  vote    │   WhatsApp   │  paste   │  reader.js   │
│  (offline)  │──code──> │   / SMS      │──code──> │  (organizer) │
│             │          │   / Email    │          │              │
│  Voter ranks│          │              │          │  Decrypts &  │
│  candidates │          │              │          │  tallies IRV │
└─────────────┘          └──────────────┘          └──────────────┘
```

**Security:**
- Vote codes are RSA-2048 encrypted — only the organizer's private key can decrypt them
- Each voter token is single-use (HMAC-verified, no server-side token list needed)
- No personal data is stored — votes are anonymous
- The ballot works fully offline — no network requests

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

No npm dependencies required — everything uses built-in Node.js modules.

## Setup

### 1. Configure the election

Edit `config.json`:

```json
{
  "title": "Your Election Title",
  "question": "Rank the candidates in order of your preference (drag to reorder):",
  "options": [
    { "id": "Rick",  "label": "Rick Astley" },
    { "id": "bob",    "label": "Bob Smith" },
    { "id": "carol",  "label": "Carol Williams" }
  ],
  "receiverContact": "Send your code to +1-555-0100 on WhatsApp",
  "tokenSecret": "pick-a-long-random-secret-here"
}
```

| Field | Description |
|-------|-------------|
| `title` | Election name shown on the ballot |
| `question` | Instruction text above the candidate list |
| `options` | Array of candidates — `id` is internal, `label` is displayed |
| `receiverContact` | Shown to voters after they generate their code — tells them where to send it |
| `tokenSecret` | Secret key used to sign voter tokens — keep this private |

### 2. Generate encryption keys

```bash
node generate-keys.js
```

This creates:
- `data/private.pem` — **keep secret**, only the organizer needs this
- `data/public.jwk` — automatically embedded in the ballot

### 3. Generate voter tokens

```bash
node generate-tokens.js <number-of-voters>
```

Example:

```bash
node generate-tokens.js 30
```

Tokens are printed to stdout. Each voter gets exactly **one** token. Tokens look like:

```
xETDAtjfBIG9ZQ.vgEpLnKbsP-AHkU4hqIRqPM47xRhDFVjeXkOhZGAobo
```

To save them to a file:

```bash
node generate-tokens.js 30 > tokens.txt
```

### 4. Build the ballot

```bash
node build-ballot.js
```

This generates `ballot.html` with your candidates and public key embedded. Distribute this file to voters (email, USB, AirDrop, etc.).

## Voting (for voters)

1. Open `ballot.html` in any browser (works offline)
2. Paste your voter token
3. Drag candidates to rank them (#1 = top choice)
4. Click **Generate Vote Code**
5. Copy the code and send it to the organizer via WhatsApp/SMS/email

## Reading votes (for the organizer)

### Interactive mode

```bash
node reader.js
```

Paste vote codes one at a time. Type `results` to see the current tally and IRV winner. Type `quit` to exit.

### Process a single code

```bash
node reader.js <vote-code>
```

### View results only

```bash
node reader.js --results
```

Example output:

```
  === Community Election 2026 — Results ===

  Votes cast: 12 of 30 tokens issued (40%)

  First-choice votes:
    Alice Johnson        ████████████████████  6
    Bob Smith            ██████████            3
    Carol Williams       ██████████            3

  Instant-Runoff Voting:
    Round 1: Alice Johnson: 6, Bob Smith: 3, Carol Williams: 3  ->  Carol Williams eliminated
    Round 2: Alice Johnson: 6, Bob Smith: 6
    Round 3: Alice Johnson: 8, Bob Smith: 4  ->  Alice Johnson wins

  WINNER:  Alice Johnson
```

## Resetting

To clear all vote data and start fresh (keeps your keys):

```bash
./clear.sh
```

Then regenerate tokens and rebuild the ballot:

```bash
node generate-tokens.js 30 > tokens.txt
node build-ballot.js
```

## File Reference

| File | Purpose |
|------|---------|
| `config.json` | Election title, candidates, token secret |
| `generate-keys.js` | Generates RSA-2048 key pair (run once) |
| `generate-tokens.js` | Generates voter tokens |
| `build-ballot.js` | Builds `ballot.html` from config + public key |
| `ballot.html` | The file voters open to vote (distribute this) |
| `reader.js` | Decrypts vote codes and tallies results |
| `clear.sh` | Wipes vote data and tokens |
| `data/private.pem` | RSA private key (NEVER share) |
| `data/public.jwk` | RSA public key (embedded in ballot automatically) |
| `data/voter-registry.json` | List of issued voter IDs (created by generate-tokens) |
| `data/used-voters.json` | Tracks which tokens have been used (created by reader) |
| `data/votes.json` | Anonymous vote records (created by reader) |

## Quick Start (TL;DR)

```bash
# 1. Edit config.json with your candidates and a secret

# 2. One-time setup
node generate-keys.js

# 3. Generate tokens and build ballot
node generate-tokens.js 30 > tokens.txt
node build-ballot.js

# 4. Send ballot.html + one token to each voter

# 5. When codes come in via WhatsApp:
node reader.js
# paste codes, type "results" to see the winner
```
