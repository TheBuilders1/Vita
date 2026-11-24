import { Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { PrintSheet } from '@/components/print/PrintSheet'
import { Button } from '@/components/ui/Button'
import { useRecordEditor } from '@/features/records/editor'
import { settingsStore } from '@/store'
import { telLink } from '@/utils/links'
import { Block, ModuleRecords, useRecords } from './shared'

const CARD_FIELDS = [['bloodType', 'Grupo sanguíneo'], ['allergies', 'Alergias'], ['conditions', 'Información médica'], ['medication', 'Medicación'], ['instructions', 'Qué debe saber quien atienda']] as const

export function EmergencyView() {
  const { members } = useHome()
  const editor = useRecordEditor()
  const number = useStore(settingsStore, (s) => s.settings.emergencyNumber)
  const contacts = useRecords('emergencyContact').toSorted((a, b) => Number(a.data.priority ?? 99) - Number(b.data.priority ?? 99))
  const cards = useRecords('emergencyCard')
  const [printing, setPrinting] = useState(false)
  return (
    <div className="grid grid-cols-1 gap-6">
      <a href={telLink(number)} className="pixel-edge flex min-h-20 items-center gap-4 bg-peligro px-5 py-3 text-2xl font-bold text-crema [--edge:var(--color-peligro-hondo)]">
        <Phone aria-hidden="true" className="size-9 shrink-0" />Llamar al {number}
      </a>
      <ol className="list-decimal pl-6">
        <li>Comprueba que el lugar es seguro para ti.</li>
        <li>Llama y di qué ocurre, dónde y a cuántas personas.</li>
        <li>No cuelgues: sigue lo que te indiquen.</li>
      </ol>
      {contacts.length > 0 && (
        <Block title="Avisar a">
          <div className="grid grid-cols-1 gap-2">
            {contacts.map((c) => (
              <a key={c.id} href={telLink(String(c.data.phone))} className="pixel-edge flex min-h-16 items-center gap-4 bg-crema px-4 py-2 font-bold">
                <Phone aria-hidden="true" className="size-6 shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{String(c.data.name)}<span className="block font-normal">{[c.data.relation, c.data.phone].filter(Boolean).join(', ')}</span></span>
              </a>
            ))}
          </div>
        </Block>
      )}
      {cards.length > 0 && (
        <Block title="Fichas">
          <div className="grid grid-cols-1 gap-3">
            {cards.map((card) => (
              <article key={card.id} className="border-2 border-peligro p-4">
                <button type="button" onClick={() => editor.open(card.id)} className="min-h-11 text-xl font-bold underline underline-offset-4">{members.find((m) => m.id === card.data.member)?.name ?? 'Antiguo integrante'}</button>
                <dl className="mt-1 grid grid-cols-1 gap-2">
                  {CARD_FIELDS.filter(([key]) => card.data[key]).map(([key, label]) => <div key={key}><dt className="font-bold">{label}</dt><dd className="whitespace-pre-line">{String(card.data[key])}</dd></div>)}
                </dl>
              </article>
            ))}
          </div>
        </Block>
      )}
      {(cards.length > 0 || contacts.length > 0) && (
        <div>
          <Button icon={Printer} onClick={() => setPrinting(true)}>Imprimir para la nevera</Button>
          <p className="mt-2 text-apagado">Teléfonos y fichas en papel. Contiene datos de salud: piensa dónde lo dejas.</p>
          {printing && (
            <PrintSheet onDone={() => setPrinting(false)}>
              <h1>En una emergencia: {number}</h1>
              {contacts.length > 0 && <section><h2>Avisar a</h2><ul>{contacts.map((c) => <li key={c.id}><strong>{String(c.data.name)}</strong>: {String(c.data.phone)}{c.data.relation ? ` (${String(c.data.relation)})` : ''}</li>)}</ul></section>}
              {cards.map((card) => (
                <section key={card.id}>
                  <h2>{members.find((m) => m.id === card.data.member)?.name ?? 'Antiguo integrante'}</h2>
                  <dl>{CARD_FIELDS.filter(([key]) => card.data[key]).map(([key, label]) => <div key={key}><dt><strong>{label}</strong></dt><dd style={{ whiteSpace: 'pre-line' }}>{String(card.data[key])}</dd></div>)}</dl>
                </section>
              ))}
            </PrintSheet>
          )}
        </div>
      )}
      <Block title="Preparar esta pantalla"><ModuleRecords moduleId="emergency" /></Block>
    </div>
  )
}
