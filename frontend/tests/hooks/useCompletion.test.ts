import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'
import { useCompletion } from '@/hooks/useCompletion'
import { buildAgenda } from '@/services/agenda'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { openTestHome } from '../support/database'

vi.mock('@/app/providers/home', () => ({ useHome: vi.fn() }))
vi.mock('@/hooks/useToday', () => ({ useToday: () => '2026-11-24' }))

let home: Awaited<ReturnType<typeof openTestHome>>
let record: FamilyRecord

beforeEach(async () => {
  home = await openTestHome()
  const [family, members] = await Promise.all([home.family.get(), home.family.listMembers()])
  const actor = members.find(({ id }) => id === home.pilar)
  if (!actor || !family) throw new Error('Falta el hogar de prueba')
  record = await home.records.create(home.marta, {
    typeId: 'task', data: { title: 'Regar', dueDate: '2026-11-24', repeat: 'daily', members: [actor.id] },
  })
  vi.mocked(useHome).mockReturnValue({ actor, family, members, records: [record] })
  vi.spyOn(repositories.records, 'setDone').mockImplementation(home.records.setDone)
})

afterEach(() => {
  toastStore.getState().clear()
  vi.restoreAllMocks()
})

test.each(['agenda', 'lista'])('desde %s, el aviso permite recuperar la fecha pendiente', async (source) => {
  const completion = useCompletion()
  const [item] = buildAgenda({ records: [record], members: [], from: '2026-11-24', to: '2026-11-24' })
  if (!item) throw new Error('Falta la tarea en la agenda')
  const run = source === 'agenda' ? completion.forItem(item)?.run : completion.forRecord(record, item.title, false)
  run?.()

  await vi.waitFor(() => expect(toastStore.getState().toasts[0]).toMatchObject({
    message: 'Hecho: Regar. La próxima, mañana', action: { label: 'Deshacer' },
  }))
  toastStore.getState().toasts[0]?.action?.run()
  await vi.waitFor(async () => expect((await home.records.get(home.pilar, record.id))?.data).toEqual(record.data))
})

test('el detalle recibe su propio aviso con deshacer', async () => {
  const success = vi.fn<(notice: { message: string; undo: () => Promise<unknown> }) => void>()
  const run = useCompletion().forRecord(record, 'Regar', false, { success, error: vi.fn() })
  await run?.()

  expect(success).toHaveBeenCalledOnce()
  expect(toastStore.getState().toasts).toEqual([])
  const notice = success.mock.calls[0]?.[0]
  expect(notice?.message).toBe('Hecho: Regar. La próxima, mañana')
  await notice?.undo()
  expect((await home.records.get(home.pilar, record.id))?.data).toEqual(record.data)
})
