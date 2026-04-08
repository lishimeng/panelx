<template>
  <div
    :id="containerId"
    ref="containerRef"
    class="panelx-scene3d-framework"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import type { CanvasTexture } from 'three'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, OrthographicCamera, PerspectiveCamera, Points, PointsMaterial, Vector3 } from 'three'
import {
  setup3D,
  ControlsStoryBoard,
  LayerDef,
  ModelLoadable,
  ORTHOGRAPHIC_FRUSTUM_SCALE,
  ORTHOGRAPHIC_F_CLIP,
  ORTHOGRAPHIC_N_CLIP,
  initialOrthographicZoomFromWorldSize,
  orthographicHalfFromWorldSize,
  minOrthographicOrbitDistanceFromWorldSize,
  worldSizeHasPositiveExtent,
  SimpleModel,
  modelRegistry
} from '../framework'
import type { World } from '../framework'
import type { Model } from '../framework'
import { createScene3DInfoBox, createScene3DSpriteInfoBox } from '../framework/Scene3DInfoBox'
import type { Scene3DConfig, Model3DItemConfig, WidgetConfig3D } from '../types/dashboard'
import { createStarPointSpriteTexture, startStarFieldXZAnimation } from '../utils/starFieldXZ'
import { degToRad } from '../utils/angle'
import { clamp01, toFiniteNumber, toPositiveNumber } from '../utils/number'
import { CommandManager } from '../utils/CommandManager'
import { CameraManager } from '../utils/CameraManager'
import { PropertyManager } from '../utils/PropertyManager'
import { StreamEngine } from '../utils/StreamEngine'
import type { CameraRequest, CommandRequest, PropertyRequest } from '../types'
import { dataChainLog, formatDataChainDetail } from '../core/comm/dataChainLog'
import { register3DCommandHandlers, register3DPropertyHandlers } from '../utils/manager3DRegistry'
import { create3DPropertyHandlers } from '../utils/manager3DHandlers'
import { create3DCommandHandlers } from '../utils/manager3DCommandHandlers'
import { create3DCameraHandlers } from '../utils/manager3DCameraHandlers'
import { register3DCameraHandlers } from '../utils/manager3DRegistry'

const props = defineProps<{
  /** 3D ???????????????????????statsStyle ????????? App ???????????*/
  config?: Scene3DConfig
}>()

const containerRef = ref<HTMLElement | null>(null)
const containerId = computed(() => `panelx-3d-framework-${Math.random().toString(36).slice(2, 10)}`)
let worldInstance: World | null = null
let resizeObserver: ResizeObserver | null = null
/** 运行时 id → 已入场景的 Model；由 Loader 登记库经 createModelInstance 克隆后加入 storyboard */
let runtimeSceneModelsById: Map<string, Model> | null = null
let runtimeStoryBoard: ControlsStoryBoard | null = null
/** starField ??? rAF ????????????? cancel */
let disposeStarFieldAnim: (() => void) | null = null
/** ????????????????????? dispose */
let starFieldPointTexture: CanvasTexture | null = null
const CUSTOM_PROPS_KEY = 'custom'
const MASK_COLOR_KEY = 'maskColor'
const MASK_OPACITY_KEY = 'maskOpacity'
const MASK_RADIUS_KEY = 'maskRadius'
const AUTO_ROTATE_ENABLED_KEY = 'autoRotateEnabled'
const AUTO_ROTATE_AXIS_KEY = 'autoRotateAxis'
const AUTO_ROTATE_SPEED_DEG_KEY = 'autoRotateSpeedDeg'
const FORWARD_ENABLED_KEY = 'forwardEnabled'
const FORWARD_X_KEY = 'forwardX'
const FORWARD_Y_KEY = 'forwardY'
const FORWARD_Z_KEY = 'forwardZ'

const UNSELECTED_OPACITY_MULTIPLIER = 0.5
const PERSPECTIVE_NEAR = 0.01
const PERSPECTIVE_FAR = 10000
const ORBIT_MIN_DISTANCE = 0.1
const ORBIT_MAX_DISTANCE = 5000

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

const RESERVED_WIDGET_PROP_KEYS = new Set(['typeId', 'source', 'position', 'scale', 'rotation', CUSTOM_PROPS_KEY])

function applyWidgetDirectProps(model: Model, props: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(props)) {
    if (RESERVED_WIDGET_PROP_KEYS.has(k)) continue
    try {
      model.propUpdate(k, v)
    } catch {
      // ignore unsupported props
    }
  }
}

function applyCustomProps(model: Model, props: Record<string, unknown>): void {
  const custom = props[CUSTOM_PROPS_KEY]
  if (!custom || typeof custom !== 'object') return
  for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
    // ????????????????????????????? applyInstanceExtrasFromCustom ????
    if (k === MASK_COLOR_KEY || k === MASK_OPACITY_KEY || k === MASK_RADIUS_KEY) continue
    if (k === AUTO_ROTATE_ENABLED_KEY || k === AUTO_ROTATE_AXIS_KEY || k === AUTO_ROTATE_SPEED_DEG_KEY) continue
    if (k === FORWARD_ENABLED_KEY || k === FORWARD_X_KEY || k === FORWARD_Y_KEY || k === FORWARD_Z_KEY) continue
    try {
      model.propUpdate(k, v)
    } catch {
      // ignore
    }
  }
}

/** ??Editor3D `useEditor3DSelectionTransform` ????????????? number ??[x,y,z] ???? */
function parseWidgetScaleVec(raw: unknown): [number, number, number] {
  if (typeof raw === 'number') {
    const v = toPositiveNumber(raw, 1)
    return [v, v, v]
  }
  if (Array.isArray(raw)) {
    return [
      toPositiveNumber(raw[0], 1),
      toPositiveNumber(raw[1], 1),
      toPositiveNumber(raw[2], 1)
    ]
  }
  return [1, 1, 1]
}

function applyInstanceExtrasFromCustom(model: Model, props: Record<string, unknown>): void {
  const custom = props[CUSTOM_PROPS_KEY]
  if (!custom || typeof custom !== 'object') return

  const c = custom as Record<string, unknown>

  // Apply mask settings from custom props.
  const maskColor = typeof c[MASK_COLOR_KEY] === 'string' ? c[MASK_COLOR_KEY] : '#38bdf8'
  const maskOpacityRaw = Number(c[MASK_OPACITY_KEY])
  const maskOpacity = Number.isFinite(maskOpacityRaw) ? clamp01(maskOpacityRaw) : 1
  const maskRadiusWorld = toPositiveNumber(c[MASK_RADIUS_KEY], 3)

  model.setMaskColor(maskColor)
  // ???????????????????????? editor ?????? unselected ????? opacity * 0.5
  model.setMaskOpacity(maskOpacity * UNSELECTED_OPACITY_MULTIPLIER)
  model.setMaskRadiusWorld(maskRadiusWorld)
  model.setMaskVisible(false)

  // Apply auto-rotate settings from custom props.
  const enabled = Boolean(c[AUTO_ROTATE_ENABLED_KEY])
  const axisRaw = c[AUTO_ROTATE_AXIS_KEY]
  const axis = axisRaw === 'x' || axisRaw === 'y' || axisRaw === 'z' ? axisRaw : 'y'
  const speedDeg = toFiniteNumber(c[AUTO_ROTATE_SPEED_DEG_KEY], 30)

  const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
  model.setAutoRotateAxis(axisVec)
  model.setAutoRotateEnabled(enabled)
  model.setAutoRotateSpeed(degToRad(speedDeg || 0))

  // Apply forward settings from custom props.
  const forwardEnabled = Boolean(c[FORWARD_ENABLED_KEY])
  const forwardX = toFiniteNumber(c[FORWARD_X_KEY], 1)
  const forwardY = toFiniteNumber(c[FORWARD_Y_KEY], 0)
  const forwardZ = toFiniteNumber(c[FORWARD_Z_KEY], 0)
  model.setForwardEnabled(forwardEnabled)
  model.setForwardAxis(new Vector3(forwardX, forwardY, forwardZ))
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
    { position: [number, number, number]; scale: [number, number, number]; rotationDeg: [number, number, number] }
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
      const ws0 = widgets3DConfig[0]?.worldSize
      const fallbackOrthographicSize =
        useWidgets3DRuntime && ws0 && worldSizeHasPositiveExtent(ws0)
          ? orthographicHalfFromWorldSize(ws0)
          : 5
      const orthographicSize =
        (cameraConfig?.orthographicSize ?? fallbackOrthographicSize) * ORTHOGRAPHIC_FRUSTUM_SCALE

      const camera = isOrthographic
        ? new OrthographicCamera(
            -orthographicSize * aspect,
            orthographicSize * aspect,
            orthographicSize,
            -orthographicSize,
            ORTHOGRAPHIC_N_CLIP,
            ORTHOGRAPHIC_F_CLIP
          )
        : new PerspectiveCamera(120, aspect, PERSPECTIVE_NEAR, PERSPECTIVE_FAR)
      if (isOrthographic) {
        const od = minOrthographicOrbitDistanceFromWorldSize(ws0 && worldSizeHasPositiveExtent(ws0) ? ws0 : undefined)
        camera.position.copy(new Vector3(1, 1, 1).normalize().multiplyScalar(od))
        ;(camera as OrthographicCamera).zoom = initialOrthographicZoomFromWorldSize(
          ws0 && worldSizeHasPositiveExtent(ws0) ? ws0 : undefined
        )
        ;(camera as OrthographicCamera).updateProjectionMatrix()
      } else {
        camera.position.set(2, 1.5, 2)
      }
      if (Array.isArray(cameraConfig?.position) && cameraConfig.position.length >= 3) {
        camera.position.set(
          Number(cameraConfig.position[0]) || 0,
          Number(cameraConfig.position[1]) || 0,
          Number(cameraConfig.position[2]) || 0
        )
      }
      const cameraZoom = Number(cameraConfig?.zoom)
      if (Number.isFinite(cameraZoom) && cameraZoom > 0) {
        camera.zoom = cameraZoom
        camera.updateProjectionMatrix()
      }

      const sceneOptions = {
        background: props.config?.background,
        lights: sceneLights,
        ...(isOrthographic && { orthographicSize })
      }
      const storyBoard = new ControlsStoryBoard('main', camera, sceneOptions)
      runtimeStoryBoard = storyBoard

      // Render star field only when scene3D.starField === true.
      if (props.config?.starField === true) {
        // XZ plane stars, Y fixed, with large/small point mixing.
        const STAR_COUNT_TOTAL = 80
        const STAR_LARGE_COUNT = Math.max(1, Math.round(STAR_COUNT_TOTAL / 7))
        const STAR_SMALL_COUNT = STAR_COUNT_TOTAL - STAR_LARGE_COUNT
        /** ?????????????????Y ??????????????????????????????????????????????z-fight */
        const STAR_PLANE_Y = 0
        const STAR_COLOR = new Color(0x38bdf8)
        const ext = Math.max(orthographicSize * aspect, orthographicSize)
        const pad = 1.12
        const halfW = isOrthographic ? ext * pad : 112
        const halfD = isOrthographic ? ext * pad : 112

        function fillStarBuffer(count: number): { pos: Float32Array; col: Float32Array } {
          const starPositions = new Float32Array(count * 3)
          const starColors = new Float32Array(count * 3)
          for (let i = 0; i < count; i++) {
            let x: number
            let z: number
            if (isOrthographic) {
              x = (Math.random() * 2 - 1) * halfW
              z = (Math.random() * 2 - 1) * halfD
            } else {
              const theta = Math.random() * Math.PI * 2
              const r = 18 + Math.random() * 92
              x = Math.cos(theta) * r
              z = Math.sin(theta) * r
            }

            starPositions[i * 3 + 0] = x
            starPositions[i * 3 + 1] = STAR_PLANE_Y
            starPositions[i * 3 + 2] = z

            // Roughly 1/7 stars are brighter.
            const isBright = Math.random() < 1 / 7
            const brightness = isBright ? 0.52 + Math.random() * 0.48 : 0.04 + Math.random() * 0.22
            const isWhite = isBright && Math.random() < 0.2
            const c = isWhite ? new Color(0xffffff) : STAR_COLOR
            const final = c.clone().multiplyScalar(brightness)
            starColors[i * 3 + 0] = final.r
            starColors[i * 3 + 1] = final.g
            starColors[i * 3 + 2] = final.b
          }
          return { pos: starPositions, col: starColors }
        }

        const smallBuf = fillStarBuffer(STAR_SMALL_COUNT)
        const largeBuf = fillStarBuffer(STAR_LARGE_COUNT)

        starFieldPointTexture?.dispose()
        starFieldPointTexture = createStarPointSpriteTexture(64)

        const pointSizeSmall = isOrthographic
          ? Math.max(4, Math.min(15, 3.4 + ext * 0.62))
          : Math.max(10, 18)
        const pointSizeLarge = isOrthographic
          ? Math.max(9, Math.min(26, 5.6 + ext * 1.05))
          : Math.max(20, 32)

        const matShared = {
          map: starFieldPointTexture,
          vertexColors: true,
          color: 0xffffff,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          blending: AdditiveBlending,
          sizeAttenuation: !isOrthographic
        } as const

        const geoSmall = new BufferGeometry()
        geoSmall.setAttribute('position', new Float32BufferAttribute(smallBuf.pos, 3))
        geoSmall.setAttribute('color', new Float32BufferAttribute(smallBuf.col, 3))
        const starFieldSmall = new Points(geoSmall, new PointsMaterial({ ...matShared, size: pointSizeSmall }))
        starFieldSmall.layers.enableAll()
        storyBoard.scene.add(starFieldSmall)

        const geoLarge = new BufferGeometry()
        geoLarge.setAttribute('position', new Float32BufferAttribute(largeBuf.pos, 3))
        geoLarge.setAttribute('color', new Float32BufferAttribute(largeBuf.col, 3))
        const starFieldLarge = new Points(geoLarge, new PointsMaterial({ ...matShared, size: pointSizeLarge }))
        starFieldLarge.layers.enableAll()
        storyBoard.scene.add(starFieldLarge)

        disposeStarFieldAnim?.()
        const stopSmall = startStarFieldXZAnimation(starFieldSmall, {
          count: STAR_SMALL_COUNT,
          halfW,
          halfD,
          planeY: STAR_PLANE_Y,
          twinkleRatio: 0.2,
          speedMin: 0.015,
          speedMax: 0.05
        })
        const stopLarge = startStarFieldXZAnimation(starFieldLarge, {
          count: STAR_LARGE_COUNT,
          halfW,
          halfD,
          planeY: STAR_PLANE_Y,
          twinkleRatio: 0.2,
          speedMin: 0.015,
          speedMax: 0.05
        })
        disposeStarFieldAnim = () => {
          stopSmall()
          stopLarge()
        }
      }

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
        // Avoid invalid camera mask=0.
        if (!anyEnabled) camera.layers.enable(LayerDef.default)
      } else {
        camera.layers.enable(LayerDef.default)
      }

      const store = loader.getTemplateStore()
      const sceneModelsById = new Map<string, Model>()
      runtimeSceneModelsById = sceneModelsById
      const runtimeModels = useWidgets3DRuntime
        ? widgets3DConfig.map((w) => ({ id: w.id, visible: w.visible, layer: w.layer }))
        : modelsConfig.map((m) => ({ id: m.id, visible: m.visible, layer: m.layer }))
      // Do not force widget/model layer onto all instances here.
      // Let model defaults decide; only info-box related types need config-driven layers.
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
        const model = store.createModelInstance(item.id)
        if (model?.scene) {
          if (useWidgets3DRuntime) {
            const tf = widgetTransformMap.get(item.id)
            if (tf) {
              model.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
              // Keep consistent with Editor3D: use full XYZ scale; CSS3D models apply *0.01.
              const cssMul = (model as unknown as { isCss3d?: boolean }).isCss3d ? 0.01 : 1
              const [sx, sy, sz] = tf.scale
              model.scene.scale.set(sx * cssMul, sy * cssMul, sz * cssMul)
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
          sceneModelsById.set(item.id, model)
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
      const cameraLookAt = (() => {
        if (Array.isArray(cameraConfig?.lookAt) && cameraConfig.lookAt.length >= 3) {
          return new Vector3(
            Number(cameraConfig.lookAt[0]) || 0,
            Number(cameraConfig.lookAt[1]) || 0,
            Number(cameraConfig.lookAt[2]) || 0
          )
        }
        return new Vector3(0, 0, 0)
      })()
      if (storyBoard.controls) {
        storyBoard.controls.target.copy(cameraLookAt)
        storyBoard.controls.update()
        if (isOrthographic) {
          const od = minOrthographicOrbitDistanceFromWorldSize(ws0 && worldSizeHasPositiveExtent(ws0) ? ws0 : undefined)
          storyBoard.controls.minDistance = Math.max(ORBIT_MIN_DISTANCE, od * 0.98)
          storyBoard.controls.maxDistance = Math.max(od * 20, 50000)
        } else {
          storyBoard.controls.minDistance = ORBIT_MIN_DISTANCE
          storyBoard.controls.maxDistance = ORBIT_MAX_DISTANCE
        }
      } else {
        camera.lookAt(cameraLookAt)
      }
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
        // Only some model types rely on external layer controls.
        if (typeId === 'sprite-info-box') {
          model.layer = [LayerDef.sprite]
        } else if (typeId === 'info-box') {
          model.layer = toLayerArray(w.layer)
        } else {
          // For most types keep Object3D default layer behavior (layer=0).
          model.layer = []
        }
        model.props = { ...p }
        applyWidgetDirectProps(model, p)
        applyCustomProps(model, p)
        const pos = (p.position as [number, number, number] | undefined) ?? [0, 0, 0]
        const rawRotation = (p.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
        const scaleVec = parseWidgetScaleVec(p.scale)
        widgetPropsMap.set(w.id, p)
        widgetTransformMap.set(w.id, {
          position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
          scale: scaleVec,
          rotationDeg: [Number(rawRotation[0]) || 0, Number(rawRotation[1]) || 0, Number(rawRotation[2]) || 0]
        })
        list.push(model)
      }
      return list
    }
  )
})

/**
 * Runtime command/property entry points for external callers.
 */
const commandManager = new CommandManager()
const cameraManager = new CameraManager()
const propertyManager = new PropertyManager()
const controlEngine = new StreamEngine(commandManager, propertyManager, cameraManager)

register3DCommandHandlers(
  commandManager,
  create3DCommandHandlers({
    getModelById: (id: string) => {
      return runtimeSceneModelsById?.get(id) ?? null
    }
  })
)

function executeCommand(req: CommandRequest): void {
  dataChainLog('Scene3DFramework.commandDispatch', {
    key: req.key,
    id: req.id,
    params: formatDataChainDetail(req.params ?? null, 8000)
  })
  commandManager.execute(req)
}

register3DPropertyHandlers(
  propertyManager,
  create3DPropertyHandlers((id: string) => {
    return runtimeSceneModelsById?.get(id) ?? null
  })
)

register3DCameraHandlers(
  cameraManager,
  create3DCameraHandlers({
    getCamera: () => {
      return (runtimeStoryBoard?.camera ?? null) as any
    }
  })
)

function executeProperty(req: PropertyRequest): void {
  propertyManager.execute(req)
}

function executeCamera(req: CameraRequest): void {
  cameraManager.execute(req)
}

defineExpose({
  executeCommand,
  executeProperty,
  executeCamera,
  registerControlSource: (source: Parameters<StreamEngine['registerSource']>[0]) => controlEngine.registerSource(source),
  startControlEngine: () => controlEngine.start(),
  stopControlEngine: () => controlEngine.stop(),
  pauseControlEngine: () => controlEngine.pause(),
  resumeControlEngine: () => controlEngine.resume()
})

onUnmounted(() => {
  void controlEngine.dispose()
  runtimeSceneModelsById = null
  disposeStarFieldAnim?.()
  disposeStarFieldAnim = null
  starFieldPointTexture?.dispose()
  starFieldPointTexture = null
  resizeObserver?.disconnect()
  resizeObserver = null
  if (worldInstance) {
    worldInstance.destroy()
    worldInstance = null
  }
  runtimeStoryBoard = null
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
