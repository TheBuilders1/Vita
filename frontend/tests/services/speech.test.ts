import { describe, expect, test } from 'vitest'
import { pickVoice, spokenAgenda, spokenParts } from '@/services/speech'
import type { AgendaItem } from '@/services/agenda'

const voice = (lang: string, localService = true, isDefault = false) => ({ lang, localService, default: isDefault, name: lang })
const item = (extra: Partial<AgendaItem>): AgendaItem => ({ key: 'k', moduleId: 'planner', date: '2026-11-24', title: 'Cena', category: 'event', memberIds: [], ...extra })

describe('elegir voz', () => {
  test('solo en español y solo del dispositivo: las demás mandan el texto fuera', () => {
    expect(pickVoice([voice('en-GB'), voice('es-ES', false)])).toBeUndefined()
    expect(pickVoice([voice('es-MX'), voice('es-ES')])?.lang).toBe('es-ES')
    expect(pickVoice([voice('es_MX')])?.lang).toBe('es_MX')
    expect(pickVoice([voice('est-EE')])).toBeUndefined()
  })
})
describe('texto que se oye', () => {
  test('las direcciones web no se deletrean', () => {
    expect(spokenParts('Mira https://ejemplo.es/a?b=1\nAdiós')).toEqual(['Mira un enlace', 'Adiós'])
  })
  test('los textos largos se parten por frases', () => {
    const parts = spokenParts(`${'Una frase bastante larga para leer. '.repeat(20)}`)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((p) => p.length <= 220)).toBe(true)
  })
  test('una sola palabra enorme no se queda colgada', () => expect(spokenParts('a'.repeat(500)).join('')).toHaveLength(500))
})
describe('agenda en voz alta', () => {
  test('dice qué, cuándo y con qué detalle', () => {
    expect(spokenAgenda('Hoy', [item({ time: '21:00', detail: 'Casa de Nora' }), item({ title: 'Pan', done: true })])).toBe('Hoy.\nA las 21:00, Cena. Casa de Nora.')
  })
  test('si no hay nada, lo dice', () => expect(spokenAgenda('Hoy', [])).toBe('Hoy no hay nada pendiente.'))
})
