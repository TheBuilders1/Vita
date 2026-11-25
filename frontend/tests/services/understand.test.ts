import { describe, expect, test, vi } from 'vitest'
import { hintFor, proposeFromFiles, savingIntent, toProposal, understandFile, type Understood } from '@/services/chat/understand'
import { buildMember } from '../support/builders'

const marta = buildMember('marta', 'master', { name: 'Marta López' })
const leo = buildMember('leo', 'member', { name: 'Leo' })
const context = { fileId: 'f1', members: [marta, leo], actorId: 'marta', today: '2026-11-25' }
const bill: Understood = { type: 'bill', concept: 'Factura de la luz · Iberdrola', supplier: 'Iberdrola', amountCents: 6342, date: '2026-11-03', dueDate: '2026-11-20', category: 'home' }

test('una factura leída se propone como gasto listo para guardar, con el archivo', () => {
  expect(toProposal(bill, context)).toEqual({
    typeId: 'transaction', ready: true, missing: [], notes: ['Vence el 20 de noviembre de 2026.'],
    data: { kind: 'expense', concept: 'Factura de la luz · Iberdrola', amount: 6342, category: 'home', date: '2026-11-03', files: ['f1'] },
  })
})

test('si no se lee el importe, la tarjeta lo pide en vez de inventarlo', () => {
  const proposal = toProposal({ ...bill, amountCents: null, date: null, dueDate: null }, context)
  expect(proposal).toMatchObject({ ready: false, missing: ['Importe'], data: { date: '2026-11-25' } })
  expect(proposal.data).not.toHaveProperty('amount')
})

test('un DNI se asigna a quien es su titular y su caducidad cuenta como leída', () => {
  const dni: Understood = { type: 'document', kind: 'id', title: 'DNI de Marta López', holderName: 'MARTA LÓPEZ GARCÍA', issueDate: '2021-04-30', expiryDate: '2031-04-30' }
  expect(toProposal(dni, context)).toMatchObject({
    typeId: 'document', ready: true,
    data: { kind: 'id', title: 'DNI de Marta López', member: 'marta', issueDate: '2021-04-30', expiryDate: '2031-04-30', scannedDate: '2031-04-30', scannedFile: 'f1', files: ['f1'] },
  })
  expect(toProposal({ ...dni, holderName: 'Persona Desconocida' }, context).data).not.toHaveProperty('member')
})

test('la pista sale de lo escrito y solo se lee el archivo si se quiere guardar', () => {
  expect([hintFor('guarda esta factura del agua'), hintFor('mi DNI'), hintFor('')]).toEqual(['bill', 'id', 'other'])
  for (const text of ['', 'guárdalo', 'Apunta esta factura', 'sube mi DNI']) expect(savingIntent(text)).toBe(true)
  for (const text of ['¿cuánto hay que pagar?', 'resume este contrato']) expect(savingIntent(text)).toBe(false)
})

test('envía el archivo y la pista, y valida lo que vuelve', async () => {
  const request = vi.fn().mockResolvedValue(Response.json(bill))
  const file = new File(['x'], 'factura.pdf', { type: 'application/pdf' })
  expect(await understandFile(file, 'bill', { signal: new AbortController().signal, fetch: request })).toEqual(bill)
  const [url, init] = request.mock.calls[0]!
  expect(url).toBe('/api/v1/documents/understand')
  expect((init.body as FormData).get('kind')).toBe('bill')
  expect(new Headers(init.headers).get('x-vita')).toBe('1')
  for (const answer of [Response.json({ ...bill, amountCents: 'mucho' }), Response.json({}, { status: 502 })]) {
    await expect(understandFile(file, 'bill', { signal: new AbortController().signal, fetch: vi.fn().mockResolvedValue(answer) })).rejects.toThrow()
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
    expect(reply).toMatchObject({ kind: 'proposals', text: expect.stringContaining('He leído'), proposals: [{ typeId: 'transaction', ready: true, data: { amount: 6342, files: ['guardado'] } }] })
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
