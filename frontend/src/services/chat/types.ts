import type { RecordData } from '@/modules/fields'
import type { ModuleId } from '@/modules/types'
import type { AgendaItem } from '@/services/agenda'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'

/** Todo lo que Vita puede usar para contestar: solo lo que ve el perfil activo. */
export interface ChatContext {
  readonly actor: Member
  readonly members: readonly Member[]
  readonly records: readonly FamilyRecord[]
  readonly enabled: readonly ModuleId[]
  readonly today: string
  readonly emergencyNumber: string
  readonly canReadPhotos: boolean
}

export interface Proposal {
  readonly typeId: string
  readonly data: RecordData
  /** Se puede guardar tal cual. Si no, hay que completarla en el formulario. */
  readonly ready: boolean
  readonly missing: readonly string[]
  readonly notes: readonly string[]
}
/** Un dato y de dónde sale: un registro o un perfil. */
export interface Fact { readonly key: string; readonly title: string; readonly text: string; readonly recordId?: string; readonly memberId?: string; readonly phone?: string }
export interface ChatLink { readonly to: string; readonly label: string }

export type Reply =
  | { readonly kind: 'text'; readonly text: string; readonly link?: ChatLink }
  | { readonly kind: 'agenda'; readonly text: string; readonly items: readonly AgendaItem[]; readonly more: number }
  | { readonly kind: 'proposals'; readonly text: string; readonly proposals: readonly Proposal[] }
  | { readonly kind: 'facts'; readonly text: string; readonly facts: readonly Fact[] }
  | { readonly kind: 'emergency'; readonly text: string; readonly number: string; readonly helpline?: string; readonly contacts: readonly { readonly name: string; readonly phone: string }[] }
