import { Camera, FileText, IdCard, Lightbulb, Paperclip } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { useRecordEditor } from '@/features/records/editor'
import { useCanCreate } from '@/features/records/RecordList'
import { useToday } from '@/hooks/useToday'
import { getRecordType } from '@/modules/registry'
import type { RecordData } from '@/modules/fields'
import { describeError } from '@/services/errors'
import { ACCEPTED_TYPES } from '@/types/records'
import { preparePhoto } from '@/utils/photo'

type Kind = 'light' | 'id' | 'other'

/** Subir un papel en dos pasos: qué es y el archivo. Después se abre su ficha ya rellena para revisarla. */
export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actor, family } = useHome()
  const today = useToday()
  const editor = useRecordEditor()
  const [kind, setKind] = useState<Kind>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const picker = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const canBill = useCanCreate(getRecordType('transaction')) && family.enabledModules.includes('finances')
  const canDocument = useCanCreate(getRecordType('document')) && family.enabledModules.includes('documents')
  const close = () => { setKind(undefined); setError(undefined); onClose() }

  const presets: Record<Kind, [string, RecordData]> = {
    light: ['transaction', { kind: 'expense', concept: 'Factura de la luz', category: 'home', date: today }],
    id: ['document', { kind: 'id', title: `DNI de ${actor.name}`, member: actor.id }],
    other: ['document', { kind: 'other', title: '' }],
  }
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !kind) return
    setBusy(true)
    setError(undefined)
    try {
      // shortcut: si se cancela la ficha, el archivo queda guardado sin usar; limpiar huérfanos cuando haya papelera de archivos.
      const { id } = await repositories.files.add(actor.id, await preparePhoto(file))
      const [typeId, preset] = presets[kind]
      close()
      editor.create(typeId, { ...preset, files: [id] })
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setBusy(false)
    }
  }
  const choices = [
    canBill && { id: 'light' as const, icon: Lightbulb, label: 'Factura de la luz', hint: 'Se apunta como gasto de vivienda con la factura adjunta.' },
    canDocument && { id: 'id' as const, icon: IdCard, label: 'DNI', hint: 'Se guarda en Documentación. Podrás apuntar cuándo caduca.' },
    canDocument && { id: 'other' as const, icon: FileText, label: 'Otro documento', hint: 'Contratos, seguros, recetas, papeles del colegio…' },
  ].filter(Boolean) as { id: Kind; icon: typeof FileText; label: string; hint: string }[]

  return (
    <Dialog open={open} title="Subir un documento" error={error} onClose={close}>
      {choices.length === 0 ? <Notice>Tu perfil no puede guardar documentos. Pídeselo a quien administra el hogar.</Notice> : !kind ? (
        <div className="grid grid-cols-1 gap-3">
          <p>¿Qué vas a subir?</p>
          {choices.map(({ id, icon: Icon, label, hint }) => (
            <button key={id} type="button" onClick={() => setKind(id)} className="pixel-edge flex min-h-16 items-center gap-4 bg-crema px-4 py-3 text-left hover:bg-yeso">
              <Icon aria-hidden="true" className="size-8 shrink-0 text-madera" />
              <span><strong className="block text-lg">{label}</strong>{hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <p>Haz una foto o elige el archivo (foto o PDF). Después podrás revisar los datos antes de guardar.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={Camera} disabled={busy} onClick={() => camera.current?.click()}>Hacer una foto</Button>
            <Button icon={Paperclip} disabled={busy} onClick={() => picker.current?.click()}>Elegir archivo</Button>
            <Button disabled={busy} onClick={() => setKind(undefined)}>Atrás</Button>
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void upload(e) }} />
          <input ref={picker} type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={(e) => { void upload(e) }} />
          <p role="status">{busy && 'Guardando el archivo…'}</p>
        </div>
      )}
    </Dialog>
  )
}
