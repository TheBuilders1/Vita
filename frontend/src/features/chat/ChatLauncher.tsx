import { lazy, Suspense, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Mic } from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'
import { Dialog } from '@/components/ui/Dialog'
// El chat se carga al abrirlo: así no pesa en la primera carga de cada pantalla.
const ProfileChat = lazy(async () => ({ default: (await import('./ChatPage')).ProfileChat }))

export function ChatLauncher({ origin }: { origin?: string }) {
  const home = useHome()
  const [open, setOpen] = useState(false)
  return (
    <div className="vita-chat-launcher chat-launcher">
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="chat-launch">
        <span className="chat-launch-face"><LogoMark /><span className="chat-launch-dot" aria-hidden="true" /></span>
        <span className="chat-launch-text">Pregúntame<span className="sr-only"> a Vita</span><span className="chat-launch-hint" aria-hidden="true"><Mic />Habla o escribe</span></span>
      </button>
      <Dialog open={open} title="Pídeselo a Vita" onClose={() => setOpen(false)}>
        <Suspense fallback={<p>Abriendo a Vita…</p>}><ProfileChat home={home} panel fromRoom={origin} /></Suspense>
      </Dialog>
    </div>
  )
}
