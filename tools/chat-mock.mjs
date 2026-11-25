import { createServer } from 'node:http'

const token = process.env.VITA_API_TOKEN || 'demo-local'
const port = Number(process.env.PORT || 8787)
const server = createServer(async (req, res) => {
  const send = (status, value) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(value))
  }
  if (req.url !== '/v1/chat') return send(404, { error: 'Ruta desconocida' })
  if (req.method !== 'POST') return send(405, { error: 'Usa POST' })
  if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Token incorrecto' })
  const chunks = []
  let bytes = 0
  try {
    for await (const chunk of req) {
      bytes += chunk.length
      if (bytes > 128 * 1024) return send(413, { error: 'Petición demasiado grande' })
      chunks.push(chunk)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 500) return send(400, { error: 'Revisa el mensaje' })
    const reply = /organiza/i.test(body.message)
      ? { kind: 'proposals', text: 'Respuesta de prueba. ¿Quieres guardar esta tarea?', proposals: [{ typeId: 'task', data: { title: 'Preparar la mochila' } }] }
      : { kind: 'text', text: 'Respuesta de prueba. Puedes pedirme «Organiza mi día» para revisar una tarea.' }
    return send(200, { reply })
  } catch {
    return send(400, { error: 'No se ha podido leer la petición' })
  }
})
server.listen(port, '127.0.0.1', () => console.log(`Chat de prueba en http://127.0.0.1:${port}/v1/chat`))
