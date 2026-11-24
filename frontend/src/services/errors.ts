/** Errores previstos: su mensaje está pensado para mostrarse tal cual a la familia. */
export class VitaError extends Error {
  override readonly name: string = 'VitaError'
}
export class PermissionError extends VitaError {
  override readonly name = 'PermissionError'
  constructor(message = 'No tienes permiso para hacer esto') { super(message) }
}
export class NotFoundError extends VitaError {
  override readonly name = 'NotFoundError'
}
export class ConflictError extends VitaError {
  override readonly name = 'ConflictError'
}
export class ValidationError extends VitaError {
  override readonly name = 'ValidationError'
  /** Mensaje por campo, para pintarlo junto al control. */
  readonly fields: Readonly<Record<string, string>>
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0] ?? 'Revisa los datos')
    this.fields = fields
  }
}

interface Issue { readonly path: readonly PropertyKey[]; readonly message: string }

export function validationErrorFrom(issues: readonly Issue[]): ValidationError {
  const fields: Record<string, string> = {}
  for (const issue of issues) fields[String(issue.path[0] ?? '')] ??= issue.message
  return new ValidationError(fields)
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('name' in error && error.name === 'QuotaExceededError') return true
  return 'inner' in error && isQuotaError(error.inner)
}

export function describeError(error: unknown): string {
  if (error instanceof VitaError) return error.message
  if (isQuotaError(error)) return 'No queda espacio en este navegador. Elimina archivos grandes o guarda una copia y libera espacio.'
  return 'Algo ha fallado y no se ha guardado el cambio. Inténtalo de nuevo.'
}
