import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

/** Lo que hace falta para abrir Vita sin conexión. `base` es la carpeta en la que se publica. */
export const precacheList = (files: readonly string[], base: string): string[] =>
  [base, ...files.filter((f) => f !== 'index.html' && f !== 'sw.js' && !f.endsWith('.map')).map((f) => base + f).toSorted()]

/** Service worker. Solo guarda el programa: los datos del hogar ya viven en IndexedDB y no pasan por aquí. */
export function serviceWorker(files: readonly string[], html: string, base: string): string {
  return `const NAME = 'vita-${sha256(JSON.stringify([files, html])).slice(0, 12)}'
const BASE = '${base}'
const PAGE = '${sha256(html)}'
const FILES = ${JSON.stringify(files)}

const hex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')

// Primero se descarga y se comprueba todo; solo entonces se guarda. A medias o con la página de otra versión, no se instala.
async function install() {
  const found = await Promise.all(FILES.map(async (file) => {
    const response = await fetch(new Request(file, { cache: 'reload' }))
    if (!response.ok) throw new Error('Falta ' + file)
    if (file === BASE && hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer())) !== PAGE) throw new Error('La página es de otra versión')
    return [file, response]
  }))
  const cache = await caches.open(NAME)
  await Promise.all(found.map(([file, response]) => cache.put(file, response)))
}

// Otras pestañas pueden seguir con la versión anterior hasta que se recarguen: se conserva esa, y solo esa.
async function clean() {
  const old = (await caches.keys()).filter((name) => /^vita-[0-9a-f]{12}$/.test(name) && name !== NAME)
  await Promise.all(old.slice(0, -1).map((name) => caches.delete(name)))
  await self.clients.claim()
}

self.addEventListener('install', (event) => { event.waitUntil(install()) })
self.addEventListener('activate', (event) => { event.waitUntil(clean()) })

// La versión nueva espera a que la persona diga que sí: recargar a mitad de un formulario perdería lo escrito.
self.addEventListener('message', (event) => { if (event.data === 'update') self.skipWaiting() })

async function page(request) {
  const cache = await caches.open(NAME)
  return (await cache.match(BASE)) ?? fetch(request)
}
async function asset(request, path) {
  const cache = await caches.open(NAME)
  return (await cache.match(path)) ?? (await caches.match(path)) ?? fetch(request)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return
  const path = url.pathname.slice(BASE.length)
  // La API y los archivos del servidor no son pantallas de Vita.
  if (path === 'api' || path.startsWith('api/')) return
  if (request.mode === 'navigate') { if (!path.split('/').at(-1).includes('.')) event.respondWith(page(request)) }
  else if (FILES.includes(url.pathname) || path.startsWith('assets/')) event.respondWith(asset(request, url.pathname))
})
`
}

export function offlinePlugin(): Plugin {
  let base = '/'
  return {
    name: 'vita-offline',
    apply: 'build',
    configResolved(config) { base = config.base },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const html = bundle['index.html']
        const page = html?.type === 'asset' ? String(html.source) : ''
        const files = [...Object.keys(bundle), 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-apple.png']
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker(precacheList([...new Set(files)], base), page, base) })
      },
    },
  }
}
