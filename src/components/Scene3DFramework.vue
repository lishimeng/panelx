<template>
  <div
    :id="containerId"
    ref="containerRef"
    class="panelx-scene3d-framework"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { OrthographicCamera, PerspectiveCamera } from 'three'
import { setup3D, ControlsStoryBoard, LayerDef, ModelLoadable } from '../framework'
import type { World } from '../framework'
import type { Model } from '../framework'
import { createScene3DInfoBox } from '../framework/Scene3DInfoBox'
import type { Scene3DConfig, Model3DItemConfig } from '../types/dashboard'

const props = defineProps<{
  /** 3D 场景配置（模型列表、statsStyle 等），由 App 或外部传入 */
  config?: Scene3DConfig
}>()

const containerRef = ref<HTMLElement | null>(null)
const containerId = computed(() => `panelx-3d-framework-${Math.random().toString(36).slice(2, 10)}`)
let worldInstance: World | null = null
let resizeObserver: ResizeObserver | null = null

function getModelsConfig(): Model3DItemConfig[] {
  return props.config?.models ?? []
}

function toLayerArray(layer?: number | number[]): number[] {
  if (layer === undefined) return [LayerDef.default]
  return Array.isArray(layer) ? layer : [layer]
}

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  el.id = containerId.value
  const modelsConfig = getModelsConfig()

  setup3D(
    `#${el.id}`,
    (loader, world) => {
      worldInstance = world
      const statsStyle = props.config?.statsStyle ?? 0
      world.statsStyle(statsStyle)
      const width = el.parentElement?.clientWidth ?? 800
      const height = el.parentElement?.clientHeight ?? 600
      const aspect = width / height
      const cameraConfig = props.config?.camera
      const isOrthographic = cameraConfig?.type === 'orthographic'
      const orthographicSize = cameraConfig?.orthographicSize ?? 5

      const camera = isOrthographic
        ? new OrthographicCamera(
            -orthographicSize * aspect,
            orthographicSize * aspect,
            orthographicSize,
            -orthographicSize,
            0.1,
            1000
          )
        : new PerspectiveCamera(120, aspect, 0.1, 1000)
      camera.position.set(2, 1.5, 2)

      const sceneOptions = {
        background: props.config?.background,
        lights: props.config?.lights,
        ...(isOrthographic && { orthographicSize })
      }
      const storyBoard = new ControlsStoryBoard('main', camera, sceneOptions)
      camera.layers.disableAll()
      const cameraLayers = cameraConfig?.layers
      if (cameraLayers != null && cameraLayers.length > 0) {
        cameraLayers.filter((item) => item.enable).forEach((item) => camera.layers.enable(item.layer))
      } else {
        camera.layers.enable(LayerDef.default)
      }
      const store = loader.getStore()
      for (const item of modelsConfig) {
        const stored = store.getModels().get(item.id)
        if (stored) stored.layer = toLayerArray(item.layer)
      }
      const modelPositions = new Map<string, [number, number, number]>()
      for (const item of modelsConfig) {
        if (item.visible === false) continue
        const model = store.getModel(item.id)
        if (model?.scene) {
          if (item.position) {
            model.scene.position.set(item.position[0], item.position[1], item.position[2])
            modelPositions.set(item.id, [...item.position])
          }
          if (item.rotation) {
            model.scene.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2])
          } else {
            model.scene.rotation.set(0, 0, 0)
          }
          if (item.scale != null) {
            model.scene.scale.setScalar(item.scale)
          }
          storyBoard.addModel(model)
        }
      }
      const infoBoxes = props.config?.infoBoxes ?? []
      const defaultOffset: [number, number, number] = [0, 1.2, 0]
      for (const boxConfig of infoBoxes) {
        if (boxConfig.visible === false) continue
        let x: number, y: number, z: number
        if (boxConfig.modelId != null) {
          const pos = modelPositions.get(boxConfig.modelId)
          if (!pos) continue
          const [ox, oy, oz] = boxConfig.offset ?? defaultOffset
          x = pos[0] + ox
          y = pos[1] + oy
          z = pos[2] + oz
        } else if (boxConfig.position) {
          const [px, py, pz] = boxConfig.position
          const [ox, oy, oz] = boxConfig.offset ?? defaultOffset
          x = px + ox
          y = py + oy
          z = pz + oz
        } else {
          continue
        }
        const css3d = createScene3DInfoBox(boxConfig)
        css3d.position.set(x, y, z)
        if (boxConfig.rotation) {
          css3d.rotation.set(boxConfig.rotation[0], boxConfig.rotation[1], boxConfig.rotation[2])
        } else {
          css3d.rotation.set(0, 0, 0)
        }
        css3d.layers.set(LayerDef.default)
        storyBoard.scene.add(css3d)
      }
      storyBoard.enableControls(world.getRendererDom())
      world.sceneTo(storyBoard)
      nextTick(() => world.notifyResize())
      if (el) {
        resizeObserver = new ResizeObserver(() => world.notifyResize())
        resizeObserver.observe(el)
      }
    },
    (): Model[] =>
      modelsConfig.map((m) => new ModelLoadable(m.id, m.format ?? 'gltf', m.source))
  )
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (worldInstance) {
    worldInstance.destroy()
    worldInstance = null
  }
})
</script>

<style scoped>
.panelx-scene3d-framework {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 200px;
}
.panelx-scene3d-framework canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
