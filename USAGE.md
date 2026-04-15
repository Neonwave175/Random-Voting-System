# Usage

## Setup
```bash
node generate-keys.js                # one-time — creates encryption keys
node generate-tokens.js 30           # generate 30 voter tokens
node build-ballot.js                 # build the ballot file
```

or

```bash
npm keys
node generate-tokens.js <NUMBER-OF-VOTERS>
npm run build
```
## Distribute
- Send `ballot.html` to each voter
- Send each voter **one** token from the output above

## Vote
Voters open `ballot.html` → paste token → rank → copy code → send via WhatsApp

## Read votes
```bash
node reader.js                       # interactive — paste codes, type "results"
node reader.js --results             # just show the tally (not required)
```

## Reset
```bash
./clear.sh                           # wipes votes and tokens, keeps keys
```
