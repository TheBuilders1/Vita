import { DataArrayTexture, LinearMipmapLinearFilter, MeshLambertMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'
import { paintTiles, TILE_COUNT, TILE_SIZE } from './tiles'

let texture: DataArrayTexture | undefined

/** Una sola textura con todas las capas: cada una se repite por su cuenta, sin sangrado entre vecinas. */
export function getTileTexture(): DataArrayTexture {
  if (texture) return texture
  texture = new DataArrayTexture(paintTiles(), TILE_SIZE, TILE_SIZE, TILE_COUNT)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** Lambert con textura por capas y brillo propio por vértice. Todas las instancias comparten programa. */
export function createPixelMaterial(): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiles = { value: getTileTexture() }
    shader.vertexShader = `attribute vec2 aUv;\nattribute float aLayer;\nattribute float aGlow;\nvarying vec2 vTileUv;\nvarying float vLayer;\nvarying float vGlow;\n${shader.vertexShader}`
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n  vTileUv = aUv;\n  vLayer = aLayer;\n  vGlow = aGlow;')
    shader.fragmentShader = `uniform mediump sampler2DArray uTiles;\nvarying vec2 vTileUv;\nvarying float vLayer;\nvarying float vGlow;\n${shader.fragmentShader}`
      .replace('#include <map_fragment>', 'vec3 tileColor = texture(uTiles, vec3(vTileUv, floor(vLayer + 0.5))).rgb;\n  diffuseColor.rgb *= tileColor;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = emissive * tileColor + tileColor * vGlow;')
  }
  material.customProgramCacheKey = () => 'vita-pixel'
  return material
}
