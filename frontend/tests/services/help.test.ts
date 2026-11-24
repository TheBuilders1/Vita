import { describe, expect, test } from 'vitest'
import { HELP } from '@/data/help'
import { FLOORS } from '@/modules/floors'
import { MODULES } from '@/modules/registry'

const topics = HELP.flatMap((g) => g.topics)
describe('ayuda', () => {
  test('cada tema tiene nombre propio y al menos un paso', () => {
    expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length)
    expect(topics.every((t) => t.steps.length > 0)).toBe(true)
  })
  test('los enlaces llevan a habitaciones que existen', () => {
    for (const { link } of topics) {
      const room = /^\/planta\/(\w+)\/(\w+)$/.exec(link?.to ?? '')
      if (!room) continue
      expect(FLOORS.some((f) => f.id === room[1])).toBe(true)
      expect(MODULES.some((m) => m.id === room[2] && m.floor === room[1])).toBe(true)
    }
  })
})
