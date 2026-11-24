const MAX = 200

/** Los nombres larguísimos no aportan nada y estorban al guardar copias. Conserva la extensión. */
export function shortName(name: string): string {
  if (name.length <= MAX) return name
  const extension = /\.[^.]{1,10}$/.exec(name)?.[0] ?? ''
  return `${name.slice(0, MAX - 1 - extension.length)}…${extension}`
}
