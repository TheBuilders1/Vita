import { expect, test } from 'vitest'
import { isHiddenBelow, isOutOfView } from '@/utils/reveal'

test.each([
  ['lo que el menú inferior tapa dentro de la ventana', 604, 640, 117, true],
  ['lo que empieza a taparse', 524, 640, 117, true],
  ['lo que está fuera de la ventana', 905, 640, 117, true],
  ['sin menú inferior, lo que se sale', 901, 900, 0, true],
])('hay que mostrar %s', (_, bottom, height, inset, expected) => expect(isHiddenBelow(bottom, height, inset)).toBe(expected))

test.each([
  ['lo que queda justo encima del menú', 523, 640, 117],
  ['lo que se dejó arriba al bajar a leer', -40, 640, 117],
  ['lo que cabe justo sin menú inferior', 900, 900, 0],
  ['lo visible cuando el margen es «auto»', 900, 900, Number.NaN],
])('no mueve %s', (_, bottom, height, inset) => expect(isHiddenBelow(bottom, height, inset)).toBe(false))

test.each([
  ['tapado por el menú', 500, 604, true],
  ['salido por arriba al plegarse lo anterior', -25, 79, true],
  ['entero por encima', -200, -58, true],
  ['a la vista', 219, 322, false],
  ['pegado a los dos bordes', 0, 523, false],
])('lo pulsado está %s', (_, top, bottom, expected) => expect(isOutOfView(top, bottom, 640, 117)).toBe(expected))
