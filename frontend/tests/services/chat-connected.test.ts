import { afterEach, expect, test, vi } from 'vitest'
import { respond, followUps } from '@/services/chat/connected'
import { UNKNOWN, type ChatContext } from '@/services/chat'
import { buildMember } from '../support/builders'

const actor = buildMember('ana', 'master', { name: 'Ana' })
const context: ChatContext = { actor, members: [actor], records: [], enabled: ['planner'], today: '2026-11-25', emergencyNumber: '112', canReadPhotos: false }
const ask = (message = 'Organiza mi día', connected = true, household: string | null = 'hogar') =>
  respond(message, context, [], connected, household, new AbortController().signal)
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test('consulta primero el dispositivo y exige permiso y servidor', async () => {
  const request = vi.fn()
  vi.stubGlobal('fetch', request)
  for (const text of ['Mi medicación', 'Busca el DNI', '¿Qué tengo mañana?', 'Teléfonos de emergencia']) await ask(text)
  await ask(undefined, false)
  await ask(undefined, true, null)
  expect(request).not.toHaveBeenCalled()
})
test('envía solo el contexto mínimo y recibe una propuesta para revisar', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ reply: { kind: 'proposals', text: 'Revisa la tarea', proposals: [{ typeId: 'task', data: { title: 'Regar' } }] } }))
  vi.stubGlobal('fetch', request)
  expect(await ask()).toMatchObject({ remote: true, reply: { proposals: [{ typeId: 'task', ready: true }] } })
  expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({ message: 'Organiza mi día', actor: { id: 'ana', name: 'Ana' }, members: [{ id: 'ana', name: 'Ana' }], origin: null, today: context.today, timeZone: expect.any(String), history: [] })
})
test.each([
  Response.json({}, { status: 503 }),
  Response.json({ reply: { kind: 'text', text: 'a'.repeat(2001) } }),
  Response.json({ reply: { kind: 'text', text: '<b>Hola</b>' } }),
  ...['medication', 'task'].map(typeId => Response.json({ reply: { kind: 'proposals', text: 'Revisa', proposals: [{ typeId, data: {} }] } })),
])('recupera la respuesta local ante un error', async response => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  const { reply } = await ask()
  expect(reply.text).toContain(UNKNOWN)
  expect(reply.text).toContain('No he podido consultar')
})
test('corta la espera a los veinte segundos', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', (_url: string, { signal }: RequestInit) => new Promise((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason))))
  const result = ask()
  await vi.advanceTimersByTimeAsync(20_000)
  expect((await result).reply.text).toContain('No he podido consultar')
})
test('da seguimiento según la respuesta y reconoce ambas preguntas de agenda', () => {
  const reply = { kind: 'agenda', text: '', items: [], remaining: [] } as const
  expect(followUps(reply)).toEqual(['¿Y mañana?', '¿Y la semana que viene?'])
  for (const message of followUps(reply)) expect(respond(message, { ...context, previous: reply }, [], false, null, new AbortController().signal)).toMatchObject({ reply: { kind: 'agenda' } })
  expect(followUps({ kind: 'text', text: UNKNOWN }).length).toBeGreaterThanOrEqual(2)
  expect(followUps({ kind: 'proposals', text: '', proposals: [] })).toEqual([])
})

test('el historial lleva seis intercambios remotos y excluye tarjetas y consultas privadas', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ reply: { kind: 'text', text: 'De acuerdo' } }))
  vi.stubGlobal('fetch', request)
  const remote = Array.from({ length: 8 }, (_, i) => ({
    id: String(i), remote: true, message: 'Mensaje ' + i, cards: {},
    reply: { kind: 'proposals', text: 'Propuesta ' + i, proposals: [{ typeId: 'task', data: { title: 'Contenido privado' }, ready: true, missing: [], notes: [] }] } as const,
  }))
  const local = { id: 'local', message: 'Mi medicación', reply: { kind: 'text', text: 'Dato privado' } as const, cards: {} }
  await respond('Organiza mi día', context, [...remote, local], true, 'hogar', new AbortController().signal)
  const body = request.mock.calls[0]![1].body
  expect(JSON.parse(body).history).toEqual(remote.slice(-6).map(t => ({ message: t.message, reply: t.reply.text })))
  expect(body).not.toContain('privado')
  expect(body).not.toContain('medicación')
})
