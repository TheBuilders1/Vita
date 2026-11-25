/** Reglas del proxy de desarrollo: el token vive aquí, nunca en el navegador. */
export interface ApiConfig { readonly target: string; readonly token: string; readonly household: string }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ALLOWED: readonly RegExp[] = [/^GET \/api\/healthz$/, /^POST \/api\/v1\/chat$/, /^POST \/api\/v1\/chat\/attachments$/, /^POST \/api\/v1\/documents$/, /^POST \/api\/v1\/runs$/, new RegExp(`^GET /api/v1/runs/${UUID}$`)]
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

interface Call { readonly method: string | undefined; readonly url: string | undefined; readonly remote: string | undefined; readonly guard: string | undefined; readonly site: string | undefined }

/**
 * Solo las seis llamadas que hacen falta y solo desde este equipo. La cabecera propia obliga al navegador
 * a pedir permiso antes: sin ella, otra web abierta podría usar el token sin saberlo nadie.
 */
export function isAllowedCall({ method, url, remote, guard, site }: Call): boolean {
  return LOOPBACK.has(remote ?? '') && guard === '1' && (site === undefined || site === 'same-origin') && ALLOWED.some((rule) => rule.test(`${method} ${url}`))
}

function isSafeTarget(text: string): boolean {
  const url = URL.parse(text)
  return url !== null && (url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)))
}

export function readApiConfig(env: Readonly<Record<string, string | undefined>>): ApiConfig | null {
  const token = env.VITA_API_TOKEN?.trim()
  const household = env.VITA_HOUSEHOLD_ID?.trim()
  const target = env.VITA_API_URL?.trim() || 'http://127.0.0.1:8000'
  if (!token || !household || !new RegExp(`^${UUID}$`, 'i').test(household) || !isSafeTarget(target)) return null
  return { target, token, household }
}
