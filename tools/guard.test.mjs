import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRepo, controls } from './guard.mjs'

const critical = `.gitignore .dockerignore package.json frontend/package.json frontend/pnpm-lock.yaml
frontend/vite.config.ts frontend/server/offline.ts frontend/server/pages.ts frontend/e2e/accessibility.spec.ts
frontend/e2e/flows.spec.ts pyproject.toml compose.yaml Dockerfile openclaw/config.example.json5
.github/workflows/deploy.yml .github/workflows/monitor.yml .github/workflows/links.yml .github/workflows/release.yml
.github/workflows/scorecard.yml .github/dependabot.yml .github/SECURITY.md .github/pages/maintenance.html
tools/guard.mjs tools/agents.mjs tools/commit-msg.mjs tools/serve.mjs`.split(/\s+/)
const entries = 'node_modules/ dist/ .env .venv/ __pycache__/ *.local /reporte.md .vite/ .playwright-mcp/'.split(' ')
const condition = "github.event_name != 'pull_request' && github.ref == 'refs/heads/development'"
const deploy = '.github/workflows/deploy.yml'
const workflow = `permissions: {}
on: push
jobs:
  revision:
    timeout-minutes: 5
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${'a'.repeat(40)}
        with:
          persist-credentials: false
      - run: echo listo
${controls.map(id => `  ${id}:
    uses: ./.github/workflows/monitor.yml
`).join('')}  empaquetar:
    needs:
      - revision
${controls.map(id => `      - ${id}
`).join('')}    if: ${condition}
    permissions:
      attestations: write
    uses: ./.github/workflows/monitor.yml
  deploy:
    needs: empaquetar
    if: ${condition}
    permissions:
      pages: write
    uses: ./.github/workflows/monitor.yml`

function repo() {
  const data = Object.fromEntries(critical.map(file => [file, '']))
  for (const file of critical.filter(file => file.includes('/workflows/'))) {
    data[file] = file === deploy ? workflow : workflow.slice(0, workflow.indexOf('  empaquetar:')).replace('on: push', 'on: workflow_call')
  }
  data['.gitignore'] = entries.join('\n')
  data['frontend/package.json'] = '{"packageManager":"pnpm@10"}'
  return data
}

function check(data, overrides = {}) {
  return checkRepo({ files: Object.keys(data), ignored: [], read: f => data[f], size: f => Buffer.byteLength(data[f]), ...overrides })
}

test('repositorio permitido y variantes de needs', () => {
  const block = 'needs:\n      - revision\n' + controls.map(id => `      - ${id}\n`).join('')
  for (const needs of [`needs: [revision, ${controls.join(', ')}]\n`, block, `needs: [\n      revision, ${controls.join(', ')},\n    ]\n`]) {
    const data = repo()
    data[deploy] = workflow.replace(block, needs)
    for (const file of ['.env.example', 'frontend/.env.example', 'migrations/schema.sql']) data[file] = ''
    assert.deepEqual(check(data), [])
  }
})

for (const file of critical) test('falta ' + file, () => {
  const data = repo()
  delete data[file]
  assert.ok(check(data).some(error => error.includes(file)))
})

for (const id of controls) test('desaparece el control ' + id, () => {
  const data = repo()
  data[deploy] = workflow.replace(`  ${id}:\n    uses: ./.github/workflows/monitor.yml\n`, '').replace(`      - ${id}\n`, '')
  assert.ok(check(data).some(error => error.includes('falta el control ' + id)))
})

test('solo el despliegue puede publicar, en cualquier workflow', () => {
  const data = repo()
  const file = '.github/workflows/links.yml'
  data[file] += "\n  otro:\n    permissions:\n      pages: write\n    uses: ./.github/workflows/monitor.yml\n"
  assert.ok(check(data).some(error => error.includes('permisos de escritura')))
})

for (const entry of entries) test('protección ' + entry, () => {
  const data = repo()
  data['.gitignore'] = entries.filter(item => item !== entry).join('\n')
  assert.ok(check(data).length)
})

for (const name of `.env .envrc .env.example .env.local copia.sql id_rsa.pub clave.pem .npmrc secrets-app.json
copia.dump test.sqlite prueba.log node_modules/a dist/a .venv/a __pycache__/a .claude/a .codex/a .cursor/a
.idea/a package-lock.json yarn.lock bun.lock bun.lockb .playwright-mcp/a .atl/a reporte.md .vite/a`.split(/\s+/)) {
  test('ruta prohibida ' + name, () => assert.ok(check({ ...repo(), ['docs/' + name]: '' }).length))
}

test('raíz, ignorados, tamaño y gestor', () => {
  assert.ok(check({ ...repo(), extra: '' }).length)
  assert.ok(check(repo(), { ignored: ['package.json'] }).length)
  assert.deepEqual(check(repo(), { size: () => 1024 ** 2 }), [])
  assert.ok(check(repo(), { size: () => 1024 ** 2 + 1 }).length)
  for (const pkg of ['{', '{}', '{"packageManager":"npm@10"}']) assert.ok(check({ ...repo(), 'frontend/package.json': pkg }).length)
})

for (const secret of ['-----BEGIN ' + 'PRIVATE KEY-----', 'ghp_' + 'a'.repeat(36), 'github_pat_' + 'a'.repeat(60),
  'AKIA' + 'A'.repeat(16), 'sk-' + 'x'.repeat(32), 'xoxb-' + 'x'.repeat(10), 'AIza' + 'x'.repeat(35)]) {
  test('formato secreto ' + secret.slice(0, 4), () => assert.ok(check({ ...repo(), 'docs/test.md': secret }).length))
}

const faults = [
  ['permissions: {}', 'permissions: write-all'], ['on: push', 'on: pull_request_target'],
  ['a'.repeat(40), 'main'], ['persist-credentials: false', 'persist-credentials: true'],
  ['      - run:', '      - name: otro\n        with:\n          persist-credentials: false\n        run:'],
  ['timeout-minutes: 5', 'name: revisión'], ['runs-on:', 'continue-on-error: true\n    runs-on:'],
  ['echo listo', 'comprobar || true'], ['runs-on:', 'container: ejemplo:latest\n    runs-on:'],
  ['runs-on:', 'services:\n      db:\n        image: postgres\n    runs-on:'],
  ['- revision', '- otra'], ['pages: write', 'attestations: write'], ['attestations: write', 'pages: write'],
  ['echo listo', 'echo ${{ secrets.PRIVATE }}'], ['runs-on:', 'if: secrets.PRIVATE\n    runs-on:'],
  ['runs-on:', 'container: postgres@sha256:' + 'b'.repeat(64) + '\n    runs-on:'],
]
for (const expression of ['github.event.issue.title', 'inputs.foo', 'steps.x.outputs.y', 'github.head_ref']) {
  faults.push(['echo listo', '|\n          echo ${{ format("x", ' + expression + ') }}'])
}
for (const job of ['empaquetar', 'deploy']) {
  for (const weak of [condition.split(' && ')[0], condition.split(' && ')[1], condition + ' || always()', "${{ !(success() && " + condition + " && success()) }}"]) {
    test(job + ' exige ' + weak, () => {
      const start = workflow.indexOf('  ' + job + ':')
      assert.ok(check({ ...repo(), [deploy]: workflow.slice(0, start) + workflow.slice(start).replace(condition, weak) }).length)
    })
  }
}
for (const [from, to] of faults) test('workflow ' + to, () => {
  let changed = workflow.replace(from, () => to)
  if (to.startsWith('      - name:')) changed = changed.replace('persist-credentials: false', 'otra: false')
  assert.notEqual(changed, workflow)
  assert.ok(check({ ...repo(), [deploy]: changed }).length)
})
