/** crypto.randomUUID solo existe en HTTPS o localhost; así funciona también en la red de casa. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
