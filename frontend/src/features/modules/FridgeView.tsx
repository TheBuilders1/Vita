import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { ChoicesInput } from '@/components/form/ListInputs'
import { EmptyState } from '@/components/ui/Panel'
import { RecordList } from '@/features/records/RecordList'
import { useToday } from '@/hooks/useToday'
import { getRecordType } from '@/modules/registry'
import { rankRecipes } from '@/services/recipes'
import { RecipeCard } from './RecipeCard'
import { Block, TabbedView, useRecords } from './shared'

export function FridgeView() {
  return (
    <TabbedView label="Nevera" tabs={[
      { id: 'items', label: 'Qué hay en casa', content: <RecordList type={getRecordType('foodItem')} /> },
      { id: 'cook', label: 'Qué podemos cocinar', content: <WhatToCook /> },
    ]} />
  )
}

function WhatToCook() {
  const { family } = useHome()
  const today = useToday()
  const food = useRecords('foodItem')
  const recipes = useRecords('recipe')
  const needs = useRecords('dietNeed')
  // Lo caducado no se propone; lo que caduca antes va primero.
  const options = useMemo(() => food
    .filter((f) => f.data.expiryDate === undefined || String(f.data.expiryDate) >= today)
    .toSorted((a, b) => String(a.data.expiryDate ?? '9').localeCompare(String(b.data.expiryDate ?? '9')))
    .map((f) => ({ value: f.id, label: String(f.data.name) })), [food, today])
  const [excluded, setExcluded] = useState<string[]>([])
  const chosen = options.filter((o) => !excluded.includes(o.value))
  const matches = useMemo(() => rankRecipes(recipes, chosen.map((o) => o.label), needs), [recipes, chosen, needs])

  if (!family.enabledModules.includes('cooking') || recipes.length === 0) return <EmptyState title="Aún no hay recetas">Añade alguna en Cocinar y aquí verás cuáles podéis preparar.</EmptyState>
  return (
    <div className="grid grid-cols-1 gap-6">
      <ChoicesInput label="Con estos alimentos" required value={chosen.map((o) => o.value)} options={options} onChange={(ids) => setExcluded(options.filter((o) => !ids.includes(o.value)).map((o) => o.value))} />
      <Block title="Recetas, de más a menos fácil">
        <ul className="grid grid-cols-1 gap-3">{matches.map((m) => <RecipeCard key={m.recipe.id} match={m} />)}</ul>
        <p className="mt-3 text-apagado">Se compara con lo que habéis registrado. Lee siempre las etiquetas: puede haber trazas.</p>
      </Block>
    </div>
  )
}
