// Sirve frontend/dist como lo hace GitHub Pages: en su carpeta, comprimido y con 404.html para lo que no existe.
// Lo usan las pruebas de navegador y Lighthouse. Uso: SITE_URL=https://… node tools/serve.mjs [puerto]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const PORT = Number(process.argv[2] ?? 4173)
const BASE = process.env.SITE_URL ? new URL(process.env.SITE_URL).pathname.replace(/\/?$/, '/') : '/'
const ROOT = resolve(fileURLToPath(new URL('../frontend/dist', import.meta.url)))
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSED = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.txt'])

async function find(path) {
  let file
  try { file = resolve(ROOT, `.${sep}${decodeURIComponent(path)}`) } catch { return null }
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null
  if (file === ROOT) return resolve(ROOT, 'index.html')
  return (await stat(file).catch(() => null))?.isFile() ? file : null
}

async function send(request, response, status, file) {
  const type = extname(file)
  let body = await readFile(file)
  const headers = { 'Content-Type': TYPES[type] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600' }
  if (COMPRESSED.has(type) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body)
    headers['Content-Encoding'] = 'gzip'
  }
  response.writeHead(status, headers).end(request.method === 'HEAD' ? undefined : body)
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  if (BASE !== '/' && pathname === BASE.slice(0, -1)) {
    response.writeHead(301, { Location: BASE }).end()
    return
  }
  const reply = async () => {
    const file = pathname.startsWith(BASE) ? await find(pathname.slice(BASE.length)) : null
    await send(request, response, file ? 200 : 404, file ?? resolve(ROOT, '404.html'))
  }
  reply().catch(() => { response.writeHead(500).end() })
}).listen(PORT, '127.0.0.1', () => { console.log(`Sirviendo frontend/dist en http://127.0.0.1:${PORT}${BASE}`) })
