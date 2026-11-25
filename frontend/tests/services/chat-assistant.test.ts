import { expect, test, vi } from 'vitest'
import { assistantContext, askOrchestrator, shouldUseAssistant, validateChatAttachments, type Reply } from '@/services/chat'

const message = 'Hola'
const conversationId = 'a'.repeat(32)
const context = [{ title: 'DNI de Alba', detail: 'Caduca el 31 de diciembre de 2030' }]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

test('envía pregunta y contexto filtrado, con la clave del proxy local', async () => {
  const request = vi.fn(async (_url: string, _init?: RequestInit) => json({ message: '¡Hola!' }))
  const answer = await askOrchestrator({ message, conversationId, context, fetch: request as never })
  expect(answer).toBe('¡Hola!')
  expect(request).toHaveBeenCalledTimes(1)
  const [url, init] = request.mock.calls[0]!
  expect(url).toBe('/api/v1/chat')
  expect(new Headers(init?.headers).get('x-vita')).toBe('1')
  expect(JSON.parse(String(init?.body))).toEqual({ message, conversationId, context, attachments: [] })
})

test.each([
  ['sin conexión', () => new TypeError('Failed to fetch')],
  ['respuesta no válida', () => json({ unexpected: true })],
  ['servidor sin autorización', () => json({}, 401)],
  ['orquestador desconectado', () => json({}, 503)],
])('%s: informa que no puede responder', async (_, response) => {
  const request = vi.fn(async () => {
    const result = response()
    if (result instanceof Error) throw result
    return result
  })
  await expect(askOrchestrator({ message, conversationId, context: [], fetch: request as never })).rejects.toThrow()
})

test('extrae el adjunto localmente y solo manda su texto al orquestador', async () => {
  const file = new File(['Texto de prueba'], 'nota.txt', { type: 'text/plain' })
  const request = vi.fn()
    .mockResolvedValueOnce(json({ text: 'Texto extraído localmente' }))
    .mockResolvedValueOnce(json({ message: 'He leído la nota.' }))

  await expect(askOrchestrator({ message, conversationId, context: [], attachments: [file], fetch: request as never }))
    .resolves.toBe('He leído la nota.')

  expect(request.mock.calls.map(([url]) => url)).toEqual(['/api/v1/chat/attachments', '/api/v1/chat'])
  const uploaded = request.mock.calls[0]![1]?.body as FormData
  expect((uploaded.get('file') as File).name).toBe('nota.txt')
  expect(JSON.parse(String(request.mock.calls[1]![1]?.body))).toMatchObject({
    attachments: [{ text: 'Texto extraído localmente' }],
  })
  expect(String(request.mock.calls[1]![1]?.body)).not.toContain('nota.txt')
})

test('limita tipo, tamaño y número de adjuntos', () => {
  const image = new File(['png'], 'foto.png', { type: 'image/png' })
  const webp = new File(['webp'], 'foto.webp', { type: 'image/webp' })
  const text = new File(['txt'], 'nota.txt', { type: 'text/plain' })
  expect(validateChatAttachments([image, webp, text])).toBeUndefined()
  expect(validateChatAttachments(Array.from({ length: 4 }, () => image))).toContain('como máximo 3')
  expect(validateChatAttachments([new File(['x'], 'archivo.html', { type: 'text/html' })])).toContain('JPG/PNG')
  expect(validateChatAttachments([new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })])).toContain('10 MB')
})

test('rechaza un adjunto no permitido antes de enviarlo', async () => {
  const request = vi.fn()
  await expect(askOrchestrator({
    message,
    conversationId,
    context: [],
    attachments: [new File(['x'], 'script.html', { type: 'text/html' })],
    fetch: request as never,
  })).rejects.toThrow('JPG/PNG')
  expect(request).not.toHaveBeenCalled()
})

test('prepara solo hechos visibles de preguntas de agenda o fichas', () => {
  const facts: Reply = {
    kind: 'facts', text: 'La caducidad',
    facts: [{ key: 'dni', title: 'DNI de Alba', text: 'Caduca el 31 de diciembre de 2030', phone: '600 111 222', recordId: 'privado' }],
  }
  const agenda: Reply = {
    kind: 'agenda', text: 'La agenda',
    items: [{ key: 'event', moduleId: 'planner', date: '2030-12-31', time: '10:00', title: 'Cita médica', category: 'event', memberIds: ['alba'], sources: ['registro'] }],
    remaining: [],
  }
  expect(assistantContext(facts)).toEqual([{ title: 'DNI de Alba', detail: 'Caduca el 31 de diciembre de 2030 · Teléfono: 600 111 222' }])
  expect(assistantContext(agenda)).toEqual([{ title: 'Cita médica', detail: '2030-12-31 · 10:00' }])
})

test('mantiene urgencias y escrituras fuera del procesamiento de adjuntos', () => {
  expect(shouldUseAssistant({ kind: 'assistant', text: 'Hola' }, false)).toBe(true)
  expect(shouldUseAssistant({ kind: 'text', text: 'No puedo dar consejo médico.' }, true)).toBe(false)
  expect(shouldUseAssistant({ kind: 'text', text: 'No cambio ni borro nada.' }, true)).toBe(false)
  expect(shouldUseAssistant({ kind: 'emergency', text: 'Llama al 112.', number: '112', contacts: [] }, true)).toBe(false)
  expect(shouldUseAssistant({ kind: 'text', text: 'No he entendido.' }, true)).toBe(true)
})
