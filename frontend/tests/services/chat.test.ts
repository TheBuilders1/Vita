import { describe, expect, test } from 'vitest'
import { MODULES } from '@/modules/registry'
import { answer, type ChatContext, type Reply } from '@/services/chat'
import { buildMember, buildRecord } from '../support/builders'

const today = '2026-11-24' // martes
const ana = buildMember('ana', 'master', { name: 'Ana', birthDate: '1980-01-01' })
const leo = buildMember('leo', 'member', { name: 'Leo', birthDate: '2017-05-01' })
const pilar = buildMember('pilar', 'vulnerable', { name: 'Pilar', birthDate: '1945-03-01' })
const list = buildRecord({ id: 'list', typeId: 'shoppingList', moduleId: 'shopping', data: { name: 'Compra de casa' } })
const context = (extra: Partial<ChatContext> = {}): ChatContext => ({ actor: ana, members: [ana, leo, pilar], records: [list], enabled: MODULES.map((m) => m.id), today, emergencyNumber: '112', canReadPhotos: false, ...extra })
const ask = (text: string, extra: Partial<ChatContext> = {}) => answer(text, context(extra))
const proposals = (reply: Reply) => (reply.kind === 'proposals' ? reply.proposals : [])
const only = (reply: Reply) => { const all = proposals(reply); expect(all).toHaveLength(1); return all[0]! }

describe('apuntar', () => {
  test('una cita dental con persona, día y hora', () => {
    const p = only(ask('Apunta dentista para Leo el martes a las 5'))
    expect(p).toMatchObject({ typeId: 'dentalVisit', ready: true, data: { member: 'leo', title: 'Dentista', date: '2026-12-01', time: '17:00', kind: 'checkup' } })
    expect(p.notes.join()).toContain('17:00')
  })
  test('una cita médica para quien habla', () => {
    expect(only(ask('Anótame cita con el médico mañana a las 10:30'))).toMatchObject({ typeId: 'appointment', ready: true, data: { member: 'ana', date: '2026-11-25', time: '10:30' } })
  })
  test('sin persona no la inventa: hay que completarla', () => {
    const p = only(ask('apunta pediatra el viernes a las 10'))
    expect(p).toMatchObject({ typeId: 'appointment', ready: false })
    expect(p.data.member).toBeUndefined()
    expect(p.missing).toContain('Persona')
  })
  test('sin fecha no la inventa', () => {
    const p = only(ask('apunta dentista para Leo'))
    expect(p).toMatchObject({ ready: false, missing: ['Fecha'] })
    expect(p.data.date).toBeUndefined()
  })
  test('una tarea, con o sin fecha', () => {
    expect(only(ask('Recuérdame llamar al banco mañana'))).toMatchObject({ typeId: 'task', ready: true, data: { title: 'Llamar al banco', dueDate: '2026-11-25' } })
    expect(only(ask('tengo que renovar el seguro'))).toMatchObject({ typeId: 'task', ready: true, data: { title: 'Renovar el seguro' } })
  })
  test('conserva tildes y mayúsculas de lo escrito', () => expect(only(ask('apunta tarea llamar a Tía Begoña mañana')).data.title).toBe('Llamar a Tía Begoña'))
  test('un evento con hora', () => {
    expect(only(ask('Apunta reunión del cole el jueves a las 17:00'))).toMatchObject({ typeId: 'event', ready: true, data: { title: 'Reunión del cole', date: '2026-11-26', time: '17:00' } })
  })
  test('la compra: varios productos, con cantidad y unidad', () => {
    const all = proposals(ask('Añade 2 litros de leche, pan y 12 huevos a la compra'))
    expect(all.map((p) => p.data)).toMatchObject([{ list: 'list', name: 'Leche', quantity: 2, unit: 'litros' }, { list: 'list', name: 'Pan' }, { list: 'list', name: 'Huevos', quantity: 12 }])
    expect(all.every((p) => p.typeId === 'shoppingItem' && p.ready)).toBe(true)
  })
  test('«comprar» también vale', () => expect(only(ask('comprar aceite de oliva'))).toMatchObject({ typeId: 'shoppingItem', data: { name: 'Aceite de oliva' } }))
  test('con varias listas no elige por su cuenta', () => {
    const other = buildRecord({ id: 'other', typeId: 'shoppingList', moduleId: 'shopping', data: { name: 'Ferretería' } })
    const p = only(ask('compra tornillos', { records: [list, other] }))
    expect(p.ready).toBe(false)
    expect(p.missing).toEqual(['Lista'])
  })
  test('sin lista propone crearla', () => expect(only(ask('compra leche', { records: [] }))).toMatchObject({ typeId: 'shoppingList', data: { name: 'Compra de casa' } }))
  test('dos personas con el mismo nombre: no elige', () => {
    const other = buildMember('leo2', 'member', { name: 'Leo' })
    const p = only(ask('apunta dentista para Leo mañana', { members: [ana, leo, other] }))
    expect(p.ready).toBe(false)
    expect(p.notes.join()).toContain('más de una persona')
  })
  test('un nombre dentro de otra palabra no cuenta', () => expect(only(ask('apunta tarea leer Leonardo mañana')).data.members ?? []).toEqual([]))
  test('una fecha imposible se avisa y no se guarda', () => {
    const p = only(ask('apunta dentista para Leo el 31 de febrero'))
    expect(p.ready).toBe(false)
    expect(p.notes.join()).toContain('no existe')
  })
  test('sin decir qué, lo pregunta', () => expect(ask('apunta')).toMatchObject({ kind: 'text', text: expect.stringContaining('¿Qué') }))
  test('un texto larguísimo no rompe nada', () => {
    const p = only(ask(`apunta ${'a'.repeat(500)}`))
    expect(p.ready).toBe(false)
  })
  test('respeta los permisos del perfil', () => {
    expect(ask('apunta dentista para Leo mañana', { actor: pilar })).toMatchObject({ kind: 'text', text: expect.stringContaining('perfil') })
    expect(proposals(ask('recuérdame regar las plantas', { actor: pilar }))).toHaveLength(1)
  })
  test('una habitación cerrada se dice', () => expect(ask('compra leche', { enabled: ['planner'] })).toMatchObject({ kind: 'text', text: expect.stringContaining('cerrada') }))
})

describe('lo que no hace', () => {
  test.each(['borra la cita del dentista', 'elimina todo', 'cancela el dentista', 'cambia la cita al lunes', 'mueve la cita'])('%s: no cambia ni borra', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('No cambio ni borro') }))
  test('«no apuntes» no apunta', () => expect(ask('no apuntes dentista mañana').kind).toBe('text'))
  test.each(['qué me tomo para la fiebre', 'puedo tomar ibuprofeno', 'me duele la cabeza, ¿qué hago?'])('%s: no da consejo médico', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('consejo médico') }))
  test.each(['', '   ', 'asdf qwer', '???'])('%j no se entiende y lo dice', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('No te he entendido') }))
})

describe('emergencias, antes que nada', () => {
  const contact = buildRecord({ id: 'c', typeId: 'emergencyContact', moduleId: 'emergency', data: { name: 'Andrés', phone: '600 111 222' } })
  test.each(['es una emergencia', 'mi padre no respira', 'apunta que llames a una ambulancia', 'se ha desmayado, está inconsciente', 'necesito ayuda urgente'])('%s', (text) => {
    expect(ask(text, { records: [contact] })).toMatchObject({ kind: 'emergency', number: '112', contacts: [{ name: 'Andrés', phone: '600 111 222' }] })
  })
  test.each(['me quiero morir', 'pienso en suicidarme'])('%s: ofrece el 024', (text) => expect(ask(text)).toMatchObject({ kind: 'emergency', helpline: '024' }))
  test('un simulacro o un contacto no es una emergencia', () => expect(ask('¿cuál es el teléfono de Andrés?', { records: [contact] }).kind).toBe('facts'))
})

describe('la agenda', () => {
  const records = [
    buildRecord({ id: 'e1', typeId: 'event', moduleId: 'planner', data: { title: 'Cena', date: '2026-11-24', members: [] } }),
    buildRecord({ id: 'e2', typeId: 'event', moduleId: 'planner', data: { title: 'Reunión', date: '2026-11-26', time: '10:00', members: ['leo'] }, subjectIds: ['leo'] }),
    buildRecord({ id: 'e3', typeId: 'event', moduleId: 'planner', data: { title: 'Viaje', date: '2026-12-02', members: [] } }),
  ]
  const titles = (text: string) => { const r = ask(text, { records }); return r.kind === 'agenda' ? r.items.map((i) => i.title) : r.kind }
  test.each<[string, string[]]>([
    ['¿Qué tengo hoy?', ['Cena']], ['qué hay mañana', []], ['¿Qué tenemos esta semana?', ['Cena', 'Reunión']], ['qué hay la semana que viene', ['Viaje']], ['qué hay el jueves', ['Reunión']],
    ['¿Qué tiene Leo esta semana?', ['Reunión']], ['planes para el 2 de diciembre', ['Viaje']], ['agenda', ['Cena']],
  ])('%s', (text, expected) => expect(titles(text)).toEqual(expected))
  test('«tengo» no enseña lo que es solo de otra persona', () => expect(titles('qué tengo el jueves')).toEqual([]))
  test('si no hay nada lo dice', () => expect(ask('qué hay mañana', { records })).toMatchObject({ kind: 'agenda', items: [], text: expect.stringContaining('nada') }))
})

describe('documentos y personas como fuente', () => {
  const dni = buildRecord({ id: 'd1', typeId: 'document', moduleId: 'documents', subjectIds: ['ana'], data: { title: 'DNI de Ana', kind: 'id', member: 'ana', expiryDate: '2026-12-12' } })
  const passport = buildRecord({ id: 'd2', typeId: 'document', moduleId: 'documents', subjectIds: ['leo'], data: { title: 'Pasaporte de Leo', kind: 'passport', member: 'leo' } })
  const allergy = buildRecord({ id: 'a1', typeId: 'dietNeed', moduleId: 'diet', subjectIds: ['leo'], data: { member: 'leo', title: 'Frutos secos', kind: 'allergy', severity: 'severe', avoid: [] } })
  const records = [dni, passport, allergy]
  const facts = (text: string, extra = {}) => { const r = ask(text, { records, ...extra }); return r.kind === 'facts' ? r.facts : [] }
  test('la caducidad, con su fuente', () => {
    expect(facts('¿Cuándo caduca el DNI de Ana?')).toEqual([expect.objectContaining({ recordId: 'd1', title: 'DNI de Ana', text: expect.stringContaining('12 de diciembre de 2026') })])
    expect(facts('cuándo caduca el DNI de Ana')[0]?.text).toContain('18 días')
  })
  test('«mi DNI» es el de quien habla', () => expect(facts('cuándo caduca mi dni').map((f) => f.recordId)).toEqual(['d1']))
  test('si falta la fecha lo dice, no la inventa', () => expect(facts('cuándo caduca el pasaporte de Leo')[0]?.text).toContain('no tiene caducidad apuntada'))
  test('todo lo que caduca', () => expect(facts('¿qué documentos caducan?').map((f) => f.recordId)).toEqual(['d1']))
  test('lo que no está, no está', () => expect(ask('cuándo caduca el carnet de Pilar', { records })).toMatchObject({ kind: 'text', text: expect.stringContaining('No encuentro') }))
  test('la edad y el cumpleaños', () => {
    expect(facts('¿Cuántos años tiene Leo?')[0]).toMatchObject({ memberId: 'leo', text: expect.stringContaining('9 años') })
    expect(facts('cuándo es el cumpleaños de Leo')[0]?.text).toContain('1 de mayo')
  })
  test('las alergias apuntadas, con su fuente', () => expect(facts('¿Leo tiene alergias?')[0]).toMatchObject({ recordId: 'a1', text: expect.stringContaining('Grave') }))
  test('sin alergias apuntadas no afirma que no las tenga', () => expect(ask('alergias de Ana', { records })).toMatchObject({ kind: 'text', text: expect.stringContaining('no significa') }))
  test('solo usa lo que recibe: lo que el perfil no ve no aparece', () => expect(ask('cuándo caduca el DNI de Ana', { records: [passport] }).kind).toBe('text'))
  test('las habitaciones cerradas no se consultan', () => expect(ask('cuándo caduca el DNI de Ana', { records, enabled: ['planner'] }).kind).toBe('text'))
  test('leer una foto solo se ofrece si está activado', () => {
    expect(ask('escanea un documento', { canReadPhotos: true })).toMatchObject({ kind: 'text', link: { to: '/planta/finance/documents' } })
    expect(ask('escanea un documento')).toMatchObject({ kind: 'text', text: expect.stringContaining('no está activada') })
  })
})

test.each(['hola', 'ayuda', '¿qué puedes hacer?'])('%s explica qué sabe hacer y que no es IA', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('frases sencillas') }))
