export function joinDictation(written: string, spoken: string, max = Infinity): string {
  return [written.trim(), spoken.trim()].filter(Boolean).join(' ').slice(0, max)
}

/** Parar a propósito no es un fallo. */
export function dictationProblem(code: string): string | undefined {
  switch (code) {
    case 'aborted': return undefined
    case 'not-allowed': case 'service-not-allowed': return 'El navegador no deja usar el micrófono. Puedes permitirlo en el icono que hay junto a la dirección.'
    case 'audio-capture': return 'No se encuentra ningún micrófono.'
    case 'network': return 'Para usar la voz, este navegador necesita conexión a internet y ahora no la hay.'
    case 'no-speech': return 'No se ha oído nada. Prueba otra vez, más cerca del micrófono.'
    case 'language-not-supported': return 'Este navegador no reconoce la voz en español.'
    default: return 'No se ha podido reconocer la voz. Escríbelo o prueba otra vez.'
  }
}
