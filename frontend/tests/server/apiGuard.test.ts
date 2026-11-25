import { expect, test } from 'vitest'
import { isAllowedCall, readApiConfig } from '../../server/apiGuard'

const RUN = '11111111-1111-4111-8111-111111111111'
const call = (extra = {}) => isAllowedCall({ method: 'POST', url: '/api/v1/documents', remote: '127.0.0.1', guard: '1', site: 'same-origin', ...extra })

test.each([['POST', '/api/v1/chat'], ['POST', '/api/v1/documents'], ['POST', '/api/v1/runs'], ['GET', `/api/v1/runs/${RUN}`], ['GET', '/api/healthz']])('deja pasar %s %s', (method, url) => expect(call({ method, url })).toBe(true))
test.each([
  ['POST', '/api/v1/internal/scan'], ['POST', '/api/v1/internal/report-result'], ['POST', `/api/v1/runs/${RUN}/confirm`], ['GET', '/api/v1/documents'], ['DELETE', '/api/v1/documents'], ['GET', '/api/docs'], ['GET', '/api/openapi.json'],
  ['GET', '/api/v1/runs/../internal/scan'], ['GET', '/api/v1/runs/%2e%2e/internal/scan'], ['POST', '/api/v1/documents/'], ['POST', '/api/v1/documents?x=1'], ['POST', '/api//v1/documents'], ['GET', `/api/v1/runs/${RUN}#x`],
])('corta %s %s', (method, url) => expect(call({ method, url })).toBe(false))
test('solo desde este equipo: el token no se presta a la red', () => {
  for (const remote of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) expect(call({ remote })).toBe(true)
  for (const remote of ['192.168.1.20', '::ffff:192.168.1.20', undefined, '']) expect(call({ remote })).toBe(false)
})
test('otra web abierta en el navegador no puede usarlo', () => {
  expect(call({ guard: undefined })).toBe(false)
  expect(call({ site: 'cross-site' })).toBe(false)
  expect(call({ site: 'same-site' })).toBe(false)
  expect(call({ site: undefined })).toBe(true)
})

const env = { VITA_API_TOKEN: 'secreto', VITA_HOUSEHOLD_ID: RUN }
test('sin token u hogar no hay conexión', () => {
  expect(readApiConfig({})).toBeNull()
  expect(readApiConfig({ ...env, VITA_API_TOKEN: ' ' })).toBeNull()
  expect(readApiConfig({ ...env, VITA_HOUSEHOLD_ID: 'mi-casa' })).toBeNull()
  expect(readApiConfig(env)).toEqual({ target: 'http://127.0.0.1:8000', token: 'secreto', household: RUN })
})
test.each(['http://api.ejemplo.com', 'http://192.168.1.5:8000', 'nada', 'file:///x', 'http://127.0.0.1.malo.com'])('no manda el token a %s', (url) => expect(readApiConfig({ ...env, VITA_API_URL: url })).toBeNull())
test.each(['http://localhost:9000', 'http://127.0.0.1:9000', 'http://[::1]:9000', 'https://api.ejemplo.com'])('%s vale: es este equipo o va cifrado', (url) => expect(readApiConfig({ ...env, VITA_API_URL: url })?.target).toBe(url))

test('el chat exige la ruta exacta, el método y la misma protección del proxy', () => {
  const chat = { url: '/api/v1/chat' }
  for (const extra of [{ site: 'cross-site' }, { guard: undefined }, { method: 'GET' }, { remote: '192.168.1.2' }, { url: '/api/v1/chat?x=1' }]) {
    expect(call({ ...chat, ...extra })).toBe(false)
  }
})
