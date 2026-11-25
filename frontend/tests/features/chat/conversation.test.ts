import { expect, it } from 'vitest'
import { createChatStore } from '@/store/chatStore'
import { greeting, restartConversation, scrollDistance } from '@/features/chat/conversation'

it.each([[5, 'Buenas noches'], [6, 'Buenos días'], [13, 'Buenos días'], [14, 'Buenas tardes'], [20, 'Buenas tardes'], [21, 'Buenas noches']] as const)('saluda a las %i según la hora local', (hour, expected) => {
  expect(greeting(hour)).toBe(expected)
})

it('recupera las tarjetas tal como estaban y conserva los mensajes posteriores', () => {
  const store = createChatStore()
  store.getState().enter('marta')
  const reply = { kind: 'text', text: 'De acuerdo' } as const
  store.getState().add('Compra', reply)
  const original = store.getState().turns[0]!
  store.getState().mark(original.id, 0, { state: 'saved', recordId: 'pan' })
  const previous = store.getState().turns
  const undo = restartConversation(store)
  expect(store.getState().turns).toEqual([])
  store.getState().add('Hoy', reply)
  const recent = store.getState().turns
  undo()
  undo()
  expect(store.getState().turns).toEqual([...previous, ...recent])
})

it('no recupera mensajes en otro perfil', () => {
  const store = createChatStore()
  store.getState().enter('marta')
  store.getState().add('Mi cita', { kind: 'text', text: 'Hoy' })
  const undo = restartConversation(store)
  store.getState().enter('ana')
  undo()
  expect(store.getState().turns).toEqual([])
})

it.each([[100, 250, 0], [200, 360, 60], [500, 1200, 450], [80, 720, 30], [20, 80, -30]])('acerca solo lo necesario una respuesta entre %i y %i', (top, bottom, expected) => {
  expect(scrollDistance(top, bottom, 50, 300)).toBe(expected)
})
