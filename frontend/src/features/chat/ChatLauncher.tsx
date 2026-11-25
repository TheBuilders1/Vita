import { lazy, Suspense, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { LogoMark } from '@/components/layout/Logo'
import { Dialog } from '@/components/ui/Dialog'
// El chat se carga al abrirlo: así no pesa en la primera carga de cada pantalla.
const ProfileChat = lazy(async () => ({ default: (await import('./ChatPage')).ProfileChat }))

export function ChatLauncher({ origin }: { origin?: string }) {
  const home = useHome()
  const [open, setOpen] = useState(false)
  return (
    <div className="vita-chat-launcher chat-launcher">
      <Button variant="primary" aria-haspopup="dialog" onClick={() => setOpen(true)} className="chat-launch-button"><span className="flex items-center gap-2"><LogoMark className="h-7 w-6" />Pregúntame<span className="sr-only"> a Vita</span></span></Button>
      <Dialog open={open} title="Pídeselo a Vita" onClose={() => setOpen(false)}>
        <Suspense fallback={<p>Abriendo a Vita…</p>}><ProfileChat home={home} panel fromRoom={origin} /></Suspense>
      </Dialog>
    </div>
  )
}
