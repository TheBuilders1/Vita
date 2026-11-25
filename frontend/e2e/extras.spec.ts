import { expect as baseExpect, test as base } from '@playwright/test'
import { expect, test } from './support'

base('un enlace abre el ejemplo con el perfil de Pilar', async ({ page }) => {
  await page.goto('./bienvenida?como=pilar')
  await baseExpect(page.getByRole('heading', { name: 'Hola, Pilar' })).toBeVisible()
})

test('Vita dice la clave de la wifi y lo que hay en la nevera', async ({ page }) => {
  await page.goto('./vita')
  const box = page.getByLabel('Escribe a Vita')
  await box.fill('¿Cuál es la clave de la wifi?')
  await box.press('Enter')
  await expect(page.getByRole('log')).toContainText('Robles-Invitados')
  await box.fill('¿Qué hay en la nevera?')
  await box.press('Enter')
  await expect(page.getByRole('log')).toContainText('Yogur natural')
})

test('el modo cocina enseña la receta paso a paso', async ({ page }) => {
  await page.goto('./planta/food/fridge')
  await page.getByRole('tab', { name: 'Qué podemos cocinar' }).or(page.getByRole('button', { name: 'Qué podemos cocinar' })).first().click()
  await page.getByRole('button', { name: /^Modo cocina/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/^Paso 1 de \d+$/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Siguiente' }).click()
  await expect(dialog.getByText(/^Paso 2 de \d+$/)).toBeVisible()
})

test('subir un DNI abre su ficha rellena con el archivo', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Subir documento' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: /^DNI/ }).click()
  // Un PNG de 1×1 píxel.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await page.locator('input[type=file]:not([capture])').setInputFiles({ name: 'dni.png', mimeType: 'image/png', buffer: png })
  const form = page.getByRole('dialog')
  await expect(form.getByLabel('Nombre del documento')).toHaveValue('DNI de Marta')
  await expect(form.getByText('dni.png').first()).toBeVisible()
})
