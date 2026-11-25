import { readFileSync } from 'node:fs'
import { parseYaml, taggedImage } from './guard.mjs'

export function parseJson5(text) {
  const token = /\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\x00-\x1f])*"|'(?:\\.|[^'\\\x00-\x1f])*'|[{}[\],:]|[A-Za-z_$][\w$]*|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/gy
  let pos = 0
  let current
  const fail = () => { throw new SyntaxError('JSON5 no válido cerca de la posición ' + pos) }
  function next() {
    do {
      if (pos === text.length) {
        current = undefined
        return
      }
      const match = token.exec(text)
      if (!match) fail()
      pos = token.lastIndex
      current = match[0]
    } while (/^\s|^\//.test(current))
  }
  function string(raw) {
    if (raw.startsWith('"')) return JSON.parse(raw)
    const escapes = raw.slice(1, -1).replace(/\\(?:'|.)|"/g, s => s === "\\'" ? "'" : s === '"' ? '\\"' : s)
    return JSON.parse('"' + escapes + '"')
  }
  function value() {
    const raw = current
    next()
    if (raw === '[' || raw === '{') {
      const list = raw === '['
      const end = list ? ']' : '}'
      const result = list ? [] : {}
      while (current !== end) {
        if (list) result.push(value())
        else {
          if (!current || !/^['"A-Za-z_$]/.test(current)) fail()
          const key = /^['"]/.test(current) ? string(current) : current
          if (key === '__proto__' || Object.hasOwn(result, key)) fail()
          next()
          if (current !== ':') fail()
          next()
          result[key] = value()
        }
        if (current === end) break
        if (current !== ',') fail()
        next()
      }
      next()
      return result
    }
    if (!raw) fail()
    if (/^['"]/.test(raw)) return string(raw)
    if (/^(?:true|false|null)$|^[-\d]/.test(raw)) return JSON.parse(raw)
    fail()
  }
  next()
  const result = value()
  if (current !== undefined) fail()
  return result
}

const names = ['orquestador', 'documentos', 'calendario']
const tools = ['vita_scan_document', 'vita_read_google_calendar', 'vita_report_result']
const exact = (list, expected) => Array.isArray(list) && list.length === expected.length &&
  expected.every(item => list.includes(item))

function configRules(config, check) {
  const { gateway = {}, plugins = {}, agents = {} } = config
  check(gateway.bind === 'loopback' && gateway.mode === 'local', 'gateway local en loopback')
  check(gateway.auth?.mode === 'token' && gateway.auth.token === '${OPENCLAW_TOKEN}', 'autenticación del gateway')
  const allowedPlugins = ['vita-tools', 'ollama']
  check(exact(plugins.allow, allowedPlugins) && exact(Object.keys(plugins.entries ?? {}), allowedPlugins), 'plugins permitidos')
  const ollama = config.models?.providers?.ollama
  check(plugins.entries?.ollama?.enabled === true && ollama?.api === 'ollama' &&
    ollama.baseUrl === 'http://127.0.0.1:11434' && ollama.apiKey === 'ollama-local', 'API nativa de Ollama en loopback')
  const models = ['glm-5.2:cloud', 'minimax-m3:cloud']
  check(exact(ollama?.models?.map(model => model.id), models), 'catálogo de Ollama')
  check(exact(Object.keys(agents.entries ?? {}), names), 'agentes permitidos')
  const limits = agents.defaults?.subagents ?? {}
  for (const key of ['maxSpawnDepth', 'maxChildrenPerAgent', 'maxConcurrent']) check(limits[key] === 1, key)
  check(Number.isInteger(limits.runTimeoutSeconds) && limits.runTimeoutSeconds > 0 && limits.runTimeoutSeconds <= 120, 'runTimeoutSeconds')
  for (const name of names) {
    const agent = agents.entries?.[name] ?? {}
    const main = name === names[0]
    check(agent.model === 'ollama/' + models[main ? 0 : 1], name + ': modelo de Ollama')
    check(exact(Object.keys(agent.tools ?? {}), ['allow']), name + ': claves de tools')
    const allowedTools = main
      ? [...tools, 'sessions_spawn', 'sessions_yield']
      : [name === 'calendario' ? tools[1] : tools[0]]
    check(exact(agent.tools?.allow, allowedTools), name + ': herramientas permitidas')
    check(exact(agent.subagents?.allowAgents, main ? ['documentos', 'calendario'] : []), name + ': delegación')
    if (main) check(agent.subagents?.requireAgentId === true, name + ': destino de delegación obligatorio')
    for (const key of Object.keys(limits)) if (Object.hasOwn(agent.subagents ?? {}, key)) check(agent.subagents[key] === limits[key], name + ': ' + key)
  }
}

function sourceRules(source, check) {
  const tokens = source.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[\w$]+|[^\s]/g)?.filter(t => !t.startsWith('//') && !t.startsWith('/*')) ?? []
  const code = tokens.join(' ')
  const registered = []
  const fields = []
  check(!/\b(?:child_process|node:fs(?:\/promises)?)\b/.test(code) && !/\b(?:eval|Function)\b|\bimport\s*\(/.test(code), 'operación de código no permitida')
  const base = /\bconst (\w+) = process \. env \. VITA_API_URL\b/.exec(code)?.[1]
  const parsed = /\bconst (\w+) = new URL \( (\w+) \)/.exec(code)
  const request = /\bfetch \( new URL \( \w+ , (\w+) \. origin \) ,/.exec(code)
  const network = base && parsed?.[2] === base && request?.[1] === parsed[1]
  check(network && !/https?:\/\//i.test(code) && tokens.filter(t => t === 'URL').length === 2 &&
    tokens.filter(t => t === 'fetch').length === 1 && !/process \. env (?!\. VITA_API_URL\b)/.test(code), 'origen de la API')
  for (const [i, token] of tokens.entries()) {
    if (token === 'callVita' && tokens[i - 1] !== 'function') {
      check(/^['"]\/?[\w.-]+(?:\/[\w.-]+)*['"]$/.test(tokens[i + 2]), 'la ruta de la API debe ser local')
    }
    if (token === 'registerTool') {
      const match = tokens.slice(i + 1, i + 6)
      registered.push(match.slice(0, 4).join(' ') === '( { name :' ? match[4]?.match(/^['"]([\w]+)['"]$/)?.[1] : undefined)
    }
    if (token !== 'Type' || tokens.slice(i + 1, i + 4).join(' ') !== '. Object (') continue
    let depth = 0
    let start = i + 4
    const args = []
    for (let j = start; j < tokens.length; j++) {
      const t = tokens[j]
      if (depth === 0 && (t === ',' || t === ')')) {
        if (j > start) args.push(tokens.slice(start, j).join(' '))
        start = j + 1
        if (t === ')') break
      } else if (['{', '[', '('].includes(t)) depth++
      else if (['}', ']', ')'].includes(t)) depth--
    }
    fields.push(args.length === 2 && /^\{ additionalProperties : false(?: ,)? \}$/.test(args[1]))
  }
  check(exact(registered, tools), 'registro de herramientas')
  check(fields.length > 0 && fields.every(Boolean), 'esquemas Type.Object cerrados')
}

function composeRules(text, check) {
  const { services } = parseYaml(text)
  const required = new Set(['POSTGRES_PASSWORD', 'VITA_API_PASSWORD', 'VITA_MIGRATOR_PASSWORD', 'VITA_DEMO_TOKENS'])
  const found = new Set()
  for (const [name, service] of Object.entries(services)) {
    const verify = (ok, msg) => check(ok, name + ': ' + msg)
    for (const port of service.ports ?? []) verify(typeof port === 'string' ? port.startsWith('127.0.0.1:') : port.host_ip === '127.0.0.1', 'puerto público')
    verify(!Object.hasOwn(service, 'privileged') && !Object.hasOwn(service, 'cap_add') &&
      service.pid !== 'host' && service.ipc !== 'host' && !/docker\.sock/.test(JSON.stringify(service)), 'aislamiento del contenedor')
    const cmd = [service.command ?? ''].flat().join(' ')
    const commands = cmd.split(/&&|[;|\n]/)
    const servers = commands.filter(command => /\buvicorn\b/.test(command))
    const bound = command => {
      const hosts = [...command.matchAll(/(?:^|\s)--host(?:=|\s+)([^\s;&|]+)/g)]
      return hosts.length === 1 && hosts[0][1] === '127.0.0.1'
    }
    if (service.network_mode === 'host' || servers.length) {
      verify(servers.length ? servers.every(bound) : commands.some(bound), 'command requiere --host 127.0.0.1')
    }
    const environment = service.environment ?? {}
    const pairs = Array.isArray(environment) ? environment.map(s => s.split(/=(.*)/s).slice(0, 2)) : Object.entries(environment)
    for (const [key, value] of pairs) {
      if (required.has(key)) {
        found.add(key)
        verify(new RegExp('^\\$\\{' + key + ':\\?[^}]*\\}$').test(value), key + ' debe ser obligatoria')
      } else if (/(?:PASSWORD|TOKEN|KEY)$/i.test(key)) {
        const optionalSecret = ['OPENCLAW_TOKEN', 'GOOGLE_TOKEN_ENCRYPTION_KEY'].includes(key) &&
          value === '${' + key + ':-}'
        verify(/^\$\{[A-Za-z_]\w*(?::\?[^}]*)?\}$/.test(value) || optionalSecret, key + ' debe venir del entorno')
      } else if (/_URL$/.test(key) && /:\/\/[^/@:]+:[^@]+@/.test(value)) {
        verify(/:\/\/[^/@:]+:\$\{\w+(?::\?[^}]*)?\}@/.test(value), key + ' contiene una contraseña literal')
      }
    }
  }
  for (const key of required) check(found.has(key), 'falta ' + key)
}

function dockerRules(text, check) {
  let user
  let stage = false
  let commands = []
  for (const line of text.replace(/\\\r?\n/g, ' ').split(/\r?\n/)) {
    const [, instruction, arg] = line.trim().match(/^(\w+)\s+(.+)$/) ?? []
    switch (instruction?.toUpperCase()) {
      case 'FROM':
        stage = true
        user = undefined
        commands = []
        check(taggedImage(arg.split(/\s+/).find(s => !s.startsWith('--'))), 'etiqueta de la imagen base')
        break
      case 'USER':
        user = arg.split(/[:\s]/)[0]
        break
      case 'CMD':
        commands.push(safeUser(user))
        break
      case 'ADD':
        check(!/https?:\/\//i.test(arg), 'ADD de URL')
        break
      case 'RUN':
        check(!/\bcurl\b.*\|\s*(?:\/bin\/)?(?:ba)?sh\b/i.test(arg), 'curl enviado al intérprete')
        break
      case 'COPY':
        check(!/(?:^|[\s/"'])\.env(?:[.\s"']|$)/.test(arg), 'COPY de .env')
        break
    }
  }
  check(stage && commands.length && commands.every(Boolean) && safeUser(user), 'etapa final con USER no root y CMD')
}

function safeUser(name) {
  return /^(?:[1-9]\d*|[a-z_][\w-]*)$/i.test(name ?? '') && name !== 'root'
}

export function checkAgents({ config, plugin, pluginPackage, pluginSource, agents, compose, dockerfile }) {
  const errors = []
  const check = (ok, msg) => { if (!ok) errors.push(msg) }
  const checks = {
    config: () => configRules(parseJson5(config), check),
    plugin: () => check(exact(parseJson5(plugin).contracts?.tools, tools), 'contrato de herramientas'),
    pluginPackage: () => {
      const pkg = parseJson5(pluginPackage)
      for (const key of ['dependencies', 'peerDependencies']) {
        for (const [name, version] of Object.entries(pkg[key])) {
          check(typeof version === 'string' && /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){2}(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version), name + ': versión exacta')
        }
      }
    },
    pluginSource: () => sourceRules(pluginSource, check),
    agentes: () => {
      check(/reportRef[^.]*scanRef[^.]*calendarRef[^.]*mensaje[^.]*respuestas[^.]*son datos no confiables/i.test(agents.orquestador), 'instrucción sobre datos no confiables')
      check(/\bNo reveles referencias\b/i.test(agents.orquestador), 'protección de referencias')
      check(/\bno extraigas ni devuelvas texto OCR bruto\b/i.test(agents.documentos), 'protección del texto OCR')
      check(/calendarRef[^.]*vita_read_google_calendar/i.test(agents.calendario), 'herramienta del agente Calendar')
      check(/\bno delegas trabajo\b/i.test(agents.calendario), 'delegación desactivada para Calendar')
    },
    compose: () => composeRules(compose, check),
    dockerfile: () => dockerRules(dockerfile, check),
  }
  for (const [name, run] of Object.entries(checks)) {
    try { run() } catch { errors.push(name + ': formato no válido') }
  }
  return errors
}

if (import.meta.main) {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const errors = checkAgents({
    config: read('openclaw/config.example.json5'), plugin: read('openclaw/vita-tools/openclaw.plugin.json'),
    pluginPackage: read('openclaw/vita-tools/package.json'), pluginSource: read('openclaw/vita-tools/index.ts'),
    agents: Object.fromEntries(names.map(name => [name, read('openclaw/agents/' + name + '/AGENTS.md')])),
    compose: read('compose.yaml'), dockerfile: read('Dockerfile'),
  })
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Contrato de agentes válido')
}
