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
  readonly origin?: ModuleId | 'calendar' | undefined
  readonly previous?: Reply | undefined
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
export interface Fact { readonly key: string; readonly title: string; readonly text: string; readonly recordId?: string; readonly memberId?: string; readonly phone?: string; readonly to?: string; readonly sources?: readonly string[]; readonly moduleId?: ModuleId }
export interface ChatLink { readonly to: string; readonly label: string }

export interface CompletionChoice { readonly recordId: string; readonly updatedAt: string }
export type CardStatus = { readonly state: 'editing' } | { readonly state: 'saved'; readonly recordId: string } | { readonly state: 'undone' }
export interface AgendaMatch extends AgendaItem { readonly sources: readonly string[] }
export interface Contact { readonly recordId: string; readonly name: string; readonly phone: string }

export interface AgendaScope {
  readonly memberIds: readonly string[]
  readonly personal: boolean
  readonly subject?: 'appointment' | 'task' | 'event' | 'medication'
  readonly moduleId?: ModuleId
}

export type Reply =
  | { readonly kind: 'assistant'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string; readonly link?: ChatLink }
  | { readonly kind: 'agenda'; readonly scope?: AgendaScope; readonly text: string; readonly items: readonly AgendaMatch[]; readonly remaining: readonly AgendaMatch[] }
  | { readonly kind: 'proposals'; readonly text: string; readonly proposals: readonly Proposal[] }
  | { readonly kind: 'complete'; readonly text: string; readonly choices: readonly CompletionChoice[] }
  | { readonly kind: 'facts'; readonly text: string; readonly facts: readonly Fact[] }
  | { readonly kind: 'emergency'; readonly text: string; readonly number: string; readonly helpline?: string; readonly contacts: readonly Contact[] }
