import { Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { DocHead } from '@/components/print/DocHead'
import { PrintSheet } from '@/components/print/PrintSheet'
import { Button } from '@/components/ui/Button'
import { RadioGroup } from '@/components/ui/Field'
import { useRecordEditor } from '@/features/records/editor'
import { settingsStore } from '@/store'
import { todayIso } from '@/utils/dates'
import { telLink } from '@/utils/links'
import { Block, ModuleRecords, useRecords } from './shared'

const CARD_FIELDS = [['bloodType', 'Grupo sanguíneo'], ['allergies', 'Alergias'], ['conditions', 'Información médica'], ['medication', 'Medicación'], ['instructions', 'Qué debe saber quien atienda']] as const

/** Orden y tono de la ficha impresa: las alergias en rojo, lo que debe saber quien atienda en azul. */
const PRINT_FIELDS = [['allergies', 'Alergias', 'danger'], ['conditions', 'Condiciones médicas', ''], ['medication', 'Medicación habitual', ''], ['instructions', 'Indicaciones de atención', 'info']] as const

type Paper = 'A4' | 'A5' | 'A6'
const PAPERS = [
  { value: 'A4', label: 'A4', hint: 'Folio normal, para la nevera.' },
  { value: 'A5', label: 'A5', hint: 'Medio folio.' },
  { value: 'A6', label: 'A6', hint: 'Tamaño postal, para la cartera o el bolso.' },
] as const

function EmergencyFooter({ paper }: { paper: Paper }) {
  const [year, month, day] = todayIso().split('-')
  return (
    <div className={`doc doc-${paper}`}><footer className="doc-foot">
      <strong>Generado el {day}/{month}/{year} · Información familiar confidencial</strong>
      <span>Información facilitada por la familia. No sustituye a un historial clínico.</span>
      <span>Verificar los datos antes de cualquier intervención sanitaria.</span>
    </footer></div>
  )
}

export function EmergencyView() {
  const { members } = useHome()
  const editor = useRecordEditor()
  const number = useStore(settingsStore, (s) => s.settings.emergencyNumber)
  const extraNumbers = useStore(settingsStore, (s) => s.settings.emergencyContacts)
  const contacts = useRecords('emergencyContact').toSorted((a, b) => Number(a.data.priority ?? 99) - Number(b.data.priority ?? 99))
  const cards = useRecords('emergencyCard')
  const [printing, setPrinting] = useState(false)
  const [paper, setPaper] = useState<Paper>('A4')
  return (
    <div className="grid grid-cols-1 gap-6">
      <a href={telLink(number)} className="pixel-edge flex min-h-20 items-center gap-4 bg-peligro px-5 py-3 text-2xl font-bold text-crema [--edge:var(--color-peligro-hondo)]">
        <Phone aria-hidden="true" className="size-9 shrink-0" />Llamar al {number}
      </a>
      {extraNumbers.map(({ name, number: phone }, index) => (
        <a key={index} href={telLink(phone)} className="pixel-edge flex min-h-16 items-center gap-4 bg-crema px-4 py-2 font-bold">
          <Phone aria-hidden="true" className="size-6 shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{name}<span className="block font-normal">{phone}</span></span>
        </a>
      ))}
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
          <RadioGroup legend="Tamaño del papel" name="paper" value={paper} options={PAPERS} onChange={(value) => setPaper(value as Paper)} />
          <Button className="mt-3" icon={Printer} onClick={() => setPrinting(true)}>Imprimir ficha de emergencia</Button>
          <p className="mt-2 text-apagado">Teléfonos y fichas en papel. Contiene datos de salud: piensa dónde lo dejas.</p>
          {printing && (
            <PrintSheet onDone={() => setPrinting(false)} footer={<EmergencyFooter paper={paper} />}>
              <div className={`doc doc-${paper}`}>
              <DocHead title="Ficha de emergencia" subtitle="Información sanitaria familiar" />
              <section className="doc-hero doc-hero-alert">
                <div><p className="doc-label">En caso de emergencia</p>
                <div className="doc-call">
                  <span className="doc-big">{number}</span>
                  <div><strong>Servicio de emergencias</strong><span>Llama si existe una emergencia.</span></div>
                </div>
                {extraNumbers.length > 0 && <ul className="doc-extra">{extraNumbers.map(({ name, number: phone }, index) => <li key={index}><strong>{phone}</strong> {name}</li>)}</ul>}
              </div></section>
              {contacts.length > 0 && (
                <section className="doc-section">
                  <h2><span>01</span> Contactos de emergencia</h2>
                  <div className="doc-grid">
                    {contacts.map((c) => <div key={c.id} className="doc-box"><strong>{String(c.data.name)}</strong>{Boolean(c.data.relation) && <span>{String(c.data.relation)}</span>}<b>{String(c.data.phone)}</b></div>)}
                  </div>
                </section>
              )}
              {cards.length > 0 && (
                <section className="doc-section">
                  <h2><span>{contacts.length > 0 ? '02' : '01'}</span> Información sanitaria familiar</h2>
                  {cards.map((card) => (
                    <article key={card.id} className="doc-card">
                      <div className="doc-card-head">
                        <h3>{members.find((m) => m.id === card.data.member)?.name ?? 'Antiguo integrante'}</h3>
                        {Boolean(card.data.bloodType) && <div><span className="doc-label">Grupo sanguíneo</span><b>{String(card.data.bloodType)}</b></div>}
                      </div>
                      <div className="doc-card-body">
                        {PRINT_FIELDS.filter(([key]) => card.data[key]).map(([key, label, tone]) => (
                          <div key={key} className={tone ? `doc-note doc-${tone}` : undefined}><span className="doc-label">{label}</span><p>{String(card.data[key])}</p></div>
                        ))}
                        {Boolean(card.data.doctor || card.data.doctorPhone) && <div><span className="doc-label">Médico de referencia</span><p>{[card.data.doctor, card.data.doctorPhone].filter(Boolean).map(String).join(' · ')}</p></div>}
                      </div>
                    </article>
                  ))}
                </section>
              )}
              </div>
            </PrintSheet>
          )}
        </div>
      )}
      <Block title="Preparar esta pantalla"><ModuleRecords moduleId="emergency" /></Block>
    </div>
  )
}
