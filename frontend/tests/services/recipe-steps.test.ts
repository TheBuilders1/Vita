import { expect, test } from 'vitest'
import { recipeSteps } from '@/services/recipes'

test('cada línea es un paso, sin números ni guiones', () => {
  expect(recipeSteps('1. Pela las patatas.\n2) Bate los huevos\n\n- Cuaja a fuego lento')).toEqual(['Pela las patatas.', 'Bate los huevos', 'Cuaja a fuego lento'])
})

test('un párrafo se parte por frases', () => {
  expect(recipeSteps('Pon el agua a hervir. Echa la pasta. Escurre a los 10 minutos.')).toEqual(['Pon el agua a hervir.', 'Echa la pasta.', 'Escurre a los 10 minutos.'])
})

test('sin preparación no hay pasos', () => {
  expect(recipeSteps(undefined)).toEqual([])
})
