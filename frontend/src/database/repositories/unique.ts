import { getRecordType } from '@/modules/registry'
import { ValidationError } from '@/services/errors'
import { canRead } from '@/services/permissions'
import type { Member } from '@/types/family'
import type { FamilyRecord } from '@/types/records'
import type { RepositoryContext } from './context'

/** Uno solo por valor (`uniqueBy`). Lo privado de otra persona no cuenta: decir que ya existe lo revelaría. */
export async function requireUnique({ db }: RepositoryContext, actor: Member, record: FamilyRecord): Promise<void> {
  const { uniqueBy } = getRecordType(record.typeId)
  if (!uniqueBy) return
  const twin = await db.records.where('typeId').equals(record.typeId)
    .filter((r) => r.id !== record.id && r.data[uniqueBy] === record.data[uniqueBy] && canRead(actor, r)).count()
  if (twin > 0) throw new ValidationError({ [uniqueBy]: 'Ya hay otro igual. Cámbialo en vez de añadir uno nuevo.' })
}
