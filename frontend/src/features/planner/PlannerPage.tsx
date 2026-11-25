import { PageHeader } from '@/components/layout/PageHeader'
import { BackLink } from '@/components/navigation/BackLink'
import { Panel } from '@/components/ui/Panel'
import { ModuleRecords } from '@/features/modules/shared'
import { useTitle } from '@/hooks/useTitle'

export function PlannerPage() {
  useTitle('Tareas y eventos')
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5">
      <PageHeader back={<BackLink to="/edificio">Volver al edificio</BackLink>} title="Tareas y eventos" description="Lo de todo el hogar que no es de ninguna habitación." />
      <Panel><ModuleRecords moduleId="planner" /></Panel>
    </div>
  )
}
