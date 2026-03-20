<template>
  <div
    :id="containerId"
    ref="containerRef"
    class="panelx-scene3d-framework"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, OrthographicCamera, PerspectiveCamera, Points, PointsMaterial, Vector3 } from 'three'
import { setup3D, ControlsStoryBoard, LayerDef, ModelLoadable, SimpleModel, modelRegistry } from '../framework'
import type { World } from '../framework'
import type { Model } from '../framework'
import { createScene3DInfoBox, createScene3DSpriteInfoBox } from '../framework/Scene3DInfoBox'
import type { Scene3DConfig, Model3DItemConfig, WidgetConfig3D } from '../types/dashboard'

const props = defineProps<{
  /** 3D 场景配置（模型列表、statsStyle 等），由 App 或外部传入 */
  config?: Scene3DConfig
}>()

const containerRef = ref<HTMLElement | null>(null)
const containerId = computed(() => `panelx-3d-framework-${Math.random().toString(36).slice(2, 10)}`)
let worldInstance: World | null = null
let resizeObserver: ResizeObserver | null = null
const CUSTOM_PROPS_KEY = 'custom'
const MASK_COLOR_KEY = 'maskColor'
const MASK_OPACITY_KEY = 'maskOpacity'
const MASK_RADIUS_KEY = 'maskRadius'
const AUTO_ROTATE_ENABLED_KEY = 'autoRotateEnabled'
const AUTO_ROTATE_AXIS_KEY = 'autoRotateAxis'
const AUTO_ROTATE_SPEED_DEG_KEY = 'autoRotateSpeedDeg'

const UNSELECTED_OPACITY_MULTIPLIER = 0.5

function getModelsConfig(): Model3DItemConfig[] {
  return props.config?.models ?? []
}

function getWidgets3DConfig(): WidgetConfig3D[] {
  return props.config?.widgets3D ?? []
}

function toLayerArray(layer?: number | number[]): number[] {
  if (layer === undefined) return [LayerDef.default]
  const arr = Array.isArray(layer) ? layer : [layer]
  return arr.map((v) => LayerDef.normalize(v))
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function resolveModelUrl(source: string | undefined): string | undefined {
  if (source == null || source === '') return undefined
  if (source.startsWith('http://') || source.startsWith('https://')) return source
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const path = source.startsWith('/') ? source.slice(1) : source
  const fullPath = base.endsWith('/') ? base + path : base + '/' + path
  try {
    return new URL(fullPath, window.location.origin).href
  } catch {
    return undefined
  }
}

function createModelByTypeId(typeId: string, name: string, source?: string): Model | null {
  if (typeId === 'gltf') return new ModelLoadable(name, 'gltf', source ?? '') as unknown as Model
  if (typeId === 'fbx') return new ModelLoadable(name, 'fbx', source ?? '') as unknown as Model
  if (typeId === 'simple') return new SimpleModel(name) as unknown as Model
  return modelRegistry.createModel(typeId, { name, source })
}

function applyCustomProps(model: Model, props: Record<string, unknown>): void {
  const custom = props[CUSTOM_PROPS_KEY]
  if (!custom || typeof custom !== 'object') return
  for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
    // 引擎级状态（自旋转/遮罩）由 applyInstanceExtrasFromCustom 处理
    if (k === MASK_COLOR_KEY || k === MASK_OPACITY_KEY || k === MASK_RADIUS_KEY) continue
    if (k === AUTO_ROTATE_ENABLED_KEY || k === AUTO_ROTATE_AXIS_KEY || k === AUTO_ROTATE_SPEED_DEG_KEY) continue
    try {
      model.propUpdate(k, v)
    } catch {
      // ignore
    }
  }
}

function applyInstanceExtrasFromCustom(model: Model, props: Record<string, unknown>): void {
  const custom = props[CUSTOM_PROPS_KEY]
  if (!custom || typeof custom !== 'object') return

  const c = custom as Record<string, unknown>

  // 遮罩（运行时默认不显示；仅应用颜色/透明度/半径用于后续可能的显示逻辑）
  const maskColor = typeof c[MASK_COLOR_KEY] === 'string' ? c[MASK_COLOR_KEY] : '#38bdf8'
  const maskOpacityRaw = Number(c[MASK_OPACITY_KEY])
  const maskOpacity = Number.isFinite(maskOpacityRaw) ? Math.min(1, Math.max(0, maskOpacityRaw)) : 1
  const maskRadiusWorldRaw = Number(c[MASK_RADIUS_KEY])
  const maskRadiusWorld = Number.isFinite(maskRadiusWorldRaw) && maskRadiusWorldRaw > 0 ? maskRadiusWorldRaw : 3

  model.setMaskColor(maskColor)
  // 不处于“选中”态：沿用 editor 里的 unselected 逻辑 opacity * 0.5
  model.setMaskOpacity(maskOpacity * UNSELECTED_OPACITY_MULTIPLIER)
  model.setMaskRadiusWorld(maskRadiusWorld)
  model.setMaskVisible(false)

  // 自旋转
  const enabled = Boolean(c[AUTO_ROTATE_ENABLED_KEY])
  const axisRaw = c[AUTO_ROTATE_AXIS_KEY]
  const axis = axisRaw === 'x' || axisRaw === 'y' || axisRaw === 'z' ? axisRaw : 'y'
  const speedDegRaw = Number(c[AUTO_ROTATE_SPEED_DEG_KEY])
  const speedDeg = Number.isFinite(speedDegRaw) ? speedDegRaw : 30

  const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
  model.setAutoRotateAxis(axisVec)
  model.setAutoRotateEnabled(enabled)
  model.setAutoRotateSpeed(degToRad(speedDeg || 0))
}

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  el.id = containerId.value
  const modelsConfig = getModelsConfig()
  const widgets3DConfig = getWidgets3DConfig()
  const useWidgets3DRuntime = widgets3DConfig.length > 0
  const widgetPropsMap = new Map<string, Record<string, unknown>>()
  const widgetTransformMap = new Map<
    string,
    { position: [number, number, number]; scale: number; rotationDeg: [number, number, number] }
  >()

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
      const firstWidgetProps = useWidgets3DRuntime
        ? (((widgets3DConfig[0]?.props ?? {}) as Record<string, unknown>) ?? {})
        : {}
      const fallbackLights = firstWidgetProps.sceneLights as Record<string, unknown> | undefined
      const lightsFromConfig = props.config?.lights
      const sceneLights = lightsFromConfig ?? {
        ambient: Number(fallbackLights?.ambient ?? 1.5),
        hemisphere: Number(fallbackLights?.hemisphere ?? 1.5),
        point: Number(fallbackLights?.point ?? 1.5)
      }
      const bloomFromConfig = props.config?.bloom
      const sceneBloom =
        bloomFromConfig ??
        (firstWidgetProps.sceneBloom as
          | { strength?: unknown; radius?: unknown; threshold?: unknown }
          | undefined)
      if (sceneBloom) {
        const s = Number((sceneBloom as any).strength)
        const r = Number((sceneBloom as any).radius)
        const t = Number((sceneBloom as any).threshold)
        world.setBloom(true, {
          ...(Number.isFinite(s) ? { strength: s } : {}),
          ...(Number.isFinite(r) ? { radius: r } : {}),
          ...(Number.isFinite(t) ? { threshold: t } : {})
        })
      }
      const isOrthographic = cameraConfig?.type === 'orthographic'
      const fallbackOrthographicSize =
        useWidgets3DRuntime && widgets3DConfig[0]?.worldSize?.y
          ? Math.max(0.0001, Number(widgets3DConfig[0].worldSize!.y) / 2)
          : 5
      const orthographicSize = cameraConfig?.orthographicSize ?? fallbackOrthographicSize

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
        lights: sceneLights,
        ...(isOrthographic && { orthographicSize })
      }
      const storyBoard = new ControlsStoryBoard('main', camera, sceneOptions)

      // 星空粒子背景：用 THREE.Points 生成远处散点
      // 让它们落在默认 layer，避免引入新的 layer 规则；camera.layers 开关关闭默认层时也会一起隐藏。
      const STAR_COUNT = 1800
      // 让星星分布别太远，保证在相机视野内更容易看到
      const STAR_MIN_RADIUS = 25
      const STAR_MAX_RADIUS = 140
      const STAR_COLOR = new Color(0x38bdf8)
      const starPositions = new Float32Array(STAR_COUNT * 3)
      const starColors = new Float32Array(STAR_COUNT * 3)
      for (let i = 0; i < STAR_COUNT; i++) {
        // 球面随机分布（避免“平面一条带”的感觉）
        const u = Math.random()
        const v = Math.random()
        const theta = 2 * Math.PI * u
        const phi = Math.acos(2 * v - 1)

        const r = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS)
        const sinPhi = Math.sin(phi)

        const x = r * sinPhi * Math.cos(theta)
        const y = r * Math.cos(phi)
        const z = r * sinPhi * Math.sin(theta)

        starPositions[i * 3 + 0] = x
        starPositions[i * 3 + 1] = y
        starPositions[i * 3 + 2] = z

        // 少量白色更亮，形成“星星”层次
        const brightness = 0.25 + Math.random() * 0.75
        const isWhite = Math.random() < 0.18
        const c = isWhite ? new Color(0xffffff) : STAR_COLOR
        const final = c.clone().multiplyScalar(brightness)
        starColors[i * 3 + 0] = final.r
        starColors[i * 3 + 1] = final.g
        starColors[i * 3 + 2] = final.b
      }

      const starGeometry = new BufferGeometry()
      starGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3))
      starGeometry.setAttribute('color', new Float32BufferAttribute(starColors, 3))
      const starMaterial = new PointsMaterial({
        size: 0.12,
        vertexColors: true,
        color: 0xffffff,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        blending: AdditiveBlending
      })
      const starField = new Points(starGeometry, starMaterial)
      // 星空背景希望不受 camera.layers 开关误伤：允许在任意相机层可见
      starField.layers.enableAll()
      storyBoard.scene.add(starField)

      camera.layers.disableAll()
      const cameraLayers = cameraConfig?.layers
      if (cameraLayers != null && cameraLayers.length > 0) {
        let anyEnabled = false
        cameraLayers
          .filter((item) => item.enable)
          .forEach((item) => {
            anyEnabled = true
            camera.layers.enable(LayerDef.normalize(item.layer))
          })
        // 避免误配置导致 camera mask=0，全黑
        if (!anyEnabled) camera.layers.enable(LayerDef.default)
      } else {
        camera.layers.enable(LayerDef.default)
      }

      const store = loader.getStore()
      const runtimeModels = useWidgets3DRuntime
        ? widgets3DConfig.map((w) => ({ id: w.id, visible: w.visible, layer: w.layer }))
        : modelsConfig.map((m) => ({ id: m.id, visible: m.visible, layer: m.layer }))
      // 注意：不要在这里把 widget/model 的 layer 强行覆盖给实例。
      // 模型的 layer 应尽量由模型自身/类型规则决定；仅 info-box/sprite-info-box 需要由配置控制。
      const modelPositions = new Map<string, [number, number, number]>()
      const widgetTypeIdById = new Map<string, string>()
      if (useWidgets3DRuntime) {
        for (const w of widgets3DConfig) {
          const p = (w.props ?? {}) as Record<string, unknown>
          const typeId = String(p.typeId ?? '')
          if (typeId) widgetTypeIdById.set(w.id, typeId)
        }
      }
      for (const item of runtimeModels) {
        if (item.visible === false) continue
        const model = store.getModel(item.id)
        if (model?.scene) {
          if (useWidgets3DRuntime) {
            const tf = widgetTransformMap.get(item.id)
            if (tf) {
              model.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
                // InfoBoxModel 内部已给 CSS3DObject 设置了默认缩放（0.01）
                // 这里改为“相对缩放”，避免在 configurable 的 widgets3D runtime 路径中覆盖为 scale=1 导致信息框变大
                model.scene.scale.multiplyScalar(tf.scale)
              model.scene.rotation.set(degToRad(tf.rotationDeg[0]), degToRad(tf.rotationDeg[1]), degToRad(tf.rotationDeg[2]))
              modelPositions.set(item.id, [...tf.position])

            }
            const wp = widgetPropsMap.get(item.id)
              if (wp) {
                applyCustomProps(model, wp)
                applyInstanceExtrasFromCustom(model, wp)
              }
          } else {
            const itemCfg = modelsConfig.find((m) => m.id === item.id)
            if (itemCfg?.position) {
              model.scene.position.set(itemCfg.position[0], itemCfg.position[1], itemCfg.position[2])
              modelPositions.set(itemCfg.id, [...itemCfg.position])
            }
            if (itemCfg?.rotation) {
              model.scene.rotation.set(itemCfg.rotation[0], itemCfg.rotation[1], itemCfg.rotation[2])
            } else {
              model.scene.rotation.set(0, 0, 0)
            }
            if (itemCfg?.scale != null) {
              model.scene.scale.setScalar(itemCfg.scale)
            }
          }
          storyBoard.addModel(model)
        }
      }
      const infoBoxes = useWidgets3DRuntime ? [] : props.config?.infoBoxes ?? []
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
        const obj =
          boxConfig.renderType === 'sprite' ? createScene3DSpriteInfoBox(boxConfig) : createScene3DInfoBox(boxConfig)
        obj.position.set(x, y, z)
        if (boxConfig.rotation) {
          obj.rotation.set(boxConfig.rotation[0], boxConfig.rotation[1], boxConfig.rotation[2])
        } else {
          obj.rotation.set(0, 0, 0)
        }
        const boxLayer = boxConfig.layer ?? LayerDef.default
        obj.layers.set(LayerDef.normalize(boxLayer))
        storyBoard.scene.add(obj)
      }
      storyBoard.enableControls(world.getRendererDom())
      world.sceneTo(storyBoard)
      nextTick(() => world.notifyResize())
      if (el) {
        resizeObserver = new ResizeObserver(() => world.notifyResize())
        resizeObserver.observe(el)
      }
    },
    (): Model[] => {
      if (!useWidgets3DRuntime) {
        return modelsConfig.map((m) => {
          const source = m.source ?? ''
          if (source.startsWith('builtin:')) {
            const typeId = source.slice('builtin:'.length)
            const model = createModelByTypeId(typeId, m.id, undefined)
            if (model) return model
          }
          return new ModelLoadable(m.id, m.format ?? 'gltf', m.source)
        })
      }
      const list: Model[] = []
      for (const w of widgets3DConfig) {
        if (w.visible === false) continue
        const p = (w.props ?? {}) as Record<string, unknown>
        const typeId = String(p.typeId ?? '')
        if (!typeId) continue
        const rawSource = p.source != null ? String(p.source) : undefined
        const source = resolveModelUrl(rawSource)
        if ((typeId === 'gltf' || typeId === 'fbx') && !source) continue
        const model = createModelByTypeId(typeId, w.id, source)
        if (!model) continue
        // 只有部分模型需要依赖外部 layer 开关；其余模型让自身默认 layer 行为生效
        if (typeId === 'sprite-info-box') {
          model.layer = [LayerDef.sprite]
        } else if (typeId === 'info-box') {
          model.layer = toLayerArray(w.layer)
        } else {
          // expanding-ring / gltf/fbx 等默认使用 Object3D 默认 layer=0，
          // 不把 widget.layer 强行覆盖到 mesh 上，避免出现 configurable 中“只少某模型”的 layer mask 问题
          model.layer = []
        }
        model.props = { ...p }
        applyCustomProps(model, p)
        const pos = (p.position as [number, number, number] | undefined) ?? [0, 0, 0]
        const rawScale = p.scale
        const rawRotation = (p.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
        let scale = 1
        if (typeof rawScale === 'number') scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1
        else if (Array.isArray(rawScale)) scale = Number(rawScale[0]) || 1
        widgetPropsMap.set(w.id, p)
        widgetTransformMap.set(w.id, {
          position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
          scale,
          rotationDeg: [Number(rawRotation[0]) || 0, Number(rawRotation[1]) || 0, Number(rawRotation[2]) || 0]
        })
        list.push(model)
      }
      return list
    }
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
  min-height: 12.5rem;
}
.panelx-scene3d-framework canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
