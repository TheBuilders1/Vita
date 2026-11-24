import { describe, expect, test } from 'vitest'
import { CSP, publishedSite, withPolicy } from '../../server/pages'

describe('la dirección en la que se publica', () => {
  test('sin dirección se compila para la raíz y no se anuncia ninguna', () => {
    expect(publishedSite(undefined)).toEqual({ base: '/', url: null })
    expect(publishedSite('')).toEqual({ base: '/', url: null })
  })
  test('la carpeta sale de la dirección, con barra final', () => {
    expect(publishedSite('https://Vita-Hogar.github.io/Vita')).toEqual({ base: '/Vita/', url: 'https://vita-hogar.github.io/Vita/' })
    expect(publishedSite('https://vita.example/')).toEqual({ base: '/', url: 'https://vita.example/' })
  })
  test.each(['http://vita.example/', 'javascript:alert(1)', 'https://a:b@vita.example/', 'https://vita.example/?x=1', 'https://vita.example/#x', "https://vita.example/a'b/", 'vita'])('no admite %s', (value) => {
    expect(() => publishedSite(value)).toThrow()
  })
})

describe('la política de contenido', () => {
  const html = '<html><head>\n    <meta charset="UTF-8" />\n    <script type="module" src="/a.js"></script></head></html>'
  test('va justo tras la codificación: lo que se carga antes no quedaría protegido', () => {
    const page = withPolicy(html, null)
    expect(page.indexOf('Content-Security-Policy')).toBeGreaterThan(page.indexOf('charset'))
    expect(page.indexOf('Content-Security-Policy')).toBeLessThan(page.indexOf('<script'))
  })
  test('por defecto no se permite nada, y los datos no pueden salir a otro sitio', () => {
    expect(CSP).toMatch(/^default-src 'none'/)
    expect(CSP).toContain("connect-src 'self'")
    expect(CSP).not.toMatch(/unsafe|https?:|\*/)
  })
  test('con dirección pública añade la ficha para compartir; sin ella, no', () => {
    expect(withPolicy(html, 'https://vita.example/')).toContain('<meta property="og:url" content="https://vita.example/"')
    expect(withPolicy(html, null)).not.toContain('og:url')
  })
  test('si la página no tiene dónde ponerla, se detiene', () => {
    expect(() => withPolicy('<html></html>', null)).toThrow()
  })
})
