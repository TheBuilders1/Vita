import { describe, expect, test } from 'vitest'
import { buildSchema } from '@/modules/fields'

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? []

describe('buildSchema', () => {
  test('recorta los textos y trata el opcional vacío como ausente', () => {
    const schema = buildSchema({
      title: { kind: 'text', label: 'Título', required: true },
      notes: { kind: 'textarea', label: 'Notas' },
    })
    expect(schema.parse({ title: '  Dentista  ', notes: '   ' })).toEqual({ title: 'Dentista' })
  })

  test('un obligatorio en blanco da un mensaje comprensible en español', () => {
    const schema = buildSchema({ title: { kind: 'text', label: 'Título', required: true } })
    for (const title of ['', '   ', null, undefined]) {
      expect(messages(schema.safeParse({ title }))).toEqual(['Este dato es obligatorio'])
    }
  })

  test('limita la longitud del texto', () => {
    const schema = buildSchema({ title: { kind: 'text', label: 'Título' } })
    expect(schema.safeParse({ title: 'a'.repeat(200) }).success).toBe(true)
    expect(messages(schema.safeParse({ title: 'a'.repeat(201) }))).toEqual(['Como máximo 200 caracteres'])
  })

  test('rechaza claves que el módulo no declara', () => {
    const schema = buildSchema({ title: { kind: 'text', label: 'Título' } })
    expect(schema.safeParse({ title: 'x', admin: true }).success).toBe(false)
  })

  test('valida fechas y horas reales', () => {
    const schema = buildSchema({
      date: { kind: 'date', label: 'Fecha', required: true },
      time: { kind: 'time', label: 'Hora' },
    })
    expect(schema.safeParse({ date: '2026-11-24', time: '09:05' }).success).toBe(true)
    expect(messages(schema.safeParse({ date: '2026-02-30' }))).toEqual(['La fecha no es válida'])
    expect(messages(schema.safeParse({ date: '2026-11-24', time: '25:00' }))).toEqual(['La hora no es válida'])
  })

  test('el dinero son céntimos enteros y no negativos', () => {
    const schema = buildSchema({ amount: { kind: 'money', label: 'Importe', required: true } })
    expect(schema.parse({ amount: 1250 })).toEqual({ amount: 1250 })
    for (const amount of [12.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(schema.safeParse({ amount }).success).toBe(false)
    }
  })

  test('respeta mínimos y máximos numéricos', () => {
    const schema = buildSchema({ minutes: { kind: 'integer', label: 'Minutos', min: 1, max: 600 } })
    expect(schema.safeParse({ minutes: 1 }).success).toBe(true)
    expect(messages(schema.safeParse({ minutes: 0 }))).toEqual(['El valor mínimo es 1'])
    expect(messages(schema.safeParse({ minutes: 601 }))).toEqual(['El valor máximo es 600'])
    expect(messages(schema.safeParse({ minutes: 1.5 }))).toEqual(['Escribe un número sin decimales'])
  })

  test('un select solo admite sus opciones', () => {
    const schema = buildSchema({
      kind: { kind: 'select', label: 'Tipo', required: true, options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    })
    expect(schema.safeParse({ kind: 'b' }).success).toBe(true)
    expect(messages(schema.safeParse({ kind: 'z' }))).toEqual(['Elige una de las opciones'])
    expect(messages(schema.safeParse({ kind: '' }))).toEqual(['Este dato es obligatorio'])
  })

  test('las listas ausentes son vacías, sin duplicados, y las obligatorias exigen un elemento', () => {
    const schema = buildSchema({
      tags: { kind: 'tags', label: 'Etiquetas' },
      times: { kind: 'times', label: 'Horas', required: true },
    })
    expect(schema.parse({ times: ['20:00', '08:00', '08:00'], tags: ['a', ' a ', ''] })).toEqual({ times: ['08:00', '20:00'], tags: ['a'] })
    expect(schema.parse({ times: ['08:00'] })).toEqual({ times: ['08:00'], tags: [] })
    expect(messages(schema.safeParse({ times: [] }))).toEqual(['Añade al menos un elemento'])
  })

  test('los días de la semana van de 1 (lunes) a 7 (domingo)', () => {
    const schema = buildSchema({ days: { kind: 'weekdays', label: 'Días' } })
    expect(schema.parse({ days: [7, 1, 1] })).toEqual({ days: [1, 7] })
    expect(schema.safeParse({ days: [0] }).success).toBe(false)
    expect(schema.safeParse({ days: [8] }).success).toBe(false)
  })

  test('los ingredientes admiten cantidad opcional', () => {
    const schema = buildSchema({ ingredients: { kind: 'ingredients', label: 'Ingredientes', required: true } })
    expect(schema.parse({ ingredients: [{ name: ' Arroz ', quantity: 200, unit: 'g' }, { name: 'Sal' }] }))
      .toEqual({ ingredients: [{ name: 'Arroz', quantity: 200, unit: 'g' }, { name: 'Sal' }] })
    expect(schema.safeParse({ ingredients: [{ name: '' }] }).success).toBe(false)
  })

  test('el booleano ausente es falso', () => {
    expect(buildSchema({ done: { kind: 'boolean', label: 'Hecho' } }).parse({})).toEqual({ done: false })
  })

  test('valida el formato de teléfono y enlace', () => {
    const schema = buildSchema({ phone: { kind: 'phone', label: 'Teléfono' }, url: { kind: 'url', label: 'Enlace' } })
    expect(schema.safeParse({ phone: '+34 600 000 000', url: 'https://example.org' }).success).toBe(true)
    expect(schema.safeParse({ phone: '112' }).success).toBe(true)
    expect(schema.safeParse({ phone: 'llámame' }).success).toBe(false)
    expect(schema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
  })

  test('aplica las reglas entre campos y las asocia al campo indicado', () => {
    const schema = buildSchema(
      { start: { kind: 'date', label: 'Inicio', required: true }, end: { kind: 'date', label: 'Fin' } },
      [{ field: 'end', message: 'El fin no puede ser anterior al inicio', valid: (d) => !d.end || String(d.end) >= String(d.start) }],
    )
    expect(schema.safeParse({ start: '2026-01-02', end: '2026-01-02' }).success).toBe(true)
    const bad = schema.safeParse({ start: '2026-01-02', end: '2026-01-01' })
    expect(bad.error?.issues[0]).toMatchObject({ path: ['end'], message: 'El fin no puede ser anterior al inicio' })
  })
})

test('las opciones múltiples solo admiten las declaradas y sin repetir', () => {
  const schema = buildSchema({ allergens: { kind: 'choices', label: 'Alérgenos', options: [{ value: 'egg', label: 'Huevo' }, { value: 'milk', label: 'Lácteos' }] } })
  expect(schema.parse({ allergens: ['milk', 'egg', 'milk'] })).toEqual({ allergens: ['milk', 'egg'] })
  expect(schema.parse({})).toEqual({ allergens: [] })
  expect(schema.safeParse({ allergens: ['nope'] }).success).toBe(false)
})
