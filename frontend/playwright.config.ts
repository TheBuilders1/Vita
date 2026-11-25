import { defineConfig } from '@playwright/test'
import { publishedSite } from './server/pages.ts'

const PORT = 4173
/** La misma carpeta en la que se publica: las pruebas usan direcciones relativas (./tareas). */
const URL_BASE = `http://127.0.0.1:${PORT}${publishedSite(process.env.SITE_URL).base}`
/** Para usar un navegador ya instalado en vez de descargar otro. */
const executablePath = process.env.VITA_CHROMIUM
/** Otro motor (firefox o webkit) para la CI. Firefox no simula móviles: se prueba la pantalla estrecha. */
const engine = process.env.VITA_BROWSER === 'firefox' || process.env.VITA_BROWSER === 'webkit' ? process.env.VITA_BROWSER : undefined

/** Se prueba la versión compilada, servida como en GitHub Pages, en el móvil más estrecho y en escritorio. */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'node_modules/.cache/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: URL_BASE, locale: 'es-ES', timezoneId: 'Europe/Madrid', launchOptions: executablePath ? { executablePath } : {} },
  projects: engine
    ? [
        { name: `${engine}-estrecho`, use: { browserName: engine, viewport: { width: 320, height: 640 } } },
        { name: `${engine}-escritorio`, use: { browserName: engine, viewport: { width: 1440, height: 900 } } },
      ]
    : [
        { name: 'movil', use: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true } },
        { name: 'escritorio', use: { viewport: { width: 1440, height: 900 } } },
      ],
  webServer: { command: `node ../tools/serve.mjs ${PORT}`, url: URL_BASE, reuseExistingServer: false },
})
