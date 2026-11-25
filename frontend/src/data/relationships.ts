/** Formas de vivir: agrupadas para que una lista larga se recorra bien. Si ninguna encaja, se escribe. */
export const RELATIONSHIPS: readonly { readonly group: string; readonly options: readonly string[] }[] = [
  { group: 'Pareja e hijos', options: ['Madre', 'Padre', 'Pareja', 'Hija', 'Hijo', 'Bebé'] },
  { group: 'Familia que se une', options: ['Madrastra', 'Padrastro', 'Hijastra', 'Hijastro', 'Madre de acogida', 'Padre de acogida', 'Menor en acogida'] },
  { group: 'Mayores y otros parientes', options: ['Abuela', 'Abuelo', 'Nieta', 'Nieto', 'Hermana', 'Hermano', 'Tía', 'Tío', 'Sobrina', 'Sobrino', 'Prima', 'Primo', 'Suegra', 'Suegro', 'Cuñada', 'Cuñado'] },
  { group: 'Cuidados y convivencia', options: ['Titular del hogar', 'Persona cuidadora', 'Tutora legal', 'Tutor legal', 'Compañero o compañera de piso', 'Amiga', 'Amigo'] },
]
/** Opción del primer paso: cambia el resto del alta. */
export const ALONE = 'Vivo solo o sola'
/** Lo que se guarda como parentesco de quien vive solo. */
export const ALONE_RELATIONSHIP = 'Titular del hogar'
export const OTHER = 'Otra (escríbela)'
export const isListed = (value: string) => RELATIONSHIPS.some((g) => g.options.includes(value))
