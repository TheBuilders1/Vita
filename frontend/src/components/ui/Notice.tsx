import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ModuleDef } from '@/modules/types'

type Tone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<Tone, { className: string; icon: LucideIcon }> = {
  info: { className: 'bg-info-fondo border-marino', icon: Info },
  success: { className: 'bg-exito-fondo border-oliva', icon: CircleCheck },
  warning: { className: 'bg-aviso-fondo border-madera', icon: TriangleAlert },
  error: { className: 'bg-error-fondo border-peligro', icon: CircleAlert },
}

export function Notice({ tone = 'info', title, children, action }: { tone?: Tone; title?: string; children: ReactNode; action?: ReactNode }) {
  const { className, icon: Icon } = TONES[tone]
  return (
    <div className={`flex items-start gap-3 border-l-8 p-4 text-tinta ${className}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

const DISCLAIMERS = {
  health: 'Esta información te ayuda a organizarte. No es un diagnóstico ni sustituye a un profesional sanitario.',
  finance: 'Estas cifras te ayudan a organizarte. No son asesoramiento financiero.',
}

export function Disclaimer({ kind }: { kind: NonNullable<ModuleDef['disclaimer']> }) {
  return <Notice>{DISCLAIMERS[kind]}</Notice>
}
