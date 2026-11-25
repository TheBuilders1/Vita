import { expect, test } from 'vitest'
import { buildMember, buildRecord } from '../support/builders'
import { answer, type ChatContext } from '@/services/chat'

const ana = buildMember('ana', 'master')
const leo = buildMember('leo', 'member')
const records = [ana, leo].map(({ id }) => buildRecord({
  id, moduleId: 'healthRecord', typeId: 'appointment', subjectIds: [id],
  data: { title: id, member: id, date: '2026-11-26', time: '10:00' },
}))
const context: ChatContext = {
  actor: ana, members: [ana, leo], records, enabled: ['healthRecord', 'dental'],
  today: '2026-11-24', emergencyNumber: '112', canReadPhotos: false,
}

test('mantiene la persona de la consulta al cambiar el día', () => {
  for (const [question, id] of [['¿Qué tengo mañana?', ana.id], ['¿Qué tiene leo mañana?', leo.id]] as const) {
    const previous = answer(question, context)
    expect(answer('¿Y el jueves?', { ...context, previous })).toMatchObject({ kind: 'agenda', items: [{ recordId: id }] })
  }
})

test('las citas del perfil usan el día pedido', () => {
  expect(answer('Mis citas el jueves', { ...context, actor: leo })).toMatchObject({ kind: 'agenda', items: [{ recordId: leo.id }] })
})

test('la agenda de una habitación solo muestra sus registros', () => {
  expect(answer('¿Qué tengo el jueves?', { ...context, origin: 'dental' })).toMatchObject({ kind: 'agenda', items: [] })
})

test('el ejemplo del calendario propone una cita para el perfil activo', () => {
  expect(answer('dentista el martes a las 10', { ...context, origin: 'calendar' })).toMatchObject({
    kind: 'proposals', proposals: [{ typeId: 'dentalVisit', data: { member: ana.id, date: '2026-12-01', time: '10:00' } }],
  })
})

test('«mis tareas» conserva el tipo de registro al preguntar por otro día', () => {
  const task = buildRecord({ id: 'regar', subjectIds: [ana.id], data: { title: 'Regar', dueDate: '2026-11-26' } })
  const home = { ...context, records: [...records, task], enabled: [...context.enabled, task.moduleId] }
  const previous = answer('Mis tareas de mañana', home)
  expect(answer('¿Y el jueves?', { ...home, previous })).toMatchObject({ kind: 'agenda', items: [{ recordId: task.id }] })
})
