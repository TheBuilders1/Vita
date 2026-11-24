import { useMemo, useState, type ReactNode } from 'react'
import { useHome } from '@/app/providers/home'
import { Tabs } from '@/components/ui/Tabs'
import { RecordList } from '@/features/records/RecordList'
import { getModule, getRecordType } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'
import type { FamilyRecord } from '@/types/records'

export function useRecords(typeId: string): FamilyRecord[] {
  const { records } = useHome()
  return useMemo(() => records.filter((r) => r.typeId === typeId), [records, typeId])
}

export function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Vista común: un selector por tipo de registro y su lista. */
export function ModuleRecords({ moduleId, types }: { moduleId: ModuleId; types?: readonly string[] }) {
  const options = (types ?? getModule(moduleId).recordTypes.map((t) => t.id)).map((id) => getRecordType(id))
  const [selected, setSelected] = useState(options[0]!.id)
  return (
    <div className="grid grid-cols-1 gap-4">
      {options.length > 1 && <Tabs label="Qué ver" value={selected} options={options.map((t) => ({ value: t.id, label: t.plural }))} onChange={setSelected} />}
      <RecordList key={selected} type={getRecordType(selected)} />
    </div>
  )
}

/** Vista con pestañas propias antes de las listas. */
export function TabbedView({ label, tabs }: { label: string; tabs: readonly { id: string; label: string; content: ReactNode }[] }) {
  const [selected, setSelected] = useState(tabs[0]!.id)
  return (
    <div className="grid grid-cols-1 gap-4">
      <Tabs label={label} value={selected} options={tabs.map((t) => ({ value: t.id, label: t.label }))} onChange={setSelected} />
      {tabs.find((t) => t.id === selected)?.content}
    </div>
  )
}
