import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeChatImages } from '../openclaw/vita-tools/vision.mjs'

const VITA_API = 'http://127.0.0.1:8000'
const OLLAMA_KEY = 'test-ollama-key'
const refs = ['a'.repeat(43), 'b'.repeat(43)]

async function withOllamaKey(run) {
  const previous = process.env.OLLAMA_API_KEY
  process.env.OLLAMA_API_KEY = OLLAMA_KEY
  try {
    await run()
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_API_KEY
    else process.env.OLLAMA_API_KEY = previous
  }
}

test('pide imágenes por referencia de un solo uso y solo las manda a GLM-5.3-Flash', async () => {
  await withOllamaKey(async () => {
    const calls = []
    const fetcher = async (url, init) => {
      calls.push({ url: String(url), init })
      if (String(url).startsWith(VITA_API)) {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { 'content-type': 'image/png' },
        })
      }
      return new Response(JSON.stringify({ message: { content: 'Se ve un gráfico.' } }))
    }

    const text = await analyzeChatImages({
      visionRefs: refs,
      question: '¿Qué muestra el gráfico?',
      vitaApiUrl: VITA_API,
      fetcher,
    })

    assert.equal(text, 'Se ve un gráfico.')
    assert.equal(calls.length, 3)
    assert.deepEqual(
      calls.slice(0, 2).map(({ url }) => url),
      [
        `${VITA_API}/v1/internal/chat-image`,
        `${VITA_API}/v1/internal/chat-image`,
      ],
    )
    assert.deepEqual(
      calls.slice(0, 2).map(({ init }) => init.headers.Authorization),
      refs.map((ref) => `Bearer ${ref}`),
    )
    const cloudRequest = calls[2]
    assert.equal(cloudRequest.url, 'https://ollama.com/api/chat')
    assert.equal(cloudRequest.init.headers.Authorization, `Bearer ${OLLAMA_KEY}`)
    const body = JSON.parse(cloudRequest.init.body)
    assert.equal(body.model, 'glm-5.3-flash')
    assert.equal(body.messages[1].content, '¿Qué muestra el gráfico?')
    assert.equal(body.messages[1].images.length, 2)
    assert.equal(body.messages[1].images[0], Buffer.from([137, 80, 78, 71]).toString('base64'))
    assert.ok(!JSON.stringify(calls.slice(0, 2)).includes(body.messages[1].images[0]))
  })
})

test('rechaza referencias o preguntas inválidas antes de recuperar imágenes', async () => {
  await withOllamaKey(async () => {
    const fetcher = async () => {
      throw new Error('No debe realizar solicitudes')
    }
    await assert.rejects(
      analyzeChatImages({
        visionRefs: ['referencia-inválida'],
        question: '¿Qué ves?',
        vitaApiUrl: VITA_API,
        fetcher,
      }),
      /Invalid authorized image references/,
    )
    await assert.rejects(
      analyzeChatImages({
        visionRefs: refs.slice(0, 1),
        question: ' ',
        vitaApiUrl: VITA_API,
        fetcher,
      }),
      /Invalid image question/,
    )
  })
})

test('no sigue redirecciones de imagen a contenido no admitido', async () => {
  await withOllamaKey(async () => {
    await assert.rejects(
      analyzeChatImages({
        visionRefs: refs.slice(0, 1),
        question: 'Lee el documento',
        vitaApiUrl: VITA_API,
        fetcher: async () => new Response('not an image', {
          headers: { 'content-type': 'text/html' },
        }),
      }),
      /unsupported format/,
    )
  })
})
