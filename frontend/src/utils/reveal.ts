/** Solo hacia abajo: lo que queda por encima es que la persona ya lo pasó y moverla la perdería. */
export function isHiddenBelow(bottom: number, viewHeight: number, inset: number): boolean {
  return bottom > viewHeight - (Number.isNaN(inset) ? 0 : inset)
}

export function isOutOfView(top: number, bottom: number, viewHeight: number, inset: number): boolean {
  return top < 0 || isHiddenBelow(bottom, viewHeight, inset)
}

/** El margen es el de `scroll-padding` (index.css): lo que ocupa el menú inferior del móvil. */
const bottomInset = () => Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom)

/** Acerca al centro lo que tapa el menú inferior o queda fuera por abajo. */
export function revealIfHiddenBelow(element: Element) {
  if (isHiddenBelow(element.getBoundingClientRect().bottom, window.innerHeight, bottomInset())) element.scrollIntoView({ block: 'center' })
}

/** Igual, también si se ha salido por arriba: para lo que se acaba de pulsar. */
export function revealIfOutOfView(element: Element) {
  const { top, bottom } = element.getBoundingClientRect()
  if (isOutOfView(top, bottom, window.innerHeight, bottomInset())) element.scrollIntoView({ block: 'center' })
}
