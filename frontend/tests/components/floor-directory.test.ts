import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, vi } from 'vitest'
import { FloorDirectory, nextFloor } from '@/components/navigation/FloorDirectory'

test('volver a pulsar la planta la pliega y oculta sus habitaciones', () => {
  const props = { rooms: [{ moduleId: 'pets', pending: 0, enabled: true }] as const, hovered: null, onSelect: vi.fn(), onHover: vi.fn(), onSelectModule: vi.fn() }
  const selected = nextFloor(null, 'health')
  const opened = renderToStaticMarkup(createElement(FloorDirectory, { ...props, selected }))
  expect(opened).toContain('aria-expanded="true"')
  expect(opened).toContain('id="room-pets"')
  const closed = renderToStaticMarkup(createElement(FloorDirectory, { ...props, selected: nextFloor(selected, 'health') }))
  expect(closed).not.toContain('aria-expanded="true"')
  expect(closed).not.toContain('id="room-pets"')
})
