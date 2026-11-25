import { describe, expect, test } from 'vitest'
import { MODULES } from '@/modules/registry'
import { answer, reviewReply, type ChatContext, type Reply } from '@/services/chat'
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
  test.each(['compra 1,5 kg de arroz', 'compra 1,5 kg de arroz, 2 barras de pan y leche'])('conserva la coma decimal en «%s»', (message) => {
    const all = proposals(ask(message))
    const rice = { name: 'Arroz', quantity: 1.5, unit: 'kg' }
    expect(all.map((p) => p.data)).toMatchObject(message.includes('pan')
      ? [rice, { name: 'Pan', quantity: 2, unit: 'barras' }, { name: 'Leche' }]
      : [rice])
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

describe('respuestas guardadas', () => {
  const document = buildRecord({ id: 'doc', typeId: 'document', moduleId: 'documents', ownerId: ana.id,
    data: { title: 'Documento de prueba', expiryDate: '2027-01-01' } })
  const before = context({ actor: leo, records: [document] })

  test.each([
    ['se borra', { records: [] }],
    ['se vuelve privada', { records: [{ ...document, visibility: 'private' as const }] }],
    ['se cierra su habitación', { enabled: ['planner'] as const }],
  ] satisfies [string, Partial<ChatContext>][])('oculta una ficha guardada cuando %s', (_, change) => {
    const reply = answer('¿Cuándo caduca el documento?', before)
    expect(reply.kind).toBe('facts')
    expect(reviewReply(reply, { ...before, ...change })).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })

  test('conserva la ficha que aún se ve y sustituye la borrada', () => {
    const other = { ...document, id: 'otra', data: { title: 'Otra ficha', expiryDate: '2028-01-02' } }
    const reply = answer('¿Cuándo caducan los documentos?', { ...before, records: [document, other] })
    expect(reviewReply(reply, { ...before, records: [other] })).toMatchObject({
      kind: 'facts', facts: [{ key: 'doc', unavailable: true }, { key: 'otra', title: 'Otra ficha' }],
    })
  })

  test('oculta el nombre de una lista borrada que aparecía en un artículo', () => {
    const shoppingItem = buildRecord({ id: 'item', typeId: 'shoppingItem', moduleId: 'shopping', data: { list: list.id, name: 'Arroz' } })
    const reply = ask('¿Qué falta en la compra?', { records: [shoppingItem, list] })
    expect(reply).toMatchObject({ kind: 'facts', facts: [{ text: 'Compra de casa' }] })
    expect(reviewReply(reply, context({ records: [shoppingItem] }))).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })

  test('oculta un contacto retirado y conserva el botón general de emergencias', () => {
    const contact = buildRecord({ id: 'c', typeId: 'emergencyContact', moduleId: 'emergency', data: { name: 'Contacto de prueba', phone: '000 000 000' } })
    const reply = ask('es una emergencia', { records: [contact] })
    expect(reviewReply(reply, context({ records: [] }))).toMatchObject({
      kind: 'emergency', number: '112', contacts: [{ recordId: 'c', unavailable: true }],
    })
  })

  test('oculta fechas y lugares de una cita retirada', () => {
    const appointment = buildRecord({ id: 'cita', typeId: 'event', moduleId: 'planner', data: { title: 'Cita de prueba', date: today, place: 'Lugar de prueba' } })
    const reply = ask('¿Qué tengo hoy?', { records: [appointment] })
    expect(reply).toMatchObject({ kind: 'agenda', items: [{ detail: 'Lugar de prueba' }] })
    expect(reviewReply(reply, context({ records: [] }))).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })

  test('el gasto guardado deja de verse si se retira un apunte que se sumó', () => {
    const transaction = buildRecord({ id: 'gasto', typeId: 'transaction', moduleId: 'finances', data: { kind: 'expense', category: 'food', date: today, amount: 8000 } })
    const reply = ask('¿Cuánto llevamos en comida?', { records: [transaction] })
    expect(reply.kind).toBe('facts')
    expect(reviewReply(reply, context({ records: [] }))).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })

  test('una propuesta guardada y borrada deja de mostrar lo que contenía', () => {
    const reply = ask('apunta tarea revisar el contador')
    expect(reply.kind).toBe('proposals')
    expect(reviewReply(reply, context(), { 0: { state: 'saved', recordId: 'borrada' } })).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })

  test('una tarea ya marcada deja de mostrar el aviso de guardado cuando se borra', () => {
    const task = buildRecord({ id: 'tarea', data: { title: 'Revisar el contador', done: false } })
    const reply = ask('he hecho revisar el contador', { records: [task] })
    expect(reply.kind).toBe('complete')
    expect(reviewReply(reply, context(), { 0: { state: 'saved', recordId: task.id } })).toEqual({ kind: 'text', text: 'Esto ya no está disponible para tu perfil' })
  })
})

describe('lo que no hace', () => {
  test.each(['borra la cita del dentista', 'elimina todo', 'cancela el dentista', 'cambia la cita al lunes', 'mueve la cita'])('%s: no cambia ni borra', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('No cambio ni borro') }))
  test('«no apuntes» no apunta', () => expect(ask('no apuntes dentista mañana').kind).toBe('text'))
  test.each(['qué me tomo para la fiebre', 'puedo tomar ibuprofeno', 'me duele la cabeza, ¿qué hago?'])('%s: no da consejo médico', (text) => expect(ask(text)).toMatchObject({ kind: 'text', text: expect.stringContaining('consejo médico') }))
  test.each(['', '   ', 'asdf qwer', '???'])('%j se deriva a conversación abierta', (text) => expect(ask(text).kind).toBe('assistant'))
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

test.each(['hola', 'ayuda', '¿qué puedes hacer?'])('%s se deriva al orquestador', (text) => expect(ask(text).kind).toBe('assistant'))

describe('acciones y consultas nuevas', () => {
  test.each([
    ['recuérdame regar las plantas cada lunes a las 9', { title: 'Regar las plantas', dueDate: '2026-11-30', time: '09:00', repeat: 'weekly' }],
    ['cada mes pagar el alquiler el día 5', { title: 'Pagar el alquiler', dueDate: '2026-12-05', repeat: 'monthly' }],
    ['todos los días sacar al perro', { title: 'Sacar al perro', dueDate: today, repeat: 'daily' }],
  ])('propone una tarea con la repetición de %s', (text, data) => {
    expect(only(ask(text))).toMatchObject({ typeId: 'task', ready: true, data })
  })

  const task = (id: string, data = {}) => buildRecord({ id, typeId: 'task', moduleId: 'planner', data: { title: 'Regar las plantas', ...data } })

  test('ofrece elegir entre tareas con el mismo nombre', () => {
    expect(ask('marca regar las plantas como hecha', { records: [task('a'), task('b')] }))
      .toMatchObject({ kind: 'complete', choices: [{ recordId: 'a' }, { recordId: 'b' }] })
  })

  test('solo propone la coincidencia que sigue pendiente', () => {
    expect(ask('completa regar las plantas', { records: [task('a'), task('b', { done: true })] }))
      .toMatchObject({ kind: 'complete', choices: [{ recordId: 'a' }] })
  })

  test('busca documentos visibles y omite habitaciones cerradas', () => {
    const records = [buildRecord({ id: 'doc', typeId: 'document', moduleId: 'documents', ownerId: ana.id, data: { title: 'DNI', kind: 'id' } })]
    expect(ask('busca el DNI', { records })).toMatchObject({ kind: 'facts', facts: [{ recordId: 'doc' }, { to: '/planta/finance/documents' }] })
    expect(ask('busca el DNI', { records, enabled: ['planner'] }).kind).toBe('text')
  })

  test('muestra gasto y tope sin revelar Finanzas a perfiles sin acceso', () => {
    const records = [
      buildRecord({ typeId: 'transaction', moduleId: 'finances', data: { kind: 'expense', concept: 'Compra', category: 'food', date: today, amount: 8000 } }),
      buildRecord({ typeId: 'budget', moduleId: 'finances', data: { category: 'food', limit: 10000 } }),
    ]
    expect(ask('¿cuánto llevamos en comida?', { records })).toMatchObject({ kind: 'facts', facts: [{ key: 'food', text: expect.stringMatching(/80.*100/) }] })
    expect(ask('¿cuánto llevamos en comida?', { records, actor: pilar }).kind).toBe('text')
  })

  test('enlaza ayuda para borrar', () => expect(ask('¿cómo borro algo?')).toMatchObject({ kind: 'text', link: { to: '/ayuda#borrar' } }))
})

test.each(['cada lunes y martes regar las plantas', 'cada mes pagar el alquiler el día 5 y 10', 'cada día regar las plantas a las 9 y a las 18'])('pide aclaración para %s', (text) => {
  expect(ask(text).kind).toBe('text')
})

test('pregunta cuándo empieza una tarea mensual sin día y no ofrece guardarla', () => {
  expect(only(ask('cada mes regar las plantas'))).toMatchObject({ ready: false, missing: ['Para cuándo'] })
})

test('no propone completar una tarea cuyos permisos corresponden a otra persona', () => {
  const task = buildRecord({ typeId: 'task', moduleId: 'planner', ownerId: ana.id, subjectIds: [leo.id], data: { title: 'Regar las plantas', members: [leo.id] } })
  expect(ask('marca regar las plantas como hecha', { records: [task], actor: pilar }).kind).toBe('text')
})

test('la búsqueda no revela una ficha privada de otro perfil', () => {
  const record = buildRecord({ typeId: 'document', moduleId: 'documents', ownerId: leo.id, visibility: 'private', data: { title: 'DNI oculto de prueba', kind: 'id' } })
  expect(ask('busca oculto de prueba', { records: [record] }).kind).toBe('text')
})
