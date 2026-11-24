import { expectAccessible, expectNoOverflow, expect, test } from './support'

const SCREENS = ['/', '/planta/finance/documents', '/planta/finance/finances', '/planta/health/emergency', '/planta/health/medication', '/calendario', '/calendario?vista=semana', '/tareas', '/hogar', '/hogar/nuevo', '/vita', '/buscar', '/ayuda', '/ajustes', '/planes']

for (const path of SCREENS) {
  test(`accesible y sin desbordes: ${path}`, async ({ page }) => {
    await page.goto(`.${path}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
    await expectAccessible(page)
    await expectNoOverflow(page)
  })
}

test('el perfil sencillo también', async ({ page }) => {
  await page.getByRole('button', { name: /^Cambiar de perfil/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pilar' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Pilar' })).toBeVisible()
  await expectAccessible(page)
  await expectNoOverflow(page)
})
