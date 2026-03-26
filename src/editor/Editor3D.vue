<template>
  <div class="panelx-editor3d">
    <LeftSidebar
      v-model:leftGroups="leftGroups"
      v-model:designSize3D="designSize3D"
      v-model:worldScale="worldScale"
      v-model:worldSizeZ="worldSizeZ"
      v-model:designCoord="designCoord"
      v-model:sceneLights="sceneLights"
      v-model:bloomStrength="bloomStrength"
      v-model:bloomRadius="bloomRadius"
      v-model:bloomThreshold="bloomThreshold"
      v-model:cameraZoom="cameraZoom"
      v-model:editorBackgroundColor="editorBackgroundColor"
      v-model:cameraLayers="cameraLayers"
      @camera-layer-change="applyCameraLayers"
      :scene-world-size="sceneWorldSize"
      :world-outer-style="worldOuterStyle"
      :model-types-by-group="modelTypesByGroup"
      :preset-models="presetModels"
      :on-drag-start-type="onDragStartType"
      :on-drag-start-preset="onDragStartPreset"
      :export-config="exportConfig"
      :save-draft-to-local-storage="saveDraftToLocalStorage"
      :trigger-import-config="triggerImportConfig"
      :create-robot-demo-scene="createRobotDemoScene"
      :datasource-probe-running="datasourceProbeRunning"
      :datasource-probe-hint="datasourceProbeHint"
      :datasource-probe-hint-variant="datasourceProbeHintVariant"
      :start-datasource-probe="startDatasourceProbeManual"
      :stop-datasource-probe="stopDatasourceProbeManual"
    />
    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="panelx-editor3d-file-input"
      @change="onImportConfigFile"
    />

    <MainArea
      :is-drag-over="isDragOver"
      :editor-background-color="editorBackgroundColor"
      :world-outer-style="worldOuterStyle"
      :widgets3D="widgets3D"
      :group-options="groupOptions"
      :selected-widget-id="selectedWidgetId"
      :floating-instance-list-open="floatingInstanceListOpen"
      :get-widget-display-name="getWidgetDisplayName"
      :format-widget-scale="formatWidgetScale"
      :on-select-widget="onSelectWidget"
      :clone-widget="cloneWidget"
      :delete-widget="deleteWidget"
      :on-create-group="createGroup"
      @dragover="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="onDrop"
      @update:floatingInstanceListOpen="floatingInstanceListOpen = $event"
    />

    <RightSidebar
      v-model:rightGroups="rightGroups"
      v-model:selectedWidgetId="selectedWidgetId"
      v-model:selectedWidgetIdText="selectedWidgetIdText"
      v-model:selectedWidgetIdError="selectedWidgetIdError"
      v-model:selectedWidgetGroupId="selectedWidgetGroupId"
      v-model:selectedWidgetName="selectedWidgetName"
      v-model:selectedPosition="selectedPosition"
      v-model:axisLock="axisLock"
      v-model:selectedScaleUniform="selectedScaleUniform"
      v-model:selectedScale="selectedScale"
      v-model:selectedRotation="selectedRotation"
      v-model:anchorWidgetId="anchorWidgetId"
      v-model:rotateCmd="rotateCmd"
      v-model:moveCmd="moveCmd"
      v-model:autoRotateCmd="autoRotateCmd"
      v-model:propertyRequestJson="propertyRequestJson"
      v-model:propertyRequestError="propertyRequestError"
      v-model:newPropKey="newPropKey"
      v-model:newPropValue="newPropValue"
      :widgets3D="widgets3D"
      :selected-widget-supported-props="selectedWidgetSupportedProps"
      :selected-widget-custom-props="selectedWidgetCustomProps"
      :custom-only-prop-entries="customOnlyPropEntries as any"
      :group-options="groupOptions"
      :rename-selected-widget-id="renameSelectedWidgetId"
      :on-position-input-change="onPositionInputChange"
      :on-scale-uniform-change="onScaleUniformChange"
      :on-scale-axis-change="onScaleAxisChange"
      :on-rotation-axis-change="onRotationAxisChange"
      :get-mask-settings="getMaskSettings"
      :on-mask-color-input="onMaskColorInput"
      :on-mask-opacity-input="onMaskOpacityInput"
      :on-mask-radius-input="onMaskRadiusInput"
      :set-custom-prop-value="setCustomPropValue as any"
      :remove-custom-prop="removeCustomProp"
      :add-custom-prop="addCustomProp"
      :execute-command="executeCommand"
      :execute-property="executeProperty"
    />

    <!-- 放下后弹出的位置/缩放对话框 -->
    <Teleport to="body">
      <div v-if="dropDialogVisible" class="panelx-editor3d-dialog-mask" @click.self="closeDropDialog">
        <div class="panelx-editor3d-dialog">
          <h3 class="panelx-editor3d-dialog-title">设置位置与缩放</h3>
          <p v-if="pendingDrop" class="panelx-editor3d-dialog-sub">{{ pendingDrop.label }}</p>
          <div class="panelx-editor3d-dialog-form">
            <label>位置 X <input v-model.number="dropForm.posX" type="number" step="any" /></label>
            <label>位置 Y <input v-model.number="dropForm.posY" type="number" step="any" /></label>
            <label>位置 Z <input v-model.number="dropForm.posZ" type="number" step="any" /></label>
            <label>缩放 <input v-model.number="dropForm.scale" type="number" step="any" min="0.01" /></label>
          </div>
          <div class="panelx-editor3d-dialog-actions">
            <button type="button" class="panelx-editor3d-dialog-btn" @click="closeDropDialog">取消</button>
            <button type="button" class="panelx-editor3d-dialog-btn primary" @click="confirmDropDialog">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import LeftSidebar from './editor3d/ui/LeftSidebar.vue'
import MainArea from './editor3d/ui/MainArea.vue'
import RightSidebar from './editor3d/ui/RightSidebar.vue'
import {
  LayerDef,
  modelRegistry,
  minOrthographicOrbitDistanceFromWorldSize,
  ORTHOGRAPHIC_FRUSTUM_SCALE,
  orthographicHalfFromWorldSize,
  setup3D
} from '../framework'
import type { DashboardConfig, WidgetConfig3D, Scene3DCameraLayerItem } from '../types/dashboard'
import type { BackendDataSourceConfig } from '../types'
import { loadDatasourceConfigFromStorage } from '../utils/datasourceConfigStorage'
import { resolveDatasourceUrl } from '../utils/resolveDatasourceUrl'
import { startSseDatasourceProbe } from '../utils/sseDatasourceProbe'
import { isDebugEnabled } from '../utils/logManager'
import { dataChainLog } from '../core/comm/dataChainLog'
import type { PropDefinition } from '../framework'
import type { Loader } from '../framework'
import { Color, Object3D, OrthographicCamera, Vector3 } from 'three'
import { BaseStoryBoard } from '../framework/storyboard/BaseStoryBoard'
import type { StoryBoard } from '../framework'
import type { Model } from '../framework'
import { designInputToWorldXZ, worldXZToDesignInput } from '../utils/coord3d'
import { useModelTypesByGroup } from './editor3d/useModelTypesByGroup'
import { useViewportLayout } from './editor3d/useViewportLayout'
import { saveEditor3DDraft } from '../utils/editor3dDraft'
import { useEditor3DManagers } from './editor3d/useEditor3DManagers'
import { useEditor3DDemoScene } from './editor3d/useEditor3DDemoScene'
import { useEditor3DDragDrop } from './editor3d/useEditor3DDragDrop'
import { useEditor3DSelectionTransform } from './editor3d/useEditor3DSelectionTransform'
import { useEditor3DSceneBinding } from './editor3d/useEditor3DSceneBinding'
import { useEditor3DCustomProps } from './editor3d/useEditor3DCustomProps'
import { degToRad } from '../utils/angle'
import { normalizeHexColor } from '../utils/color'
import { clamp01, percentToOpacityUnit, toFiniteNumber, toPositiveNumber } from '../utils/number'

/** 预设模型列表（由 examples 等注入），在侧栏「可用模型」中展示 */
defineProps<{
  presetModels?: Array<{ id: string; label: string; typeId: string; source?: string; name?: string }>
}>()

/** 3D 设计稿尺寸（与 Dashboard `config.design` 无关；用于 worldScale / 定位换算） */
const designSize3D = reactive({ width: 1920, height: 1080 })
/** 比例尺：world = design3D * scale。默认 0.01（将 1920 缩到 19.2，适配模型单位） */
const worldScale = ref(0.01)
/** world Z 尺寸：当前仅用于配置导出/展示（x/y 由设计尺寸与比例尺换算） */
const worldSizeZ = ref(1000)
const sceneWorldSize = computed<{ x: number; y: number; z: number }>(() => ({
  x: (Number(designSize3D.width) || 0) * (Number(worldScale.value) || 0),
  y: (Number(designSize3D.height) || 0) * (Number(worldScale.value) || 0),
  z: Number(worldSizeZ.value) || 0
}))
const sceneLights = reactive<{ ambient: number; hemisphere: number; point: number }>({
  ambient: 1.8,
  hemisphere: 2.0,
  point: 8.0
})
/** 先保证能看见泛光；若整屏发白再提高 Th、降低 St */
const bloomStrength = ref(0.55)
const bloomRadius = ref(0.22)
/** 默认 0.35：在关闭 tone mapping 后，emissive 区域能稳定超过阈值并泛光 */
const bloomThreshold = ref(0.35)
/** 相机 zoom（正交与透视均可设置；语义不同），默认 1。 */
const cameraZoom = ref(1)

/** 3D 编辑区背景色（主区域），可用色彩选择器配置 */
const editorBackgroundColor = ref('#0f172a')

/** 相机图层开关：控制相机渲染哪些层。编辑器中默认全部开启便于预览 */
const cameraLayers = reactive<Scene3DCameraLayerItem[]>(
  LayerDef.getAllLayers().map((layer) => ({ layer, enable: true }))
)

function applyCameraLayers(): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb?.camera) return
  const cam = sb.camera as { layers: { disableAll: () => void; enable: (n: number) => void } }
  cam.layers.disableAll()
  cameraLayers
    .filter((item) => item.enable)
    .forEach((item) => cam.layers.enable(LayerDef.normalize(item.layer)))
}

function applyCameraZoom(): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb?.camera) return
  const cam = sb.camera as { zoom?: number; updateProjectionMatrix?: () => void }
  const z = Number(cameraZoom.value)
  if (!Number.isFinite(z) || z <= 0) return
  cam.zoom = z
  cam.updateProjectionMatrix?.()
}

/** 3D world（由 setup3D 初始化；这里用最小接口以避免与具体实现强耦合） */
type WorldLike = {
  getSize: () => { x: number; y: number }
  destroy?: () => void
  notifyResize?: () => void
  getRendererDom?: () => HTMLCanvasElement
  setBloom?: (enabled: boolean, cfg?: { strength?: number; radius?: number; threshold?: number }) => void
  statsStyle?: (style: number) => void
  sceneTo?: (...args: any[]) => void
}
const worldRef = ref<WorldLike | null>(null)

/** 父容器实际像素（仅影响视口/相机 aspect；3D 世界坐标由 designSize3D + worldScale 等决定） */
const { viewportSize, worldOuterStyle } = useViewportLayout(worldRef)

/**
 * 3D Editor 坐标系（用于 XZ 转换）：
 * - 基础坐标为「3D 设计尺寸」坐标系
 * - 输入/定义：把“左上角”的 (x,y) 定义为 (0,0)
 * - origin 表示左上角在「3D 设计坐标」中的基准点
 * - 例：origin=(-10,-10)，输入(1,1) => 设计坐标(-9,-9) => 乘比例尺得到 world (x,z)
 */
const designCoord = reactive({
  enabled: true,
  originX: 0,
  originY: 0
})

function applyOrthographicByWorldSize(): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb) return
  const cam = sb.camera as unknown as OrthographicCamera
  // 兼容非正交相机：只在 orthographic camera 上应用
  if (!(cam as unknown as { isOrthographicCamera?: boolean }).isOrthographicCamera) return

  const size = viewportSize.value
  const aspect = size.y > 0 ? size.x / size.y : 1
  // 与 useEditor3DSceneBinding 一致：半高含 FRUSTUM_SCALE；相机须在包围球外，否则近裁会切入几何体
  const halfH = orthographicHalfFromWorldSize(sceneWorldSize.value) * ORTHOGRAPHIC_FRUSTUM_SCALE
  cam.top = halfH
  cam.bottom = -halfH
  cam.left = -halfH * aspect
  cam.right = halfH * aspect
  cam.updateProjectionMatrix()
  sb.syncOrthographicReferenceSize(halfH)

  const controls = (sb as unknown as { controls?: { target: Vector3; update: () => void; minDistance?: number; maxDistance?: number } }).controls
  if (controls) {
    const minD = minOrthographicOrbitDistanceFromWorldSize(sceneWorldSize.value)
    const target = controls.target
    const dist = cam.position.distanceTo(target)
    if (dist < minD) {
      let dir = cam.position.clone().sub(target)
      if (dir.lengthSq() < 1e-6) dir.set(1, 1, 1)
      dir.normalize()
      cam.position.copy(target.clone().add(dir.multiplyScalar(minD)))
      controls.update()
    }
    controls.minDistance = Math.max(0.1, minD * 0.98)
    controls.maxDistance = Math.max(minD * 20, 50000)
  }
}

watch(
  () => ({ x: sceneWorldSize.value.x, y: sceneWorldSize.value.y, z: sceneWorldSize.value.z }),
  () => applyOrthographicByWorldSize()
)

/** 监听灯光配置变更，实时更新当前场景的灯光强度 */
watch(
  () => ({ ambient: sceneLights.ambient, hemisphere: sceneLights.hemisphere, point: sceneLights.point }),
  (v) => {
    const sb = storyboardRef.value as BaseStoryBoard | null
    if (!sb) return
    if (typeof v.ambient === 'number') {
      sb.changeLight('ambientLight', v.ambient)
    }
    if (typeof v.hemisphere === 'number') {
      sb.changeLight('hesLight', v.hemisphere)
    }
    if (typeof v.point === 'number') {
      sb.changeLight('pointLight', v.point)
      // pointLightFill 与 pointLight 同步
      sb.changeLight('pointLightFill', v.point)
    }
  }
)

/** bloom 阈值：越高，参与泛光的像素越少（避免整模发白） */
watch(cameraLayers, () => applyCameraLayers(), { deep: true })
watch(cameraZoom, () => applyCameraZoom())

watch(
  () => ({ strength: bloomStrength.value, radius: bloomRadius.value, threshold: bloomThreshold.value }),
  (v) => {
    const world = worldRef.value
    if (!world?.setBloom) return
    const st = Number(v.strength)
    const rd = Number(v.radius)
    const th = Number(v.threshold)
    if (!Number.isFinite(st) || !Number.isFinite(rd) || !Number.isFinite(th)) return
    world.setBloom(true, {
      strength: Math.max(0, Math.min(5, st)),
      radius: Math.max(0, Math.min(2, rd)),
      threshold: Math.max(0, Math.min(2, th))
    })
  }
)

function applyEditorBackgroundColorToScene(): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb?.scene) return
  const raw = String(editorBackgroundColor.value ?? '').trim()
  const isTransparent = !raw || raw === 'transparent'
  if (isTransparent) {
    sb.scene.background = null
    return
  }
  try {
    sb.scene.background = new Color(raw)
  } catch {
    // ignore invalid css color text
  }
}

watch(editorBackgroundColor, () => applyEditorBackgroundColorToScene())

/** 按分组整理后的模型类型列表，用于左侧「模型类型」分组展示 */
const modelTypesByGroup = useModelTypesByGroup(modelRegistry)

/** 3D 编辑器当前配置：符合 DashboardConfig，widgets3D 符合 WidgetConfig3D 格式 */
const config = reactive<DashboardConfig>({
  design: { width: 1920, height: 1080 },
  widgets2D: [],
  widgets3D: []
})
const groupOptions = ref<string[]>(['default'])
const datasourceCatalog = ref<BackendDataSourceConfig[]>([])
let stopDatasourceProbe: (() => void) | null = null
const datasourceProbeRunning = ref(false)
const datasourceProbeHint = ref('')
const datasourceProbeHintVariant = ref<'info' | 'success' | 'warn' | 'error'>('info')
let datasourceProbeHintTimer: ReturnType<typeof setTimeout> | null = null

function logEditor3DDatasourceState(stage: string, list: BackendDataSourceConfig[]): void {
  const enabled = list.filter((d) => d.enable === true)
  const active = enabled[0] ?? list[0]
  dataChainLog('Editor3D.datasource', {
    stage,
    count: list.length,
    enabledCount: enabled.length,
    activeKey: active?.key ?? '',
    activeType: active?.type ?? '',
    keys: list.map((d) => d.key)
  })
}

function setDatasourceProbeHint(text: string, variant: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  datasourceProbeHint.value = text
  datasourceProbeHintVariant.value = variant
  if (datasourceProbeHintTimer) clearTimeout(datasourceProbeHintTimer)
  datasourceProbeHintTimer = setTimeout(() => {
    datasourceProbeHint.value = ''
    datasourceProbeHintTimer = null
  }, 3000)
}

function pickActiveDatasource(list: BackendDataSourceConfig[]): BackendDataSourceConfig | null {
  const enabled = list.filter((d) => d.enable === true)
  if (enabled.length > 1) return enabled[0] ?? null
  if (enabled.length === 1) return enabled[0]
  return list[0] ?? null
}

type ProbeRoute = { domain: '2d' | '3d'; action: 'command' | 'property' | 'camera' | 'chart' | 'other' }
let stopCameraMoveAnim: (() => void) | null = null

function parseProbeRoute(token: string): ProbeRoute | null {
  const t = String(token ?? '').trim().toLowerCase()
  const [d, a] = t.split('_')
  const domain = d === '2d' || d === '3d' ? d : null
  const action = a === 'command' || a === 'property' || a === 'camera' || a === 'chart' || a === 'other' ? a : null
  if (!domain || !action) return null
  return { domain, action }
}

function executeCameraRequest(input: unknown): void {
  const req = (input ?? {}) as { key?: unknown; params?: unknown }
  const key = String(req.key ?? '').trim()
  if (!key) return
  const p = (req.params ?? {}) as Record<string, unknown>
  const sb = storyboardRef.value as BaseStoryBoard | null
  const cam = sb?.camera as {
    position?: { set: (x: number, y: number, z: number) => void; x: number; y: number; z: number }
    zoom?: number
    lookAt?: (x: number, y: number, z: number) => void
    updateProjectionMatrix?: () => void
  } | null
  if (!cam) return
  if (key === 'camera.moveTo' && cam.position) {
    const pos = cam.position
    const x0 = pos.x
    const y0 = pos.y
    const z0 = pos.z
    const x1 = toFiniteNumber(p.x, x0)
    const y1 = toFiniteNumber(p.y, y0)
    const z1 = toFiniteNumber(p.z, z0)
    const durationMs = toPositiveNumber(p.durationMs, 1000)
    stopCameraMoveAnim?.()
    stopCameraMoveAnim = null

    if (durationMs <= 1) {
      pos.set(x1, y1, z1)
      const lk = p.lookAt as Record<string, unknown> | undefined
      if (lk && typeof lk === 'object') {
        cam.lookAt?.(toFiniteNumber(lk.x, 0), toFiniteNumber(lk.y, 0), toFiniteNumber(lk.z, 0))
      }
      dataChainLog('Editor3D.cameraDispatch', { key, params: req.params ?? null, applied: true, durationMs: 0 })
      return
    }

    let stopped = false
    const startedAt = performance.now()
    const step = (now: number) => {
      if (stopped) return
      const t = Math.max(0, Math.min(1, (now - startedAt) / durationMs))
      pos.set(
        x0 + (x1 - x0) * t,
        y0 + (y1 - y0) * t,
        z0 + (z1 - z0) * t
      )
      const lk = p.lookAt as Record<string, unknown> | undefined
      if (lk && typeof lk === 'object') {
        cam.lookAt?.(toFiniteNumber(lk.x, 0), toFiniteNumber(lk.y, 0), toFiniteNumber(lk.z, 0))
      }
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    stopCameraMoveAnim = () => {
      stopped = true
    }
    dataChainLog('Editor3D.cameraDispatch', { key, params: req.params ?? null, applied: true, durationMs })
    return
  }
  if (key === 'camera.zoomTo' && typeof cam.zoom === 'number') {
    cam.zoom = toPositiveNumber(p.zoom, cam.zoom)
    cam.updateProjectionMatrix?.()
    dataChainLog('Editor3D.cameraDispatch', { key, params: req.params ?? null, applied: true })
    return
  }
  dataChainLog('Editor3D.cameraDispatch', { key, params: req.params ?? null, applied: false, reason: 'unsupported_or_camera_unavailable' })
}

function dispatchProbeRoute(route: ProbeRoute, payload: unknown): void {
  if (route.domain !== '3d') return
  const req = (payload ?? {}) as { key?: unknown; id?: unknown; params?: unknown }
  if (route.action === 'command') {
    executeCommand({ key: String(req.key ?? ''), id: String(req.id ?? ''), params: req.params })
    return
  }
  if (route.action === 'property') {
    executePropertyRequest({ key: String(req.key ?? ''), id: String(req.id ?? ''), params: req.params })
    return
  }
  if (route.action === 'camera') {
    executeCameraRequest(req)
  }
}

function extractProbePayloads(eventName: string, rawData: string): Array<{ route: ProbeRoute; payload: unknown }> {
  const directRoute = parseProbeRoute(eventName)
  if (!directRoute) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(rawData)
  } catch {
    return []
  }
  const list = Array.isArray(parsed) ? parsed : [parsed]
  const out: Array<{ route: ProbeRoute; payload: unknown }> = []
  for (const item of list) {
    const rec = (item ?? {}) as Record<string, unknown>
    const header = rec.header as Record<string, unknown> | undefined
    const routeHeader = (header?.route ?? null) as Record<string, unknown> | null
    const routeFromHeader =
      routeHeader && typeof routeHeader === 'object'
        ? parseProbeRoute(`${String(routeHeader.domain ?? '')}_${String(routeHeader.action ?? '')}`)
        : header && typeof header === 'object'
          ? parseProbeRoute(`${String((header as any).domain ?? '')}_${String((header as any).action ?? '')}`)
          : null
    const route = routeFromHeader ?? directRoute
    const arrPayload = rec.payload
    if (Array.isArray(arrPayload)) {
      for (const row of arrPayload) {
        const r = (row ?? {}) as Record<string, unknown>
        out.push({ route, payload: r.payload ?? r })
      }
      continue
    }
    out.push({ route, payload: rec.payload ?? rec })
  }
  return out
}

function startDatasourceProbe(list: BackendDataSourceConfig[]): void {
  stopDatasourceProbe?.()
  stopDatasourceProbe = null
  datasourceProbeRunning.value = false
  const active = pickActiveDatasource(list)
  if (!active) {
    dataChainLog('Editor3D.datasourceProbe', { stage: 'skip', reason: 'no_active_datasource' })
    return
  }
  const url = resolveDatasourceUrl(active)

  if (active.type === 'sse') {
    datasourceProbeRunning.value = true
    const stop = startSseDatasourceProbe(
      url,
      (entry) => dataChainLog('Editor3D.datasourceProbe', entry),
      { key: active.key, sourceTag: 'Editor3D' },
      ({ eventName, data }) => {
        const packets = extractProbePayloads(eventName, data)
        for (const packet of packets) {
          dispatchProbeRoute(packet.route, packet.payload)
        }
      }
    )
    stopDatasourceProbe = () => {
      stop()
      datasourceProbeRunning.value = false
    }
    return
  }

  let timer: ReturnType<typeof setInterval> | null = null
  const poll = async () => {
    try {
      const res = await fetch(url, { method: active.method ?? 'GET' })
      const text = await res.text()
      dataChainLog('Editor3D.datasourceProbe', {
        stage: 'data',
        type: 'polling',
        key: active.key,
        status: res.status,
        rawLength: text.length
      })
    } catch (err) {
      dataChainLog('Editor3D.datasourceProbe', {
        stage: 'error',
        type: 'polling',
        key: active.key,
        message: String(err)
      })
    }
  }
  void poll()
  timer = setInterval(() => void poll(), Math.max(500, active.interval ?? 2000))
  datasourceProbeRunning.value = true
  stopDatasourceProbe = () => {
    if (timer) clearInterval(timer)
    timer = null
    datasourceProbeRunning.value = false
  }
}

function startDatasourceProbeManual(): void {
  dataChainLog('Editor3D.datasourceProbe.control', {
    action: 'start',
    running: datasourceProbeRunning.value,
    datasourceCount: datasourceCatalog.value.length
  })
  startDatasourceProbe(datasourceCatalog.value)
  setDatasourceProbeHint(datasourceProbeRunning.value ? '数据源已启动' : '未找到可启动的数据源', datasourceProbeRunning.value ? 'success' : 'warn')
}

function stopDatasourceProbeManual(): void {
  dataChainLog('Editor3D.datasourceProbe.control', {
    action: 'stop',
    running: datasourceProbeRunning.value
  })
  stopDatasourceProbe?.()
  stopDatasourceProbe = null
  datasourceProbeRunning.value = false
  setDatasourceProbeHint('数据源已停止', 'info')
}

const widgets3D = computed(() => config.widgets3D ?? [])

/** 3D world/loader/storyboard（由 setup3D 初始化） */
const loaderRef = ref<Loader | null>(null)
// worldRef 已提前声明（用于布局计算）
const storyboardRef = ref<StoryBoard | null>(null)
watch(
  () => storyboardRef.value,
  () => applyEditorBackgroundColorToScene()
)
const addedModelNames = new Set<string>()
const pendingTransforms = new Map<
  string,
  { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }
>()
/** widget id -> 已加入场景的 Object3D（用于删除时从 scene 移除） */
const addedModelNodes = new Map<string, Object3D>()
const {
  selectedWidgetId,
  anchorWidgetId,
  selectedPosition,
  selectedScale,
  selectedScaleUniform,
  selectedRotation,
  axisLock,
  onSelectWidget,
  onPositionInputChange,
  onScaleUniformChange,
  onScaleAxisChange,
  onRotationAxisChange
} = useEditor3DSelectionTransform({
  config,
  storyboardRef,
  addedModelNodes,
  pendingTransforms,
  designCoord,
  worldScale
})

const selectedWidgetName = computed<string>({
  get() {
    const id = selectedWidgetId.value
    if (!id) return ''
    const w = config.widgets3D?.find((item) => item.id === id)
    const name = (w?.props as Record<string, unknown> | undefined)?.name
    return typeof name === 'string' ? name : ''
  },
  set(v: string) {
    const id = selectedWidgetId.value
    if (!id) return
    const w = config.widgets3D?.find((item) => item.id === id)
    if (!w) return
    if (!w.props) w.props = {}
    const s = String(v ?? '').trim()
    if (s) (w.props as Record<string, unknown>).name = s
    else delete (w.props as Record<string, unknown>).name
  }
})

const selectedWidgetIdError = ref('')
const selectedWidgetIdText = computed<string>({
  get() {
    return selectedWidgetId.value ?? ''
  },
  set(v: string) {
    renameSelectedWidgetId(v)
  }
})
const selectedWidgetGroupId = computed<string>({
  get() {
    const id = selectedWidgetId.value
    if (!id) return 'default'
    const w = config.widgets3D?.find((item) => item.id === id)
    const gid = String(w?.groupId ?? 'default').trim() || 'default'
    return gid
  },
  set(v: string) {
    const id = selectedWidgetId.value
    if (!id) return
    const w = config.widgets3D?.find((item) => item.id === id)
    if (!w) return
    const gid = normalizeGroupId(v)
    ensureGroupExists(gid)
    w.groupId = gid
  }
})

/** 实例显示名：优先 props.name，回退到 widget.id。 */
function getWidgetDisplayName(w: WidgetConfig3D): string {
  const name = (w.props as Record<string, unknown> | undefined)?.name
  if (typeof name === 'string' && name.trim() !== '') return name.trim()
  return w.id
}

function renameSelectedWidgetId(nextIdRaw: string): void {
  const currentId = selectedWidgetId.value
  if (!currentId) return
  const nextId = String(nextIdRaw ?? '').trim()
  if (!nextId) {
    selectedWidgetIdError.value = '实例ID不能为空'
    return
  }
  if (nextId === currentId) {
    selectedWidgetIdError.value = ''
    return
  }
  const list = config.widgets3D ?? []
  if (list.some((w) => w.id === nextId)) {
    selectedWidgetIdError.value = `实例ID重复：${nextId}`
    return
  }
  const widget = list.find((w) => w.id === currentId)
  if (!widget) {
    selectedWidgetIdError.value = `未找到实例：${currentId}`
    return
  }

  widget.id = nextId
  selectedWidgetId.value = nextId
  if (anchorWidgetId.value === currentId) anchorWidgetId.value = nextId

  if (addedModelNames.has(currentId)) {
    addedModelNames.delete(currentId)
    addedModelNames.add(nextId)
  }
  if (pendingTransforms.has(currentId)) {
    const tf = pendingTransforms.get(currentId)!
    pendingTransforms.delete(currentId)
    pendingTransforms.set(nextId, tf)
  }
  if (addedModelNodes.has(currentId)) {
    const node = addedModelNodes.get(currentId)!
    addedModelNodes.delete(currentId)
    addedModelNodes.set(nextId, node)
  }

  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(currentId)
  if (model) model.modelName = nextId

  const storeMap = loaderRef.value?.getStore?.().getModels?.() as Map<string, Model> | undefined
  if (storeMap && storeMap.has(currentId)) {
    const m = storeMap.get(currentId)!
    storeMap.delete(currentId)
    storeMap.set(nextId, m)
  }
  selectedWidgetIdError.value = ''
  dataChainLog('Editor3D.renameWidgetId', { from: currentId, to: nextId })
}

function normalizeGroupId(raw: string): string {
  const text = String(raw ?? '').trim()
  return text || 'default'
}

function ensureGroupExists(groupId: string): void {
  const gid = normalizeGroupId(groupId)
  if (!groupOptions.value.includes(gid)) groupOptions.value.push(gid)
}

function ensureWidgetGroups(): void {
  const list = config.widgets3D ?? []
  for (const w of list) {
    w.groupId = normalizeGroupId(String(w.groupId ?? 'default'))
    ensureGroupExists(w.groupId)
  }
}

function createGroup(name: string): void {
  const gid = normalizeGroupId(name)
  ensureGroupExists(gid)
  dataChainLog('Editor3D.group.create', { groupId: gid, total: groupOptions.value.length })
}

const leftGroups = reactive({
  sceneOpen: true,
  typeOpen: true,
  presetOpen: true,
  opsOpen: true
})

/** 主区域左上角「已添加」实例列表是否展开（可收缩） */
const floatingInstanceListOpen = ref(true)

const rightGroups = reactive({
  transformOpen: true,
  propsOpen: true,
  commandsOpen: true,
  maskOpen: true
})

/** 选中模型的「自定义属性」存储在 w.props.custom，此处 key 与配置约定一致 */
const CUSTOM_PROPS_KEY = 'custom'

const MASK_COLOR_KEY = 'maskColor'
const MASK_OPACITY_KEY = 'maskOpacity'
const MASK_RADIUS_KEY = 'maskRadius'
const SELECTED_MASK_OPACITY = 0.75
const UNSELECTED_OPACITY_MULTIPLIER = 0.5

// 自旋转：持久化到 w.props.custom（每个模型实例各自独立）
const AUTO_ROTATE_ENABLED_KEY = 'autoRotateEnabled'
const AUTO_ROTATE_AXIS_KEY = 'autoRotateAxis' // 'x'|'y'|'z'
const AUTO_ROTATE_SPEED_DEG_KEY = 'autoRotateSpeedDeg' // 度/秒（editor UI 单位）

/** 根据 id 查找 widgets3D 中的实例配置。 */
function getWidgetById(id: string): WidgetConfig3D | undefined {
  return config.widgets3D?.find((w) => w.id === id)
}

/** 读取并归一化遮罩配置（颜色/透明度/半径）。 */
function getMaskSettings(id: string): { color: string; opacity: number; radiusWorld: number } {
  const w = getWidgetById(id)
  const custom = (w?.props as Record<string, unknown> | undefined)?.[CUSTOM_PROPS_KEY] as Record<string, unknown> | undefined
  const color = normalizeHexColor(custom?.[MASK_COLOR_KEY], '#38bdf8')
  const op = Number(custom?.[MASK_OPACITY_KEY])
  const opacity = Number.isFinite(op) ? clamp01(op) : 1
  const radiusWorld = toPositiveNumber(custom?.[MASK_RADIUS_KEY], 3)
  return { color, opacity, radiusWorld }
}

/** 读取并归一化自旋转配置（enabled/axis/speedDeg）。 */
function getAutoRotateSettings(id: string): { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number } {
  const w = getWidgetById(id)
  const custom = (w?.props as Record<string, unknown> | undefined)?.[CUSTOM_PROPS_KEY] as Record<string, unknown> | undefined
  const enabled = Boolean(custom?.[AUTO_ROTATE_ENABLED_KEY])
  const axisRaw = custom?.[AUTO_ROTATE_AXIS_KEY]
  const axis = axisRaw === 'x' || axisRaw === 'y' || axisRaw === 'z' ? axisRaw : ('y' as const)
  const speedDeg = toFiniteNumber(custom?.[AUTO_ROTATE_SPEED_DEG_KEY], 30)
  return { enabled, axis, speedDeg }
}

/** 将自旋转配置持久化到 widget.props.custom。 */
function setAutoRotateSettingsToCustom(id: string, next: { enabled?: boolean; axis?: 'x' | 'y' | 'z'; speedDeg?: number }): void {
  const w = getWidgetById(id)
  if (!w) return
  if (!w.props) w.props = {}
  const props = w.props as Record<string, unknown>
  if (typeof props[CUSTOM_PROPS_KEY] !== 'object' || props[CUSTOM_PROPS_KEY] === null) props[CUSTOM_PROPS_KEY] = {}
  const custom = props[CUSTOM_PROPS_KEY] as Record<string, unknown>
  if (next.enabled != null) custom[AUTO_ROTATE_ENABLED_KEY] = Boolean(next.enabled)
  if (next.axis != null) custom[AUTO_ROTATE_AXIS_KEY] = next.axis
  if (next.speedDeg != null && Number.isFinite(next.speedDeg)) custom[AUTO_ROTATE_SPEED_DEG_KEY] = next.speedDeg
}

/** 将遮罩配置持久化到 widget.props.custom。 */
function setMaskSettingsToCustom(id: string, next: { color?: string; opacity?: number; radiusWorld?: number }): void {
  const w = getWidgetById(id)
  if (!w) return
  if (!w.props) w.props = {}
  const props = w.props as Record<string, unknown>
  if (typeof props[CUSTOM_PROPS_KEY] !== 'object' || props[CUSTOM_PROPS_KEY] === null) props[CUSTOM_PROPS_KEY] = {}
  const custom = props[CUSTOM_PROPS_KEY] as Record<string, unknown>
  if (next.color != null) custom[MASK_COLOR_KEY] = normalizeHexColor(next.color)
  if (next.opacity != null && Number.isFinite(next.opacity)) custom[MASK_OPACITY_KEY] = clamp01(next.opacity)
  if (next.radiusWorld != null) {
    const radiusWorld = toPositiveNumber(next.radiusWorld, -1)
    if (radiusWorld > 0) custom[MASK_RADIUS_KEY] = radiusWorld
  }
}

/** 把当前遮罩配置应用到对应模型实例。 */
function applyMaskToModel(id: string, opts: { selected: boolean }): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  const { color, opacity, radiusWorld } = getMaskSettings(id)
  model.setMaskColor(color)
  model.setMaskRadiusWorld(radiusWorld)
  model.setMaskVisible(opts.selected)
  model.setMaskOpacity(opts.selected ? SELECTED_MASK_OPACITY : opacity * UNSELECTED_OPACITY_MULTIPLIER)
  model.refreshMask()
}

watch(
  () => selectedWidgetId.value,
  (next, prev) => {
    selectedWidgetIdError.value = ''
    if (prev) applyMaskToModel(prev, { selected: false })
    if (next) applyMaskToModel(next, { selected: true })
    if (next) {
      const ar = getAutoRotateSettings(next)
      autoRotateCmd.enabled = ar.enabled
      autoRotateCmd.axis = ar.axis
      autoRotateCmd.speedDeg = ar.speedDeg
    }
  }
)

/** 右侧遮罩颜色输入回调。 */
function onMaskColorInput(v: string): void {
  const id = selectedWidgetId.value
  if (!id) return
  setMaskSettingsToCustom(id, { color: v })
  applyMaskToModel(id, { selected: true })
}

/** 右侧遮罩透明度输入回调（百分比）。 */
function onMaskOpacityInput(percent: number): void {
  const id = selectedWidgetId.value
  if (!id) return
  const p = Number(percent)
  const opacity = percentToOpacityUnit(p, 1)
  setMaskSettingsToCustom(id, { opacity })
  applyMaskToModel(id, { selected: true })
}

/** 右侧遮罩半径输入回调（world 单位）。 */
function onMaskRadiusInput(radiusWorld: number): void {
  const id = selectedWidgetId.value
  if (!id) return
  const r = toPositiveNumber(radiusWorld, -1)
  if (r <= 0) return
  setMaskSettingsToCustom(id, { radiusWorld: r })
  applyMaskToModel(id, { selected: true })
}

const importInputRef = ref<HTMLInputElement | null>(null)

/** 打开导入文件对话框。 */
function triggerImportConfig(): void {
  importInputRef.value?.click()
}

async function onImportConfigFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // reset value so selecting the same file triggers change again
  input.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const payload = JSON.parse(text) as Partial<DashboardConfig>

    // 1) 清空当前场景已有实例（会 dispose）
    const existing = [...(config.widgets3D ?? [])] as WidgetConfig3D[]
    for (const w of existing) deleteWidget(w)

    // 2) 应用基础配置
    // 仅写入 Dashboard 级 `design`（供导出/大屏 2D 使用）；不在此编辑器内编辑，也不参与 3D 画布尺寸
    if (payload.design?.width && payload.design?.height) {
      const w = Number(payload.design.width)
      const h = Number(payload.design.height)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        config.design = { width: Math.floor(w), height: Math.floor(h) }
      }
    }
    if (typeof payload.background === 'string' && payload.background.trim() !== '') {
      editorBackgroundColor.value = payload.background
    }
    if (payload.debug != null) config.debug = payload.debug

    // 3) widgets3D
    const importedWidgets = (payload.widgets3D ?? []) as WidgetConfig3D[]
    config.widgets3D = importedWidgets.map((w) => ({
      ...w,
      groupId: normalizeGroupId(String(w.groupId ?? 'default')),
      props: w.props ? { ...(w.props as Record<string, unknown>) } : {}
    }))
    ensureWidgetGroups()

    // 3.1) sceneWorldSize：优先使用导入的 worldSize（取第一个 widget），否则按跟随策略决定
    const importedWorldSize = config.widgets3D?.[0]?.worldSize
    if (importedWorldSize) {
      // 以当前 3D 设计尺寸为基准推导比例尺：scale = world / design
      const dw = Number(designSize3D.width) || 0
      const dh = Number(designSize3D.height) || 0
      const sx = dw > 0 ? importedWorldSize.x / dw : undefined
      const sy = dh > 0 ? importedWorldSize.y / dh : undefined
      const derived = Number.isFinite(sx as number) ? (sx as number) : Number.isFinite(sy as number) ? (sy as number) : undefined
      if (derived != null) worldScale.value = derived
      worldSizeZ.value = importedWorldSize.z
    }

    // 4) 从 payload.scene3D 恢复灯光/Bloom/相机图层；不存在则兼容旧结构（第一个 widget.props）
    const scene3D = payload.scene3D

    if (scene3D?.lights) {
      const a = Number(scene3D.lights.ambient)
      const h = Number(scene3D.lights.hemisphere)
      const p = Number(scene3D.lights.point)
      if (Number.isFinite(a)) sceneLights.ambient = a
      if (Number.isFinite(h)) sceneLights.hemisphere = h
      if (Number.isFinite(p)) sceneLights.point = p
    } else {
      const firstLights = (config.widgets3D?.[0]?.props as Record<string, unknown> | undefined)?.sceneLights as
        | { ambient?: unknown; hemisphere?: unknown; point?: unknown }
        | undefined
      if (firstLights) {
        const a = Number(firstLights.ambient)
        const h = Number(firstLights.hemisphere)
        const p = Number(firstLights.point)
        if (Number.isFinite(a)) sceneLights.ambient = a
        if (Number.isFinite(h)) sceneLights.hemisphere = h
        if (Number.isFinite(p)) sceneLights.point = p
      }
    }

    if (scene3D?.bloom) {
      const s = Number(scene3D.bloom.strength)
      const r = Number(scene3D.bloom.radius)
      const t = Number(scene3D.bloom.threshold)
      if (Number.isFinite(s)) bloomStrength.value = Math.max(0, Math.min(5, s))
      if (Number.isFinite(r)) bloomRadius.value = Math.max(0, Math.min(2, r))
      if (Number.isFinite(t)) bloomThreshold.value = Math.max(0, Math.min(2, t))
    } else {
      const firstBloom = (config.widgets3D?.[0]?.props as Record<string, unknown> | undefined)?.sceneBloom as
        | { strength?: unknown; radius?: unknown; threshold?: unknown }
        | undefined
      if (firstBloom) {
        const s = Number(firstBloom.strength)
        const r = Number(firstBloom.radius)
        const t = Number(firstBloom.threshold)
        if (Number.isFinite(s)) bloomStrength.value = Math.max(0, Math.min(5, s))
        if (Number.isFinite(r)) bloomRadius.value = Math.max(0, Math.min(2, r))
        if (Number.isFinite(t)) bloomThreshold.value = Math.max(0, Math.min(2, t))
      }
    }

    if (scene3D?.camera?.layers && Array.isArray(scene3D.camera.layers)) {
      cameraLayers.splice(
        0,
        cameraLayers.length,
        ...scene3D.camera.layers.map((item) => ({
          layer: LayerDef.normalize(Number(item.layer ?? LayerDef.default)),
          enable: Boolean(item.enable)
        }))
      )
    } else {
      const firstCameraLayers = (config.widgets3D?.[0]?.props as Record<string, unknown> | undefined)?.cameraLayers as
        | Array<{ layer?: unknown; enable?: unknown }>
        | undefined
      if (firstCameraLayers && Array.isArray(firstCameraLayers)) {
        cameraLayers.splice(
          0,
          cameraLayers.length,
          ...firstCameraLayers.map((item) => ({
            layer: LayerDef.normalize(Number(item.layer ?? LayerDef.default)),
            enable: Boolean(item.enable)
          }))
        )
      }
    }
    if (scene3D?.camera?.zoom != null) {
      const z = Number(scene3D.camera.zoom)
      if (Number.isFinite(z) && z > 0) cameraZoom.value = z
    }

    // 5) 按配置重新加入场景
    await nextTick()
    applyOrthographicByWorldSize()
    applyCameraLayers()
    applyCameraZoom()
    for (const w of config.widgets3D ?? []) {
      addWidgetModelToScene(w)
    }
  } catch (err) {
    console.error('[Editor3D] import config failed:', err)
  }
}

/** 右侧命令框：旋转到（弧度）+ 速度（弧度/秒） */
const rotateCmd = reactive({
  x: 0,
  y: 0,
  z: 0,
  speed: Math.PI
})

const autoRotateCmd = reactive({
  enabled: false,
  axis: 'y' as 'x' | 'y' | 'z',
  speedDeg: 30
})

const moveCmd = reactive({
  x: 0,
  y: 0,
  z: 0,
  speed: 1
})
/** 通过 model id 获取 storyboard 中的实例（非 store clone）。 */
function getEditorModelById(id: string): Model | null {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb) return null
  if (!id) return null
  return (sb.getModelByName(id) as Model | undefined) ?? null
}
const {
  propertyRequestJson,
  propertyRequestError,
  executeCommand,
  executeProperty,
  executePropertyRequest,
  cleanupEditor3DManagers
} = useEditor3DManagers({
  getModelById: getEditorModelById,
  mapMoveParamsToWorld: (params) => {
    const x = toFiniteNumber(params.x, 0)
    const y = toFiniteNumber(params.y, 0)
    const z = toFiniteNumber(params.z, 0)
    if (!designCoord.enabled) return new Vector3(x, y, z)
    const xz = designInputToWorldXZ(x, z, designCoord.originX, designCoord.originY, worldScale.value)
    return new Vector3(xz.x, y, xz.z)
  },
  resolveAnchorId: (params) => (typeof params.anchorWidgetId === 'string' ? params.anchorWidgetId : ''),
  onAnchorResolved: (targetWorld) => {
    if (designCoord.enabled) {
      const xz = worldXZToDesignInput(targetWorld.x, targetWorld.z, designCoord.originX, designCoord.originY, worldScale.value)
      moveCmd.x = xz.x
      moveCmd.z = xz.y
      moveCmd.y = targetWorld.y
      return
    }
    moveCmd.x = targetWorld.x
    moveCmd.y = targetWorld.y
    moveCmd.z = targetWorld.z
  },
  onApplyAutoRotate: (id, next) => {
    setAutoRotateSettingsToCustom(id, next)
  }
})

/** 当前选中模型类型支持的 prop 列表（注册时配置），有 enum 的用下拉，无则自由输入 */
const selectedWidgetSupportedProps = computed((): PropDefinition[] => {
  const id = selectedWidgetId.value
  if (!id) return []
  const w = config.widgets3D?.find((item) => item.id === id)
  const typeId = (w?.props as Record<string, unknown> | undefined)?.typeId as string | undefined
  if (!typeId) return []
  const def = modelRegistry.getType(typeId)
  return def?.supportedProps ?? []
})

const {
  selectedWidgetCustomProps,
  customOnlyPropEntries,
  newPropKey,
  newPropValue,
  addCustomProp,
  setCustomPropValue,
  removeCustomProp
} = useEditor3DCustomProps({
  config,
  selectedWidgetId,
  storyboardRef,
  customPropsKey: CUSTOM_PROPS_KEY,
  selectedWidgetSupportedProps
})

/** 度转弧度。 */
const { addWidgetModelToScene, onFrameworkLoaded } = useEditor3DSceneBinding({
  loaderRef,
  worldRef,
  storyboardRef,
  addedModelNames,
  pendingTransforms,
  addedModelNodes,
  sceneWorldSize,
  sceneLights,
  designSize3D,
  bloomStrength,
  bloomRadius,
  bloomThreshold,
  customPropsKey: CUSTOM_PROPS_KEY,
  maskColorKey: MASK_COLOR_KEY,
  maskOpacityKey: MASK_OPACITY_KEY,
  maskRadiusKey: MASK_RADIUS_KEY,
  autoRotateEnabledKey: AUTO_ROTATE_ENABLED_KEY,
  autoRotateAxisKey: AUTO_ROTATE_AXIS_KEY,
  autoRotateSpeedDegKey: AUTO_ROTATE_SPEED_DEG_KEY,
  getAutoRotateSettings,
  normalizeLayerValues,
  applyLayersToObject,
  degToRad,
  applyCameraLayers,
  cameraZoomRef: cameraZoom
})

const { createRobotDemoScene, clearDemoInfoBoxes } = useEditor3DDemoScene({
  getStoryboard: () => (storyboardRef.value as BaseStoryBoard | null),
  widgets3D: () => config.widgets3D,
  ensureWidgets3D: () => {
    if (!config.widgets3D) config.widgets3D = []
    return config.widgets3D
  },
  addWidgetModelToScene,
  onSelectWidget
})

/** 归一化 layer 输入，过滤非法值并保证有默认层。 */
function normalizeLayerValues(layer: unknown): number[] {
  const valid = new Set(LayerDef.getAllLayers())
  const src = Array.isArray(layer) ? layer : [layer]
  const nums = src
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n))
    .filter((n) => valid.has(n))
  const uniq = Array.from(new Set(nums))
  return uniq.length ? uniq : [LayerDef.default]
}

/** 将 layer 集合应用到对象及其子对象。 */
function applyLayersToObject(obj: Object3D, values: number[]): void {
  const first = values[0] ?? LayerDef.default
  obj.traverse((child) => {
    child.layers.set(first)
    for (const l of values.slice(1)) child.layers.enable(l)
  })
}

/** 主区域是否处于拖拽悬停 */
const isDragOver = ref(false)


const {
  pendingDrop,
  dropDialogVisible,
  dropForm,
  onDragStartType,
  onDragStartPreset,
  onDrop: onDropInternal,
  closeDropDialog,
  confirmDropDialog
} = useEditor3DDragDrop({
  widgets3DRef: computed({
    get: () => config.widgets3D,
    set: (v) => {
      config.widgets3D = v
    }
  }),
  defaultGroupIdRef: selectedWidgetGroupId,
  customPropsKey: CUSTOM_PROPS_KEY,
  defaultLayer: LayerDef.default,
  spriteLayer: LayerDef.sprite,
  addWidgetModelToScene
})

/** 主区域 drop 包装：先清理拖拽态，再委托到 drag-drop composable。 */
function onDrop(e: DragEvent) {
  isDragOver.value = false
  onDropInternal(e)
}

/** 从主区域删除模型实例：从配置与场景中移除 */
function deleteWidget(w: WidgetConfig3D): void {
  const id = w.id
  const arr = config.widgets3D
  if (arr) {
    const idx = arr.findIndex((item) => item.id === id)
    if (idx !== -1) arr.splice(idx, 1)
  }
  addedModelNames.delete(id)
  pendingTransforms.delete(id)
  const obj = addedModelNodes.get(id)
  if (obj && storyboardRef.value) {
    ;(storyboardRef.value as BaseStoryBoard).removeModelByScene(obj)
    addedModelNodes.delete(id)
  }
  if (selectedWidgetId.value === id) {
    selectedWidgetId.value = null
  }
}

/** 克隆当前实例配置并立即加入场景。 */
function cloneWidget(source: WidgetConfig3D): void {
  const props = (source.props ? { ...(source.props as Record<string, unknown>) } : {}) as Record<string, unknown>
  const typeId = String(props.typeId ?? '')
  const id = `model-${typeId || source.id}-clone-${Date.now()}`

  // 深拷贝常见字段，避免复用引用
  const nextProps: Record<string, unknown> = { ...props }
  if (Array.isArray(props.position)) nextProps.position = [...(props.position as unknown[])] as unknown
  if (Array.isArray(props.scale)) nextProps.scale = [...(props.scale as unknown[])] as unknown
  if (Array.isArray(props.rotation)) nextProps.rotation = [...(props.rotation as unknown[])] as unknown
  if (typeof props.custom === 'object' && props.custom != null) nextProps.custom = { ...(props.custom as Record<string, unknown>) }

  const w: WidgetConfig3D = {
    ...source,
    id,
    groupId: normalizeGroupId(String(source.groupId ?? 'default')),
    props: nextProps
  }

  if (!config.widgets3D) config.widgets3D = []
  config.widgets3D.push(w)
  addWidgetModelToScene(w)
  onSelectWidget(w)
}


/** 将 scale 格式化为面板展示字符串。 */
function formatWidgetScale(scale: unknown): string {
  if (Array.isArray(scale)) {
    const [sx, sy, sz] = scale as unknown[]
    const toStr = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Number(v).toFixed(2).replace(/\.00$/, '') : '-'
    return `${toStr(sx)},${toStr(sy)},${toStr(sz)}`
  }
  if (typeof scale === 'number' && Number.isFinite(scale)) {
    return String(scale)
  }
  return '-'
}

onMounted(async () => {
  datasourceCatalog.value = loadDatasourceConfigFromStorage()
  logEditor3DDatasourceState('mounted', datasourceCatalog.value)
  if (isDebugEnabled()) {
    console.info('[Editor3D] datasource loaded from localStorage', {
      count: datasourceCatalog.value.length,
      keys: datasourceCatalog.value.map((d) => d.key)
    })
  }
  await nextTick()
  // 初始化 3D world：主区域容器内创建 renderer/canvas，并在资源加载完成后回调 onFrameworkLoaded
  setup3D('#panelx-editor3d-world', onFrameworkLoaded, () => [])
  ensureWidgetGroups()
})

onUnmounted(() => {
  stopCameraMoveAnim?.()
  stopCameraMoveAnim = null
  stopDatasourceProbeManual()
  if (datasourceProbeHintTimer) clearTimeout(datasourceProbeHintTimer)
  datasourceProbeHintTimer = null
  cleanupEditor3DManagers()
  clearDemoInfoBoxes()
  try {
    worldRef.value?.destroy?.()
  } catch {
    // ignore
  }
  loaderRef.value = null
  worldRef.value = null
  storyboardRef.value = null
})

/** 构建与「导出 JSON」一致的 Dashboard 片段（仅含 3D 相关字段 + design 供对齐），供文件下载与 localStorage 草稿共用 */
function buildDashboardExportPayload(): DashboardConfig {
  datasourceCatalog.value = loadDatasourceConfigFromStorage()
  logEditor3DDatasourceState('export', datasourceCatalog.value)
  if (isDebugEnabled()) {
    console.info('[Editor3D] datasource merged on export', {
      count: datasourceCatalog.value.length,
      keys: datasourceCatalog.value.map((d) => d.key)
    })
  }
  const store = loaderRef.value?.getStore()
  const payload: DashboardConfig = {
    design: { ...config.design },
    widgets2D: [],
    datasources: datasourceCatalog.value.map((d) => ({ ...d })),
    widgets3D: config.widgets3D?.length
      ? (config.widgets3D as WidgetConfig3D[]).map((w) => {
          const props = { ...(w.props ? { ...w.props } : {}) } as Record<string, unknown>
          const model = store?.getModel(w.id) as { source?: string } | undefined
          if (model?.source) props.source = model.source

          // 将每个模型实例的“遮罩/自旋转”状态落到 props.custom，保证导入后可重现
          const custom = (typeof props[CUSTOM_PROPS_KEY] === 'object' && props[CUSTOM_PROPS_KEY] !== null
            ? { ...(props[CUSTOM_PROPS_KEY] as Record<string, unknown>) }
            : {}) as Record<string, unknown>
          const ms = getMaskSettings(w.id)
          custom[MASK_COLOR_KEY] = ms.color
          custom[MASK_OPACITY_KEY] = ms.opacity
          custom[MASK_RADIUS_KEY] = ms.radiusWorld
          const ar = getAutoRotateSettings(w.id)
          custom[AUTO_ROTATE_ENABLED_KEY] = ar.enabled
          custom[AUTO_ROTATE_AXIS_KEY] = ar.axis
          custom[AUTO_ROTATE_SPEED_DEG_KEY] = ar.speedDeg
          props[CUSTOM_PROPS_KEY] = custom

          return {
            id: w.id,
            type: w.type,
            groupId: normalizeGroupId(String(w.groupId ?? 'default')),
            layer: w.layer,
            worldSize: w.worldSize ?? { x: sceneWorldSize.value.x, y: sceneWorldSize.value.y, z: sceneWorldSize.value.z },
            visible: w.visible,
            props
          }
        })
      : []
  }
  payload.scene3D = {
    lights: {
      ambient: sceneLights.ambient,
      hemisphere: sceneLights.hemisphere,
      point: sceneLights.point
    },
    bloom: {
      strength: bloomStrength.value,
      radius: bloomRadius.value,
      threshold: bloomThreshold.value
    },
    camera: {
      zoom: (() => {
        const cam = (storyboardRef.value as BaseStoryBoard | null)?.camera as OrthographicCamera | undefined
        const z = cam?.zoom
        return Number.isFinite(z) && (z as number) > 0 ? (z as number) : cameraZoom.value
      })(),
      layers: cameraLayers.map((item) => ({ layer: LayerDef.normalize(item.layer), enable: item.enable }))
    }
  }
  payload.background = editorBackgroundColor.value
  if (config.debug != null) payload.debug = config.debug
  return payload
}

/** 下载导出当前配置（dashboard-config-3d.json）。 */
function exportConfig() {
  const payload = buildDashboardExportPayload()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-config-3d.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** 保存当前 3D 配置到 localStorage，供 Editor2D 在「合并 3D」导出时使用 */
function saveDraftToLocalStorage() {
  saveEditor3DDraft(buildDashboardExportPayload())
}
</script>

<style>
.panelx-editor3d {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.panelx-editor3d-sidebar {
  flex-shrink: 0;
  width: 14rem;
  padding: 0.85rem 0.85rem;
  background: #1e293b;
  color: #e2e8f0;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 100%;
  overflow-y: auto;
}
.panelx-editor3d-sidebar-right {
  border-right: none;
  border-left: 1px solid #334155;
}
.panelx-editor3d-group-header {
  width: 100%;
  padding: 0.4rem 0.5rem;
  margin: 0.15rem 0 0.35rem;
  border: none;
  border-radius: 0.35rem;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.panelx-editor3d-group-header:hover {
  background: #1f2937;
}
.panelx-editor3d-group-toggle {
  font-size: 0.9rem;
}
.panelx-editor3d-sidebar h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}
.panelx-editor3d-size-display {
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.375rem;
  background: #0f172a;
  font-size: 0.75rem;
  color: #94a3b8;
}
.panelx-editor3d-size-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.panelx-editor3d-size-row-inputs {
  margin-top: 0.25rem;
}
.panelx-editor3d-size-label {
  flex-shrink: 0;
}
.panelx-editor3d-size-value {
  font-weight: 500;
}
.panelx-editor3d-error-text {
  color: #fca5a5;
  width: 100%;
}
.panelx-editor3d-size-inputs {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.panelx-editor3d-size-inputs label {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.panelx-editor3d-size-inputs input {
  width: 3rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-size-row-bg {
  margin-top: 0.25rem;
}
.panelx-editor3d-camera-layers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
}
.panelx-editor3d-camera-layer-item {
  white-space: nowrap;
}
.panelx-editor3d-color-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.panelx-editor3d-color-picker {
  width: 2rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #0f172a;
  cursor: pointer;
}
.panelx-editor3d-color-hex {
  width: 5rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.8125rem;
}
.panelx-editor3d-model-item:hover {
  background: #475569;
}
.panelx-editor3d-type-groups {
  margin-top: 0.25rem;
}
.panelx-editor3d-group-subheader {
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.panelx-editor3d-group-subheader:first-child {
  margin-top: 0;
}
.panelx-editor3d-model-label {
  font-weight: 500;
}
.panelx-editor3d-model-category {
  font-size: 0.6875rem;
  color: #94a3b8;
}
.panelx-editor3d-section {
  margin-top: 0.85rem;
}
.panelx-editor3d-preset {
  border-left: 2px solid #38bdf8;
}
.panelx-editor3d-ops {
  margin-top: 1.5rem;
}
.panelx-editor3d-btn {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
}
.panelx-editor3d-btn:hover {
  background: #475569;
}
.panelx-editor3d-file-input {
  display: none;
}
.panelx-editor3d-btn-inline {
  width: auto;
  margin-top: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
}
.panelx-editor3d-commands-body {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}
.panelx-editor3d-right-empty {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}
.panelx-editor3d-main {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  transition: outline 0.15s ease;
}
.panelx-editor3d-instance-float {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  min-width: 11rem;
  max-width: 20rem;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid #334155;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.panelx-editor3d-instance-float.collapsed {
  max-height: none;
}
.panelx-editor3d-instance-float-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid #334155;
  color: #e2e8f0;
  font-size: 0.8125rem;
  user-select: none;
}
.panelx-editor3d-instance-float.collapsed .panelx-editor3d-instance-float-header {
  border-bottom: none;
}
.panelx-editor3d-instance-float-header:hover {
  background: rgba(51, 65, 85, 0.9);
}
.panelx-editor3d-instance-float-title {
  font-weight: 500;
}
.panelx-editor3d-instance-float-body {
  overflow-y: auto;
  padding: 0.5rem;
}
.panelx-editor3d-instance-float-body .panelx-editor3d-widget-list {
  padding: 0;
}
.panelx-editor3d-main-drag-over {
  outline: 2px dashed #38bdf8;
  outline-offset: -4px;
}
.panelx-editor3d-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
}
.panelx-editor3d-world-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  border-radius: 0.5rem;
  overflow: hidden;
}
.panelx-editor3d-world {
  position: absolute;
  inset: 0;
}
.panelx-editor3d-world-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px dashed rgba(56, 189, 248, 0.6);
  color: #94a3b8;
  font-size: 0.875rem;
  text-align: center;
  pointer-events: none;
}
.panelx-editor3d-placeholder {
  color: #64748b;
  font-size: 0.875rem;
  text-align: center;
}
.panelx-editor3d-widget-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0 0;
  width: 100%;
}
.panelx-editor3d-widget-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  background: #1e293b;
  color: #94a3b8;
  font-size: 0.8125rem;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.panelx-editor3d-widget-tag.active {
  border: 1px solid #38bdf8;
}
.panelx-editor3d-widget-tag:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #e2e8f0;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.panelx-editor3d-widget-tag-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.panelx-editor3d-widget-delete {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #334155;
  color: #94a3b8;
  font-size: 0.75rem;
  cursor: pointer;
}
.panelx-editor3d-widget-clone {
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #334155;
  color: #94a3b8;
  font-size: 0.75rem;
  cursor: pointer;
}
.panelx-editor3d-widget-clone:hover {
  background: #475569;
  border-color: #475569;
  color: #fff;
}
.panelx-editor3d-widget-delete:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}
.panelx-editor3d-pos-editor {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}
.panelx-editor3d-pos-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panelx-editor3d-pos-row .panelx-editor3d-size-inputs {
  justify-content: flex-start;
}

.panelx-editor3d-props-editor {
  margin-top: 0.5rem;
}
.panelx-editor3d-props-other-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.5rem 0 0.25rem;
}
.panelx-editor3d-props-select {
  cursor: pointer;
  appearance: auto;
}
.panelx-editor3d-props-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.panelx-editor3d-props-row {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}
.panelx-editor3d-props-key {
  flex-shrink: 0;
  width: 5.5rem;
  max-width: 5.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panelx-editor3d-props-value {
  flex: 1;
  min-width: 7rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-props-remove {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.2rem;
  background: #475569;
  color: #e2e8f0;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.panelx-editor3d-props-remove:hover {
  background: #ef4444;
}
.panelx-editor3d-props-add {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.panelx-editor3d-props-key-in,
.panelx-editor3d-props-value-in {
  width: 4rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid #475569;
  background: #020617;
  color: #e2e8f0;
  font-size: 0.75rem;
}
.panelx-editor3d-props-value-in {
  flex: 1;
  min-width: 3rem;
}
.panelx-editor3d-props-add-btn {
  flex-shrink: 0;
  margin-top: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
}

/* 放下后弹出的对话框 */
.panelx-editor3d-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.panelx-editor3d-dialog {
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.25rem;
  min-width: 18rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.panelx-editor3d-dialog-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}
.panelx-editor3d-dialog-sub {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: #94a3b8;
}
.panelx-editor3d-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.panelx-editor3d-dialog-form label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.panelx-editor3d-dialog-form input {
  width: 6rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.875rem;
}
.panelx-editor3d-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.panelx-editor3d-dialog-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
}
.panelx-editor3d-dialog-btn.primary {
  background: #1890ff;
  border-color: #1890ff;
}
.panelx-editor3d-dialog-btn:hover {
  opacity: 0.9;
}
</style>
