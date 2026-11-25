import { blocks, type Part } from './richText'

const Parts = ({ parts }: { parts: Part[] }) => parts.map((part, i) => (part.strong
  ? <strong key={i}>{part.text}</strong> // oxlint-disable-line react/no-array-index-key -- el texto no cambia
  : <span key={i}>{part.text}</span>)) // oxlint-disable-line react/no-array-index-key -- el texto no cambia

/** Respuesta con párrafos, listas y negritas, pintada con elementos de React (nunca HTML crudo). */
export function FormattedReply({ text }: { text: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 break-words">
      {blocks(text).map((block, i) => {
        if (block.kind === 'p') return <p key={i}><Parts parts={block.parts} /></p> // oxlint-disable-line react/no-array-index-key -- el texto no cambia
        const List = block.kind
        return (
          <List key={i} className={`grid gap-1 pl-6 ${List === 'ul' ? 'list-disc' : 'list-decimal'}`}> {/* oxlint-disable-line react/no-array-index-key -- el texto no cambia */}
            {block.items.map((parts, j) => <li key={j}><Parts parts={parts} /></li>)} {/* oxlint-disable-line react/no-array-index-key -- el texto no cambia */}
          </List>
        )
      })}
    </div>
  )
}
