import * as z from '@/utils/zod'
import type { VitaDb } from '@/database/db'
import { validationErrorFrom } from '@/services/errors'

const phone = z.string().trim().regex(/^\+?[\d\s().-]{3,30}$/, 'El teléfono no es válido')

export const MAX_EMERGENCY_CONTACTS = 8
const emergencyContacts = z.array(z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Como máximo 80 caracteres'),
  number: phone.regex(/\d/, 'El teléfono no es válido'),
})).max(MAX_EMERGENCY_CONTACTS, 'Puedes guardar hasta ocho números')

const shape = {
  textSize: z.enum(['normal', 'large', 'xlarge']),
  contrast: z.enum(['normal', 'high']),
  motion: z.enum(['system', 'reduced']),
  building: z.enum(['3d', 'simple']),
  emergencyNumber: phone,
  emergencyContacts,
  /** Permite enviar fotos de documentos al servidor del hogar. Apagado hasta que alguien lo active. */
  photoReading: z.boolean(),
  connectedChat: z.boolean().default(false),
  /** device: solo si la voz no sale del dispositivo · any: también si el navegador la envía a su fabricante. */
  dictation: z.enum(['off', 'device', 'any']),
}
const settingsSchema = z.object(shape)
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = { textSize: 'normal', contrast: 'normal', motion: 'system', building: '3d', emergencyNumber: '112', emergencyContacts: [], photoReading: false, connectedChat: false, dictation: 'off' }

/** Al leer, cada preferencia dañada vuelve a su valor por defecto sin arrastrar a las demás. */
const tolerantSchema = z.object({
  textSize: shape.textSize.catch(DEFAULT_SETTINGS.textSize),
  contrast: shape.contrast.catch(DEFAULT_SETTINGS.contrast),
  motion: shape.motion.catch(DEFAULT_SETTINGS.motion),
  building: shape.building.catch(DEFAULT_SETTINGS.building),
  emergencyContacts: emergencyContacts.catch([]),
  emergencyNumber: phone.catch(DEFAULT_SETTINGS.emergencyNumber),
  photoReading: shape.photoReading.catch(DEFAULT_SETTINGS.photoReading),
  connectedChat: shape.connectedChat.catch(false),
  dictation: shape.dictation.catch(DEFAULT_SETTINGS.dictation),
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
