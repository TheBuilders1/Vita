/**
 * El asistente contesta con Markdown sencillo. Se convierte en bloques que pinta React,
 * nunca en HTML crudo: lo que venga del modelo o de un documento no puede inyectar nada.
 */
export interface Part { readonly text: string; readonly strong?: true }
export type Block =
  | { readonly kind: 'p'; readonly parts: Part[] }
  | { readonly kind: 'ul' | 'ol'; readonly items: Part[][] }

function inline(line: string): Part[] {
  return line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((piece) =>
    piece.startsWith('**') && piece.endsWith('**') && piece.length > 4 ? { text: piece.slice(2, -2), strong: true } : { text: piece })
}

export function blocks(text: string): Block[] {
  const result: Block[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      const last = result.at(-1)
      const item = inline((bullet ?? numbered)![1]!)
      if (last?.kind === kind) last.items.push(item)
      else result.push({ kind, items: [item] })
    } else if (heading) {
      result.push({ kind: 'p', parts: [{ text: heading[1]!.replaceAll('**', ''), strong: true }] })
    } else {
      result.push({ kind: 'p', parts: inline(line) })
    }
  }
  return result
}

/** Para leerlo en voz alta: sin asteriscos ni almohadillas. */
export const plainText = (text: string) =>
  blocks(text).map((block) => (block.kind === 'p' ? [block.parts] : block.items).map((parts) => parts.map((p) => p.text).join('')).join('. ')).join('. ')
