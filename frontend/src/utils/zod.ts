import { config } from 'zod'

// La política de contenido no deja evaluar código, y Zod lo intentaría. Antes de crear ningún esquema: después ya no hace efecto.
config({ jitless: true })

export * from 'zod'
