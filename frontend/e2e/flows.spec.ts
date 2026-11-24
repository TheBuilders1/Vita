import { expect, expectAccessible, expectNoOverflow, test } from './support'

test('Vita está en el centro de la barra en todos los perfiles', async ({ page }) => {
  for (const profile of [undefined, 'Pilar']) {
    if (profile) {
      await page.getByRole('button', { name: /^Cambiar de perfil/ }).click()
      await page.getByRole('dialog').getByRole('button', { name: profile }).click()
      await expect(page.getByRole('heading', { name: `Hola, ${profile}` })).toBeVisible()
    }
    const labels = await page.getByRole('navigation', { name: 'Principal' }).getByRole('link').allInnerTexts()
    expect(labels).toHaveLength(5)
    expect(labels[2]?.trim()).toBe('Vita')
  }
})

test('añadir un documento se ve nada más entrar', async ({ page }) => {
  await page.goto('./planta/finance/documents')
  await expect(page.getByRole('button', { name: 'Añadir documento' })).toBeInViewport({ ratio: 1 })
})

test('borrar se deshace al momento y desde la papelera', async ({ page }) => {
  await page.goto('./tareas')
  const row = page.getByRole('listitem').filter({ hasText: 'Prueba de borrado' })
  await page.getByRole('button', { name: 'Añadir tarea' }).first().click()
  await page.getByRole('dialog').getByLabel('Tarea', { exact: true }).fill('Prueba de borrado')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  const remove = async () => {
    await row.getByRole('button').last().click()
    await expectAccessible(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar tarea' }).click()
    await expect(row).toHaveCount(0)
  }
  await remove()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(row).toHaveCount(1)
  await remove()
  await page.goto('./ajustes#papelera')
  await page.getByRole('button', { name: 'Recuperar Prueba de borrado' }).click()
  await expect(page.getByText('La papelera está vacía')).toBeVisible()
})

test('una copia con contraseña se guarda y se vuelve a abrir', async ({ page }) => {
  await page.goto('./ajustes')
  await page.getByRole('button', { name: 'Guardar una copia' }).click()
  const dialog = page.getByRole('dialog')
  await expectAccessible(page)
  await expectNoOverflow(page)
  await dialog.getByRole('button', { name: 'Guardar copia' }).click()
  await expect(dialog.getByText('Usa al menos 10 letras')).toBeVisible()
  await dialog.getByLabel('Contraseña', { exact: true }).fill('caballo grapa pila')
  await dialog.getByLabel('Otra vez').fill('caballo grapa pila')
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Guardar copia' }).click()])
  expect(download.suggestedFilename()).toMatch(/^vita-copia-cifrada-\d{4}-\d{2}-\d{2}\.json$/)
  const path = await download.path()
  await page.getByLabel('Restaurar una copia').setInputFiles(path)
  await dialog.getByLabel('Contraseña').fill('no es esta')
  await dialog.getByRole('button', { name: 'Abrir la copia' }).click()
  await expect(dialog.getByText('La contraseña no es correcta')).toBeVisible()
  await expectAccessible(page)
  await dialog.getByLabel('Contraseña').fill('caballo grapa pila')
  await dialog.getByRole('button', { name: 'Abrir la copia' }).click()
  await dialog.getByRole('button', { name: 'Sustituir por la copia' }).click()
  await expect(page.getByText('Copia restaurada')).toBeVisible()
})

test('una tarea que se repite avanza al darla por hecha', async ({ page }) => {
  await page.goto('./vita')
  await page.getByLabel('Escribe a Vita').fill('Recuérdame regar las plantas todos los días a las 9')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.getByRole('log').getByRole('button', { name: /^Guardar/ }).click()
  await expect(page.getByRole('log').getByText(/Guardado/)).toBeVisible()
  await expectAccessible(page)
  await page.goto('./calendario')
  const row = page.getByRole('listitem').filter({ hasText: /regar las plantas/i })
  await row.getByRole('button', { name: /^Hecho/ }).click()
  await expect(page.getByText('La próxima')).toBeVisible()
  await expect(row).toHaveCount(0)
})

test('la búsqueda no necesita tildes y abre la ficha', async ({ page }) => {
  await page.goto('./buscar')
  await page.getByLabel('Qué buscas').fill('medico')
  await expect(page.getByText(/\d+ resultados?/)).toBeVisible()
  await page.getByRole('region', { name: 'Guardado en tu hogar' }).getByRole('button').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('el calendario se guarda como archivo, con aviso', async ({ page }) => {
  await page.goto('./calendario')
  await page.getByRole('button', { name: 'Guardar para otro calendario' }).click()
  await expectAccessible(page)
  await expectNoOverflow(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: /^(Guardar|Descargar)/ }).click()])
  expect(download.suggestedFilename()).toBe('vita-calendario.ics')
})

test('imprimir saca solo la ficha', async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { (window as Window & { printed?: number }).printed = 1 } })
  await page.goto('./planta/finance/documents')
  await page.getByRole('button', { name: /^DNI de Marta/ }).last().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Imprimir' }).click()
  await expect.poll(() => page.evaluate(() => (window as Window & { printed?: number }).printed)).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.print-sheet').getByRole('heading', { name: 'DNI de Marta' })).toBeVisible()
  await expect(page.locator('#root')).toBeHidden()
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await expect(page.locator('.print-sheet')).toHaveCount(0)
})

test('se abre sin conexión', async ({ page, context }) => {
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  await context.setOffline(true)
  await page.goto('./ajustes')
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
  await context.setOffline(false)
})

test('el dictado está apagado, y activarlo avisa y enseña el botón', async ({ page }) => {
  await page.goto('./vita')
  await expect(page.getByRole('button', { name: 'Dictar' })).toHaveCount(0)
  await page.goto('./ajustes')
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
  const remote = page.getByRole('radio', { name: /También con el servicio/ })
  test.skip(await remote.count() === 0, 'este navegador no sabe dictar')
  await remote.check()
  await expect(page.getByText('puede enviarla a la empresa')).toBeVisible()
  // Por el menú, como una persona: recargar en ese mismo instante podría adelantarse al guardado.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Vita' }).click()
  await expect(page.getByRole('button', { name: 'Dictar' })).toBeVisible()
})
