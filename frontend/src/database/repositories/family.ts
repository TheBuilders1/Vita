import { ConflictError, NotFoundError, PermissionError, validationErrorFrom } from '@/services/errors'
import { planRemoval } from '@/services/integrity'
import { canManage, type ManagedArea } from '@/services/permissions'
import { familyInputSchema, memberInputSchema, type Family, type FamilyInput, type Member, type MemberInput } from '@/types/family'
import { todayIso } from '@/utils/dates'
import { newId } from '@/utils/ids'
import { loadActor, type RepositoryContext } from './context'
import { SESSION_KEY } from './session'
import { applyRemoval, summarize, type RemovalSummary } from './removal'
import { forgetInTrash } from './trash'

/** Lo que cada persona puede cambiar de su propio perfil sin ser admin. */
const SELF_EDITABLE = new Set<string>(['name', 'birthDate', 'relationship', 'photo', 'notes', 'phone'])
const NEEDS_MASTER = 'El hogar necesita al menos un admin'

const parseFamily = (input: FamilyInput) => {
  const parsed = familyInputSchema.safeParse(input)
  if (!parsed.success) throw validationErrorFrom(parsed.error.issues)
  return parsed.data
}

export function createFamilyRepository(ctx: RepositoryContext) {
  const { db, now } = ctx

  const parseMember = (input: unknown) => {
    const parsed = memberInputSchema(todayIso(now())).safeParse(input)
    if (!parsed.success) throw validationErrorFrom(parsed.error.issues)
    return parsed.data
  }
  const buildMember = (input: MemberInput, order: number): Member => {
    const timestamp = now().toISOString()
    return { ...parseMember(input), id: newId(), order, createdAt: timestamp, updatedAt: timestamp }
  }
  const requireManager = async (actorId: string, area: ManagedArea) => {
    const actor = await loadActor(ctx, actorId)
    if (!canManage(actor, area)) throw new PermissionError()
    return actor
  }
  const requireMember = async (id: string) => {
    const member = await db.members.get(id)
    if (!member) throw new NotFoundError('Esa persona ya no está en el hogar')
    return member
  }
  const planMemberRemoval = async (id: string, heirId: string) =>
    planRemoval(await db.records.toArray(), { member: { id, heirId } })

  const get = (): Promise<Family | undefined> => db.families.toCollection().first()

  return {
    get,

    listMembers: async (): Promise<Member[]> => (await db.members.toArray()).toSorted((a, b) => a.order - b.order),

    async setup(input: { family: FamilyInput; members: MemberInput[]; isDemo?: boolean }): Promise<{ family: Family; members: Member[] }> {
      const timestamp = now().toISOString()
      const family: Family = { ...parseFamily(input.family), id: newId(), isDemo: input.isDemo ?? false, createdAt: timestamp, updatedAt: timestamp }
      const members = input.members.map((m, i) => buildMember(m, i))
      if (!members.some((m) => m.role === 'master')) throw new ConflictError(NEEDS_MASTER)
      await db.transaction('rw', db.families, db.members, async () => {
        if (await get()) throw new ConflictError('Ya hay un hogar guardado en este dispositivo')
        await db.families.add(family)
        await db.members.bulkAdd(members)
      })
      return { family, members }
    },

    update: (actorId: string, changes: Partial<FamilyInput>): Promise<Family> =>
      db.transaction('rw', db.families, db.members, async () => {
        await requireManager(actorId, 'modules')
        const current = await get()
        if (!current) throw new NotFoundError('Todavía no hay ningún hogar')
        const parsed = parseFamily({ name: current.name, enabledModules: current.enabledModules, ...changes })
        const updated = { ...current, ...parsed, updatedAt: now().toISOString() }
        await db.families.put(updated)
        return updated
      }),

    addMember: (actorId: string, input: MemberInput): Promise<Member> =>
      db.transaction('rw', db.members, async () => {
        await requireManager(actorId, 'family')
        const last = Math.max(-1, ...(await db.members.toArray()).map((m) => m.order))
        const member = buildMember(input, last + 1)
        await db.members.add(member)
        return member
      }),

    updateMember: (actorId: string, id: string, changes: Partial<MemberInput>): Promise<Member> =>
      db.transaction('rw', db.members, async () => {
        const actor = await loadActor(ctx, actorId)
        const onlyOwnProfile = actor.id === id && Object.keys(changes).every((key) => SELF_EDITABLE.has(key))
        if (!canManage(actor, 'family') && !onlyOwnProfile) throw new PermissionError()
        const current = await requireMember(id)
        const { createdAt, updatedAt: _previous, id: _id, order, ...profile } = current
        const updated: Member = { ...parseMember({ ...profile, ...changes }), id, order, createdAt, updatedAt: now().toISOString() }
        if (current.role === 'master' && updated.role !== 'master') {
          const masters = await db.members.filter((m) => m.role === 'master').count()
          if (masters === 1) throw new ConflictError(NEEDS_MASTER)
        }
        await db.members.put(updated)
        return updated
      }),

    previewMemberRemoval: (actorId: string, id: string): Promise<RemovalSummary> =>
      db.transaction('r', db.members, db.records, async () => {
        const actor = await requireManager(actorId, 'family')
        await requireMember(id)
        return summarize(await planMemberRemoval(id, actor.id))
      }),

    /** Como nadie se elimina a sí mismo y solo elimina un admin, siempre queda al menos uno. */
    removeMember: (actorId: string, id: string): Promise<void> =>
      db.transaction('rw', db.members, db.records, db.files, db.trash, async () => {
        const actor = await requireManager(actorId, 'family')
        if (actor.id === id) throw new ConflictError('No puedes eliminar tu propio perfil')
        await requireMember(id)
        await applyRemoval(ctx, actor.id, await planMemberRemoval(id, actor.id))
        await db.files.filter((f) => f.recordId === undefined && f.uploadedBy === id).delete()
        await forgetInTrash(ctx, { id, heirId: actor.id })
        await db.members.delete(id)
      }),

    /** Borra el hogar y todo su contenido. Conserva las preferencias del dispositivo. */
    wipe: (actorId: string): Promise<void> =>
      db.transaction('rw', [db.families, db.members, db.records, db.files, db.trash, db.settings], async () => {
        await requireManager(actorId, 'data')
        await Promise.all([db.families.clear(), db.members.clear(), db.records.clear(), db.files.clear(), db.trash.clear(), db.settings.delete(SESSION_KEY)])
      }),
  }
}
