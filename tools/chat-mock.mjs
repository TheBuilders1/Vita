import { createServer } from 'node:http'

// Imita el contrato del backend real (app/main.py) para probar el chat sin OpenClaw ni Ollama.
const token = process.env.VITA_API_TOKEN || 'demo-local'
const port = Number(process.env.PORT || 8787)
const GREETING = '¡Hola! Soy Vita, tu asistente personal. ¿En qué puedo ayudarte?'

function reply({ message, context, attachments }) {
  if (/^\s*[¡!]*\s*(hola|buen[oa]s)/i.test(message)) return GREETING
  if (/qu[eé] (puedes|sabes) hacer|ayuda/i.test(message)) return 'Respuesta de prueba. Puedo apuntar citas, tareas y la compra, consultar tu agenda y tus fichas, leer documentos y darte los teléfonos de emergencia. Nada se guarda hasta que lo confirmas.'
  const parts = ['Respuesta de prueba.']
  if (context.length) parts.push(`He recibido ${context.length} dato(s) visibles, el primero: «${context[0].title}».`)
  if (attachments.length) parts.push(`He recibido el texto de ${attachments.length} archivo(s).`)
  return parts.join(' ')
}

const server = createServer(async (req, res) => {
  const send = (status, value) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(value))
  }
  if (!['/v1/chat', '/v1/chat/attachments', '/v1/documents/understand'].includes(req.url)) return send(404, { detail: 'not_found' })
  if (req.method !== 'POST') return send(405, { detail: 'method_not_allowed' })
  if (req.headers.authorization !== `Bearer ${token}`) return send(401, { detail: 'invalid_token' })
  const chunks = []
  let bytes = 0
  try {
    for await (const chunk of req) {
      bytes += chunk.length
      if (bytes > 11 * 1024 * 1024) return send(413, { detail: 'attachment_too_large' })
      chunks.push(chunk)
    }
    // El archivo no se lee: se contesta con un texto fijo, como haría el lector local.
    if (req.url === '/v1/chat/attachments') return send(200, { text: 'Texto de prueba extraído del archivo.' })
    if (req.url === '/v1/documents/understand') {
      // Datos ficticios fijos: el modelo real los saca del propio documento.
      return send(200, /name="kind"\r\n\r\nbill/.test(Buffer.concat(chunks).toString('latin1'))
        ? { type: 'bill', concept: 'Factura de prueba · Luz', supplier: 'Eléctrica de prueba', amountCents: 6342, date: '2026-11-03', dueDate: '2026-11-20', category: 'home' }
        : { type: 'document', kind: 'id', title: 'DNI de prueba', holderName: null, issueDate: '2021-04-30', expiryDate: '2031-04-30' })
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (typeof body?.message !== 'string' || !body.message.trim() || typeof body.conversationId !== 'string') return send(422, { detail: 'invalid_request' })
    return send(200, { message: reply({ message: body.message, context: body.context ?? [], attachments: body.attachments ?? [] }) })
  } catch {
    return send(400, { detail: 'invalid_json' })
  }
})
server.listen(port, '127.0.0.1', () => console.log(`Chat de prueba en http://127.0.0.1:${port}/v1/chat`))
