import { describe, expect, test, vi } from 'vitest'
import { catalogFor, hintFor, proposeFromFiles, savingIntent, toProposal, understandFile, type Understood } from '@/services/chat/understand'
import { MODULES } from '@/modules/registry'
import { buildMember } from '../support/builders'

const marta = buildMember('marta', 'master', { name: 'Marta López' })
const leo = buildMember('leo', 'member', { name: 'Leo' })
const context = { fileId: 'f1', members: [marta, leo], actorId: 'marta', today: '2026-11-25' }
const enabled = MODULES.map((m) => m.id)
const bill: Understood = { typeId: 'transaction', data: { kind: 'expense', concept: 'Factura 2024-0001 · Empresa de logística', amount: 153806, category: 'other', date: '2024-04-17', dueDate: '2024-05-17' } }

test('el catálogo lleva las fichas que la persona puede crear, sin los campos de la app, y cabe en la petición', () => {
  const catalog = catalogFor(marta, enabled)
  expect(catalog.map((t) => t.typeId)).toEqual(expect.arrayContaining(['transaction', 'document', 'recipe', 'appointment', 'wifi', 'task']))
  const document = catalog.find((t) => t.typeId === 'document')!
  expect(document.fields).not.toHaveProperty('scannedDate')
  expect(document.fields).not.toHaveProperty('files')
  expect(catalog.find((t) => t.typeId === 'transaction')!.fields.category!.options).toContain('home')
  expect(new TextEncoder().encode(JSON.stringify(catalog)).length).toBeLessThan(64 * 1024)
  expect(catalogFor(leo, enabled).length).toBeLessThan(catalog.length)
})

test('una factura leída se propone como gasto listo para guardar, con el archivo', () => {
  expect(toProposal(bill, context)).toEqual({
    typeId: 'transaction', ready: true, missing: [], notes: ['Vence el 17 de mayo de 2024.'],
    data: { kind: 'expense', concept: 'Factura 2024-0001 · Empresa de logística', amount: 153806, category: 'other', date: '2024-04-17', files: ['f1'] },
  })
})

test('los euros con decimales pasan a céntimos y lo que el esquema rechaza se quita en vez de guardarse', () => {
  const proposal = toProposal({ typeId: 'transaction', data: { kind: 'expense', concept: 'Luz', amount: 63.42, category: 'vacaciones', date: '17/04/2024' } }, context)
  expect(proposal.data).toMatchObject({ amount: 6342 })
  expect(proposal.data).not.toHaveProperty('category')
  expect(proposal.data).not.toHaveProperty('date')
  expect(proposal).toMatchObject({ ready: false, missing: ['Categoría', 'Fecha'] })
})

test('un DNI se asigna a su titular y su caducidad cuenta como leída; un desconocido no se asigna', () => {
  const dni: Understood = { typeId: 'document', data: { kind: 'id', title: 'DNI de Marta López', member: 'MARTA LÓPEZ GARCÍA', issueDate: '2021-04-30', expiryDate: '2031-04-30' } }
  expect(toProposal(dni, context)).toMatchObject({
    typeId: 'document', ready: true,
    data: { member: 'marta', expiryDate: '2031-04-30', scannedDate: '2031-04-30', scannedFile: 'f1', files: ['f1'] },
  })
  expect(toProposal({ ...dni, data: { ...dni.data, member: 'Persona Desconocida' } }, context).data).not.toHaveProperty('member')
})

test('sirve para cualquier ficha: una receta con sus ingredientes', () => {
  const recipe = toProposal({ typeId: 'recipe', data: { title: 'Lentejas de la abuela', ingredients: [{ name: 'lentejas', quantity: 300, unit: 'g' }], name: 'campo que no existe' } }, context)
  expect(recipe).toMatchObject({ typeId: 'recipe', ready: false, missing: ['Tiempo de preparación'], data: { title: 'Lentejas de la abuela', ingredients: [{ name: 'lentejas' }] } })
  expect(recipe.data).not.toHaveProperty('name')
})

test('la pista sale de lo escrito y una pregunta no es solo para guardar', () => {
  expect([hintFor('guarda esta factura del agua'), hintFor('mi DNI'), hintFor('')]).toEqual(['bill', 'id', 'other'])
  for (const text of ['', 'guárdalo', 'Apunta esta factura', 'sube mi DNI']) expect(savingIntent(text)).toBe(true)
  for (const text of ['¿cuánto hay que pagar?', 'resume este contrato']) expect(savingIntent(text)).toBe(false)
})

test('envía el archivo, la pista y el catálogo, y solo acepta una ficha del catálogo', async () => {
  const catalog = catalogFor(marta, enabled)
  const request = vi.fn().mockResolvedValue(Response.json(bill))
  const file = new File(['x'], 'factura.pdf', { type: 'application/pdf' })
  expect(await understandFile(file, 'bill', catalog, { signal: new AbortController().signal, fetch: request })).toEqual(bill)
  const [url, init] = request.mock.calls[0]!
  expect(url).toBe('/api/v1/documents/understand')
  expect((init.body as FormData).get('kind')).toBe('bill')
  expect(JSON.parse(String((init.body as FormData).get('catalog')))).toEqual(catalog)
  for (const answer of [Response.json({ typeId: 'inventado', data: {} }), Response.json({}, { status: 502 })]) {
    await expect(understandFile(file, 'bill', catalog, { signal: new AbortController().signal, fetch: vi.fn().mockResolvedValue(answer) })).rejects.toThrow()
  }
})

describe('proposeFromFiles', () => {
  const pdf = new File(['x'], 'factura-noviembre.pdf', { type: 'application/pdf' })
  const options = (read?: Parameters<typeof proposeFromFiles>[2]['read']) => ({
    store: vi.fn(async () => 'guardado'), read, members: [marta, leo], actorId: 'marta', today: '2026-11-25', signal: new AbortController().signal,
  })

  test('con servidor, guarda el archivo, lo lee y propone la ficha rellena', async () => {
    const deps = options(vi.fn(async () => bill))
    const reply = await proposeFromFiles([pdf], 'guarda esta factura', deps)
    expect(deps.store).toHaveBeenCalledWith(pdf)
    expect(deps.read).toHaveBeenCalledWith(pdf, 'bill', deps.signal)
    expect(reply).toMatchObject({ kind: 'proposals', text: expect.stringContaining('He leído'), proposals: [{ typeId: 'transaction', ready: true, data: { amount: 153806, files: ['guardado'] } }] })
  })

  test('si no se puede leer, deja la ficha preparada y lo dice', async () => {
    const reply = await proposeFromFiles([pdf], 'guarda esta factura', options(vi.fn(async () => { throw new Error('caído') })))
    expect(reply).toMatchObject({ text: expect.stringContaining('No he podido leer'), proposals: [{ typeId: 'transaction', ready: false, missing: ['Importe'], data: { files: ['guardado'] } }] })
  })

  test('sin servidor, lo guarda como documento con su nombre', async () => {
    const reply = await proposeFromFiles([pdf], '', options())
    expect(reply).toMatchObject({ text: expect.stringContaining('Sin el servidor'), proposals: [{ typeId: 'document', ready: true, data: { kind: 'other', title: 'factura-noviembre', files: ['guardado'] } }] })
  })
})
