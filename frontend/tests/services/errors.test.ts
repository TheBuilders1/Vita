import { expect, test } from 'vitest'
import { PermissionError, describeError } from '@/services/errors'

test('los errores propios muestran su mensaje', () => {
  expect(describeError(new PermissionError())).toBe('No tienes permiso para hacer esto')
})
test('quedarse sin espacio se explica, aunque Dexie lo envuelva', () => {
  const quota = Object.assign(new Error('x'), { name: 'QuotaExceededError' })
  expect(describeError(quota)).toMatch(/no queda espacio/i)
  expect(describeError(Object.assign(new Error('x'), { name: 'AbortError', inner: quota }))).toMatch(/no queda espacio/i)
})
test('lo inesperado no enseña detalles técnicos', () => {
  expect(describeError(new TypeError('undefined is not a function'))).toBe('Algo ha fallado y no se ha guardado el cambio. Inténtalo de nuevo.')
  expect(describeError(null)).toBe('Algo ha fallado y no se ha guardado el cambio. Inténtalo de nuevo.')
})
