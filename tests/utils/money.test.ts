import { expect, test } from 'vitest'
import { parseMoney, toMoneyInput } from '@/utils/money'

test.each([['12,50', 1250], ['12.50', 1250], ['12', 1200], ['1.234,5', 123450], ['1,234.50', 123450], ['1.500', 150000], ['0,99 €', 99], [' 7 ', 700], ['1.234.567', 123456700]])(
  'entiende %j', (text, cents) => expect(parseMoney(text)).toBe(cents))
test.each(['', 'abc', '-5', '12,345', '1,2,3', '12..5', '€'])('rechaza %j', (text) => expect(parseMoney(text)).toBeNull())
test('evita los errores de coma flotante', () => expect(parseMoney('19,99')).toBe(1999))
test('escribe el importe como se teclearía', () => {
  expect(toMoneyInput(1250)).toBe('12,50')
  expect(toMoneyInput(5)).toBe('0,05')
  expect(parseMoney(toMoneyInput(123456789))).toBe(123456789)
})
