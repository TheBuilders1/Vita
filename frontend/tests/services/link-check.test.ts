import { expect, it } from 'vitest'
import { checkContact } from '@/services/linkCheck'

it.each(['http://example.es', 'corre0s.es', 'bbva.es.datos.example', 'xn--caf-dma.es', '192.0.2.1', 'bit.ly/a', 'ejemplo.xyz', 'BBVA <avisos@gmail.com>', 'cuenta@caixabamk.es', '+34 905 123 456', '806123456', '807123456', '+34 123', 'esto no es una dirección'])('avisa al comprobar %s', (input) => {
  expect(checkContact(input).signals.length).toBeGreaterThan(0)
})
it.each(['https://sede.dgt.gob.es', 'ayuda@correos.es', '+34 612 345 678', '+33 6 12 34 56 78'])('admite el formato de %s', (input) => {
  expect(checkContact(input).signals).toEqual([])
})

it.each([
  ['https://cuenta.acceso.clientes.ejemplo.es', 'subdominios'],
  ['dgt@outlook.es', 'gratuito'],
  ['https://bbav.example', 'habitual'],
  ['https://amazon.es@192.0.2.1', 'arroba'],
  ['+33 1', 'formato'],
])('indica qué señal ha encontrado en %s', (input, signal) => {
  expect(checkContact(input).signals.join(' ')).toContain(signal)
})

it('identifica el país sin tratar un prefijo extranjero como un número español de pago', () => {
  const result = checkContact('+351 905 123 456')
  expect(result.detail).toContain('Portugal')
  expect(result.signals).toEqual([])
})

it.each(['+33 612 345', '+1 123 456', '612+345678', '612.34.56.78'])('comprueba el formato de marcación de %s', (input) => {
  const result = checkContact(input)
  expect(result.channel).toBe('call')
  expect(result.signals.length > 0).toBe(input !== '612.34.56.78')
})
