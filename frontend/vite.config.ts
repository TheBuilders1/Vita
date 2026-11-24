import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { offlinePlugin } from './server/offline.ts'
import { pagesPlugin, publishedSite } from './server/pages.ts'
import { isAllowedCall, readApiConfig } from './server/apiGuard.ts'

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default defineConfig(({ command, mode, isPreview }) => {
  // Solo al desarrollar: una versión publicada no tiene proxy y no debe ofrecer la lectura de fotos.
  const api = command === 'serve' && !isPreview && mode !== 'test' ? readApiConfig(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITA_')) : null
  const site = publishedSite(process.env.SITE_URL)
  return {
    base: site.base,
    // El orden importa: 404.html se emite después de calcular lo que se guarda para abrir sin conexión.
    plugins: [react(), tailwindcss(), offlinePlugin(), pagesPlugin(site.url)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      rolldownOptions: {
        plugins: [{
          name: 'vita-three-catalogue',
          // Canvas registra los tipos usados en JSX. El motor de R3F conserva sus propias importaciones.
          resolveId: {
            order: 'pre',
            handler(source, importer) {
              if (source === 'three' && importer?.endsWith('/@react-three/fiber/dist/react-three-fiber.esm.js')) {
                return '\0vita-three-catalogue'
              }
            },
          },
          load(id) {
            if (id === '\0vita-three-catalogue') {
              return "export { DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'"
            }
          },
        }],
      },
    },
    define: { VITA_HOUSEHOLD: JSON.stringify(api?.household ?? null) },
    ...(api && {
      server: {
        proxy: {
          '/api': {
            target: api.target,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            bypass: (req) => (isAllowedCall({
              method: req.method, url: req.url, remote: req.socket.remoteAddress,
              guard: header(req.headers['x-vita']), site: header(req.headers['sec-fetch-site']),
            }) ? undefined : false),
            configure: (proxy) => {
              proxy.on('proxyReq', (request) => {
                request.removeHeader('cookie')
                request.setHeader('authorization', `Bearer ${api.token}`)
              })
            },
          },
        },
      },
    }),
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      setupFiles: ['tests/support/setup.ts'],
    },
  }
})
