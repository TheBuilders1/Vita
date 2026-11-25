import { expect, test } from 'vitest'
import { createChatStore } from '@/store/chatStore'

const reply = { kind: 'text', text: 'Hola' } as const

test('la conversación es de un perfil: al cambiar, desaparece', () => {
  const store = createChatStore()
  store.getState().enter('ana')
  store.getState().add('hola', reply)
  store.getState().enter('ana')
  expect(store.getState().turns).toHaveLength(1)
  store.getState().enter('leo')
  expect(store.getState().turns).toEqual([])
  store.getState().enter('ana')
  expect(store.getState().turns).toEqual([])
})
test('una tarjeta guardada lo sigue estando al volver: no se guarda dos veces', () => {
  const store = createChatStore()
  store.getState().enter('ana')
  store.getState().add('apunta', reply)
  const [turn] = store.getState().turns
  store.getState().mark(turn!.id, 0, { state: 'saved', recordId: 'r1' })
  expect(store.getState().turns[0]!.cards).toEqual({ 0: { state: 'saved', recordId: 'r1' } })
})
test('no crece sin fin', () => {
  const store = createChatStore()
  for (let i = 0; i < 60; i++) store.getState().add(String(i), reply)
  expect(store.getState().turns).toHaveLength(50)
  expect(store.getState().turns.at(-1)?.message).toBe('59')
})
test('separa sesiones al cambiar de perfil o borrar la conversación', () => {
  const store = createChatStore()
  store.getState().enter('ana')
  const first = store.getState().conversationId
  store.getState().clear()
  expect(store.getState().conversationId).not.toBe(first)
  const second = store.getState().conversationId
  store.getState().enter('leo')
  expect(store.getState().conversationId).not.toBe(second)
})
