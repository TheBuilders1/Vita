import { expect, test } from 'vitest'
import { createToastStore } from '@/store/toastStore'

test('los avisos se añaden con su tono y se pueden cerrar', () => {
  const store = createToastStore()
  store.getState().show('Cita guardada')
  store.getState().show('No se ha guardado', 'error')
  const [first, second] = store.getState().toasts
  expect([first, second]).toMatchObject([{ message: 'Cita guardada', tone: 'success' }, { message: 'No se ha guardado', tone: 'error' }])
  store.getState().dismiss(first!.id)
  expect(store.getState().toasts).toEqual([second])
})

test('repetir un aviso no lo duplica', () => {
  const store = createToastStore()
  store.getState().show('Cita guardada')
  store.getState().show('Cita guardada')
  expect(store.getState().toasts).toHaveLength(1)
})

test('como mucho se ven tres a la vez y se van los más antiguos', () => {
  const store = createToastStore()
  for (const m of ['a', 'b', 'c', 'd']) store.getState().show(m)
  expect(store.getState().toasts.map((t) => t.message)).toEqual(['b', 'c', 'd'])
})

test('los errores no desaparecen para hacer sitio a los demás', () => {
  const store = createToastStore()
  store.getState().show('fallo', 'error')
  for (const m of ['a', 'b', 'c']) store.getState().show(m)
  expect(store.getState().toasts.map((t) => t.message)).toEqual(['fallo', 'b', 'c'])
})

test('un aviso puede ofrecer deshacer', () => {
  const store = createToastStore()
  let undone = false
  store.getState().show('Tarea completada', 'success', { label: 'Deshacer', run: () => { undone = true } })
  store.getState().toasts[0]!.action!.run()
  expect(undone).toBe(true)
})

test('al cambiar de perfil se pueden retirar todos los avisos', () => {
  const store = createToastStore()
  store.getState().show('a')
  store.getState().show('b', 'error')
  store.getState().clear()
  expect(store.getState().toasts).toEqual([])
})
