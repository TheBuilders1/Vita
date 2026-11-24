import type { DemoContext } from '.'

export async function foodDemo({ add, day, marta, andres, leo, pilar }: DemoContext) {
  const lentils = await add(marta, 'recipe', {
    title: 'Lentejas estofadas', minutes: 50, servings: 4, tags: ['de cuchara', 'sin frutos de cáscara'],
    ingredients: [{ name: 'Lentejas', quantity: 320, unit: 'g' }, { name: 'Zanahoria', quantity: 2, unit: 'unidades' }, { name: 'Cebolla', quantity: 1, unit: 'unidad' }, { name: 'Patata', quantity: 2, unit: 'unidades' }],
    steps: 'Sofríe la cebolla y la zanahoria. Añade las lentejas y la patata, cubre con agua y cuece 40 minutos a fuego suave.',
  })
  const omelette = await add(andres, 'recipe', {
    title: 'Tortilla de patata', minutes: 35, servings: 4, allergens: ['egg'],
    ingredients: [{ name: 'Huevo', quantity: 6, unit: 'unidades' }, { name: 'Patata', quantity: 4, unit: 'unidades' }, { name: 'Cebolla', quantity: 1, unit: 'unidad' }],
    steps: 'Fríe la patata y la cebolla a fuego suave. Mézclalas con el huevo batido y cuaja por los dos lados.',
  })
  await add(marta, 'recipe', {
    title: 'Crema de calabacín', minutes: 25, servings: 4, allergens: ['milk'], tags: ['rápida', 'sin sal'],
    ingredients: [{ name: 'Calabacín', quantity: 3, unit: 'unidades' }, { name: 'Patata', quantity: 1, unit: 'unidad' }, { name: 'Queso fresco', quantity: 50, unit: 'g' }],
    steps: 'Cuece las verduras 15 minutos y tritura con el queso.',
  })
  await add(marta, 'recipe', {
    title: 'Bizcocho de nueces', minutes: 60, servings: 8, allergens: ['nuts', 'egg', 'gluten'],
    ingredients: [{ name: 'Harina', quantity: 250, unit: 'g' }, { name: 'Huevo', quantity: 4, unit: 'unidades' }, { name: 'Nueces', quantity: 100, unit: 'g' }],
    steps: 'Mezcla, vierte en un molde y hornea 40 minutos a 180 grados. Leo no puede comerlo.',
  })
  await add(marta, 'mealPlan', { date: day(0), meal: 'lunch', recipe: lentils })
  await add(marta, 'mealPlan', { date: day(0), meal: 'dinner', dish: 'Ensalada y pescado a la plancha' })
  await add(marta, 'mealPlan', { date: day(1), meal: 'dinner', recipe: omelette })
  await add(marta, 'dietNeed', { member: leo, title: 'Alergia a los frutos de cáscara', kind: 'allergy', allergen: 'nuts', avoid: ['nueces', 'almendras', 'avellanas'], severity: 'severe', notes: 'Diagnóstico de su alergóloga. Leer siempre las etiquetas.' })
  await add(marta, 'dietNeed', { member: pilar, title: 'Comida con poca sal', kind: 'restriction', severity: 'moderate', avoid: ['embutido', 'sal'] })
  await add(marta, 'foodItem', { name: 'Yogur natural', quantity: 6, unit: 'unidades', place: 'fridge', expiryDate: day(2) })
  await add(marta, 'foodItem', { name: 'Huevo', quantity: 10, unit: 'unidades', place: 'fridge', expiryDate: day(12) })
  await add(andres, 'foodItem', { name: 'Patata', quantity: 2, unit: 'kg', place: 'pantry' })
  await add(andres, 'foodItem', { name: 'Cebolla', quantity: 5, unit: 'unidades', place: 'pantry' })
  await add(marta, 'foodItem', { name: 'Lentejas', quantity: 1, unit: 'kg', place: 'pantry', expiryDate: day(300) })
  await add(marta, 'foodItem', { name: 'Merluza', quantity: 600, unit: 'g', place: 'freezer', expiryDate: day(60) })
}
