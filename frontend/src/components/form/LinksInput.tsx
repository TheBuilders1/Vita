import { ClipboardPaste, ExternalLink, Link2, X } from 'lucide-react'
import { useId, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { CONTROL, FieldError } from '@/components/ui/Field'
import { LINK_MAX, MAX_LINKS } from '@/modules/fields'
import { domainOf, isWebLink, tidyLink } from '@/utils/webLinks'

interface LinksProps { label: string; help?: string | undefined; error?: string | undefined; value: string[]; onChange: (links: string[]) => void }

/** Cada enlace es una línea editable: lo mal escrito se queda a la vista para corregirlo. */
export function LinksInput({ label, help, error, value, onChange }: LinksProps) {
  const id = useId()
  const list = useRef<HTMLUListElement>(null)
  const add = (text = '') => {
    onChange([...value, text])
    requestAnimationFrame(() => list.current?.querySelector<HTMLInputElement>('li:last-child input')?.focus())
  }
  const paste = async () => {
    // Si el navegador no deja leer el portapapeles, queda la línea lista para pegar a mano.
    add(tidyLink(await navigator.clipboard.readText().catch(() => '')).slice(0, LINK_MAX))
  }
  const canPaste = 'clipboard' in navigator && typeof navigator.clipboard.readText === 'function'
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 max-w-full font-bold">{label}<span className="font-normal text-apagado"> (opcional)</span></legend>
      <p className="mb-2 text-apagado">{help ?? 'Una página web: la sede electrónica, la póliza, la cita… Vita solo guarda la dirección.'}</p>
      {value.length > 0 && (
        <ul ref={list} className="mb-3 grid grid-cols-1 gap-2">
          {value.map((text, i) => {
            const link = tidyLink(text)
            const valid = isWebLink(link)
            const wrong = error !== undefined && link !== '' && !valid
            return (
              // Sin más identidad que su posición: son textos que se están escribiendo.
              // oxlint-disable-next-line react/no-array-index-key
              <li key={i} className="bg-yeso p-2">
                <label className="block"><span className="sr-only">Enlace {i + 1}</span>
                  <input type="url" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="www.ejemplo.es" maxLength={LINK_MAX} value={text} className={CONTROL}
                    aria-invalid={wrong || undefined} aria-describedby={wrong ? `${id}-error` : undefined}
                    onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))} />
                </label>
                <div className="flex flex-wrap items-center gap-x-5">
                  {valid && <span className="flex min-h-11 items-center gap-2 break-all"><Link2 aria-hidden="true" className="size-5 shrink-0" />{domainOf(link)}</span>}
                  {valid && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4"><ExternalLink aria-hidden="true" className="size-5" />Abrir<span className="sr-only"> {domainOf(link)} en otra pestaña</span></a>}
                  <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4"><X aria-hidden="true" className="size-5" />Quitar<span className="sr-only"> enlace {i + 1}</span></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {value.length < MAX_LINKS && (
        <div className="flex flex-wrap gap-3">
          <Button size="sm" icon={Link2} onClick={() => add()}>Añadir enlace</Button>
          {canPaste && <Button size="sm" icon={ClipboardPaste} onClick={() => { void paste() }}>Pegar enlace</Button>}
        </div>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  )
}
