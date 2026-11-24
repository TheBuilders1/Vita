import * as z from 'zod'
import { MODULES } from '@/modules/registry'
import type { Access, ModuleId } from '@/modules/types'
import { isIsoDate } from '@/utils/dates'

export const ROLES = ['master', 'member', 'vulnerable'] as const
export type Role = (typeof ROLES)[number]

export const NEEDS = ['dependency', 'disability', 'allergy', 'intolerance', 'newParent'] as const
export type Need = (typeof NEEDS)[number]

const moduleIds = MODULES.map((m) => m.id) as [ModuleId, ...ModuleId[]]
const moduleIdSchema = z.enum(moduleIds, { error: 'Ese módulo no existe' })
const accessSchema = z.enum(['none', 'read', 'write'], { error: 'Elige un permiso' })

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
    role: z.enum(ROLES, { error: 'Elige un rol' }),
    needs: z.array(z.enum(NEEDS)).default([]),
    moduleAccess: z.partialRecord(moduleIdSchema, accessSchema).default({}),
  })

export type MemberInput = z.input<ReturnType<typeof memberInputSchema>>

export interface Member {
  id: string
  /** Posición en la familia: los identificadores son aleatorios y no ordenan. */
  order: number
  name: string
  birthDate: string
  relationship: string
  role: Role
  needs: Need[]
  moduleAccess: Partial<Record<ModuleId, Access>>
  createdAt: string
  updatedAt: string
}

export const familyInputSchema = z.strictObject({
  name: z.string({ error: 'Escribe el nombre de la familia' }).trim().min(1, 'Escribe el nombre de la familia').max(80, 'Como máximo 80 caracteres'),
  enabledModules: z.array(moduleIdSchema).transform((ids) => [...new Set([...ids, ...ALWAYS_ON])]),
})

export type FamilyInput = z.input<typeof familyInputSchema>

export interface Family {
  id: string
  name: string
  enabledModules: ModuleId[]
  /** Familia ficticia para probar la app. */
  isDemo: boolean
  createdAt: string
  updatedAt: string
}
