import { expect, test } from 'vitest'
import { openTestHome } from '../support/database'
import { DEFAULT_SETTINGS } from '@/database/repositories/settings'

test('las preferencias anteriores conservan su número y empiezan sin contactos', async () => {
  const { db, settings } = await openTestHome()
  await db.settings.put({ key: 'preferences', value: { emergencyNumber: '999' } })
  expect(await settings.load()).toMatchObject({ emergencyNumber: '999', emergencyContacts: [] })
})

test('guarda hasta ocho contactos con nombre y teléfono', async () => {
  const { settings } = await openTestHome()
  const contact = { name: 'Policía Nacional', number: '091' }
  const save = (emergencyContacts: typeof contact[]) => settings.save({ ...DEFAULT_SETTINGS, emergencyContacts })
  const eight = Array.from({ length: 8 }, (_, i) => ({ name: 'Servicio ' + (i + 1), number: '600 112 00' + i }))
  await save(eight)
  expect((await settings.load()).emergencyContacts).toEqual(eight)
  await save([contact])
  for (const invalid of [[...eight, contact], [{ ...contact, name: ' ' }], [{ ...contact, number: 'abc' }]]) {
    await expect(save(invalid)).rejects.toThrow()
  }
  expect((await settings.load()).emergencyContacts).toEqual([contact])
})
