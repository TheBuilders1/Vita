import { expect, test, vi } from 'vitest'
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

test('recupera la pestaña, borra al cambiar de perfil y descarta datos dañados', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) })
  try {
    const store = createChatStore().getState()
    store.enter('ana')
    store.add('hola', reply)
    const fresh = createChatStore()
    fresh.getState().enter('ana')
    expect(fresh.getState().turns[0]?.reply).toEqual(reply)
    const key = [...values.keys()][0]!
    const damaged = JSON.parse(values.get(key)!)
    damaged.turns[0].reply = { kind: 'agenda', items: null }
    values.set(key, JSON.stringify(damaged))
    const bad = createChatStore()
    bad.getState().enter('ana')
    expect(bad.getState().turns).toEqual([])
    fresh.getState().enter('leo')
    expect(values.size).toBe(0)
  } finally { vi.unstubAllGlobals() }
})

test('al recargar, una cita sin fecha sigue pidiendo la fecha antes de guardarse', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) })
  try {
    const store = createChatStore().getState()
    store.enter('ana')
    store.add('Apunta una reunión', { kind: 'proposals', text: 'Revisa', proposals: [{
      typeId: 'event', data: { title: 'Reunión', date: undefined }, notes: [], missing: ['Fecha'], ready: false,
    }] })
    const fresh = createChatStore()
    fresh.getState().enter('ana')
    const restored = fresh.getState().turns[0]?.reply
    expect(restored?.kind === 'proposals' && restored.proposals[0]?.data).toHaveProperty('date', undefined)
    fresh.getState().clear()
    expect(values.size).toBe(0)
  } finally { vi.unstubAllGlobals() }
})
