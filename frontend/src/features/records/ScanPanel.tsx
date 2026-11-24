import { ScanText, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { useFile } from '@/hooks/useFile'
import { describeError } from '@/services/errors'
import { readExpiry, type ScanOutcome } from '@/services/scan'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { formatDate } from '@/utils/format'
import { preparePhoto } from '@/utils/photo'

type Step = 'idle' | 'asking' | 'reading' | 'result'
const RESULT: Record<ScanOutcome['status'], string> = {
  found: 'Esta es la fecha que se ha leído. Compruébala con el documento antes de guardarla.',
  missing: 'No se ve ninguna fecha de caducidad en la foto. Puedes escribirla tú.',
  ambiguous: 'Hay varias fechas y no está claro cuál es la de caducidad. Escríbela tú.',
  failed: 'No se ha podido leer la foto. Puedes escribir la fecha tú.',
}

/** Propone la caducidad a partir de una foto del documento. Avisa antes de enviarla y no guarda sin confirmar. */
export function ScanPanel({ record, fileId, household }: { record: FamilyRecord; fileId: string; household: string }) {
  const { actor, members } = useHome()
  const { file } = useFile(fileId)
  const [step, setStep] = useState<Step>('idle')
  const [outcome, setOutcome] = useState<ScanOutcome['status']>()
  const [date, setDate] = useState('')
  const [read, setRead] = useState<string>()
  const [error, setError] = useState<string>()
  const [dateError, setDateError] = useState<string>()
  const stop = useRef<AbortController>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => () => stop.current?.abort(), [])
  // Cada paso cambia los botones: el foco va al panel para que no se pierda y se lea lo nuevo.
  useEffect(() => { if (step !== 'idle') panel.current?.focus() }, [step])
  if (!file || (file.mime !== 'image/jpeg' && file.mime !== 'image/png')) return null

  const person = members.find((m) => m.id === record.data.member)?.name
  const scan = async () => {
    const controller = new AbortController()
    stop.current = controller
    setError(undefined)
    setStep('reading')
    try {
      // También limpia fotos guardadas antes de que se quitara la ubicación.
      const photo = await preparePhoto(new File([file.blob], file.name, { type: file.mime }))
      const result = await readExpiry({ file: photo, household, signal: controller.signal })
      setOutcome(result.status)
      setRead(result.status === 'found' ? result.date : undefined)
      setDate(result.status === 'found' ? result.date : '')
      setStep('result')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(describeError(cause))
      setStep('asking')
    }
  }
  const cancel = () => { stop.current?.abort(); setStep('idle'); setError(undefined) }
  const save = async () => {
    if (!date) { setDateError('Escribe la fecha de caducidad'); return }
    setDateError(undefined)
    try {
      await repositories.records.update(actor.id, record.id, { data: { ...record.data, expiryDate: date, scannedDate: date === read ? date : undefined, scannedFile: date === read ? fileId : undefined } })
      toastStore.getState().show(`Caducidad guardada: ${formatDate(date)}`)
      setStep('idle')
    } catch (cause) {
      setDateError(describeError(cause))
    }
  }

  if (step === 'idle') return <Button icon={ScanText} onClick={() => setStep('asking')}>Leer la caducidad<span className="sr-only"> de {file.name}</span></Button>
  return (
    <div ref={panel} tabIndex={-1} role="group" aria-labelledby={titleId} className="border-2 border-marino bg-crema p-4 outline-none">
      <h3 id={titleId} className="text-lg font-bold">Leer la caducidad de «{file.name}»</h3>
      {person && <p>Documento de {person}.</p>}
      {step === 'asking' && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <p>La foto <strong>saldrá de este navegador</strong> hacia el servidor de tu hogar, sin ubicación ni nombre de archivo. Un programa busca en ella la fecha de caducidad.</p>
          <p>La copia se queda guardada en ese servidor y, por ahora, no se puede borrar desde Vita.</p>
          <div role="alert" className="empty:hidden">{error && <Notice tone="error">{error}</Notice>}</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={ScanText} onClick={() => { void scan() }}>{error ? 'Volver a intentarlo' : 'Enviar y leer'}</Button>
            <Button icon={X} onClick={cancel}>No enviar</Button>
          </div>
        </div>
      )}
      {step === 'reading' && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <output>Leyendo la foto… Puede tardar un par de minutos.</output>
          <div><Button icon={X} onClick={cancel}>Cancelar</Button></div>
        </div>
      )}
      {step === 'result' && outcome && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <p>{RESULT[outcome]}</p>
          <TextInput label="Fecha de caducidad" required type="date" value={date} error={dateError} onChange={(e) => setDate(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="confirm" onClick={() => { void save() }}>Guardar caducidad</Button>
            <Button icon={X} onClick={cancel}>No guardar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
