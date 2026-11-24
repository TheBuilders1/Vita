import { expect, test } from 'vitest'
import { domainOf, isWebLink, tidyLink } from '@/utils/webLinks'

test.each([
  ['  https://www.dgt.es/cita  ', 'https://www.dgt.es/cita'], ['www.dgt.es', 'https://www.dgt.es'], ['sede.gob.es/dni?x=1', 'https://sede.gob.es/dni?x=1'],
  ['http://router.local', 'http://router.local'], ['HTTPS://DGT.ES', 'HTTPS://DGT.ES'],
  ['', ''], ['hola', 'hola'], ['dos palabras.es', 'dos palabras.es'], ['javascript:alert(1)', 'javascript:alert(1)'],
])('arregla %j al pegarlo', (text, expected) => expect(tidyLink(text)).toBe(expected))

test.each(['https://dgt.es', 'http://dgt.es/a?b#c'])('%j es un enlace', (text) => expect(isWebLink(text)).toBe(true))
test.each(['', 'hola', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://a.es', 'https://', 'blob:https://a.es/x', 'https://banco.es@estafa.com', 'https://ana:clave@dgt.es'])('%j no se admite', (text) => expect(isWebLink(text)).toBe(false))

test.each([['https://www.dgt.es/cita', 'dgt.es'], ['https://sede.administracion.gob.es', 'sede.administracion.gob.es'], ['no es enlace', 'no es enlace']])('el dominio de %j es %j', (url, domain) => expect(domainOf(url)).toBe(domain))
