import { describe, expect, test } from 'vitest'
import { matchRecipe, missingForShopping, rankRecipes, sameFood } from '@/services/recipes'
import { buildRecord } from '../support/builders'

const recipe = (id: string, names: string[], allergens: string[] = []) => buildRecord({ id, typeId: 'recipe', moduleId: 'cooking', data: { title: id, minutes: 10, ingredients: names.map((name) => ({ name })), allergens, tags: [] } })
const need = (data: Record<string, unknown>) => buildRecord({ id: 'n', typeId: 'dietNeed', moduleId: 'diet', data: { member: 'leo', title: 'Alergia', kind: 'allergy', avoid: [], ...data } })

describe('reconocer el mismo alimento', () => {
  test.each([['Patata', 'patatas'], ['Calabacín', 'calabacines'], ['Nueces', 'nuez'], ['Huevo', 'HUEVOS'], ['Queso', 'Queso fresco'], ['tomate', 'Tomates maduros']])('%s y %s', (a, b) => expect(sameFood(a, b)).toBe(true))
  test.each([['Sal', 'Salsa'], ['Pan', 'Pana'], ['Leche', 'Lechuga'], ['Cebolla', 'Cebollino']])('%s no es %s', (a, b) => expect(sameFood(a, b)).toBe(false))
})

test('separa lo que hay de lo que falta', () => {
  expect(matchRecipe(recipe('r', ['Patatas', 'Huevo', 'Sal']), ['patata', 'huevos'], [])).toMatchObject({ have: ['Patatas', 'Huevo'], missing: ['Sal'] })
})

describe('restricciones', () => {
  test('avisa por alérgeno declarado', () => {
    expect(matchRecipe(recipe('r', ['Harina'], ['nuts']), [], [need({ allergen: 'nuts' })]).conflicts).toEqual([{ memberId: 'leo', reason: 'Alergia', severe: true }])
  })
  test('avisa por ingrediente que evitar aunque la receta no declare alérgenos', () => {
    expect(matchRecipe(recipe('r', ['Nueces peladas']), [], [need({ avoid: ['nuez'] })]).conflicts).toHaveLength(1)
  })
  test('una preferencia no es grave', () => {
    expect(matchRecipe(recipe('r', ['Coliflor']), [], [need({ kind: 'preference', title: 'No le gusta', avoid: ['coliflor'] })]).conflicts[0]!.severe).toBe(false)
  })
  test('sin coincidencias no hay aviso', () => {
    expect(matchRecipe(recipe('r', ['Arroz'], ['egg']), [], [need({ allergen: 'nuts', avoid: ['nueces'] })]).conflicts).toEqual([])
  })
})

test('primero lo que no tiene avisos graves y pide menos compra', () => {
  const recipes = [recipe('grave', ['Pan'], ['nuts']), recipe('falta', ['Pan', 'Vino', 'Ajo']), recipe('lista', ['Pan'])]
  expect(rankRecipes(recipes, ['pan'], [need({ allergen: 'nuts' })]).map((m) => m.recipe.id)).toEqual(['lista', 'falta', 'grave'])
})

test('lo que falta para el menú no repite ni lo que hay ni lo ya apuntado', () => {
  expect(missingForShopping([recipe('a', ['Pan', 'Ajo']), recipe('b', ['Ajos', 'Leche', 'Vino'])], ['leche'], ['vino'])).toEqual(['Pan', 'Ajo'])
})
