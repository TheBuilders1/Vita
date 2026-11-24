import { describe, expect, test } from 'vitest'
import { precacheList, serviceWorker } from '../../server/offline'

const HTML = '<!doctype html><title>Vita</title>'
const name = (code: string) => /vita-[0-9a-f]{12}/.exec(code)?.[0]

describe('lo que se guarda para abrir sin conexión', () => {
  test('la página, los iconos y todo lo compilado, también en una subcarpeta', () => {
    const files = ['assets/index-a1.js', 'assets/x-b2.css', 'index.html', 'sw.js', 'assets/mapa.js.map']
    expect(precacheList(files, '/')).toEqual(['/', '/assets/index-a1.js', '/assets/x-b2.css'])
    expect(precacheList(files, '/vita/')).toEqual(['/vita/', '/vita/assets/index-a1.js', '/vita/assets/x-b2.css'])
  })
  test('cada versión tiene su propio almacén', () => {
    expect(name(serviceWorker(['/'], HTML, '/'))).toBe(name(serviceWorker(['/'], HTML, '/')))
    expect(name(serviceWorker(['/', '/a.js'], HTML, '/'))).not.toBe(name(serviceWorker(['/'], HTML, '/')))
    expect(name(serviceWorker(['/'], `${HTML} `, '/'))).not.toBe(name(serviceWorker(['/'], HTML, '/')))
  })
})

/** Ejecuta el código generado con un navegador de mentira. */
async function run(files: string[], served: Record<string, string>, base = '/') {
  const stores = new Map<string, Map<string, Response>>()
  const handlers: Record<string, (event: never) => void> = {}
  const cacheOf = (key: string) => { const store = stores.get(key) ?? new Map<string, Response>(); stores.set(key, store); return store }
  const path = (key: string | Request) => new URL(typeof key === 'string' ? key : key.url, 'https://vita.test').pathname
  const caches = {
    open: (key: string) => Promise.resolve({
      put: (k: string, r: Response) => { cacheOf(key).set(path(k), r); return Promise.resolve() },
      match: (k: string) => Promise.resolve(cacheOf(key).get(path(k))?.clone()),
    }),
    match: (k: string) => Promise.resolve([...stores.values()].map((s) => s.get(path(k))).find(Boolean)?.clone()),
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (key: string) => Promise.resolve(stores.delete(key)),
  }
  const fetchFake = (request: string | Request) => { const body = served[path(request)]; return Promise.resolve(body === undefined ? new Response('', { status: 404 }) : new Response(body)) }
  const self = { location: new URL('https://vita.test/sw.js'), addEventListener: (type: string, fn: (event: never) => void) => { handlers[type] = fn }, clients: { claim: () => Promise.resolve() }, skipWaiting: () => undefined }
  class FakeRequest { readonly url: string; constructor(url: string) { this.url = new URL(url, 'https://vita.test').href } }
  const code = serviceWorker(precacheList(files, base), HTML, base)
  // oxlint-disable-next-line typescript/no-implied-eval -- es el propio código generado, que aquí se ejecuta para probarlo
  new Function('self', 'caches', 'fetch', 'Request', 'URL', 'crypto', 'TextDecoder', code)(self, caches, fetchFake, FakeRequest, URL, crypto, TextDecoder)
  const fire = async (type: string, extra: object = {}) => {
    const waits: Promise<unknown>[] = []
    let response: Promise<Response> | undefined
    handlers[type]!({ ...extra, waitUntil: (p: Promise<unknown>) => waits.push(p), respondWith: (p: Promise<Response>) => { response = p } } as never)
    await Promise.all(waits)
    return response
  }
  const get = async (url: string, mode = 'cors', method = 'GET') => {
    const response = await fire('fetch', { request: { url: `https://vita.test${url}`, mode, method } })
    return response?.text()
  }
  return { stores, fire, get }
}

describe('el service worker', () => {
  const served = { '/': HTML, '/assets/a.js': 'A', '/api/x': 'API', '/informe.pdf': 'PDF' }
  test('sin red sirve la página y sus archivos', async () => {
    const sw = await run(['assets/a.js'], served)
    await sw.fire('install')
    expect(await sw.get('/calendario', 'navigate')).toBe(HTML)
    expect(await sw.get('/assets/a.js')).toBe('A')
  })
  test('no se instala si la página servida es de otra versión', async () => {
    const sw = await run(['assets/a.js'], { ...served, '/': '<title>Otra</title>' })
    await expect(sw.fire('install')).rejects.toThrow()
    expect(sw.stores.size).toBe(0)
  })
  test('no se instala a medias', async () => {
    const sw = await run(['assets/a.js', 'assets/falta.js'], served)
    await expect(sw.fire('install')).rejects.toThrow()
    expect(sw.stores.size).toBe(0)
  })
  test('no toca la API, otros archivos del servidor ni lo que no es lectura', async () => {
    const sw = await run(['assets/a.js'], served)
    await sw.fire('install')
    for (const url of ['/api', '/api/x', '/sw.js', '/informe.pdf']) expect(await sw.get(url, 'navigate')).toBeUndefined()
    expect(await sw.get('/calendario', 'navigate', 'POST')).toBeUndefined()
  })
  test('en una subcarpeta no sale de ella', async () => {
    const sw = await run(['assets/a.js'], { '/vita/': HTML, '/vita/assets/a.js': 'A' }, '/vita/')
    await sw.fire('install')
    expect(await sw.get('/vita/ajustes', 'navigate')).toBe(HTML)
    expect(await sw.get('/otra', 'navigate')).toBeUndefined()
  })
  test('conserva la versión anterior para las pestañas que aún la usan, y solo esa', async () => {
    const sw = await run(['assets/a.js'], served)
    sw.stores.set('vita-000000000001', new Map([['/assets/vieja.js', new Response('1')]]))
    sw.stores.set('vita-000000000002', new Map([['/assets/anterior.js', new Response('2')]]))
    sw.stores.set('ajena', new Map())
    await sw.fire('install')
    await sw.fire('activate')
    expect([...sw.stores.keys()].filter((k) => k !== 'ajena')).toHaveLength(2)
    expect(sw.stores.has('vita-000000000002') && sw.stores.has('ajena')).toBe(true)
    expect(await sw.get('/assets/anterior.js')).toBe('2')
  })
})
