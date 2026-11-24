import type { Plugin } from 'vite'

/** La web no necesita nada de fuera: si algún día entra código ajeno, el navegador no le deja enviar datos a otro sitio. */
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** Dónde se publica: de ahí sale la carpeta con la que se compila. Sin dirección, la raíz. */
export function publishedSite(value: string | undefined): { base: string; url: string | null } {
  if (!value) return { base: '/', url: null }
  const url = new URL(value)
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^[\w./~-]+$/.test(path)) throw new Error(`SITE_URL no es una dirección válida: ${value}`)
  return { base: path, url: url.origin + path }
}

const CHARSET = '<meta charset="UTF-8" />'

export function withPolicy(html: string, url: string | null): string {
  if (!html.includes(CHARSET)) throw new Error('index.html debe empezar por la codificación: ahí va la política de contenido')
  const tags = [
    `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    '<meta name="referrer" content="no-referrer" />',
    ...(url === null ? [] : [
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:locale" content="es_ES" />',
      '<meta property="og:title" content="Vita: tu hogar, en orden" />',
      '<meta property="og:description" content="La organización de tu hogar en un espacio privado, en tu propio dispositivo." />',
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${url}icon-512.png" />`,
    ]),
  ]
  return html.replace(CHARSET, [CHARSET, ...tags].join('\n    '))
}

/** Solo al compilar: en desarrollo, Vite necesita código en línea y un WebSocket. */
export function pagesPlugin(url: string | null): Plugin {
  return {
    name: 'vita-pages',
    apply: 'build',
    transformIndexHtml: { order: 'pre', handler: (html) => withPolicy(html, url) },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const html = bundle['index.html']
        // GitHub Pages responde con 404.html a las direcciones que no son archivos: la misma página abre cada pantalla.
        if (html?.type === 'asset') this.emitFile({ type: 'asset', fileName: '404.html', source: html.source })
      },
    },
  }
}
