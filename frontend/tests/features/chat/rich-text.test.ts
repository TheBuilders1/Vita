import { expect, test } from 'vitest'
import { blocks } from '@/features/chat/richText'

const factura = `Esta es la información que aparece en la factura:
- **Emisor:** Empresa de logística, S.L.
- **Total:** 1.538,06 €

Ahora bien, te aclaro dos cosas:
1. **Revisa la tarjeta.** Pulsa «Guardar».
2. Está vencida.`

test('párrafos, listas y negritas en vez de asteriscos y guiones sueltos', () => {
  expect(blocks(factura)).toEqual([
    { kind: 'p', parts: [{ text: 'Esta es la información que aparece en la factura:' }] },
    { kind: 'ul', items: [
      [{ text: 'Emisor:', strong: true }, { text: ' Empresa de logística, S.L.' }],
      [{ text: 'Total:', strong: true }, { text: ' 1.538,06 €' }],
    ] },
    { kind: 'p', parts: [{ text: 'Ahora bien, te aclaro dos cosas:' }] },
    { kind: 'ol', items: [
      [{ text: 'Revisa la tarjeta.', strong: true }, { text: ' Pulsa «Guardar».' }],
      [{ text: 'Está vencida.' }],
    ] },
  ])
})

test('el HTML que venga en el texto se queda como texto', () => {
  expect(blocks('<img src=x onerror=alert(1)> **hola**')).toEqual([
    { kind: 'p', parts: [{ text: '<img src=x onerror=alert(1)> ' }, { text: 'hola', strong: true }] },
  ])
})

test('títulos con almohadillas se leen como frase destacada', () => {
  expect(blocks('### Datos de la factura\nTexto')).toEqual([
    { kind: 'p', parts: [{ text: 'Datos de la factura', strong: true }] },
    { kind: 'p', parts: [{ text: 'Texto' }] },
  ])
})
