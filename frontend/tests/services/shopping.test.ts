import { expect, it } from 'vitest'
import { parseShopping } from '@/services/shopping'

it('separa los productos y conserva las cantidades', () => {
  expect(parseShopping('Leche, pan y dos kilos de patatas.')).toEqual([
    { name: 'Leche' }, { name: 'pan' }, { name: 'patatas', quantity: 2, unit: 'kilos' },
  ])
})
it('ignora las pausas vacías', () => expect(parseShopping(' , , ')).toEqual([]))
