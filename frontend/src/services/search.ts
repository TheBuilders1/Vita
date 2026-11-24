import { getModule, getRecordType } from '@/modules/registry'
import type { ModuleDef, ModuleId } from '@/modules/types'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import { matches, plainText } from '@/utils/text'
import { shareText } from './share'
import { recordTitle, titleContext } from './titles'

interface SearchQuery { readonly query: string; readonly records: readonly FamilyRecord[]; readonly members: readonly Member[]; readonly modules: readonly ModuleId[] }
export interface SearchResult { records: FamilyRecord[]; modules: ModuleDef[]; people: Member[] }

/** Busca en todo lo que este perfil puede ver: los registros ya llegan filtrados. */
export function searchHome({ query, records, members, modules }: SearchQuery): SearchResult {
  if (plainText(query) === '') return { records: [], modules: [], people: [] }
  const context = titleContext(members, records)
  const found = records.flatMap((record) => {
    const title = recordTitle(record, context)
    const type = getRecordType(record.typeId)
    const people = record.subjectIds.map((id) => context.members.get(id)?.name ?? '').join(' ')
    const all = [shareText(record, context), type.name, type.plural, getModule(record.moduleId).name, people].join(' ')
    return matches(all, query) ? [{ record, inTitle: matches(title, query) }] : []
  })
  return {
    records: found.toSorted((a, b) => Number(b.inTitle) - Number(a.inTitle) || b.record.updatedAt.localeCompare(a.record.updatedAt)).map((f) => f.record),
    modules: modules.map(getModule).filter((m) => matches(`${m.name} ${m.description} ${m.recordTypes.map((t) => t.plural).join(' ')}`, query)),
    people: members.filter((m) => matches(`${m.name} ${m.relationship}`, query)),
  }
}
