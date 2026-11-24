/** Al copiar una dirección es normal que falte el «https://». */
export function tidyLink(text: string): string {
  const link = text.trim()
  return /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(link) ? `https://${link}` : link
}

/** Solo web, y sin usuario dentro: «https://banco.es@estafa.com» parece el banco y no lo es. */
export function isWebLink(text: string): boolean {
  const url = URL.parse(text)
  return url !== null && /^https?:$/.test(url.protocol) && url.hostname !== '' && url.username === '' && url.password === ''
}

export const domainOf = (link: string): string => URL.parse(link)?.hostname.replace(/^www\./, '') ?? link
