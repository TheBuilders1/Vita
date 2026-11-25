/** Lo que el servidor del hogar guarda en PostgreSQL con su archivo en el volumen privado. */
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'application/pdf'])

interface StoredBlob { readonly name: string; readonly mime: string; readonly blob: Blob }
export interface KeepResult { readonly kept: number; readonly skipped: number; readonly failed: number }

/**
 * Copia en el servidor del hogar los archivos de una ficha ya confirmada.
 * La ficha y el archivo siguen en el dispositivo aunque esto falle.
 * shortcut: no se guarda qué documento del servidor corresponde a cada archivo; hace falta para borrarlo desde la app.
 */
export async function keepFilesOnServer(fileIds: readonly string[], { household, get, fetch: request = fetch }: {
  household: string
  get: (id: string) => Promise<StoredBlob | undefined>
  fetch?: typeof fetch
}): Promise<KeepResult> {
  let kept = 0
  let skipped = 0
  let failed = 0
  for (const id of fileIds) {
    const file = await get(id)
    if (!file) continue
    if (!ACCEPTED.has(file.mime)) { skipped++; continue }
    const form = new FormData()
    form.set('householdId', household)
    form.set('file', new File([file.blob], file.name, { type: file.mime }))
    try {
      const response = await request('/api/v1/documents', { method: 'POST', headers: { 'x-vita': '1' }, body: form })
      if (response.ok) kept++
      else failed++
    } catch {
      failed++
    }
  }
  return { kept, skipped, failed }
}
