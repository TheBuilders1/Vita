import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { isAllowedCall, readApiConfig } from './server/apiGuard.ts'

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default defineConfig(({ command, mode }) => {
  // Solo al desarrollar: una versión publicada no tiene proxy y no debe ofrecer la lectura de fotos.
  const api = command === 'serve' && mode !== 'test' ? readApiConfig(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITA_')) : null
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
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
