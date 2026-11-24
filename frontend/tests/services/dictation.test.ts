import { describe, expect, test } from 'vitest'
import { dictationProblem, joinDictation } from '@/services/dictation'

describe('lo dictado', () => {
  test('se añade a lo escrito con un espacio', () => {
    expect(joinDictation('Compra', 'leche y pan')).toBe('Compra leche y pan')
    expect(joinDictation('', 'compra leche')).toBe('compra leche')
    expect(joinDictation('Compra ', ' leche ')).toBe('Compra leche')
    expect(joinDictation('Compra', '  ')).toBe('Compra')
  })
  test('no pasa del tope del campo', () => expect(joinDictation('a'.repeat(8), 'bcd', 10)).toHaveLength(10))
})
describe('fallos explicados', () => {
  test('con palabras llanas, y callar no es un fallo', () => {
    expect(dictationProblem('not-allowed')).toContain('micrófono')
    expect(dictationProblem('network')).toContain('conexión')
    expect(dictationProblem('no-speech')).toContain('No se ha oído')
    expect(dictationProblem('aborted')).toBeUndefined()
    expect(dictationProblem('raro')).toContain('No se ha podido')
  })
})
