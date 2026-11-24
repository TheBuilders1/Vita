import * as z from 'zod'
import type { VitaDb } from '@/database/db'
import { validationErrorFrom } from '@/services/errors'

const phone = z.string().trim().regex(/^\+?[\d\s().-]{3,30}$/, 'El teléfono no es válido')

const shape = {
  textSize: z.enum(['normal', 'large', 'xlarge']),
  contrast: z.enum(['normal', 'high']),
  motion: z.enum(['system', 'reduced']),
  building: z.enum(['3d', 'simple']),
  emergencyNumber: phone,
}
const settingsSchema = z.object(shape)
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = { textSize: 'normal', contrast: 'normal', motion: 'system', building: '3d', emergencyNumber: '112' }

/** Al leer, cada preferencia dañada vuelve a su valor por defecto sin arrastrar a las demás. */
const tolerantSchema = z.object({
  textSize: shape.textSize.catch(DEFAULT_SETTINGS.textSize),
  contrast: shape.contrast.catch(DEFAULT_SETTINGS.contrast),
  motion: shape.motion.catch(DEFAULT_SETTINGS.motion),
  building: shape.building.catch(DEFAULT_SETTINGS.building),
  emergencyNumber: phone.catch(DEFAULT_SETTINGS.emergencyNumber),
}).catch(DEFAULT_SETTINGS)

const KEY = 'preferences'

/** Preferencias del dispositivo: cualquiera puede ajustar cómo lee la pantalla. */
export function createSettingsRepository(db: VitaDb) {
  return {
    load: async (): Promise<Settings> => tolerantSchema.parse((await db.settings.get(KEY))?.value ?? {}),
    async save(settings: Settings): Promise<Settings> {
      const parsed = settingsSchema.safeParse(settings)
      if (!parsed.success) throw validationErrorFrom(parsed.error.issues)
      await db.settings.put({ key: KEY, value: parsed.data })
      return parsed.data
    },
  }
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>
