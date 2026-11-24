/** Siempre posterior a la anterior: dos cambios en el mismo milisegundo, o un reloj retrasado, no se confunden. */
export const nextStamp = (previous: string, now: Date): string => new Date(Math.max(now.getTime(), Date.parse(previous) + 1)).toISOString()
