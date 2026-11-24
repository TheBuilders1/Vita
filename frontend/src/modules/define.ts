import { buildSchema, type Fields, type RecordData } from './fields'
import type { Access, ModuleDef, ModuleId, RecordTypeDef, RecordTypeInput } from './types'

type Unbound = Omit<RecordTypeDef, 'moduleId'>

/** El tipo se enlaza con su módulo en defineModule: así el moduleId se escribe una sola vez. */
export function defineRecordType<const F extends Fields>(input: RecordTypeInput<F>): Unbound {
  const { rules, visibility, selfLog = false, ...rest } = input
  return {
    ...rest,
    selfLog,
    visibility: { default: visibility?.default ?? 'family', locked: visibility?.locked ?? false },
    schema: buildSchema(input.fields as Fields, rules) as RecordTypeDef['schema'],
  }
}

interface ModuleInput extends Omit<ModuleDef, 'recordTypes' | 'essential' | 'minimumAccess' | 'access'> {
  readonly essential?: boolean
  readonly minimumAccess?: Access
  readonly access?: ModuleDef['access']
  readonly recordTypes: readonly Unbound[]
}

export function defineModule(input: ModuleInput): ModuleDef {
  const moduleId: ModuleId = input.id
  return {
    essential: false,
    minimumAccess: 'none',
    access: { member: 'write', vulnerable: 'read' },
    ...input,
    recordTypes: input.recordTypes.map((type) => ({ ...type, moduleId })),
  }
}

/** Regla reutilizable: si ambos valores existen, el final no puede ser anterior al inicio. */
export const notBefore = (start: string, end: string, message: string) => ({
  field: end,
  message,
  valid: (data: RecordData) => data[start] === undefined || data[end] === undefined || String(data[end]) >= String(data[start]),
})

export const options = <const T extends Record<string, string>>(labels: T) =>
  Object.entries(labels).map(([value, label]) => ({ value, label })) as { value: keyof T & string; label: string }[]

export const RESTRICTED = { default: 'restricted' } as const
export const FAMILY_LOCKED = { default: 'family', locked: true } as const
