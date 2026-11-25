import { expect, test, vi } from 'vitest'
import { VitaDb } from '@/database/db'
import { createSettingsRepository, DEFAULT_SETTINGS } from '@/database/repositories/settings'
import { createSettingsStore } from '@/store/settingsStore'

let n = 0
const open = () => { const db = new VitaDb(`vita-settings-${++n}`); return { db, repo: createSettingsRepository(db) } }

test('sin nada guardado se usan los valores por defecto', async () => {
  expect(await open().repo.load()).toEqual(DEFAULT_SETTINGS)
})

test('las preferencias sobreviven a cerrar la app', async () => {
  const { db, repo } = open()
  await repo.save({ ...DEFAULT_SETTINGS, textSize: 'xlarge', contrast: 'high' })
  db.close()
  const again = createSettingsRepository(new VitaDb(db.name))
  expect(await again.load()).toMatchObject({ textSize: 'xlarge', contrast: 'high' })
})

test('un valor dañado no arrastra a los demás', async () => {
  const { db, repo } = open()
  await db.settings.put({ key: 'preferences', value: { textSize: 'gigante', contrast: 'high', otra: 1 } })
  expect(await repo.load()).toEqual({ ...DEFAULT_SETTINGS, contrast: 'high' })
  await db.settings.put({ key: 'preferences', value: 'basura' })
  expect(await repo.load()).toEqual(DEFAULT_SETTINGS)
})

test('el número de emergencias no admite texto y no puede quedar vacío', async () => {
  const { repo } = open()
  await expect(repo.save({ ...DEFAULT_SETTINGS, emergencyNumber: 'llama' })).rejects.toThrow('El teléfono no es válido')
  await expect(repo.save({ ...DEFAULT_SETTINGS, emergencyNumber: ' ' })).rejects.toThrow('El teléfono no es válido')
})

test('cambiar una preferencia la aplica y la guarda', async () => {
  const { repo } = open()
  const store = createSettingsStore(repo)
  await store.getState().update({ textSize: 'large' })
  expect(store.getState().settings.textSize).toBe('large')
  expect((await repo.load()).textSize).toBe('large')
})

test('si no se puede guardar, se deshace el cambio', async () => {
  const store = createSettingsStore({ load: async () => DEFAULT_SETTINGS, save: async () => { throw new Error('lleno') } })
  await expect(store.getState().update({ textSize: 'large' })).rejects.toThrow('lleno')
  expect(store.getState().settings).toEqual(DEFAULT_SETTINGS)
})

test('cargar sustituye los valores por los guardados', async () => {
  const load = vi.fn(async () => ({ ...DEFAULT_SETTINGS, motion: 'reduced' as const }))
  const store = createSettingsStore({ load, save: async (s) => s })
  await store.getState().load()
  expect(store.getState().settings.motion).toBe('reduced')
})

test('leer fotos en el servidor viene apagado y hay que activarlo', async () => {
  const { db, repo } = open()
  expect((await repo.load()).photoReading).toBe(false)
  await db.settings.put({ key: 'preferences', value: { textSize: 'large' } })
  expect(await repo.load()).toMatchObject({ textSize: 'large', photoReading: false })
  await db.settings.put({ key: 'preferences', value: { photoReading: 'si' } })
  expect((await repo.load()).photoReading).toBe(false)
})

test('el dictado está apagado hasta que alguien lo activa, también con preferencias antiguas o dañadas', async () => {
  const db = new VitaDb('vita-dictado')
  const repo = createSettingsRepository(db)
  expect((await repo.load()).dictation).toBe('off')
  await db.settings.put({ key: 'preferences', value: { textSize: 'large', dictation: true } })
  expect(await repo.load()).toMatchObject({ textSize: 'large', dictation: 'off' })
})

test('con servidor del hogar, el chat va al orquestador salvo que se desactive en Ajustes', () => {
  expect(DEFAULT_SETTINGS.connectedChat).toBe(true)
})
