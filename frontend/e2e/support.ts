import { AxeBuilder } from '@axe-core/playwright'
import { expect, test as base, type Page } from '@playwright/test'

/** Cada prueba empieza en el hogar de ejemplo, en un navegador limpio, y falla si la página da un error. */
export const test = base.extend({
  page: async ({ page }, run) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))
    // Lo que la política bloquee en el uso normal es un fallo, aunque no se note.
    await page.exposeFunction('reportBlocked', (text: string) => { errors.push(`Bloqueado por la política: ${text}`) })
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => { (window as unknown as { reportBlocked: (text: string) => void }).reportBlocked(`${event.effectiveDirective} ${event.blockedURI}`) })
    })
    await page.goto('./')
    await page.getByRole('button', { name: 'Ver un hogar de ejemplo' }).click()
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
    await run(page)
    expect(errors).toEqual([])
  },
})
export { expect }

const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(RULES).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 160)}`)).toEqual([])
}

/** Nada se sale por los lados, tampoco con la letra más grande. */
export async function expectNoOverflow(page: Page): Promise<void> {
  for (const size of ['normal', 'xlarge']) {
    await page.evaluate((s) => { document.documentElement.dataset.textSize = s }, size)
    await expect.poll(() => page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]')
      return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, dialog ? dialog.scrollWidth - dialog.clientWidth : 0)
    }), { message: `letra ${size}` }).toBeLessThanOrEqual(0)
  }
  await page.evaluate(() => { delete document.documentElement.dataset.textSize })
}
