/** Para comparar lo que escribe una persona: sin tildes, mayúsculas ni espacios de más. */
export const plainText = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Quien escribe «ñ» la quiere; quien escribe «n» puede no tenerla en el teclado. */
const withEnye = (text: string) =>
  text.normalize('NFC').toLowerCase().replace(/[^ñ]/gu, (c) => c.normalize('NFD').replace(/\p{Diacritic}/gu, '')).replace(/\s+/g, ' ').trim()

/** ¿Aparecen todas las palabras, en cualquier orden? */
export function matches(text: string, query: string): boolean {
  const strict = withEnye(text)
  const loose = plainText(text)
  return withEnye(query).split(' ').every((word) => (word.includes('ñ') ? strict : loose).includes(word))
}
