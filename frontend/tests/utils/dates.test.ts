import { describe, expect, test } from 'vitest'
import { addDays, addMonths, ageOn, diffDays, isIsoDate, isTime, monthWeeks, resolveAgeBand, startOfWeek, weekdayOf } from '@/utils/dates'

describe('isIsoDate', () => {
  test.each(['2026-11-24', '2028-02-29'])('acepta la fecha real %s', (v) => expect(isIsoDate(v)).toBe(true))
  test.each(['2026-02-30', '2027-02-29', '2026-13-01', '24/11/2026', '2026-1-4', ''])(
    'rechaza %j', (v) => expect(isIsoDate(v)).toBe(false))
})

describe('isTime', () => {
  test.each(['00:00', '08:30', '23:59'])('acepta %s', (v) => expect(isTime(v)).toBe(true))
  test.each(['24:00', '8:30', '12:60', ''])('rechaza %j', (v) => expect(isTime(v)).toBe(false))
})

describe('ageOn', () => {
  test('no cumple años hasta el día del cumpleaños', () => {
    expect(ageOn('1980-11-25', '2026-11-24')).toBe(45)
    expect(ageOn('1980-11-25', '2026-11-25')).toBe(46)
  })
  test('quien nace un 29 de febrero cumple el 1 de marzo en años no bisiestos', () => {
    expect(ageOn('2000-02-29', '2027-02-28')).toBe(26)
    expect(ageOn('2000-02-29', '2027-03-01')).toBe(27)
  })
})

describe('resolveAgeBand', () => {
  test.each([[0, 'youth'], [18, 'youth'], [19, 'youngAdult'], [39, 'youngAdult'], [40, 'adult'], [90, 'adult']] as const)(
    '%i años es %s', (age, band) => expect(resolveAgeBand(age)).toBe(band))
})

describe('cálculo de días', () => {
  test('suma días cruzando meses, años y bisiestos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  test('el cambio de hora no altera los días', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
  })
  test('suma meses y ajusta al último día cuando no existe', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28')
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15')
  })
  test('la semana empieza en lunes', () => {
    expect(weekdayOf('2026-11-23')).toBe(1)
    expect(weekdayOf('2026-11-29')).toBe(7)
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23')
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23')
  })
  test('la cuadrícula del mes son semanas completas que lo contienen', () => {
    const weeks = monthWeeks('2026-11-24')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]![0]).toBe('2026-10-26')
    expect(weeks.at(-1)!.at(-1)).toBe('2026-12-06')
    expect(monthWeeks('2027-02-10')).toHaveLength(4)
  })
})
