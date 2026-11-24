import { useId, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { RadioGroup } from '@/components/ui/Field'
import { useCompletion, type CompletionNotice } from '@/hooks/useCompletion'
import type { CompletionChoice } from '@/services/chat'
import { describeError } from '@/services/errors'
import { canComplete } from '@/services/permissions'
import { titleContext, recordTitle, fieldText } from '@/services/titles'
import { chatStore } from '@/store'
import type { Turn } from '@/store/chatStore'

export function CompletionCard({ choices, turn }: { choices: readonly CompletionChoice[]; turn: Turn }) {
  const { actor, family, members, records } = useHome()
  const { forRecord } = useCompletion()
  const name = useId()
  const [picked, setPicked] = useState(choices.length === 1 ? choices[0]?.recordId ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<CompletionNotice>()
  const status = turn.cards[0]?.state
  const context = titleContext(members, records)
  const available = choices.flatMap((choice, index) => {
    const record = records.find((r) => r.id === choice.recordId)
    if (!record || record.updatedAt !== choice.updatedAt || record.data.done
      || !family.enabledModules.includes(record.moduleId) || !canComplete(actor, record)) return []
    const title = recordTitle(record, context)
    const detail = ['dueDate', 'time', 'members', 'notes'].map((field) => fieldText(record, field, context)).filter(Boolean).join(' · ')
    return [{ record, title, value: record.id, label: choices.length > 1 ? `${index + 1}. ${title}` : title, hint: detail }]
  })
  const selected = available.find((option) => option.value === picked)
  const fail = (cause: unknown) => setError(describeError(cause))
  const confirm = async () => {
    if (!selected || busy || status) return
    setBusy(true)
    setError('')
    const run = forRecord(selected.record, selected.title, false, {
      success: (result) => {
        setNotice(result)
        chatStore.getState().mark(turn.id, 0, { state: 'saved', recordId: selected.value })
      },
      error: fail,
    })
    await run?.()
    setBusy(false)
  }
  const undo = async (result: CompletionNotice) => {
    setBusy(true)
    setError('')
    try {
      await result.undo()
      chatStore.getState().mark(turn.id, 0, { state: 'undone' })
    } catch (cause) {
      fail(cause)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 break-words">
      {status === 'saved' && <div role="status">{notice?.message ?? 'Tarea marcada como hecha.'}</div>}
      {status === 'undone' && <div role="status">Tarea pendiente otra vez.</div>}
      {status === 'saved' && notice && <div><Button size="sm" disabled={busy} onClick={() => { void undo(notice) }}>Deshacer</Button></div>}
      {!status && (available.length === 0 ? <p>La tarea ya cambió o tu perfil ya no puede marcarla. Vuelve a pedírmelo.</p> : (
        <>
          {choices.length > 1
            ? <RadioGroup legend="Tarea que has hecho" name={name} options={available} value={picked} onChange={setPicked} />
            : <p><strong>{selected?.title}</strong>{selected?.hint && <span className="block">{selected.hint}</span>}</p>}
          <div><Button variant="confirm" size="sm" disabled={busy || !selected} onClick={() => { void confirm() }}>Marcar como hecha</Button></div>
        </>
      ))}
      <p role="alert" className="font-bold text-peligro empty:hidden">{error}</p>
    </div>
  )
}
