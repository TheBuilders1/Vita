import { Lightbulb } from 'lucide-react'
import { Link } from 'react-router'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import type { Tip } from '@/services/tips'
import { toastStore } from '@/store'
import { moduleLink } from '@/utils/links'

const KIND_NOTE = { general: null, health: 'Orientación general. No sustituye a un profesional sanitario.', finance: 'Orientación general. No es asesoramiento financiero.' }

export function TipCard({ tip, linked = true }: { tip: Tip; linked?: boolean }) {
  const note = KIND_NOTE[tip.kind]
  const dismiss = () => { repositories.tips.dismiss(tip.id).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error')) }
  return (
    <li className="flex items-start gap-3 bg-aviso-fondo p-4">
      <Lightbulb aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{tip.title}</p>
        <p>{tip.text}</p>
        {note && <p className="mt-1 italic">{note}</p>}
        <div className="flex flex-wrap gap-x-5">
          {linked && <Link to={tip.link ?? moduleLink(tip.moduleId)} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Ir ahora<span className="sr-only">: {tip.title}</span></Link>}
          <button type="button" onClick={dismiss} className="min-h-11 underline underline-offset-4">Descartar<span className="sr-only">: {tip.title}</span></button>
        </div>
      </div>
    </li>
  )
}
