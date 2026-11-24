import { build } from 'vite'
import { describe, expect, it } from 'vitest'

describe('Carga del edificio', () => {
  it('deja el 3D en un trozo aparte y solo incluye los tipos de Three que se usan', async () => {
    const result = await build({
      logLevel: 'silent',
      publicDir: false,
      build: { write: false, minify: false, reportCompressedSize: false },
    })
    const bundles = Array.isArray(result) ? result : [result]
    const chunks = bundles.flatMap((bundle) => 'output' in bundle ? bundle.output : []).filter((part) => part.type === 'chunk')
    const scene = chunks.find((chunk) => chunk.name === 'BuildingScene')
    const view = chunks.find((chunk) => chunk.name === 'BuildingView')

    expect(scene).toBeDefined()
    expect(view?.dynamicImports).toContain(scene?.fileName)
    expect(chunks.flatMap((chunk) => chunk.imports)).not.toContain(scene?.fileName)
    expect(chunks.flatMap((chunk) => Object.keys(chunk.modules)).some((id) => id.includes('/@react-three/drei/'))).toBe(false)
    expect(scene?.code.includes('class TorusKnotGeometry')).toBe(false)
  })
})
