import { defineModule, defineRecordType, options } from './define'

/** Los catorce alérgenos de declaración obligatoria en la UE. */
export const ALLERGENS = options({
  gluten: 'Gluten', crustaceans: 'Crustáceos', egg: 'Huevo', fish: 'Pescado', peanut: 'Cacahuete', soy: 'Soja',
  milk: 'Lácteos', nuts: 'Frutos de cáscara', celery: 'Apio', mustard: 'Mostaza', sesame: 'Sésamo',
  sulphites: 'Sulfitos', lupin: 'Altramuces', molluscs: 'Moluscos',
})

const cooking = defineModule({
  id: 'cooking', floor: 'food', name: 'Cocinar',
  description: 'Recetas de casa y menú de la semana.',
  recordTypes: [
    defineRecordType({
      id: 'recipe', name: 'Receta', plural: 'Recetas', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Nombre del plato', required: true },
        minutes: { kind: 'integer', label: 'Tiempo de preparación', unit: 'min', min: 1, max: 1440, required: true },
        servings: { kind: 'integer', label: 'Raciones', min: 1, max: 50 },
        ingredients: { kind: 'ingredients', label: 'Ingredientes', required: true },
        steps: { kind: 'textarea', label: 'Preparación' },
        allergens: { kind: 'choices', label: 'Alérgenos que contiene', options: ALLERGENS, help: 'Se usa para avisar a quien tenga alergias o intolerancias.' },
        tags: { kind: 'tags', label: 'Etiquetas', help: 'Por ejemplo: rápida, vegetariana, sin sal.' },
      },
    }),
    defineRecordType({
      id: 'mealPlan', name: 'Comida del menú', plural: 'Menú semanal', titleField: 'meal',
      fields: {
        date: { kind: 'date', label: 'Día', required: true },
        meal: { kind: 'select', label: 'Comida', required: true, options: options({ breakfast: 'Desayuno', lunch: 'Comida', snack: 'Merienda', dinner: 'Cena' }) },
        recipe: { kind: 'record', label: 'Receta', refType: 'recipe' },
        dish: { kind: 'text', label: 'O escribe el plato' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [{ field: 'dish', message: 'Elige una receta o escribe el plato', valid: (d) => Boolean(d.recipe ?? d.dish) }],
      agenda: [{ dateField: 'date', category: 'meal' }],
    }),
  ],
})

const diet = defineModule({
  id: 'diet', floor: 'food', name: 'Alimentación personalizada', disclaimer: 'health',
  description: 'Alergias, intolerancias y preferencias de cada persona.',
  recordTypes: [
    defineRecordType({
      id: 'dietNeed', name: 'Alergia o dieta', plural: 'Alergias y dietas', titleField: 'title',
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        title: { kind: 'text', label: 'Qué debemos tener en cuenta', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ allergy: 'Alergia', intolerance: 'Intolerancia', restriction: 'Restricción', preference: 'Preferencia', need: 'Necesidad específica' }) },
        allergen: { kind: 'select', label: 'Alérgeno relacionado', options: ALLERGENS },
        avoid: { kind: 'tags', label: 'Ingredientes que evitar' },
        severity: { kind: 'select', label: 'Importancia', options: options({ mild: 'Leve', moderate: 'Moderada', severe: 'Grave' }) },
        notes: { kind: 'textarea', label: 'Notas' },
      },
    }),
  ],
})

const fridge = defineModule({
  id: 'fridge', floor: 'food', name: 'Nevera inteligente',
  description: 'Qué hay en casa, cuánto queda y cuándo caduca.',
  recordTypes: [
    defineRecordType({
      id: 'foodItem', name: 'Alimento', plural: 'Alimentos', titleField: 'name',
      fields: {
        name: { kind: 'text', label: 'Alimento', required: true },
        quantity: { kind: 'number', label: 'Cantidad', min: 0 },
        unit: { kind: 'text', label: 'Unidad', maxLength: 30, help: 'Por ejemplo: g, l, unidades.' },
        place: { kind: 'select', label: 'Dónde está', required: true, options: options({ fridge: 'Nevera', freezer: 'Congelador', pantry: 'Despensa' }) },
        expiryDate: { kind: 'date', label: 'Fecha de caducidad' },
      },
      agenda: [{ dateField: 'expiryDate', category: 'deadline', label: 'Caduca' }],
    }),
  ],
})

export const FOOD_MODULES = [cooking, diet, fridge]
