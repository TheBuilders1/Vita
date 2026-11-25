import { afterEach, expect, test, vi } from 'vitest'
import { assistantTimeoutMs, respond, followUps } from '@/services/chat/connected'
import { UNKNOWN, type ChatAssistantAttachment, type ChatContext } from '@/services/chat'
import { buildMember, buildRecord } from '../support/builders'

const actor = buildMember('ana', 'master', { name: 'Ana' })
const dni = buildRecord({ id: 'dni', moduleId: 'documents', typeId: 'document', data: { kind: 'id', title: 'DNI de Ana', member: 'ana', expiryDate: '2030-12-31' } })
const context: ChatContext = { actor, members: [actor], records: [dni], enabled: ['planner', 'documents'], today: '2026-11-25', emergencyNumber: '112', canReadPhotos: false }
const remote = (connected = true, household: string | null = 'hogar', attachments: ChatAssistantAttachment[] = []) =>
  ({ connected, household, conversationId: 'c'.repeat(32), attachments, signal: new AbortController().signal })
const ask = (message = 'Organiza mi día', options = remote()) => respond(message, context, options)
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test('sin permiso o sin servidor no sale nada del dispositivo', async () => {
  const request = vi.fn()
  vi.stubGlobal('fetch', request)
  for (const text of ['Organiza mi día', 'Busca el DNI']) {
    await ask(text, remote(false))
    await ask(text, remote(true, null))
  }
  expect(request).not.toHaveBeenCalled()
})

test('lo que se resuelve aquí no se consulta: apuntar, emergencias', async () => {
  const request = vi.fn()
  vi.stubGlobal('fetch', request)
  expect(await ask('Recuérdame regar las plantas mañana')).toMatchObject({ remote: false, reply: { kind: 'proposals' } })
  expect(await ask('Llama a una ambulancia')).toMatchObject({ remote: false, reply: { kind: 'emergency' } })
  expect(request).not.toHaveBeenCalled()
})

test('lo que no entiende va al asistente con el hilo y sin datos del hogar', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ message: 'Te ayudo a organizarlo.' }))
  vi.stubGlobal('fetch', request)
  expect(await ask()).toEqual({ reply: { kind: 'assistant', text: 'Te ayudo a organizarlo.' }, details: undefined, remote: true })
  expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({ message: 'Organiza mi día', conversationId: 'c'.repeat(32), context: [], attachments: [], visionRefs: [] })
})

test('una consulta del hogar manda solo los datos visibles y conserva la ficha', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ message: 'Tu DNI caduca en 2030.' }))
  vi.stubGlobal('fetch', request)
  const result = await ask('Busca el DNI')
  expect(result).toMatchObject({ remote: true, reply: { kind: 'assistant' }, details: { kind: 'facts' } })
  expect(JSON.parse(request.mock.calls[0]![1].body).context[0].title).toBe('DNI de Ana')
})

test('si el servidor falla, se queda la respuesta local', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 503 })))
  expect(await ask('Busca el DNI')).toMatchObject({ remote: false, reply: { kind: 'facts' } })
  const { reply } = await ask()
  expect(reply.text).toContain(UNKNOWN)
  expect(reply.text).toContain('servidor de Vita')
})

test('corta la espera a los veinte segundos', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', (_url: string, { signal }: RequestInit) => new Promise((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason))))
  const result = ask()
  await vi.advanceTimersByTimeAsync(20_000)
  expect((await result).reply.text).toContain('ha tardado demasiado')
})

test('reserva más tiempo para el subagente visual autorizado', () => {
  expect(assistantTimeoutMs([])).toBe(20_000)
  expect(assistantTimeoutMs([{ file: new File(['image'], 'foto.png', { type: 'image/png' }), analyzeVisually: true }])).toBe(110_000)
})

test('da seguimiento según la respuesta y reconoce ambas preguntas de agenda', () => {
  const reply = { kind: 'agenda', text: '', items: [], remaining: [] } as const
  expect(followUps(reply)).toEqual(['¿Y mañana?', '¿Y la semana que viene?'])
  for (const message of followUps(reply)) expect(respond(message, { ...context, previous: reply }, remote(false))).toMatchObject({ reply: { kind: 'agenda' } })
  expect(followUps({ kind: 'assistant', text: UNKNOWN }).length).toBeGreaterThanOrEqual(2)
  expect(followUps({ kind: 'proposals', text: '', proposals: [] })).toEqual([])
})
