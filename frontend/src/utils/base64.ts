const CHUNK = 0x8000

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  // Por trozos: pasar millones de argumentos a la vez desborda la pila.
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(binary)
}

export const base64ToBytes = (data: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

export const blobToBase64 = async (blob: Blob): Promise<string> => bytesToBase64(new Uint8Array(await blob.arrayBuffer()))

export const base64ToBlob = (data: string, type: string): Blob => new Blob([base64ToBytes(data)], { type })
