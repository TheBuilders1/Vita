import { describe, expect, test } from 'vitest'
import { extractDate, extractTime, plain } from '@/services/chat/when'

const today = '2026-11-24' // martes
const date = (text: string) => extractDate(plain(text), today)

test('quita tildes y mayúsculas, y conserva la ñ', () => expect(plain('  MAÑANA, Médico  ')).toBe('mañana, medico'))

describe('fechas', () => {
  test.each([
    ['hoy', '2026-11-24'], ['esta noche', '2026-11-24'], ['mañana', '2026-11-25'], ['pasado mañana', '2026-11-26'],
    ['el miércoles', '2026-11-25'], ['el lunes', '2026-11-30'], ['el martes', '2026-12-01'], ['el martes que viene', '2026-12-01'], ['este sábado', '2026-11-28'], ['el próximo viernes', '2026-11-27'],
    ['el 5 de enero', '2027-01-05'], ['el 30 de noviembre', '2026-11-30'], ['el 5 de enero de 2028', '2028-01-05'], ['el 1 de diciembre del 2026', '2026-12-01'],
    ['el 5/1', '2027-01-05'], ['el 5/1/27', '2027-01-05'], ['el 5-1-2027', '2027-01-05'],
    ['el día 30', '2026-11-30'], ['el día 5', '2026-12-05'], ['en 3 días', '2026-11-27'], ['dentro de dos semanas', '2026-12-08'], ['en un mes', '2026-12-24'],
    ['el martes 1 de diciembre', '2026-12-01'],
  ])('%s', (text, expected) => expect(date(`dentista ${text}`).date).toBe(expected))
  test('la fecha se quita del texto', () => expect(date('dentista el martes que viene con leo').rest).toBe('dentista con leo'))
  test('sin fecha no inventa', () => expect(date('comprar pan')).toEqual({ rest: 'comprar pan' }))
  test.each(['el 31 de febrero', 'el 32/1', 'el 5/13'])('%s no existe y se avisa', (text) => {
    expect(date(`cita ${text}`).date).toBeUndefined()
    expect(date(`cita ${text}`).problem).toContain('no existe')
  })
  test('si el día de la semana y la fecha no cuadran, se avisa', () => {
    expect(date('dentista el lunes 1 de diciembre')).toMatchObject({ date: '2026-12-01', problem: 'El 1 de diciembre de 2026 es martes, no lunes' })
  })
  test('«por la mañana» no es «mañana»', () => {
    expect(date('el lunes por la mañana').date).toBe('2026-11-30')
    expect(date('dentista a las 9 de la mañana').date).toBeUndefined()
    expect(date('mañana por la mañana').date).toBe('2026-11-25')
  })
})

describe('horas', () => {
  const time = (text: string) => extractTime(plain(text))
  test.each([
    ['a las 17:30', '17:30'], ['a las 9 de la mañana', '09:00'], ['a las 5 de la tarde', '17:00'], ['a las 9 de la noche', '21:00'], ['a las 12 de la noche', '00:00'], ['a mediodía', '12:00'],
    ['a las 10 y media', '10:30'], ['a las 11 y cuarto', '11:15'], ['a las 11 menos cuarto', '10:45'], ['a las 18h', '18:00'], ['a las 8', '08:00'], ['a la 1 de la tarde', '13:00'], ['a las 12', '12:00'], ['a las 9.15', '09:15'], ['a las 10 y 20', '10:20'],
  ])('%s', (text, expected) => expect(time(`dentista ${text}`)).toMatchObject({ time: expected }))
  test.each([['a las 5', '17:00'], ['a la 1', '13:00'], ['a las 7 y media', '19:30']])('%s es dudoso: se propone la tarde y se dice', (text, expected) => {
    expect(time(text)).toMatchObject({ time: expected })
    expect(time(text).problem).toContain(expected)
  })
  test.each(['a las 25', 'a las 10:75'])('%s no vale', (text) => {
    expect(time(text).time).toBeUndefined()
    expect(time(text).problem).toContain('no existe')
  })
  test('se quita del texto', () => expect(time('dentista a las 5 de la tarde con leo').rest).toBe('dentista con leo'))
  test('un número suelto no es una hora', () => expect(time('comprar 5 huevos')).toEqual({ rest: 'comprar 5 huevos' }))
})
