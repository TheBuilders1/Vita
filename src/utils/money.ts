const SHAPES = {
  both: { comma: /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/, dot: /^(\d{1,3}(?:,\d{3})+)\.(\d{1,2})$/ },
  thousands: /^\d{1,3}(\.\d{3})+$/,
  decimal: /^(\d+)(?:[.,](\d{1,2}))?$/,
}

/** Lee un importe escrito a mano («1.234,50», «12.5») y devuelve céntimos, o null si no se entiende. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[\s€]/g, '')
  const grouped = SHAPES.both.comma.exec(clean) ?? SHAPES.both.dot.exec(clean)
  if (grouped) return toCents(grouped[1]!.replace(/\D/g, ''), grouped[2])
  if (SHAPES.thousands.test(clean)) return toCents(clean.replace(/\D/g, ''), undefined)
  const simple = SHAPES.decimal.exec(clean)
  return simple ? toCents(simple[1]!, simple[2]) : null
}

/** Con enteros: 19,99 no puede convertirse en 1998,9999. */
const toCents = (whole: string, decimals = '') => Number(whole) * 100 + Number(decimals.padEnd(2, '0'))

export const toMoneyInput = (cents: number) => `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`
