import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Notice } from './Notice'

interface DialogProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; error?: string | undefined; wide?: boolean }

/**
 * <dialog> nativo: el navegador gestiona el foco y lo que queda detrás.
 * Escape pide cerrar, pero decide `onClose` (puede haber cambios sin guardar).
 * Los errores van dentro (`error`): un aviso flotante quedaría inaccesible tras el velo.
 * En móvil ocupa toda la pantalla, con las acciones siempre a la vista.
 */
export function Dialog({ open, onClose, title, children, footer, error, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      className={`dialog-root m-auto max-h-[calc(100dvh-2rem)] border-4 border-marino bg-crema p-0 text-tinta max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:border-0 ${wide ? 'w-[min(52rem,calc(100vw-2rem))]' : 'w-[min(40rem,calc(100vw-2rem))]'}`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col max-sm:h-full">
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6">
            <h2 id={titleId} tabIndex={-1} className="pt-2 text-2xl font-bold outline-none">{title}</h2>
            <Button icon={X} size="sm" onClick={onClose}>Cerrar</Button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
          <div role="alert">{error && <div className="px-5 pb-3 sm:px-6"><Notice tone="error">{error}</Notice></div>}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 bg-yeso px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmProps extends Omit<DialogProps, 'footer'> { confirmLabel: string; onConfirm: () => void; busy?: boolean }

/** El botón dice qué va a pasar («Eliminar cita»), nunca «Aceptar». */
export function ConfirmDialog({ confirmLabel, onConfirm, busy = false, ...dialog }: ConfirmProps) {
  return (
    <Dialog
      {...dialog}
      footer={
        <>
          <Button onClick={dialog.onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </>
      }
    />
  )
}
