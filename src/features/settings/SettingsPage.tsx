import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import { repositories } from '@/database'
import { WipeDialog } from '@/features/dashboard/WipeDialog'
import { useTitle } from '@/hooks/useTitle'
import type { ModuleId } from '@/modules/types'
import { describeError } from '@/services/errors'
import { canManage } from '@/services/permissions'
import { settingsStore, toastStore } from '@/store'
import { BackupPanel } from './BackupPanel'
import { ModulePicker } from './ModulePicker'
import { PreferencesForm } from './PreferencesForm'
import { StoragePanel } from './StoragePanel'

function restoreTips() {
  const { show } = toastStore.getState()
  repositories.tips.restore().then(() => show('Consejos recuperados')).catch((e: unknown) => show(describeError(e), 'error'))
}

export function SettingsPage() {
  const { actor, family } = useHome()
  useTitle('Ajustes')
  // Estado propio: marcar dos casillas seguidas no puede esperar a la base de datos ni perder la primera.
  const [modules, setModules] = useState(family.enabledModules)
  const changeModules = (enabledModules: ModuleId[]) => {
    setModules(enabledModules)
    repositories.family.update(actor.id, { enabledModules }).catch((e: unknown) => {
      setModules(family.enabledModules)
      toastStore.getState().show(describeError(e), 'error')
    })
  }
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6">
      <PageHeader title="Ajustes" description="Los cambios se guardan al momento en este dispositivo." />
      <Panel title="Lectura y movimiento"><PreferencesForm /></Panel>
      <Panel title="Número de emergencias"><EmergencyNumber /></Panel>
      {canManage(actor, 'modules') && (
        <div id="habitaciones" className="scroll-mt-4">
          <Panel title="Habitaciones abiertas">
            <p className="mb-5">Cerrar una habitación la oculta, pero no borra lo que hay dentro.</p>
            <ModulePicker enabled={modules} onChange={changeModules} />
          </Panel>
        </div>
      )}
      {canManage(actor, 'data') && <BackupPanel />}
      <StoragePanel />
      <Panel title="Consejos">
        <p className="mb-3">Vuelve a enseñar los consejos que habías descartado.</p>
        <Button onClick={restoreTips}>Recuperar consejos</Button>
      </Panel>
      <Panel title="Vuestro plan">
        <p>Vita es gratuita mientras está en pruebas. <Link to="/planes" className="font-bold underline underline-offset-4">Ver los planes previstos</Link></p>
      </Panel>
      {canManage(actor, 'data') && <DeleteEverything />}
    </div>
  )
}

function EmergencyNumber() {
  const [value, setValue] = useState(() => settingsStore.getState().settings.emergencyNumber)
  const [error, setError] = useState<string>()
  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await settingsStore.getState().update({ emergencyNumber: value.trim() })
      setError(undefined)
      toastStore.getState().show('Número guardado')
    } catch (cause) {
      setError(describeError(cause))
    }
  }
  return (
    <form noValidate onSubmit={(e) => { void save(e) }} className="grid grid-cols-1 gap-4">
      <TextInput label="Teléfono" type="tel" required value={value} error={error} help="En la Unión Europea es el 112." onChange={(e) => setValue(e.target.value)} className="max-w-60" />
      <div><Button type="submit" variant="primary">Guardar número</Button></div>
    </form>
  )
}

function DeleteEverything() {
  const [open, setOpen] = useState(false)
  return (
    <Panel title="Borrar todo">
      <Notice tone="warning">Elimina la familia, sus registros y sus archivos de este navegador. No hay copia en ningún otro sitio.</Notice>
      <div className="mt-4"><Button variant="danger" onClick={() => setOpen(true)}>Borrar todos los datos</Button></div>
      <WipeDialog open={open} title="Borrar todos los datos" confirmLabel="Borrar todos los datos" onClose={() => setOpen(false)} destination="/bienvenida">
        Se eliminarán la familia, todos sus registros y todos sus archivos. No se puede deshacer.
      </WipeDialog>
    </Panel>
  )
}
