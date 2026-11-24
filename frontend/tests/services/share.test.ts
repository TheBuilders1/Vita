import { describe, expect, test } from 'vitest'
import { getRecordType } from '@/modules/registry'
import { shareText } from '@/services/share'
import { titleContext } from '@/services/titles'
import { buildMember, buildRecord } from '../support/builders'

const context = titleContext([buildMember('p', 'member', { name: 'Pilar' })], [])
const text = (typeId: string, data: Record<string, unknown>) => shareText(buildRecord({ typeId, moduleId: getRecordType(typeId).moduleId, data }), context)

describe('texto para compartir', () => {
  test('primero el título y después cada dato en una línea', () => {
    expect(text('event', { title: 'Cena', date: '2026-12-24', time: '21:00', members: ['p'] })).toMatch(/^Cena\n\nFecha: 24 de diciembre de 2026\n/)
    expect(text('event', { title: 'Cena', date: '2026-12-24', members: ['p'] })).toContain(': Pilar')
  })
  test('no repite el título ni incluye lo vacío, lo oculto o los archivos', () => {
    const result = text('document', { title: 'DNI', kind: 'id', files: ['f1'], scannedFile: 'f1', notes: '' })
    expect(result.match(/DNI/g)?.length).toBeLessThanOrEqual(2)
    expect(result).not.toMatch(/f1|undefined|Archivos/)
  })
  test('los ingredientes y los enlaces se leen bien', () => {
    const result = text('recipe', { title: 'Lentejas', minutes: 40, ingredients: [{ name: 'Lentejas', quantity: 1.5, unit: 'kg' }, { name: 'Sal' }] })
    expect(result).toContain('1,5 kg Lentejas')
    expect(result).toContain('Sal')
    expect(result).not.toContain('[object Object]')
  })
  test('los días de la semana van con su nombre', () => {
    expect(text('medicationPlan', { member: 'p', name: 'A', dose: '1', times: ['09:00'], weekdays: [1, 3], startDate: '2026-11-01' })).toContain('Días: Lunes, Miércoles')
  })
  test('lo que no es verdad no se dice', () => {
    expect(text('task', { title: 'Regar', members: [], done: false })).toBe('Regar')
  })
})
