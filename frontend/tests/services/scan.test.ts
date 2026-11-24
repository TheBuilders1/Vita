import { expect, test, vi } from 'vitest'
import { readExpiry, type ScanOptions } from '@/services/scan'

const DOC = '22222222-2222-4222-8222-222222222222'
const RUN = '11111111-1111-4111-8111-111111111111'
const HOUSE = '33333333-3333-4333-8333-333333333333'
type Step = Response | Error
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const uploaded = () => json({ documentId: DOC, status: 'uploaded' }, 201)
const accepted = () => json({ runId: RUN, status: 'queued' }, 202)
const run = (status: string, result: unknown = null, errorCode: string | null = null) => json({ runId: RUN, status, result, errorCode })
const done = (result: unknown) => run('completed', result)

function scan(steps: Step[], extra: Partial<ScanOptions> = {}) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = steps.shift()
    if (next === undefined) throw new Error('llamada inesperada')
    if (next instanceof Error) throw next
    return next
  })
  const result = readExpiry({ file: new File(['x'], 'dni.jpg', { type: 'image/jpeg' }), household: HOUSE, signal: new AbortController().signal, fetch: fetch as never, wait: async () => {}, ...extra })
  return { fetch, result }
}

test('sube, pide y espera hasta la fecha', async () => {
  const { fetch, result } = scan([uploaded(), accepted(), run('queued'), run('running'), done({ status: 'date_found', expiresOn: '2030-12-31' })])
  expect(await result).toEqual({ status: 'found', date: '2030-12-31' })
  expect(fetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)).toEqual(['POST /api/v1/documents', 'POST /api/v1/runs', `GET /api/v1/runs/${RUN}`, `GET /api/v1/runs/${RUN}`, `GET /api/v1/runs/${RUN}`])
  for (const [, init] of fetch.mock.calls) expect(new Headers(init?.headers).get('x-vita')).toBe('1')
  expect(JSON.parse(String(fetch.mock.calls[1]![1]!.body))).toMatchObject({ householdId: HOUSE, documentId: DOC })
})
test('no lleva nombre de archivo ni datos del documento', async () => {
  const { fetch, result } = scan([uploaded(), accepted(), done({ status: 'date_missing' })])
  await result
  const form = fetch.mock.calls[0]![1]!.body as FormData
  expect([...form.keys()].toSorted()).toEqual(['file', 'householdId'])
  expect((form.get('file') as File).name).toBe('foto.jpg')
})
test.each([['date_missing', 'missing'], ['date_ambiguous', 'ambiguous']])('%s', async (status, expected) => expect(await scan([uploaded(), accepted(), done({ status })]).result).toEqual({ status: expected }))
test.each([
  ['el agente falla', () => [uploaded(), accepted(), run('failed', null, 'document_agent_failed')]],
  ['se agota el tiempo del servidor', () => [uploaded(), accepted(), run('timed_out')]],
  ['el resultado es de fallo', () => [uploaded(), accepted(), done({ status: 'failed', errorCode: 'document_agent_failed' })]],
  ['termina sin resultado', () => [uploaded(), accepted(), run('completed')]],
  ['la fecha no existe', () => [uploaded(), accepted(), done({ status: 'date_found', expiresOn: '2030-02-31' })]],
  ['la respuesta no es la esperada', () => [uploaded(), accepted(), json({ otra: 1 })]],
])('si %s, no hay fecha', async (_, steps) => expect(await scan(steps()).result).toEqual({ status: 'failed' }))
test.each<[string, () => Step[], string]>([
  ['sin conexión', () => [new TypeError('Failed to fetch')], 'No se puede conectar'],
  ['con el servidor parado', () => [json({}, 502)], 'No se puede conectar'],
  ['con el proxy parado', () => [json({}, 500)], 'No se puede conectar'],
  ['sin permiso', () => [json({}, 401)], 'no acepta la conexión'],
  ['fuera del hogar', () => [json({ detail: 'not_a_household_member' }, 403)], 'no acepta la conexión'],
  ['foto demasiado grande', () => [json({}, 413)], 'no admite esta foto'],
  ['foto ilegible', () => [json({}, 422)], 'no admite esta foto'],
  ['respuesta que no es JSON', () => [new Response('<html>', { status: 200 })], 'No se puede conectar'],
])('%s: lo explica', async (_, steps, message) => expect(scan(steps()).result).rejects.toThrow(message))
test('no espera para siempre', async () => {
  const endless = Array.from({ length: 400 }, () => run('running'))
  expect(await scan([uploaded(), accepted(), ...endless]).result).toEqual({ status: 'failed' })
})
test('un corte pasajero mientras espera no lo estropea', async () => expect(await scan([uploaded(), accepted(), new TypeError('x'), done({ status: 'date_found', expiresOn: '2030-12-31' })]).result).toEqual({ status: 'found', date: '2030-12-31' }))
test('cancelar lo detiene', async () => {
  const stop = new AbortController()
  const { result } = scan([uploaded(), accepted(), run('running')], { signal: stop.signal, wait: async () => { stop.abort() } })
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
})
