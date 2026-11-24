import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Panel } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { useToday } from '@/hooks/useToday'
import { getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { canErase } from '@/services/permissions'
import { recordTitle, titleContext } from '@/services/titles'
import { toastStore } from '@/store'
import { TRASH_DAYS, type TrashEntry } from '@/types/trash'
import { todayIso } from '@/utils/dates'
import { formatNear } from '@/utils/format'

type Asking = { kind: 'one'; entry: TrashEntry; title: string } | { kind: 'all' }

/** Papelera: lo borrado se puede recuperar durante un mes, aunque se cierre Vita. */
export function TrashPanel() {
  const { actor, members, records } = useHome()
  const today = useToday()
  const entries = useLiveQuery(() => repositories.trash.list(actor.id), [actor.id, today])
  const [asking, setAsking] = useState<Asking>()
  const [error, setError] = useState<string>()
  if (!entries) return null

  const titleOf = ({ record, dependents }: TrashEntry) => recordTitle(record, titleContext(members, [...records, record, ...dependents]))
  const restore = (entry: TrashEntry) => {
    const { show } = toastStore.getState()
    repositories.trash.restore(actor.id, entry.id)
      .then(() => show(`Recuperado: ${titleOf(entry)}`))
      .catch((e: unknown) => show(describeError(e), 'error'))
  }
  const close = () => { setAsking(undefined); setError(undefined) }
  const erase = async () => {
    try {
      if (asking?.kind === 'one') await repositories.trash.discard(actor.id, asking.entry.id)
      else await repositories.trash.empty(actor.id)
      toastStore.getState().show('Borrado para siempre')
      close()
    } catch (e) {
      setError(describeError(e))
    }
  }
  const eraseLabel = asking?.kind === 'all' ? 'Vaciar la papelera' : 'Borrar para siempre'
  return (
    <div id="papelera" className="scroll-mt-4">
      <Panel title="Papelera">
        <p className="mb-3">Lo que borras se guarda aquí {TRASH_DAYS} días por si fue sin querer. Después desaparece del todo.</p>
        {entries.length === 0 ? <p className="text-apagado">La papelera está vacía.</p> : (
          <>
            <ul className="mb-4 border-t-2 border-beige">
              {entries.map((entry) => {
                const title = titleOf(entry)
                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-beige py-3">
                    <div className="min-w-0 flex-1 basis-36 [overflow-wrap:anywhere] max-[24rem]:basis-full">
                      <span className="block font-bold">{title}</span>
                      <span className="block text-apagado">{getRecordType(entry.record.typeId).name}. Borrado: {formatNear(todayIso(new Date(entry.deletedAt)), today).toLowerCase()}{entry.dependents.length > 0 && `. Vuelve con ${entry.dependents.length} más`}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="confirm" icon={Undo2} onClick={() => restore(entry)}>Recuperar<span className="sr-only"> {title}</span></Button>
                      {canErase(actor, entry) && <Button size="sm" icon={Trash2} onClick={() => setAsking({ kind: 'one', entry, title })}>Borrar para siempre<span className="sr-only"> {title}</span></Button>}
                    </div>
                  </li>
                )
              })}
            </ul>
            {entries.some((e) => canErase(actor, e)) && <Button variant="danger" icon={Trash2} onClick={() => setAsking({ kind: 'all' })}>Vaciar la papelera</Button>}
          </>
        )}
      </Panel>
      <ConfirmDialog open={asking !== undefined} title={asking?.kind === 'one' ? `Borrar «${asking.title}» para siempre` : 'Vaciar la papelera'} confirmLabel={eraseLabel} error={error} onClose={close} onConfirm={() => { void erase() }}>
        <p>{asking?.kind === 'one' ? 'Ya no se podrá recuperar.' : 'Lo que hay en la papelera ya no se podrá recuperar. Lo que incluye cosas de otras personas se queda hasta que pasen los 30 días.'}</p>
      </ConfirmDialog>
    </div>
  )
}
