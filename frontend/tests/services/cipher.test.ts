import { describe, expect, test } from 'vitest'
import { decryptText, encryptText, isEncrypted, MIN_PASSWORD, passwordProblem } from '@/services/cipher'

const PASSWORD = 'caballo grapa batería'
/** Menos vueltas solo en los tests: el formato las lleva dentro. */
const encrypt = (text: string, password = PASSWORD) => encryptText(text, password, 100_000)

describe('copia cifrada', () => {
  test('vuelve igual con su contraseña', async () => {
    const text = JSON.stringify({ app: 'vita', nombre: 'Ñandú 🏠', datos: 'x'.repeat(50_000) })
    expect(await decryptText(await encrypt(text), PASSWORD)).toBe(text)
  })
  test('por fuera no se lee nada', async () => {
    const out = await encrypt('{"app":"vita","family":{"name":"Los Robles"}}')
    expect(out).not.toContain('Robles')
    expect(isEncrypted(out)).toBe(true)
    expect(isEncrypted('{"app":"vita","version":3}')).toBe(false)
    expect(isEncrypted('no es json')).toBe(false)
  })
  test('cada vez sale distinta', async () => expect(await encrypt('hola')).not.toBe(await encrypt('hola')))
  test('con otra contraseña no se abre', async () => {
    await expect(decryptText(await encrypt('hola'), 'otra contraseña')).rejects.toThrow('La contraseña no es correcta o la copia está dañada')
  })
  test('si la tocan, no se abre', async () => {
    const copy = JSON.parse(await encrypt('hola')) as Record<string, unknown>
    for (const change of [{ encrypted: 0 }, { encrypted: 0.5 }, { data: 'AAAA' }, { iv: 'AAAAAAAAAAAAAAAA' }, { iterations: 100_001 }, { salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }]) {
      await expect(decryptText(JSON.stringify({ ...copy, ...change }), PASSWORD)).rejects.toThrow('La contraseña no es correcta o la copia está dañada')
    }
  })
  test('una versión futura o disparatada se explica', async () => {
    const copy = JSON.parse(await encrypt('hola')) as Record<string, unknown>
    await expect(decryptText(JSON.stringify({ ...copy, encrypted: 2 }), PASSWORD)).rejects.toThrow('más nueva')
    await expect(decryptText(JSON.stringify({ ...copy, iterations: 10 ** 10 }), PASSWORD)).rejects.toThrow('dañada')
  })
  test('las tildes valen se escriban como se escriban', async () => {
    expect(await decryptText(await encrypt('hola', 'batería larga'.normalize('NFC')), 'batería larga'.normalize('NFD'))).toBe('hola')
  })
})

describe('contraseña', () => {
  test('larga y repetida igual', () => {
    expect(passwordProblem('corta', 'corta')).toContain(String(MIN_PASSWORD))
    expect(passwordProblem(PASSWORD, 'otra')).toBe('Las dos no coinciden')
    expect(passwordProblem(PASSWORD, PASSWORD)).toBeUndefined()
    expect(passwordProblem('            ', '            ')).toBeDefined()
  })
})
