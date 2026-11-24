import * as z from '@/utils/zod'
import { MODULES } from '@/modules/registry'
import type { Access, ModuleId } from '@/modules/types'
import { isIsoDate } from '@/utils/dates'

export const ROLES = ['master', 'member', 'vulnerable'] as const
export type Role = (typeof ROLES)[number]

export const NEEDS = ['dependency', 'disability', 'allergy', 'intolerance', 'newParent'] as const
export type Need = (typeof NEEDS)[number]

const moduleIds = MODULES.map((m) => m.id) as [ModuleId, ...ModuleId[]]
export const moduleIdSchema = z.enum(moduleIds, { error: 'Ese módulo no existe' })
const accessSchema = z.enum(['none', 'read', 'write'], { error: 'Elige un permiso' })
const JPEG_PREFIX = 'data:image/jpeg;base64,'
const PHOTO_ERROR = 'La foto debe ser una imagen JPG válida. Elige otra foto.'
const base64 = z.base64()
const photoSchema = z.string({ error: PHOTO_ERROR })
  .refine((v) => v.length <= 192 * 1024, { error: 'La foto ocupa demasiado. Elige otra foto.', abort: true })
  .refine((v) => {
    if (!v.startsWith(JPEG_PREFIX)) return false
    const data = v.slice(JPEG_PREFIX.length)
    if (!base64.safeParse(data).success) return false
    const bytes = atob(data)
    return bytes.startsWith('\xff\xd8\xff') && bytes.endsWith('\xff\xd9')
  }, PHOTO_ERROR)
  .optional()

/** Módulos que siempre están encendidos. */
export const ALWAYS_ON: readonly ModuleId[] = ['emergency', 'planner']

/** `today` entra como parámetro para que la validación sea determinista. */
export const memberInputSchema = (today: string) =>
  z.strictObject({
    name: z.string({ error: 'Escribe el nombre' }).trim().min(1, 'Escribe el nombre').max(80, 'Como máximo 80 caracteres'),
    birthDate: z
      .string({ error: 'La fecha de nacimiento no es válida' })
      .refine(isIsoDate, { error: 'La fecha de nacimiento no es válida', abort: true })
      .refine((v) => v <= today, 'La fecha de nacimiento no puede ser futura'),
    relationship: z.string({ error: 'Indica el parentesco' }).trim().min(1, 'Indica el parentesco').max(60, 'Como máximo 60 caracteres'),
    photo: photoSchema,
    role: z.enum(ROLES, { error: 'Elige un rol' }),
    needs: z.array(z.enum(NEEDS)).default([]),
    moduleAccess: z.partialRecord(moduleIdSchema, accessSchema).default({}),
  })

export type MemberInput = z.input<ReturnType<typeof memberInputSchema>>

export interface Member {
  id: string
  /** Posición en el hogar: los identificadores son aleatorios y no ordenan. */
  order: number
  name: string
  birthDate: string
  relationship: string
  photo?: string
  role: Role
  needs: Need[]
  moduleAccess: Partial<Record<ModuleId, Access>>
  createdAt: string
  updatedAt: string
}

export const familyInputSchema = z.strictObject({
  name: z.string({ error: 'Escribe el nombre del hogar' }).trim().min(1, 'Escribe el nombre del hogar').max(80, 'Como máximo 80 caracteres'),
  enabledModules: z.array(moduleIdSchema).transform((ids) => [...new Set([...ids, ...ALWAYS_ON])]),
})

export type FamilyInput = z.input<typeof familyInputSchema>

export interface Family {
  id: string
  name: string
  enabledModules: ModuleId[]
  /** Hogar ficticio para probar la app. */
  isDemo: boolean
  createdAt: string
  updatedAt: string
}
