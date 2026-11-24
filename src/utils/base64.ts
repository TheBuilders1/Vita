const CHUNK = 0x8000

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Por trozos: pasar millones de argumentos a la vez desborda la pila.
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(binary)
}

export const base64ToBlob = (data: string, type: string): Blob =>
  new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type })
