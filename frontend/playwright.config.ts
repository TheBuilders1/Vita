import { defineConfig } from '@playwright/test'

const PORT = 4173
/** Para usar un navegador ya instalado en vez de descargar otro. */
const executablePath = process.env.VITA_CHROMIUM

/** Se prueba la versión compilada, en el móvil más estrecho y en escritorio. */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'node_modules/.cache/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: 'es-ES', timezoneId: 'Europe/Madrid', launchOptions: executablePath ? { executablePath } : {} },
  projects: [
    { name: 'movil', use: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true } },
    { name: 'escritorio', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: `pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: false },
})
