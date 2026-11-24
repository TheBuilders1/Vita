import { beforeEach, describe, expect, test } from 'vitest'
import { openTestHome } from '../support/database'

let home: Awaited<ReturnType<typeof openTestHome>>
beforeEach(async () => { home = await openTestHome() })

describe('perfil activo', () => {
  test('por defecto es el primer máster', async () => expect((await home.session.active())?.id).toBe(home.marta))
  test('se recuerda el elegido', async () => {
    await home.session.use(home.pilar)
    expect((await home.session.active())?.id).toBe(home.pilar)
  })
  test('si esa persona desaparece, vuelve al máster', async () => {
    await home.session.use(home.nora)
    await home.family.removeMember(home.marta, home.nora)
    expect((await home.session.active())?.id).toBe(home.marta)
  })
  test('no se puede entrar como alguien que no existe', async () => {
    await expect(home.session.use('nadie')).rejects.toThrow('Ese perfil ya no existe')
  })
})

describe('borrar todo', () => {
  test('solo el máster y no deja nada, salvo las preferencias del dispositivo', async () => {
    await home.records.create(home.marta, { typeId: 'task', data: { title: 'x' } })
    await home.files.add(home.marta, new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await home.session.use(home.andres)
    await home.settings.save({ ...(await home.settings.load()), textSize: 'large' })
    await expect(home.family.wipe(home.andres)).rejects.toThrow('No tienes permiso')
    await home.family.wipe(home.marta)
    expect([await home.db.families.count(), await home.db.members.count(), await home.db.records.count(), await home.db.files.count()]).toEqual([0, 0, 0, 0])
    expect(await home.session.active()).toBeUndefined()
    expect((await home.settings.load()).textSize).toBe('large')
  })
  test('después se puede crear otra familia', async () => {
    await home.family.wipe(home.marta)
    await expect(home.family.setup({ family: { name: 'Nueva', enabledModules: [] }, members: [{ name: 'A', role: 'master', birthDate: '1980-01-01', relationship: 'Yo' }] })).resolves.toBeDefined()
  })
})
