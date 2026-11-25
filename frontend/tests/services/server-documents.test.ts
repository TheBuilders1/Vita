import { expect, test, vi } from 'vitest'
import { keepFilesOnServer } from '@/services/serverDocuments'

const stored = (id: string, mime: string) => ({ id, name: `${id}.bin`, mime, blob: new Blob(['x'], { type: mime }) })
const files: Record<string, ReturnType<typeof stored>> = {
  foto: stored('foto', 'image/jpeg'), pdf: stored('pdf', 'application/pdf'), gif: stored('gif', 'image/gif'),
}
const get = async (id: string) => files[id]

test('guarda en el servidor las fotos y los PDF de la ficha y salta lo que no admite', async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ documentId: crypto.randomUUID(), status: 'uploaded' }, { status: 201 }))
  const result = await keepFilesOnServer(['foto', 'pdf', 'gif', 'borrado'], { household: 'hogar', get, fetch: request })
  expect(result).toEqual({ kept: 2, skipped: 1, failed: 0 })
  expect(request).toHaveBeenCalledTimes(2)
  const [url, init] = request.mock.calls[0]!
  expect(url).toBe('/api/v1/documents')
  expect(new Headers(init.headers).get('x-vita')).toBe('1')
  const body = init.body as FormData
  expect(body.get('householdId')).toBe('hogar')
  expect((body.get('file') as File).type).toBe('image/jpeg')
})

test('si el servidor falla, la ficha sigue guardada en el dispositivo y se cuenta el fallo', async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 503 })).mockRejectedValueOnce(new TypeError('sin red'))
  expect(await keepFilesOnServer(['foto', 'pdf'], { household: 'hogar', get, fetch: request })).toEqual({ kept: 0, skipped: 0, failed: 2 })
})
