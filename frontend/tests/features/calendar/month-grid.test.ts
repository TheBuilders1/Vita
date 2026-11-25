import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { MonthGrid } from '@/features/calendar/MonthGrid'
import type { AgendaItem } from '@/services/agenda'
import { monthWeeks } from '@/utils/dates'

const day = '2026-11-24'
const item: AgendaItem = { key: 'test', moduleId: 'planner', date: day, title: 'Regar', category: 'event', memberIds: [] }

test('un mes de seis semanas deja un solo día en el orden de tabulación', () => {
  const html = renderToStaticMarkup(createElement(MonthGrid, { weeks: monthWeeks(day), day, today: day, items: [item], onSelect: () => {} }))
  const selected = html.match(/<button\b[^>]*\btabindex="0"[^>]*>.*?<\/button>/)?.[0]
  expect(html.match(/<button\b/g)).toHaveLength(42)
  expect(html.match(/tabindex="0"/g)).toHaveLength(1)
  expect(selected).toContain('aria-current="date"')
  expect(selected).toContain('aria-pressed="true"')
  expect(selected).toContain('Martes, 24 de noviembre. 1 cosa')
})

test('el día anuncia también las categorías de los apuntes de rutina', () => {
  const dose: AgendaItem = { ...item, key: 'toma', category: 'medication', routine: true }
  const html = renderToStaticMarkup(createElement(MonthGrid, { weeks: [[day]], day, today: day, items: [item, dose], onSelect: () => {} }))
  expect(html).toContain('Martes, 24 de noviembre. 2 cosas. Eventos, Medicación')
})
