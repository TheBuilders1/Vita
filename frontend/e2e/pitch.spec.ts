import { expect, test } from '@playwright/test'
import { expectAccessible, expectNoOverflow } from './support'

test('la presentación se lee, es accesible y no crea ningún hogar', async ({ page }) => {
  await page.goto('./presentacion')
  await expect(page.getByRole('heading', { level: 1, name: 'Un día con Los Robles' })).toBeVisible()
  await expect(page.getByText('Respuesta real del motor de Vita')).toBeAttached({ timeout: 20_000 })
  await expect(page.getByText(/Leo: alergia a los frutos de cáscara/)).toBeAttached()
  await expectAccessible(page)
  await expectNoOverflow(page)
  await page.getByRole('heading', { name: 'Pruébalo tú' }).scrollIntoViewIfNeeded()
  await page.goto('./')
  await expect(page).toHaveURL(/bienvenida/)
})
