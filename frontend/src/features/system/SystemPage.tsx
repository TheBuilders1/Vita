import { CalendarPlus, Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Checkbox, SelectInput, TextArea, TextInput } from '@/components/ui/Field'
import { Disclaimer, Notice } from '@/components/ui/Notice'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { Progress } from '@/components/ui/Progress'
import { PreferencesForm } from '@/features/settings/PreferencesForm'
import { toastStore } from '@/store'

/** Catálogo de componentes para revisar el diseño. No forma parte del producto. */
export function SystemPage() {
  const [dialog, setDialog] = useState<'none' | 'form' | 'confirm'>('none')
  const [error, setError] = useState<string>()
  const close = () => { setDialog('none'); setError(undefined) }
  const { show } = toastStore.getState()
  return (
    <main id="contenido" tabIndex={-1} className="mx-auto grid max-w-7xl grid-cols-1 gap-8 p-6">
      <PageHeader title="Sistema visual" description="Las piezas con las que se construye Vita. Todo lo que ves aquí responde de verdad." />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <Panel title="Lectura y movimiento"><PreferencesForm /></Panel>
        <Panel title="Botones">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" icon={CalendarPlus} onClick={() => setDialog('form')}>Añadir cita</Button>
            <Button variant="confirm" icon={Check} onClick={() => show('Tarea completada')}>Completar tarea</Button>
            <Button onClick={() => show('No se ha podido guardar la cita', 'error')}>Provocar un error</Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDialog('confirm')}>Eliminar cita</Button>
            <Button disabled>No disponible</Button>
            <Button variant="primary" size="lg" onClick={() => show('Botón grande pulsado')}>Botón grande</Button>
          </div>
        </Panel>
        <Panel title="Formulario">
          <div className="grid grid-cols-1 gap-5">
            <TextInput label="Motivo" required defaultValue="Revisión anual" />
            <TextInput label="Fecha" type="date" required error="La fecha no es válida" />
            <SelectInput label="Persona" help="A quién corresponde la cita." options={[{ value: 'a', label: 'Persona de ejemplo' }, { value: 'b', label: 'Otra persona de ejemplo' }]} />
            <TextArea label="Notas" rows={3} />
            <Checkbox label="Avisar el día anterior" help="Solo avisa mientras Vita está abierta." />
          </div>
        </Panel>
        <div className="grid grid-cols-1 gap-5">
          <Panel title="Avisos">
            <div className="grid grid-cols-1 gap-4">
              <Notice tone="success" title="Todo al día">No queda nada pendiente para hoy.</Notice>
              <Notice tone="warning" title="Caduca pronto">Un documento caduca dentro de 12 días.</Notice>
              <Notice tone="error" title="Falta un dato">Escribe la fecha para poder guardar.</Notice>
              <Disclaimer kind="health" />
              <Disclaimer kind="finance" />
            </div>
          </Panel>
          <Panel title="Progreso y vacío">
            <div className="grid grid-cols-1 gap-6">
              <Progress label="Vacaciones de verano" value={62000} max={150000} detail="620 € de 1.500 €" />
              <EmptyState title="Aún no hay citas" action={<Button variant="primary" onClick={() => setDialog('form')}>Añadir la primera cita</Button>}>
                Cuando añadas una, aparecerá aquí y en el calendario.
              </EmptyState>
            </div>
          </Panel>
        </div>
      </div>
      <Dialog open={dialog === 'form'} onClose={close} title="Añadir cita" footer={<Button variant="primary" onClick={() => { close(); show('Ejemplo: aquí no se guarda nada') }}>Guardar cita</Button>}>
        <TextInput label="Motivo" required />
      </Dialog>
      <ConfirmDialog open={dialog === 'confirm'} onClose={close} title="Eliminar esta cita" confirmLabel="Eliminar cita" error={error} onConfirm={() => setError('Ejemplo de fallo: no se ha podido eliminar la cita.')}>
        <p>Se borrará la cita y dejará de aparecer en el calendario. No se puede deshacer.</p>
      </ConfirmDialog>
    </main>
  )
}
