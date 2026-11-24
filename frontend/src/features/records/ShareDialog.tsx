import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Share2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Checkbox, TextArea } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { filesOf } from '@/services/integrity'
import { shareText } from '@/services/share'
import { titleContext } from '@/services/titles'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'

/** No todos los navegadores lo tienen, y solo en HTTPS o localhost. */
const canShare = () => typeof navigator.share === 'function'

/** Enseña exactamente lo que va a salir, y deja quitar lo que sobre antes de enviarlo. */
export function ShareDialog({ record, onClose }: { record: FamilyRecord; onClose: () => void }) {
  const { actor, members, records } = useHome()
  const context = titleContext(members, records)
  const [text, setText] = useState(() => shareText(record, context))
  const [withFiles, setWithFiles] = useState(false)
  const [error, setError] = useState<string>()
  const area = useRef<HTMLTextAreaElement>(null)
  // Se leen al abrir: el navegador solo deja compartir justo después de pulsar.
  const files = useLiveQuery(async () => {
    const found = await Promise.all(filesOf(record.typeId, record.data).map((id) => repositories.files.get(actor.id, id)))
    return found.flatMap((f) => (f ? [new File([f.blob], f.name, { type: f.mime })] : []))
  }, [record, actor.id]) ?? []
  const shareable = canShare() && files.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files })

  const share = async () => {
    try {
      await navigator.share({ text, ...(withFiles && shareable && { files }) })
      onClose()
    } catch (cause) {
      // Cerrar la ventana de compartir sin elegir nada no es un error.
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('No se ha podido compartir. Prueba a copiar el texto.')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toastStore.getState().show('Texto copiado. Ya puedes pegarlo donde quieras.')
      onClose()
    } catch {
      area.current?.select()
      setError('Este navegador no deja copiar solo. El texto está seleccionado: cópialo con el menú o con Ctrl + C.')
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Compartir"
      error={error}
      footer={
        <>
          <Button icon={Copy} variant={canShare() ? 'secondary' : 'primary'} onClick={() => { void copy() }}>Copiar texto</Button>
          {canShare() && <Button icon={Share2} variant="primary" onClick={() => { void share() }}>Elegir a quién</Button>}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Notice tone="warning">
          Esto sale de Vita. {record.visibility === 'family' ? 'Revisa que no haya nada que no quieras enviar.' : 'En tu hogar solo lo ven algunas personas: revisa a quién se lo envías.'}
        </Notice>
        <TextArea ref={area} label="Lo que se va a enviar" required help="Puedes quitar o cambiar lo que quieras. No cambia lo guardado." rows={10} value={text} onChange={(e) => setText(e.target.value)} />
        {shareable && <Checkbox label={files.length === 1 ? 'Enviar también el archivo' : `Enviar también los ${files.length} archivos`} checked={withFiles} onChange={(e) => setWithFiles(e.target.checked)} />}
        {files.length > 0 && !shareable && <p className="text-apagado">Los archivos no se pueden enviar desde aquí: descárgalos desde la ficha y adjúntalos tú.</p>}
      </div>
    </Dialog>
  )
}
