/**
 * Generates ballot.html — the standalone file distributed to voters.
 * The server's RSA public key and voting options are embedded at build time.
 *
 * Usage: npm run build
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const config     = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))
const jwkPath    = path.join(__dirname, 'data', 'public.jwk')

if (!fs.existsSync(jwkPath)) {
  console.error('ERROR: data/public.jwk not found. Run "npm run keys" first.')
  process.exit(1)
}

const publicKeyJwk = JSON.parse(fs.readFileSync(jwkPath, 'utf8'))

const clientConfig = {
  title:           config.title,
  question:        config.question,
  options:         config.options,
  receiverContact: config.receiverContact ?? null,
  publicKey:       publicKeyJwk
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

const html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #e2e8f0;
      position: relative;
      overflow: hidden;
    }

    /* ── Animated background orbs ── */
    body::before, body::after {
      content: '';
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      opacity: .35;
      z-index: 0;
      animation: float 20s ease-in-out infinite;
    }
    body::before {
      width: 500px; height: 500px;
      background: radial-gradient(circle, #6366f1, transparent 70%);
      top: -10%; left: -10%;
    }
    body::after {
      width: 400px; height: 400px;
      background: radial-gradient(circle, #8b5cf6, transparent 70%);
      bottom: -10%; right: -10%;
      animation-delay: -10s;
      animation-direction: reverse;
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25%      { transform: translate(60px, 40px) scale(1.1); }
      50%      { transform: translate(-30px, 80px) scale(.95); }
      75%      { transform: translate(40px, -30px) scale(1.05); }
    }

    /* ── Card — liquid glass ── */
    .card {
      background: rgba(255, 255, 255, .06);
      backdrop-filter: blur(40px) saturate(1.5);
      -webkit-backdrop-filter: blur(40px) saturate(1.5);
      border: 1px solid rgba(255, 255, 255, .12);
      border-radius: 24px;
      padding: 0;
      max-width: 520px;
      width: 100%;
      overflow: hidden;
      box-shadow:
        0 25px 60px rgba(0,0,0,.35),
        inset 0 1px 0 rgba(255,255,255,.1),
        inset 0 -1px 0 rgba(0,0,0,.1);
      position: relative;
      z-index: 1;
    }

    /* Subtle glass highlight along top edge */
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 20px; right: 20px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
      z-index: 2;
    }

    /* ── Header — frosted glass ── */
    .header {
      background: linear-gradient(135deg, rgba(99,102,241,.45), rgba(139,92,246,.4));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: 32px 36px 28px;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .header::before {
      content: '';
      position: absolute;
      top: -60%; right: -20%;
      width: 260px; height: 260px;
      background: radial-gradient(circle, rgba(255,255,255,.1), transparent 60%);
      border-radius: 50%;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -40%; left: -15%;
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(139,92,246,.2), transparent 60%);
      border-radius: 50%;
    }
    .header h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
      position: relative;
    }
    .header .tagline {
      font-size: .82rem;
      color: rgba(255,255,255,.75);
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    }
    .lock-icon {
      display: inline-flex;
      width: 14px; height: 14px;
      background: rgba(255,255,255,.3);
      border-radius: 3px;
      align-items: center;
      justify-content: center;
      font-size: 9px;
    }

    /* ── Steps indicator ── */
    .steps {
      display: flex;
      gap: 0;
      padding: 0 36px;
      margin-top: -14px;
      position: relative;
      z-index: 1;
    }
    .step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .step-dot {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(51, 65, 85, .6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 2px solid rgba(71, 85, 105, .5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .7rem;
      font-weight: 700;
      color: #94a3b8;
      transition: all .3s ease;
    }
    .step.active .step-dot {
      background: #6366f1;
      border-color: #818cf8;
      color: #fff;
      box-shadow: 0 0 12px rgba(99,102,241,.4);
    }
    .step.done .step-dot {
      background: #22c55e;
      border-color: #4ade80;
      color: #fff;
    }
    .step-label {
      font-size: .68rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .5px;
      transition: color .3s;
    }
    .step.active .step-label { color: #a5b4fc; }
    .step.done .step-label   { color: #86efac; }
    .step-line {
      flex: none;
      width: 40px;
      height: 2px;
      background: #334155;
      align-self: flex-start;
      margin-top: 13px;
      border-radius: 1px;
      transition: background .3s;
    }
    .step-line.filled { background: #22c55e; }

    /* ── Body ── */
    .body { padding: 28px 36px 36px; }

    /* ── Sections ── */
    .section { margin-bottom: 24px; transition: opacity .3s; }
    .section.disabled { opacity: .4; pointer-events: none; }

    label {
      display: block;
      font-weight: 600;
      font-size: .78rem;
      text-transform: uppercase;
      letter-spacing: .5px;
      margin-bottom: 8px;
      color: #94a3b8;
    }

    /* ── Token input ── */
    .token-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, .35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(148, 163, 184, .12);
      border-radius: 12px;
      font-size: .9rem;
      font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
      color: #e2e8f0;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .token-input::placeholder { color: #475569; }
    .token-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,.2);
    }
    .token-input:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    /* ── Candidates ── */
    .ranking-label {
      font-size: .88rem;
      font-weight: 500;
      color: #cbd5e1;
      margin-bottom: 14px;
    }

    .options {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 6px;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      background: rgba(255, 255, 255, .04);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(148, 163, 184, .1);
      border-radius: 14px;
      cursor: pointer;
      user-select: none;
      transition: all .2s ease;
      position: relative;
    }
    .option::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(255,255,255,.03), transparent);
      pointer-events: none;
    }
    .option:hover {
      background: rgba(99, 102, 241, .08);
      border-color: rgba(148, 163, 184, .2);
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      transform: translateY(-1px);
    }
    .option.selected {
      background: rgba(99, 102, 241, .18);
      border-color: rgba(129, 140, 248, .6);
      box-shadow: 0 0 0 3px rgba(99,102,241,.15), 0 6px 24px rgba(0,0,0,.2);
    }
    .option.selected .radio-ring { border-color: #818cf8; }
    .option.selected .radio-dot  { opacity: 1; transform: scale(1); }

    .radio-ring {
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 2px solid rgba(148, 163, 184, .35);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: border-color .2s;
    }
    .radio-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      opacity: 0;
      transform: scale(0);
      transition: all .2s cubic-bezier(.34,1.56,.64,1);
    }

    .opt-name {
      font-weight: 500;
      font-size: .98rem;
      flex: 1;
      color: #e2e8f0;
    }

    /* ── Buttons ── */
    .generate-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, rgba(99,102,241,.75), rgba(139,92,246,.75));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .25s ease;
      box-shadow: 0 4px 20px rgba(99,102,241,.3), inset 0 1px 0 rgba(255,255,255,.15);
      letter-spacing: .3px;
      position: relative;
      overflow: hidden;
    }
    .generate-btn::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent);
      transition: left .5s ease;
    }
    .generate-btn:hover:not(:disabled)::before { left: 100%; }
    .generate-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99,102,241,.4), inset 0 1px 0 rgba(255,255,255,.2);
    }
    .generate-btn:active:not(:disabled) { transform: translateY(0); }
    .generate-btn:disabled {
      background: rgba(51, 65, 85, .5);
      border-color: rgba(148,163,184,.1);
      box-shadow: none;
      cursor: not-allowed;
      color: #64748b;
    }

    /* ── Code output ── */
    .code-box {
      display: none;
      animation: slideUp .4s ease;
    }
    .code-box.visible { display: block; }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .success-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(34, 197, 94, .08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(34, 197, 94, .2);
      border-radius: 14px;
      margin-bottom: 16px;
      box-shadow: 0 4px 20px rgba(34,197,94,.08);
    }
    .success-icon {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #22c55e;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
      color: #fff;
    }
    .success-text {
      font-size: .85rem;
      color: #86efac;
      font-weight: 500;
      line-height: 1.4;
    }

    .code-label {
      font-weight: 600;
      font-size: .78rem;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .code-area {
      width: 100%;
      padding: 14px 16px;
      background: rgba(15, 23, 42, .4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(148, 163, 184, .1);
      border-radius: 12px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: .72rem;
      line-height: 1.7;
      color: #a5b4fc;
      word-break: break-all;
      margin-bottom: 12px;
      min-height: 80px;
      resize: none;
      outline: none;
    }

    .copy-btn {
      width: 100%;
      padding: 13px;
      background: rgba(34, 197, 94, .65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 12px;
      font-size: .92rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .25s;
      box-shadow: 0 4px 20px rgba(34,197,94,.2), inset 0 1px 0 rgba(255,255,255,.15);
      margin-bottom: 14px;
    }
    .copy-btn:hover {
      background: rgba(22, 163, 74, .7);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(34,197,94,.3), inset 0 1px 0 rgba(255,255,255,.2);
    }

    .instructions {
      background: rgba(99, 102, 241, .06);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(99, 102, 241, .15);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: .82rem;
      color: #a5b4fc;
      line-height: 1.6;
    }
    .instructions strong {
      display: block;
      margin-bottom: 2px;
      color: #c7d2fe;
    }

    /* ── Error ── */
    .error-msg {
      background: rgba(239, 68, 68, .08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid rgba(239, 68, 68, .2);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: .85rem;
      color: #fca5a5;
      margin-bottom: 16px;
      display: none;
      animation: shake .4s ease;
    }
    .error-msg.visible { display: block; }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }

    /* ── Responsive ── */
    @media (max-width: 560px) {
      body { padding: 12px; }
      .header { padding: 24px 24px 22px; }
      .steps { padding: 0 24px; }
      .body { padding: 24px 24px 28px; }
      .step-line { width: 24px; }
    }
  </style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1 id="title"></h1>
    <p class="tagline"><span class="lock-icon">&#x1f512;</span> End-to-end encrypted ballot</p>
  </div>

  <div class="steps">
    <div class="step active" id="step1">
      <div class="step-dot">1</div>
      <div class="step-label">Token</div>
    </div>
    <div class="step-line" id="line1"></div>
    <div class="step active" id="step2">
      <div class="step-dot">2</div>
      <div class="step-label">Rank</div>
    </div>
    <div class="step-line" id="line2"></div>
    <div class="step" id="step3">
      <div class="step-dot">3</div>
      <div class="step-label">Send</div>
    </div>
  </div>

  <div class="body">
    <div class="error-msg" id="errorMsg" role="alert"></div>

    <div class="section" id="tokenSection">
      <label for="token">Voter Token</label>
      <input id="token" class="token-input" type="text"
             placeholder="Paste your token here" autocomplete="off" spellcheck="false">
    </div>

    <div class="section" id="rankSection">
      <p class="ranking-label" id="question"></p>
      <ul class="options" id="options" aria-label="Candidate options"></ul>
    </div>

    <button class="generate-btn" id="generateBtn">Generate Vote Code</button>

    <div class="code-box" id="codeBox">
      <div class="success-badge">
        <div class="success-icon">&#10003;</div>
        <div class="success-text">Your vote has been encrypted.<br>Copy the code below and send it.</div>
      </div>
      <p class="code-label">Your encrypted vote code</p>
      <textarea class="code-area" id="codeArea" readonly rows="4"></textarea>
      <button class="copy-btn" id="copyBtn">Copy Vote Code</button>
      <div class="instructions" id="instructions"></div>
    </div>
  </div>
</div>

<script>
const CONFIG = ${JSON.stringify(clientConfig, null, 2)};

// ── Render ──
document.getElementById('title').textContent    = CONFIG.title
document.getElementById('question').textContent = CONFIG.question

if (CONFIG.receiverContact) {
  document.getElementById('instructions').innerHTML =
    '<strong>Next step:</strong>' + escHtml(CONFIG.receiverContact)
} else {
  document.getElementById('instructions').innerHTML =
    '<strong>Next step:</strong>Send this code to the election organizer via WhatsApp, SMS, or email.'
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  )
}

// ── Step indicator ──
function setStep(n) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step' + i)
    el.classList.remove('active', 'done')
    if (i < n) el.classList.add('done')
    else if (i === n) el.classList.add('active')
  }
  document.getElementById('line1').classList.toggle('filled', n > 1)
  document.getElementById('line2').classList.toggle('filled', n > 2)
}

// ── Render options ──
const optionsList = document.getElementById('options')
let selectedId = null

CONFIG.options.forEach(opt => {
  const li = document.createElement('li')
  li.className  = 'option'
  li.dataset.id = opt.id
  li.setAttribute('role', 'radio')
  li.setAttribute('aria-checked', 'false')
  li.innerHTML = \`
    <span class="radio-ring"><span class="radio-dot"></span></span>
    <span class="opt-name">\${escHtml(opt.label)}</span>
  \`
  li.addEventListener('click', () => {
    if (li.classList.contains('locked')) return
    optionsList.querySelectorAll('.option').forEach(el => {
      el.classList.remove('selected')
      el.setAttribute('aria-checked', 'false')
    })
    li.classList.add('selected')
    li.setAttribute('aria-checked', 'true')
    selectedId = opt.id
  })
  optionsList.appendChild(li)
})

// ── Crypto ──
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary  = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function encryptPayload(token, choice) {
  const key = await crypto.subtle.importKey(
    'jwk', CONFIG.publicKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['encrypt']
  )
  const payload    = JSON.stringify({ token, choice })
  const plaintext  = new TextEncoder().encode(payload)
  const ciphertext = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, plaintext)
  return bufToBase64(ciphertext)
}

// ── Generate ──
document.getElementById('generateBtn').addEventListener('click', async () => {
  const token = document.getElementById('token').value.trim()
  const errEl = document.getElementById('errorMsg')
  const btn   = document.getElementById('generateBtn')

  errEl.className = 'error-msg'

  if (!token) {
    errEl.textContent = 'Please enter your voter token.'
    errEl.className   = 'error-msg visible'
    return
  }

  if (!selectedId) {
    errEl.textContent = 'Please select a candidate.'
    errEl.className   = 'error-msg visible'
    return
  }

  btn.disabled    = true
  btn.textContent = 'Encrypting...'

  try {
    const code = await encryptPayload(token, selectedId)

    document.getElementById('codeArea').value = code
    document.getElementById('codeBox').classList.add('visible')
    btn.style.display = 'none'

    // Lock the form
    document.getElementById('token').disabled = true
    document.getElementById('tokenSection').classList.add('disabled')
    document.getElementById('rankSection').classList.add('disabled')
    optionsList.querySelectorAll('.option').forEach(el => el.classList.add('locked'))

    setStep(3)
  } catch (err) {
    errEl.textContent = 'Encryption failed: ' + err.message
    errEl.className   = 'error-msg visible'
    btn.disabled      = false
    btn.textContent   = 'Generate Vote Code'
  }
})

// ── Copy ──
document.getElementById('copyBtn').addEventListener('click', async () => {
  const code    = document.getElementById('codeArea').value
  const copyBtn = document.getElementById('copyBtn')
  try {
    await navigator.clipboard.writeText(code)
    copyBtn.textContent = 'Copied!'
    copyBtn.style.background = 'rgba(22,163,74,.7)'
    setTimeout(() => {
      copyBtn.textContent = 'Copy Vote Code'
      copyBtn.style.background = ''
    }, 2500)
  } catch {
    document.getElementById('codeArea').select()
    copyBtn.textContent = 'Select the text above and copy manually'
  }
})
</script>
</body>
</html>`

const outPath = path.join(__dirname, 'ballot.html')
fs.writeFileSync(outPath, html)
console.log('ballot.html generated.')
console.log(`  ${config.options.length} candidates embedded`)
console.log(`  Receiver contact: ${config.receiverContact ?? '(not set)'}`)
console.log('Distribute ballot.html to voters.')
