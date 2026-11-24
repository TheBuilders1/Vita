import type * as z from 'zod'
import type { Fields, RecordData, Rule } from './fields'

export type FloorId = 'food' | 'education' | 'health' | 'finance' | 'leisure'

export type ModuleId =
  | 'cooking' | 'diet' | 'fridge'
  | 'school' | 'grants' | 'development' | 'bookings'
  | 'healthRecord' | 'dental' | 'medication' | 'care' | 'vaccination' | 'emergency' | 'pets'
  | 'finances' | 'savings' | 'kidsMoney' | 'documents'
  | 'outings' | 'shopping' | 'technology' | 'cybersecurity' | 'digitalInfo' | 'album'
  | 'planner'

export type Access = 'none' | 'read' | 'write'

/** family: todos · restricted: autor, protagonistas, invitados y admins · private: solo el autor. */
export type Visibility = 'family' | 'restricted' | 'private'

export type AgendaCategory =
  | 'event' | 'appointment' | 'medication' | 'school' | 'birthday' | 'holiday' | 'reminder' | 'deadline' | 'meal'

/** Cómo aparece un registro en el calendario. El calendario se deriva: no se duplican fechas. */
export interface AgendaEntry {
  readonly dateField: string
  readonly category: AgendaCategory
  /** Texto que acompaña al título, p. ej. «Caduca». */
  readonly label?: string
  readonly endField?: string
  readonly timeField?: string
  readonly timesField?: string
  readonly weekdaysField?: string
  readonly repeat?: 'daily' | 'yearly'
  /** Select con valores none | daily | weekly | monthly | yearly. */
  readonly repeatField?: string
  readonly untilField?: string
  /** Texto secundario: la dosis, el lugar… */
  readonly detailField?: string
  /** No la da por hecha el campo de completado del registro (p. ej. la próxima revisión de una cita pasada). */
  readonly independent?: boolean
  /** Registros que anotan cada repetición: la toma de una dosis. */
  readonly log?: { readonly typeId: string; readonly refField: string; readonly statusField?: string }
}

export interface RecordTypeInput<F extends Fields = Fields> {
  readonly id: string
  readonly name: string
  readonly plural: string
  readonly fields: F
  readonly titleField: keyof F & string
  readonly rules?: readonly Rule[]
  readonly visibility?: { readonly default: Visibility; readonly locked?: boolean }
  /** Solo puede haber uno con el mismo valor en este campo (un tope por categoría). */
  readonly uniqueBy?: keyof F & string
  /** Booleano que se cambia con la acción «completar». */
  readonly doneField?: keyof F & string
  /** Quien solo puede leer el módulo puede crear estos registros sobre sí mismo (p. ej. una toma). */
  readonly selfLog?: boolean
  readonly agenda?: readonly AgendaEntry[]
}

export interface RecordTypeDef {
  readonly id: string
  readonly moduleId: ModuleId
  readonly name: string
  readonly plural: string
  readonly fields: Fields
  readonly titleField: string
  readonly schema: z.ZodType<RecordData>
  readonly visibility: { readonly default: Visibility; readonly locked: boolean }
  readonly uniqueBy?: string
  readonly doneField?: string
  readonly selfLog: boolean
  readonly agenda?: readonly AgendaEntry[]
}

export interface ModuleDef {
  readonly id: ModuleId
  readonly floor: FloorId | null
  readonly name: string
  readonly description: string
  /** Nunca se bloquea por plan de suscripción. */
  readonly essential: boolean
  readonly disclaimer?: 'health' | 'finance'
  readonly access: { readonly member: Access; readonly vulnerable: Access }
  readonly minimumAccess: Access
  readonly recordTypes: readonly RecordTypeDef[]
}
