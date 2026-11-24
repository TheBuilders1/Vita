import type { Ingredient } from '@/modules/fields'
import type { FamilyRecord } from '@/types/records'

const FILLER = new Set(['de', 'del', 'con', 'sin', 'y', 'la', 'el'])

/** Raíz común a singular y plural: «nueces» y «nuez», «tomates» y «tomate». */
function stem(word: string): string {
  return word.replace(/ces$/, 'z').replace(/s$/, '').replace(/e$/, '')
}
function tokens(name: string): Set<string> {
  const words = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().split(/[^a-zñ]+/)
  return new Set(words.filter((w) => w && !FILLER.has(w)).map(stem))
}
const contains = (whole: Set<string>, part: Set<string>) => part.size > 0 && [...part].every((t) => whole.has(t))

export function sameFood(a: string, b: string): boolean {
  const [x, y] = [tokens(a), tokens(b)]
  return contains(x, y) || contains(y, x)
}

export interface Conflict { readonly memberId: string; readonly reason: string; readonly severe: boolean }
export interface RecipeMatch { readonly recipe: FamilyRecord; readonly have: string[]; readonly missing: string[]; readonly conflicts: Conflict[] }

const ingredientNames = (recipe: FamilyRecord) => (recipe.data.ingredients as Ingredient[]).map((i) => i.name)

/**
 * Compara con lo registrado por la familia. No garantiza que un plato sea seguro:
 * los envases pueden llevar trazas y la receta puede estar incompleta.
 */
export function matchRecipe(recipe: FamilyRecord, available: readonly string[], needs: readonly FamilyRecord[]): RecipeMatch {
  const names = ingredientNames(recipe)
  const allergens = (recipe.data.allergens ?? []) as string[]
  const have = names.filter((name) => available.some((a) => sameFood(name, a)))
  const conflicts = needs.flatMap(({ data }): Conflict[] => {
    const avoid = (data.avoid ?? []) as string[]
    const hit = allergens.includes(String(data.allergen)) || avoid.some((a) => names.some((name) => contains(tokens(name), tokens(a))))
    if (!hit) return []
    const severe = data.kind === 'allergy' || data.kind === 'intolerance' || data.severity === 'severe'
    return [{ memberId: String(data.member), reason: String(data.title), severe }]
  })
  return { recipe, have, missing: names.filter((name) => !have.includes(name)), conflicts }
}

export const hasSevere = (match: RecipeMatch) => match.conflicts.some((c) => c.severe)

export function rankRecipes(recipes: readonly FamilyRecord[], available: readonly string[], needs: readonly FamilyRecord[]): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, available, needs))
    .toSorted((a, b) => Number(hasSevere(a)) - Number(hasSevere(b)) || a.missing.length - b.missing.length || String(a.recipe.data.title).localeCompare(String(b.recipe.data.title), 'es'))
}

export function missingForShopping(recipes: readonly FamilyRecord[], available: readonly string[], alreadyListed: readonly string[]): string[] {
  const missing: string[] = []
  for (const name of recipes.flatMap(ingredientNames)) {
    if (![...available, ...alreadyListed, ...missing].some((known) => sameFood(known, name))) missing.push(name)
  }
  return missing
}
