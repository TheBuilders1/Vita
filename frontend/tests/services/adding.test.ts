import { describe, expect, test } from 'vitest'
import { addableTypes, missingParent } from '@/services/adding'
import { getRecordType } from '@/modules/registry'
import { buildMember, buildRecord } from '../support/builders'

const admin = buildMember('ana', 'master')
const member = buildMember('leo', 'member')
const vulnerable = buildMember('pilar', 'vulnerable')
const ids = (module: Parameters<typeof addableTypes>[0], actor = admin, records: Parameters<typeof addableTypes>[2] = []) => addableTypes(module, actor, records).map((t) => t.id)

describe('qué se ofrece añadir al entrar en una habitación', () => {
  test('documentos, lo primero', () => expect(ids('documents')).toEqual(['document']))
  test('lo que depende de otro no se ofrece hasta que exista', () => {
    expect(ids('savings')).toEqual(['savingsGoal'])
    expect(ids('savings', admin, [buildRecord({ typeId: 'savingsGoal', moduleId: 'savings', data: { name: 'Viaje' } })])).toEqual(['savingsGoal', 'savingsContribution'])
    expect(ids('pets')[0]).toBe('pet')
  })
  test('emergencias no: allí lo primero es llamar', () => expect(ids('emergency')).toEqual([]))
  test('quien solo consulta no ve el botón', () => {
    expect(ids('finances', member)).toEqual([])
    expect(ids('documents', vulnerable)).toEqual([])
  })
  test('quien anota lo suyo ve solo eso', () => expect(ids('medication', vulnerable, [buildRecord({ typeId: 'medicationPlan', moduleId: 'medication', data: {} })])).toEqual(['medicationIntake']))
  test('el álbum lo puede usar cualquiera', () => expect(ids('album', vulnerable)).toEqual(['memory']))
})

describe('qué hace falta antes', () => {
  test('un cuidado necesita una mascota', () => {
    expect(missingParent(getRecordType('petCare'), [])?.id).toBe('pet')
    expect(missingParent(getRecordType('petCare'), [buildRecord({ typeId: 'pet', moduleId: 'pets', data: {} })])).toBeUndefined()
  })
  test('lo demás no necesita nada', () => expect(missingParent(getRecordType('task'), [])).toBeUndefined())
})
