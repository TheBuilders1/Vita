import { ListTodo, Plus, Search, Siren, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { AddDialog } from '@/features/planner/AddDialog'
import { UploadDialog } from './UploadDialog'

/** Siempre a mano, se mire la lista de plantas o el resumen. */
export function QuickActions() {
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  return (
    <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(min(9.5rem,100%),1fr))] gap-1">
      <ButtonLink to="/planta/health/emergency" variant="danger" icon={Siren}>Emergencias</ButtonLink>
      <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Apuntar</Button>
      <Button icon={Upload} onClick={() => setUploading(true)}>Subir documento</Button>
      <ButtonLink to="/tareas" icon={ListTodo}>Tareas</ButtonLink>
      <ButtonLink to="/buscar" icon={Search}>Buscar</ButtonLink>
      <AddDialog open={adding} onClose={() => setAdding(false)} />
      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  )
}
