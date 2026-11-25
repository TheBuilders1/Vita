import { expect, test } from 'vitest'
import { openTestHome } from '../support/database'

test('cada persona puede guardar sus indicaciones y teléfono y recuperarlos de una copia', async () => {
  const { family, backup, andres, marta, db } = await openTestHome()
  const profile = { notes: 'Celíaca: nada con gluten', phone: '+34 600 123 456' }
  await family.updateMember(andres, andres, profile)
  const copy = await backup.export(marta)
  await family.updateMember(andres, andres, { phone: '', notes: '' })
  await backup.restore(marta, JSON.stringify(copy))
  expect(await db.members.get(andres)).toMatchObject(profile)
  await expect(family.updateMember(marta, andres, { notes: 'a'.repeat(501) })).rejects.toThrow()
  await expect(family.updateMember(marta, andres, { phone: 'lunes' })).rejects.toThrow()
})
