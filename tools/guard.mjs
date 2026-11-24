import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const roots = new Set('.github app database docs frontend migrations openclaw scripts tests tools .dockerignore .env.example .gitignore CHANGELOG.md Dockerfile LICENSE README.md compose.yaml package.json pyproject.toml vita-backend.md'.split(' '))
const required = `.gitignore .dockerignore package.json frontend/package.json frontend/pnpm-lock.yaml frontend/vite.config.ts
frontend/server/offline.ts frontend/server/pages.ts frontend/e2e/accessibility.spec.ts frontend/e2e/flows.spec.ts pyproject.toml
compose.yaml Dockerfile openclaw/config.example.json5 .github/dependabot.yml .github/SECURITY.md .github/pages/maintenance.html`.split(/\s+/)
required.push(...['deploy', 'monitor', 'links', 'release', 'scorecard'].map(name => `.github/workflows/${name}.yml`),
  ...['guard', 'agents', 'commit-msg', 'serve'].map(name => `tools/${name}.mjs`))
export const controls = 'guardian agentes calidad workflows secretos dependencias codeql build lighthouse e2e backend'.split(' ')
const ignoreEntries = 'node_modules/ dist/ .env .venv/ __pycache__/ *.local /reporte.md .vite/ .playwright-mcp/'.split(' ')
const forbidden = [
  /(?:^|\/)\.env[^/]*(?:\/|$)/, /\.(?:pem|key|crt|cer|p12|pfx|jks|keystore|gpg|asc|ppk|sqlite3?|db|dump|bak|backup|log)$/i,
  /(?:^|\/)(?:id_(?:rsa|ed25519|ecdsa|dsa)(?:\.pub)?|\.npmrc|\.netrc|\.htpasswd|\.pypirc|reporte\.md|package-lock\.json|yarn\.lock|bun\.lockb?)$/,
  /(?:^|\/)(?:credentials|secrets?|service-account)[^/]*\.json$/i, /^(?!migrations\/).*\.sql$/i,
  /(?:^|\/)(?:node_modules|dist|coverage|playwright-report|test-results|venv|__pycache__|\.(?:playwright-mcp|atl|vite|venv|lighthouseci|cache|pytest_cache|ruff_cache|claude|codex|cursor|idea))\//,
]
const secrets = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[\w]{60,}|AKIA[0-9A-Z]{16}|sk-(?:ant-|proj-)?[\w-]{32,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[\w-]{35})\b/

// Subconjunto de YAML del repositorio. Una construcción no reconocida detiene la revisión.
export function parseYaml(source) {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  let pos = 0
  const fail = () => { throw new Error('YAML no admitido en la línea ' + (pos + 1)) }
  const indent = line => line.length - line.trimStart().length
  const skip = () => { while (pos < lines.length && /^\s*(?:#.*)?$/.test(lines[pos])) pos++ }
  function scalar(raw) {
    if (/^[&*!]/.test(raw)) fail()
    if (/^\[|^\{(?!\{)/.test(raw)) {
      const list = raw.startsWith('[')
      if (!raw.endsWith(list ? ']' : '}')) fail()
      const items = []
      let start = 1
      let depth = 0
      let quote = ''
      for (let i = start; i < raw.length; i++) {
        const c = raw[i]
        if (quote) {
          if (quote === '"' && c === '\\') i++
          else if (c === quote) quote = ''
        } else if (c === "'" || c === '"') quote = c
        else if ((c === ',' || i === raw.length - 1) && depth === 0) {
          const item = raw.slice(start, i).trim()
          if (item) items.push(item)
          else if (c === ',') fail()
          start = i + 1
        } else if (c === '[' || c === '{') depth++
        else if (c === ']' || c === '}') depth--
      }
      if (quote || depth !== 0) fail()
      if (list) return items.map(s => scalar(s.trim()))
      const obj = Object.create(null)
      for (const pair of items) {
        const m = pair.trim().match(/^(?:['"]([\w.-]+)['"]|([\w.-]+)):\s*(.*)$/)
        if (!m) fail()
        const key = m[1] ?? m[2]
        if (Object.hasOwn(obj, key)) fail()
        obj[key] = scalar(m[3])
      }
      return obj
    }
    if (raw.startsWith('"')) return JSON.parse(raw)
    if (raw.startsWith("'")) {
      if (!raw.endsWith("'")) fail()
      return raw.slice(1, -1).replaceAll("''", "'")
    }
    return raw
  }
  function block(depth, indentless = false) {
    const list = /^-(?:\s|$)/.test(lines[pos].trim())
    const obj = list ? [] : Object.create(null)
    while (pos < lines.length) {
      skip()
      if (pos === lines.length || indent(lines[pos]) < depth) break
      if (indent(lines[pos]) !== depth) fail()
      if (indentless && !/^-(?:\s|$)/.test(lines[pos].trim())) break
      const line = lines[pos++].trim().replace(/("(?:\\.|[^"\\])*"|'(?:''|[^'])*')|\s+#.*$/g, (_, quoted) => quoted ?? '')
      if (list) {
        if (!/^-(?:\s|$)/.test(line)) fail()
        const item = line.slice(1).trim()
        if (/^(?:[\w.-]+|'[^']+'|"[^"]+"):(?:\s|$)/.test(item)) {
          lines[--pos] = ' '.repeat(depth + 2) + item
          obj.push(block(depth + 2))
        } else obj.push(scalar(item))
        continue
      }
      const pair = line.match(/^(?:'([^']+)'|"([^"]+)"|([\w.-]+)):(?:\s+(.*)|$)$/)
      if (!pair) fail()
      const key = pair[1] ?? pair[2] ?? pair[3]
      if (Object.hasOwn(obj, key)) fail()
      let value = pair[4] ?? ''
      if (/^[|>][+-]?$/.test(value)) {
        const content = []
        while (pos < lines.length && (!lines[pos].trim() || indent(lines[pos]) > depth)) content.push(lines[pos++].trim())
        obj[key] = content.join(value.startsWith('>') ? ' ' : '\n')
        continue
      }
      skip()
      const nested = pos < lines.length && indent(lines[pos]) > depth
      if (!value && pos < lines.length && indent(lines[pos]) === depth && /^-(?:\s|$)/.test(lines[pos].trim())) obj[key] = block(depth, true)
      else if (!value && nested && !/^[{[]/.test(lines[pos].trim())) obj[key] = block(indent(lines[pos]))
      else {
        while (pos < lines.length && indent(lines[pos]) > depth) {
          if (/^[\w.-]+:(?:\s|$)/.test(lines[pos].trim())) fail()
          value += ' ' + lines[pos++].trim()
          skip()
        }
        if (/^\s*[[{]/.test(value) && pos < lines.length && indent(lines[pos]) === depth && /^[\]}]$/.test(lines[pos].trim())) value += lines[pos++].trim()
        obj[key] = scalar(value.trim())
      }
    }
    return obj
  }
  skip()
  return pos === lines.length ? {} : block(0)
}

export function taggedImage(image) {
  if (typeof image !== 'string') return false
  const [name, digest, extra] = image.split('@')
  return !extra && (digest === undefined || /^sha256:[a-f\d]{64}$/.test(digest)) &&
    /:[\w.-]+$/.test(name) && !/:latest$/i.test(name)
}

function guardedBranch(condition) {
  const expression = String(condition ?? '').trim().replace(/^\$\{\{([\s\S]*)\}\}$/, '$1')
  function terms(text) {
    const parts = []
    let depth = 0
    let start = 0
    let outer = text.startsWith('(')
    for (const match of text.matchAll(/'(?:''|[^'])*'|&&|\|\||[()]/g)) {
      const token = match[0]
      if (token === '(') depth++
      if (token === ')') {
        depth--
        if (depth === 0 && match.index !== text.length - 1) outer = false
      }
      if (depth === 0 && token === '||') return []
      if (depth === 0 && token === '&&') {
        parts.push(text.slice(start, match.index))
        start = match.index + 2
      }
    }
    if (parts.length) return [...parts, text.slice(start)].flatMap(part => terms(part.trim()))
    return outer && depth === 0 ? terms(text.slice(1, -1).trim()) : [text]
  }
  const required = terms(expression.trim())
  return required.some(t => /^github\.event_name\s*!=\s*'pull_request'$/.test(t)) &&
    required.some(t => /^github\.ref\s*==\s*'refs\/heads\/development'$/.test(t))
}

function workflowErrors(file, source) {
  const wf = parseYaml(source)
  const errors = []
  const fail = msg => errors.push(file + ': ' + msg)
  if (!wf.permissions || typeof wf.permissions !== 'object' || Array.isArray(wf.permissions) || Object.keys(wf.permissions).length) fail('se requiere permissions: {} global')
  if (/\bpull_request_target\b/.test(JSON.stringify(wf.on))) fail('evento pull_request_target')
  const deploy = file.endsWith('/deploy.yml')
  const jobs = wf.jobs ?? {}
  const packaging = jobs.empaquetar
  const needs = [packaging?.needs].flat()
  const trusted = new Set(['empaquetar', 'mantenimiento', 'deploy', 'humo'])
  if (deploy && (!packaging || !jobs.deploy)) fail('faltan empaquetar o deploy')
  if (deploy) for (const id of controls) if (!jobs[id]) fail('falta el control ' + id)
  for (const [id, job] of Object.entries(jobs)) {
    const report = msg => fail(id + ': ' + msg)
    const steps = job.steps ?? []
    if (!job.uses && !/^[1-9]\d*$/.test(job['timeout-minutes'])) report('falta timeout-minutes válido')
    for (const step of [job, ...steps]) {
      const ref = step.uses
      if (ref?.startsWith('docker://')) {
        if (!taggedImage(ref)) report('imagen sin etiqueta fija')
      } else if (ref && !ref.startsWith('./') && !/@[a-f0-9]{40}$/i.test(ref)) report('acción sin SHA de 40 caracteres')
      if (/^actions\/checkout@/i.test(ref) && String(step.with?.['persist-credentials']) !== 'false') report('checkout requiere persist-credentials: false')
      for (const [, expr] of String(step.run ?? '').matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
        if (/\b(?:github\s*[.[]\s*['"]?(?:event|head_ref)\b|inputs\s*[.[]|steps\s*[.[][^}]*?\boutputs\b)/i.test(expr)) report('dato externo interpolado en run')
      }
      if (deploy && !trusted.has(id) && (String(step['continue-on-error']).toLowerCase() === 'true' || /\|\|\s*true\b/.test(step.run))) report('la revisión oculta errores')
    }
    for (const service of [job.container, ...Object.values(job.services ?? {})].filter(Boolean)) {
      if (!taggedImage(service.image ?? service)) report('imagen sin etiqueta fija')
    }
    if (job.permissions === 'write-all' || (job.permissions?.pages === 'write' && !(deploy && id === 'deploy'))) report('permisos de escritura excesivos')
    if (!deploy) continue
    if (!trusted.has(id) && !needs.includes(id)) report('falta en needs de empaquetar')
    if ((id === 'deploy' || id === 'empaquetar') && !guardedBranch(job.if)) report('condición de despliegue incompleta')
    if (id !== 'empaquetar' && job.permissions?.attestations === 'write') report('permisos de escritura excesivos')
    const expressions = Object.values(job).flatMap(value => [...JSON.stringify(value).matchAll(/\$\{\{(.*?)\}\}/g)])
    const contexts = [...expressions.map(match => match[1]), job.if, ...steps.map(step => step.if)]
    if (job.secrets === 'inherit' || contexts.some(expr => /\bsecrets\b(?!\s*\.\s*GITHUB_TOKEN\b)/i.test(expr))) report('secreto no permitido')
  }
  return errors
}

export function checkRepo({ files, ignored, read, size }) {
  const errors = ignored.map(file => file + ': versionado pero ignorado')
  const paths = new Set(files)
  for (const file of required) if (!paths.has(file)) errors.push(file + ': archivo crítico ausente')
  for (const file of paths) {
    const fail = msg => errors.push(file + ': ' + msg)
    if (!roots.has(file.split('/')[0])) fail('ruta imprevista en la raíz')
    if (!['.env.example', 'frontend/.env.example'].includes(file) && forbidden.some(re => re.test(file))) fail('ruta prohibida')
    try {
      if (size(file) > 1024 ** 2) fail('supera 1024 KB')
      const content = read(file)
      if (secrets.test(content)) fail('posible secreto')
      if (file === '.gitignore') {
        const lines = content.split(/\r?\n/).map(s => s.trim())
        for (const entry of ignoreEntries) if (!lines.includes(entry)) fail('falta ' + entry)
      }
      if (file === 'frontend/package.json' && !/^pnpm@\S+$/.test(JSON.parse(content).packageManager)) fail('se requiere packageManager pnpm@')
      if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(file)) errors.push(...workflowErrors(file, content))
    } catch { fail('no se pudo leer o interpretar el archivo') }
  }
  return errors
}

if (import.meta.main) {
  const [mode, list, extra] = process.argv.slice(2)
  if (mode && (mode !== '--files-from' || !list || extra)) throw new Error('Uso: guard.mjs [--files-from archivo]')
  const read = file => readFileSync(file, 'utf8')
  const tracked = (...args) => execFileSync('git', ['ls-files', '-z', ...args], { encoding: 'utf8' }).split('\0').filter(Boolean)
  const files = mode ? read(list).split(/\r?\n/).filter(Boolean).map(f => f.replace(/^\.\//, '')) : tracked()
  const errors = checkRepo({ files, ignored: mode ? [] : tracked('-ci', '--exclude-standard'), read, size: f => statSync(f).size })
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log(`${files.length} archivos revisados`)
}
