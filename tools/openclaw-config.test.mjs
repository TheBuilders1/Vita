import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeVitaConfig } from '../openclaw/merge-vita-config.mjs'

const defaults = {
  models: {
    providers: {
      'ollama-cloud': {
        models: [
          { id: 'minimax-m3', name: 'MiniMax M3' },
          { id: 'glm-5.3-flash', name: 'GLM-5.3 Flash', input: ['text', 'image'] },
        ],
      },
    },
  },
  agents: {
    entries: {
      'vita-vision-orquestador': { model: 'ollama-cloud/glm-5.2', tools: { allow: ['sessions_spawn'] } },
      'vita-vision': { model: 'ollama-cloud/glm-5.3-flash', tools: { allow: ['vita_analyze_chat_images'] } },
    },
  },
}

test('migra el perfil persistente solo con el modelo y agentes visuales que faltan', () => {
  const config = {
    custom: { keep: true },
    models: { providers: { 'ollama-cloud': { models: [{ id: 'minimax-m3', name: 'custom' }] } } },
    agents: { entries: { userAgent: { model: 'local/custom' } } },
  }

  const result = mergeVitaConfig(config, defaults)
  assert.deepEqual(result.models.providers['ollama-cloud'].models, [
    { id: 'minimax-m3', name: 'custom' },
    { id: 'glm-5.3-flash', name: 'GLM-5.3 Flash', input: ['text', 'image'] },
  ])
  assert.equal(result.agents.entries.userAgent.model, 'local/custom')
  assert.equal(result.agents.entries['vita-vision'].model, 'ollama-cloud/glm-5.3-flash')
  assert.equal(result.custom.keep, true)
})

test('la migración es repetible y no reemplaza una configuración de usuario ya existente', () => {
  const config = mergeVitaConfig({}, defaults)
  config.agents.entries['vita-vision'].customSetting = true

  const result = mergeVitaConfig(config, defaults)
  assert.equal(result.models.providers['ollama-cloud'].models.filter((model) => model.id === 'glm-5.3-flash').length, 1)
  assert.equal(result.agents.entries['vita-vision'].customSetting, true)
})
