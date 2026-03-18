<template>
  <div class="panelx-editor3d">
    <LeftSidebar
      v-model:leftGroups="leftGroups"
      v-model:designSize="designSize"
      v-model:designSize3D="designSize3D"
      v-model:worldScale="worldScale"
      v-model:worldSizeZ="worldSizeZ"
      v-model:designCoord="designCoord"
      v-model:sceneLights="sceneLights"
      v-model:editorBackgroundColor="editorBackgroundColor"
      :dpr="dpr"
      :viewport-size="viewportSize"
      :canvas-pixel-size="canvasPixelSize"
      :scene-world-size="sceneWorldSize"
      :world-outer-style="worldOuterStyle"
      :model-types-by-group="modelTypesByGroup"
      :preset-models="presetModels"
      :on-drag-start-type="onDragStartType"
      :on-drag-start-preset="onDragStartPreset"
      :export-config="exportConfig"
      :trigger-import-config="triggerImportConfig"
      :create-robot-demo-scene="createRobotDemoScene"
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
      :selected-widget-id="selectedWidgetId"
      :floating-instance-list-open="floatingInstanceListOpen"
      :get-widget-display-name="getWidgetDisplayName"
      :format-widget-scale="formatWidgetScale"
      :on-select-widget="onSelectWidget"
      :clone-widget="cloneWidget"
      :delete-widget="deleteWidget"
      @dragover="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="onDrop"
      @update:floatingInstanceListOpen="floatingInstanceListOpen = $event"
    />

    <RightSidebar
      v-model:rightGroups="rightGroups"
      v-model:selectedWidgetId="selectedWidgetId"
      v-model:selectedWidgetName="selectedWidgetName"
      v-model:selectedPosition="selectedPosition"
      v-model:axisLock="axisLock"
      v-model:selectedScaleUniform="selectedScaleUniform"
      v-model:selectedScale="selectedScale"
      v-model:selectedRotation="selectedRotation"
      v-model:rotateCmd="rotateCmd"
      v-model:moveCmd="moveCmd"
      v-model:autoRotateCmd="autoRotateCmd"
      v-model:newPropKey="newPropKey"
      v-model:newPropValue="newPropValue"
      :selected-widget-supported-props="selectedWidgetSupportedProps"
      :selected-widget-custom-props="selectedWidgetCustomProps"
      :custom-only-prop-entries="customOnlyPropEntries as any"
      :on-position-input-change="onPositionInputChange"
      :on-scale-uniform-change="onScaleUniformChange"
      :on-scale-axis-change="onScaleAxisChange"
      :on-rotation-axis-change="onRotationAxisChange"
      :get-mask-settings="getMaskSettings"
      :on-mask-color-input="onMaskColorInput"
      :on-mask-opacity-input="onMaskOpacityInput"
      :set-custom-prop-value="setCustomPropValue as any"
      :remove-custom-prop="removeCustomProp"
      :add-custom-prop="addCustomProp"
      :run-rotate-to-once="runRotateToOnce"
      :run-move-to-once="runMoveToOnce"
      :apply-auto-rotate="applyAutoRotateToSelected"
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
import { modelRegistry, setup3D } from '../framework'
import type { DashboardConfig, WidgetConfig3D } from '../types/dashboard'
import type { ModelTypeDefinition, PropDefinition } from '../framework'
import type { Loader } from '../framework'
import type { World } from '../framework'
import { Object3D, OrthographicCamera, Vector3 } from 'three'
import { BaseStoryBoard } from '../framework/storyboard/BaseStoryBoard'
import { ControlsStoryBoard } from '../framework/storyboard/ControlsStoryBoard'
import type { StoryBoard } from '../framework'
import type { Model } from '../framework'
import { ModelLoadable } from '../framework/model/ModelLoadable'
import { SimpleModel } from '../framework/model/SimpleModel'
import { designInputToWorldXZ, worldXZToDesignInput } from '../utils/coord3d'
import { useModelTypesByGroup } from './editor3d/useModelTypesByGroup'
import { useViewportLayout } from './editor3d/useViewportLayout'
import { createScene3DInfoBox } from '../framework/Scene3DInfoBox'
import type { Scene3DInfoBoxConfig } from '../types/dashboard'

/** 预设模型列表（由 examples 等注入），在侧栏「可用模型」中展示 */
defineProps<{
  presetModels?: Array<{ id: string; label: string; typeId: string; source?: string; name?: string }>
}>()

const DESIGN_SIZE_STORAGE_KEY = 'PanelX_DESIGN_SIZE'

function getDesignSizeFromStorage(): { width: number; height: number } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(DESIGN_SIZE_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { width?: unknown; height?: unknown }
    const w = Number(o?.width)
    const h = Number(o?.height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null
    return { width: Math.floor(w), height: Math.floor(h) }
  } catch {
    return null
  }
}

const initialDesign = getDesignSizeFromStorage() ?? { width: 1920, height: 1080 }
const designSize = reactive({ width: initialDesign.width, height: initialDesign.height })
/** 3D 设计尺寸（用于按比例尺换算世界尺寸），默认沿用 Dashboard 尺寸 */
const designSize3D = reactive({ width: initialDesign.width, height: initialDesign.height })
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

/** 3D 编辑区背景色（主区域），可用色彩选择器配置 */
const editorBackgroundColor = ref('#0f172a')

/** 3D world（由 setup3D 初始化；这里用最小接口以避免与具体实现强耦合） */
type WorldLike = {
  getSize: () => { x: number; y: number }
  destroy?: () => void
  notifyResize?: () => void
  getRendererDom?: () => HTMLCanvasElement
  statsStyle?: (style: number) => void
  sceneTo?: (...args: any[]) => void
}
const worldRef = ref<WorldLike | null>(null)

/** 父容器尺寸（跟随 dashboard 设计尺寸，只控制宽高比，不影响 3D 世界坐标系） */
const { dpr, viewportSize, canvasPixelSize, worldOuterStyle } = useViewportLayout(designSize, worldRef)

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
  // 约定：WorldSize.y 表示可视高度（世界单位）
  const worldH = Math.max(0.0001, sceneWorldSize.value.y)
  const halfH = worldH / 2
  cam.top = halfH
  cam.bottom = -halfH
  cam.left = -halfH * aspect
  cam.right = halfH * aspect
  cam.updateProjectionMatrix()
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

/** 拖拽 payload：模型类型 */
interface DragPayloadType {
  kind: 'type'
  id: string
  label: string
}
/** 拖拽 payload：预设模型 */
interface DragPayloadPreset {
  kind: 'preset'
  id: string
  label: string
  typeId: string
  source?: string
  name?: string
}
const DRAG_TYPE = 'application/panelx-3d-model'

/** 按分组整理后的模型类型列表，用于左侧「模型类型」分组展示 */
const modelTypesByGroup = useModelTypesByGroup(modelRegistry)

/** 3D 编辑器当前配置：符合 DashboardConfig，widgets3D 符合 WidgetConfig3D 格式 */
const config = reactive<DashboardConfig>({
  design: { width: 1920, height: 1080 },
  widgets2D: [],
  widgets3D: []
})

const widgets3D = computed(() => config.widgets3D ?? [])

/** 3D world/loader/storyboard（由 setup3D 初始化） */
const loaderRef = ref<Loader | null>(null)
// worldRef 已提前声明（用于布局计算）
const storyboardRef = ref<StoryBoard | null>(null)
const addedModelNames = new Set<string>()
const pendingTransforms = new Map<
  string,
  { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }
>()
/** widget id -> 已加入场景的 Object3D（用于删除时从 scene 移除） */
const addedModelNodes = new Map<string, Object3D>()

const selectedWidgetId = ref<string | null>(null)
const selectedPosition = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
const selectedScale = reactive<{ x: number; y: number; z: number }>({ x: 1, y: 1, z: 1 })
const selectedScaleUniform = ref(1)
const selectedRotation = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
const axisLock = reactive<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false })

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

function getWidgetDisplayName(w: WidgetConfig3D): string {
  const name = (w.props as Record<string, unknown> | undefined)?.name
  if (typeof name === 'string' && name.trim() !== '') return name.trim()
  return w.id
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
const SELECTED_MASK_OPACITY = 0.75
const UNSELECTED_OPACITY_MULTIPLIER = 0.5

function toHexColorString(v: unknown, fallback = '#38bdf8'): string {
  if (typeof v !== 'string') return fallback
  const s = v.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return fallback
}

function getWidgetById(id: string): WidgetConfig3D | undefined {
  return config.widgets3D?.find((w) => w.id === id)
}

function getMaskSettings(id: string): { color: string; opacity: number } {
  const w = getWidgetById(id)
  const custom = (w?.props as Record<string, unknown> | undefined)?.[CUSTOM_PROPS_KEY] as Record<string, unknown> | undefined
  const color = toHexColorString(custom?.[MASK_COLOR_KEY], '#38bdf8')
  const op = Number(custom?.[MASK_OPACITY_KEY])
  const opacity = Number.isFinite(op) ? Math.min(1, Math.max(0, op)) : 1
  return { color, opacity }
}

function setMaskSettingsToCustom(id: string, next: { color?: string; opacity?: number }): void {
  const w = getWidgetById(id)
  if (!w) return
  if (!w.props) w.props = {}
  const props = w.props as Record<string, unknown>
  if (typeof props[CUSTOM_PROPS_KEY] !== 'object' || props[CUSTOM_PROPS_KEY] === null) props[CUSTOM_PROPS_KEY] = {}
  const custom = props[CUSTOM_PROPS_KEY] as Record<string, unknown>
  if (next.color != null) custom[MASK_COLOR_KEY] = toHexColorString(next.color)
  if (next.opacity != null && Number.isFinite(next.opacity)) custom[MASK_OPACITY_KEY] = Math.min(1, Math.max(0, next.opacity))
}

function applyMaskToModel(id: string, opts: { selected: boolean }): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  const { color, opacity } = getMaskSettings(id)
  model.setMaskColor(color)
  model.setMaskVisible(opts.selected)
  model.setMaskOpacity(opts.selected ? SELECTED_MASK_OPACITY : opacity * UNSELECTED_OPACITY_MULTIPLIER)
  model.refreshMask()
}

watch(
  () => selectedWidgetId.value,
  (next, prev) => {
    if (prev) applyMaskToModel(prev, { selected: false })
    if (next) applyMaskToModel(next, { selected: true })
  }
)

function onMaskColorInput(v: string): void {
  const id = selectedWidgetId.value
  if (!id) return
  setMaskSettingsToCustom(id, { color: v })
  applyMaskToModel(id, { selected: true })
}

function onMaskOpacityInput(percent: number): void {
  const id = selectedWidgetId.value
  if (!id) return
  const p = Number(percent)
  const opacity = Number.isFinite(p) ? Math.min(1, Math.max(0, p / 100)) : 1
  setMaskSettingsToCustom(id, { opacity })
  applyMaskToModel(id, { selected: true })
}

const importInputRef = ref<HTMLInputElement | null>(null)

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
    if (payload.design?.width && payload.design?.height) {
      designSize.width = Number(payload.design.width) || designSize.width
      designSize.height = Number(payload.design.height) || designSize.height
      config.design = { width: designSize.width, height: designSize.height }
    }
    if (typeof payload.background === 'string' && payload.background.trim() !== '') {
      editorBackgroundColor.value = payload.background
    }
    if (payload.debug != null) config.debug = payload.debug

    // 3) widgets3D
    const importedWidgets = (payload.widgets3D ?? []) as WidgetConfig3D[]
    config.widgets3D = importedWidgets.map((w) => ({
      ...w,
      props: w.props ? { ...(w.props as Record<string, unknown>) } : {}
    }))

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
    } else {
      // 无 worldSize 时，默认 3D 设计尺寸沿用 Dashboard
      designSize3D.width = designSize.width
      designSize3D.height = designSize.height
    }

    // 4) 如果 props.sceneLights 存在，恢复灯光（取第一个 widget 的 sceneLights）
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

    // 5) 按配置重新加入场景
    await nextTick()
    applyOrthographicByWorldSize()
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

const DEMO_ROBOT_ID = 'demo-robot'
let demoInfoBoxes: Object3D[] = []

function runRotateToOnce(): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  model.setRotateSpeed(Number.isFinite(rotateCmd.speed) ? rotateCmd.speed : Math.PI)
  // Editor 输入为“角度”，Model 内部使用“弧度”
  model.rotateTo(new Vector3(degToRad(rotateCmd.x || 0), degToRad(rotateCmd.y || 0), degToRad(rotateCmd.z || 0)))
}

const moveCmd = reactive({
  x: 0,
  y: 0,
  z: 0,
  speed: 1
})

function applyAutoRotateToSelected(): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  const axis = autoRotateCmd.axis
  const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
  model.setAutoRotateAxis(axisVec)
  model.setAutoRotateSpeed(degToRad(autoRotateCmd.speedDeg || 0))
  model.setAutoRotateEnabled(Boolean(autoRotateCmd.enabled))
}

function clearDemoInfoBoxes(): void {
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb) return
  for (const obj of demoInfoBoxes) {
    try {
      sb.css3dManager.remove(obj.uuid)
      sb.scene.remove(obj)
      obj.removeFromParent()
    } catch {
      // ignore
    }
  }
  demoInfoBoxes = []
}

async function createRobotDemoScene(): Promise<void> {
  clearDemoInfoBoxes()

  const existing = config.widgets3D?.find((w) => w.id === DEMO_ROBOT_ID)
  if (!existing) {
    const w: WidgetConfig3D = {
      id: DEMO_ROBOT_ID,
      type: 'model3d',
      visible: true,
      props: {
        typeId: 'gltf',
        source: '/models/RobotExpressive.glb',
        position: [0, 0, 0],
        scale: 1,
        rotation: [0, 0, 0],
        name: 'Robot'
      }
    }
    if (!config.widgets3D) config.widgets3D = []
    config.widgets3D.push(w)
    addWidgetModelToScene(w)
    onSelectWidget(w)
  } else {
    onSelectWidget(existing)
  }

  await nextTick()
  const sb = storyboardRef.value as BaseStoryBoard | null
  if (!sb) return

  let model = sb.getModelByName(DEMO_ROBOT_ID)
  for (let i = 0; i < 60 && !model; i++) {
    await new Promise((r) => setTimeout(r, 50))
    model = sb.getModelByName(DEMO_ROBOT_ID)
  }
  if (!model || !model.scene) return

  model.setAutoRotateAxis(new Vector3(0, 1, 0))
  model.setAutoRotateSpeed(degToRad(30))
  model.setAutoRotateEnabled(true)

  const base: Omit<Scene3DInfoBoxConfig, 'id' | 'title' | 'equipmentId' | 'status'> = {
    visible: true,
    statusType: 'normal',
    colorPreset: 'info',
    runningTime: '12.3 h'
  }
  const configs: Scene3DInfoBoxConfig[] = [
    { ...base, id: 'demo-box-1', title: 'Robot / Telemetry', equipmentId: 'RB-001', status: 'ONLINE', message: 'Link stable · 0.8ms' },
    { ...base, id: 'demo-box-2', title: 'Power Core', equipmentId: 'PWR-7A', status: 'OK', message: 'Battery 87% · Temp 36℃', colorPreset: 'success' },
    { ...base, id: 'demo-box-3', title: 'Navigation', equipmentId: 'NAV-3', status: 'OK', message: 'IMU locked · Map synced', colorPreset: 'info' },
    { ...base, id: 'demo-box-4', title: 'Safety', equipmentId: 'SAFE-2', status: 'WARN', statusType: 'warning', message: 'Proximity alert: 1.2m', colorPreset: 'warning' }
  ]
  const offsets: Array<[number, number, number]> = [
    [2.2, 1.4, 0],
    [-2.2, 1.4, 0],
    [0, 1.4, 2.2],
    [0, 1.4, -2.2]
  ]
  for (let i = 0; i < configs.length; i++) {
    const css3d = createScene3DInfoBox(configs[i])
    const [ox, oy, oz] = offsets[i]
    // 信息框固定在世界坐标中：仅 robot 自旋转，信息框不跟随旋转/不移动
    const basePos = model.scene.position
    css3d.position.set(basePos.x + ox, basePos.y + oy, basePos.z + oz)
    css3d.rotation.set(0, 0, 0)
    sb.scene.add(css3d)
    sb.css3dManager.register(css3d)
    demoInfoBoxes.push(css3d)
  }
}

function runMoveToOnce(): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (!model) return
  model.setMoveSpeed(Number.isFinite(moveCmd.speed) ? moveCmd.speed : 1)
  if (designCoord.enabled) {
    const xz = designInputToWorldXZ(moveCmd.x || 0, moveCmd.z || 0, designCoord.originX, designCoord.originY, worldScale.value)
    model.moveTo(new Vector3(xz.x, moveCmd.y || 0, xz.z))
  } else {
    model.moveTo(new Vector3(moveCmd.x || 0, moveCmd.y || 0, moveCmd.z || 0))
  }
}

/** 当前选中 widget 的 custom 对象（用于右侧栏 Props 配置），保证存在且可写 */
const selectedWidgetCustomProps = computed(() => {
  const id = selectedWidgetId.value
  if (!id) return {}
  const w = config.widgets3D?.find((item) => item.id === id)
  if (!w) return {}
  if (!w.props) w.props = {}
  if (typeof (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] !== 'object' || (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] === null) {
    (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] = {}
  }
  return (w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] as Record<string, string | number>
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

/** 仅「非支持列表」中的 custom 键值，用于「其他属性」展示与编辑 */
const customOnlyPropEntries = computed(() => {
  const supportedKeys = new Set(selectedWidgetSupportedProps.value.map((p) => p.key))
  return Object.entries(selectedWidgetCustomProps.value).filter(([k]) => !supportedKeys.has(k))
})

const newPropKey = ref('')
const newPropValue = ref('')

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 主区域是否处于拖拽悬停 */
const isDragOver = ref(false)

function onSelectWidget(w: WidgetConfig3D): void {
  selectedWidgetId.value = w.id
  const pos = (w.props?.position as [number, number, number] | undefined) ?? [0, 0, 0]
  if (designCoord.enabled) {
    const ui = worldXZToDesignInput(pos[0] ?? 0, pos[2] ?? 0, designCoord.originX, designCoord.originY, worldScale.value)
    selectedPosition.x = ui.x
    selectedPosition.z = ui.y
  } else {
    selectedPosition.x = pos[0] ?? 0
    selectedPosition.z = pos[2] ?? 0
  }
  selectedPosition.y = pos[1] ?? 0
  const rawScale = (w.props?.scale as unknown) ?? 1
  let sx = 1
  let sy = 1
  let sz = 1
  if (Array.isArray(rawScale)) {
    sx = Number(rawScale[0]) || 1
    sy = Number(rawScale[1]) || 1
    sz = Number(rawScale[2]) || 1
  } else if (typeof rawScale === 'number') {
    sx = sy = sz = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1
  }
  selectedScale.x = sx
  selectedScale.y = sy
  selectedScale.z = sz
  selectedScaleUniform.value = sx

  const rot = (w.props?.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
  selectedRotation.x = rot[0] ?? 0
  selectedRotation.y = rot[1] ?? 0
  selectedRotation.z = rot[2] ?? 0
}

/** 模型类型拖入：拖起时写入 payload */
function onDragStartType(e: DragEvent, item: ModelTypeDefinition) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'type', id: item.id, label: item.label }))
}

/** 预设模型拖入：拖起时写入 payload */
function onDragStartPreset(
  e: DragEvent,
  p: { id: string; label: string; typeId: string; source?: string; name?: string }
) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(
    DRAG_TYPE,
    JSON.stringify({
      kind: 'preset',
      id: p.id,
      label: p.label,
      typeId: p.typeId,
      source: p.source,
      name: p.name
    })
  )
}

/** 放下后待确认的数据 */
const pendingDrop = ref<DragPayloadType | DragPayloadPreset | null>(null)
const dropDialogVisible = ref(false)
const dropForm = reactive({ posX: 0, posY: 0, posZ: 0, scale: 1 })

/** 主区域放下：确认后弹出对话框 */
function onDrop(e: DragEvent) {
  isDragOver.value = false
  const raw = e.dataTransfer?.getData(DRAG_TYPE)
  if (!raw) return
  try {
    const payload = JSON.parse(raw) as DragPayloadType | DragPayloadPreset
    if (payload.kind !== 'type' && payload.kind !== 'preset') return
    pendingDrop.value = payload
    dropForm.posX = 0
    dropForm.posY = 0
    dropForm.posZ = 0
    dropForm.scale = 1
    dropDialogVisible.value = true
  } catch {
    // ignore
  }
}

function closeDropDialog() {
  dropDialogVisible.value = false
  pendingDrop.value = null
}

function confirmDropDialog() {
  const payload = pendingDrop.value
  if (!payload) {
    closeDropDialog()
    return
  }
  const id = `model-${payload.id}-${Date.now()}`
  const position: [number, number, number] = [
    Number(dropForm.posX) || 0,
    Number(dropForm.posY) || 0,
    Number(dropForm.posZ) || 0
  ]
  const scale = Number(dropForm.scale)
  const scaleVal = Number.isFinite(scale) && scale > 0 ? scale : 1
  const w: WidgetConfig3D = {
    id,
    type: 'model3d',
    visible: true,
    props: {
      position,
      scale: scaleVal
    }
  }
  if (payload.kind === 'preset') {
    w.props!.source = payload.source
    w.props!.typeId = payload.typeId
    w.props!.name = payload.name ?? payload.id
  } else {
    w.props!.typeId = payload.id
  }

  // info-box：给一个默认的 custom，拖入后立即有内容可见
  if (w.props!.typeId === 'info-box') {
    ;(w.props as Record<string, unknown>)[CUSTOM_PROPS_KEY] = {
      title: 'Robot / Telemetry',
      equipmentId: 'RB-001',
      status: 'ONLINE',
      statusType: 'normal',
      colorPreset: 'info',
      fx: 'scanlines',
      runningTime: '12.3 h',
      message: 'Link stable · 0.8ms'
    }
    // CSS3D 默认有 0.01 scale；这里默认值用 1 即可
    w.props!.scale = w.props!.scale ?? 1
  }
  if (!config.widgets3D) config.widgets3D = []
  config.widgets3D.push(w)
  // 同步到 3D 场景：注册并加载
  addWidgetModelToScene(w)
  closeDropDialog()
}

/** 解析为绝对 URL，避免请求落到 SPA 路由返回 index.html（导致 GLTFLoader 报 "Unexpected token '<'"） */
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

/** gltf/fbx/simple 不进入模型注册表，由此处直接创建；其余类型走注册表 */
function createModelByTypeId(typeId: string, name: string, source?: string): Model | null {
  if (typeId === 'gltf') return new ModelLoadable(name, 'gltf', source ?? '') as unknown as Model
  if (typeId === 'fbx') return new ModelLoadable(name, 'fbx', source ?? '') as unknown as Model
  if (typeId === 'simple') return new SimpleModel(name) as unknown as Model
  return modelRegistry.createModel(typeId, { name, source })
}

function addWidgetModelToScene(w: WidgetConfig3D): void {
  const loader = loaderRef.value
  const sb = storyboardRef.value
  if (!loader || !sb) return

  const props = (w.props ?? {}) as Record<string, unknown>
  const typeId = String(props.typeId ?? '')
  if (!typeId) return

  const rawSource = props.source != null ? String(props.source) : undefined
  const source = resolveModelUrl(rawSource)
  if ((typeId === 'gltf' || typeId === 'fbx') && !source) return
  const modelName = w.id
  const model = createModelByTypeId(typeId, modelName, source)
  if (!model) return

  // 初始化同步 custom props（让新建实例就能体现配置）
  const custom = props[CUSTOM_PROPS_KEY]
  if (custom && typeof custom === 'object') {
    for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
      try {
        model.propUpdate(k, v)
      } catch {
        // ignore
      }
    }
  }

  const pos = (props.position as [number, number, number] | undefined) ?? [0, 0, 0]
  const rawScale = props.scale
  const rawRotation = (props.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
  let sx = 1
  let sy = 1
  let sz = 1
  if (Array.isArray(rawScale)) {
    sx = Number(rawScale[0]) || 1
    sy = Number(rawScale[1]) || 1
    sz = Number(rawScale[2]) || 1
  } else if (typeof rawScale === 'number') {
    const v = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1
    sx = sy = sz = v
  }
  pendingTransforms.set(modelName, {
    position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
    scale: [sx, sy, sz],
    rotation: [
      Number(rawRotation[0]) || 0,
      Number(rawRotation[1]) || 0,
      Number(rawRotation[2]) || 0
    ]
  })

  loader.getStore().addModel(modelName, model as unknown as Model)
  if (model instanceof ModelLoadable) {
    // 需要异步加载资源的模型（gltf/fbx 等），交给 Loader，加载完成后在 onFrameworkLoaded 中统一加入场景
    loader.load(model as unknown as Model)
  } else {
    // 内置/简单模型（如坐标轴）已经有 scene，直接同步加入当前 storyboard
    const tf = pendingTransforms.get(modelName)
    const inst = model as unknown as Model
    const isCss3d = Boolean((inst as unknown as { isCss3d?: boolean }).isCss3d)
    const cssScaleMul = isCss3d ? 0.01 : 1
    if (inst.scene && tf) {
      inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
      inst.scene.scale.set(tf.scale[0] * cssScaleMul, tf.scale[1] * cssScaleMul, tf.scale[2] * cssScaleMul)
      inst.scene.rotation.set(degToRad(tf.rotation[0]), degToRad(tf.rotation[1]), degToRad(tf.rotation[2]))
    }
    ;(sb as BaseStoryBoard).addModel(inst)
    addedModelNames.add(modelName)
    if (inst.scene) {
      addedModelNodes.set(modelName, inst.scene as unknown as Object3D)
    }
  }
}

function onFrameworkLoaded(loader: Loader, world: World): void {
  loaderRef.value = loader
  worldRef.value = world

  if (!storyboardRef.value) {
    const aspect = designSize.height > 0 ? designSize.width / designSize.height : 1
    // 先用当前 worldSize.y 推出正交相机可视高度，之后会由 applyOrthographicByWorldSize() 实时更新
    const worldH = Math.max(0.0001, sceneWorldSize.value.y)
    const halfH = worldH / 2
    const cam = new OrthographicCamera(
      -halfH * aspect,
      halfH * aspect,
      halfH,
      -halfH,
      0.1,
      1000
    )
    cam.position.set(6, 6, 6)
    cam.layers.enableAll()
    const sb = new ControlsStoryBoard('Editor3D', cam, {
      background: null,
      orthographicSize: halfH,
      lights: {
        ambient: sceneLights.ambient,
        hemisphere: sceneLights.hemisphere,
        point: sceneLights.point
      }
    })
    sb.enableControls(world.getRendererDom())
    if (sb.controls) {
      sb.controls.target.set(0, 0, 0)
      sb.controls.enableDamping = true
      sb.controls.dampingFactor = 0.05
    }
    storyboardRef.value = sb
    world.sceneTo(sb)
    nextTick(() => world.notifyResize())
  }

  // 将已加载的模型加入 storyBoard（避免重复加入）
  const sb = storyboardRef.value
  if (!sb) return
  for (const [name] of loader.getStore().getModels().entries()) {
    if (addedModelNames.has(name)) continue
    const inst = loader.getStore().getModel(name)
    if (!inst || !inst.scene) continue
    const tf = pendingTransforms.get(name)
    if (tf) {
      inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
      inst.scene.scale.set(tf.scale[0], tf.scale[1], tf.scale[2])
      inst.scene.rotation.set(degToRad(tf.rotation[0]), degToRad(tf.rotation[1]), degToRad(tf.rotation[2]))
    }
    ;(sb as BaseStoryBoard).addModel(inst as unknown as Model)
    addedModelNames.add(name)
    addedModelNodes.set(name, inst.scene!)
  }
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
    props: nextProps
  }

  if (!config.widgets3D) config.widgets3D = []
  config.widgets3D.push(w)
  addWidgetModelToScene(w)
  onSelectWidget(w)
}

function onPositionInputChange(axis: 'x' | 'y' | 'z'): void {
  const id = selectedWidgetId.value
  if (!id) return
  if (axisLock[axis]) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  const pos = (w.props.position as [number, number, number] | undefined) ?? [0, 0, 0]
  const currentWorld: [number, number, number] = [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0]

  let nextWorld: [number, number, number] = [...currentWorld] as [number, number, number]
  if (designCoord.enabled) {
    // X/Z 输入按“设计坐标系”解释：先换算到 3D 设计坐标，再按比例尺得到 world
    const xz = designInputToWorldXZ(Number(selectedPosition.x) || 0, Number(selectedPosition.z) || 0, designCoord.originX, designCoord.originY, worldScale.value)
    nextWorld = [xz.x, Number(selectedPosition.y) || 0, xz.z]
  } else {
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    const value = axis === 'x' ? selectedPosition.x : axis === 'y' ? selectedPosition.y : selectedPosition.z
    nextWorld[idx] = Number(value) || 0
  }

  w.props.position = nextWorld
  const obj = addedModelNodes.get(id)
  if (obj) {
    obj.position.set(nextWorld[0], nextWorld[1], nextWorld[2])
  }
}

function updateSelectedWidgetScale(scaleVec: [number, number, number]): void {
  const id = selectedWidgetId.value
  if (!id) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  w.props.scale = scaleVec
  const obj = addedModelNodes.get(id)
  if (obj) {
    const sb = storyboardRef.value as BaseStoryBoard | null
    const model = sb?.getModelByName(id) as unknown as { isCss3d?: boolean } | undefined
    const mul = model?.isCss3d ? 0.01 : 1
    obj.scale.set(scaleVec[0] * mul, scaleVec[1] * mul, scaleVec[2] * mul)
  }
  const tf = pendingTransforms.get(id)
  if (tf) {
    tf.scale = scaleVec
  }
}

function onScaleUniformChange(): void {
  const v = Number(selectedScaleUniform.value)
  const s = Number.isFinite(v) && v > 0 ? v : 1
  selectedScale.x = s
  selectedScale.y = s
  selectedScale.z = s
  selectedScaleUniform.value = s
  updateSelectedWidgetScale([s, s, s])
}

function onScaleAxisChange(axis: 'x' | 'y' | 'z'): void {
  const sx = Number(selectedScale.x) || 1
  const sy = Number(selectedScale.y) || 1
  const sz = Number(selectedScale.z) || 1
  const vec: [number, number, number] = [sx, sy, sz]
  if (axis === 'x') {
    vec[0] = sx
  } else if (axis === 'y') {
    vec[1] = sy
  } else {
    vec[2] = sz
  }
  updateSelectedWidgetScale(vec)
}

function updateSelectedWidgetRotation(rotVec: [number, number, number]): void {
  const id = selectedWidgetId.value
  if (!id) return
  const arr = config.widgets3D
  const w = arr?.find((item) => item.id === id)
  if (!w) return
  if (!w.props) w.props = {}
  w.props.rotation = rotVec
  const obj = addedModelNodes.get(id)
  if (obj) {
    obj.rotation.set(degToRad(rotVec[0]), degToRad(rotVec[1]), degToRad(rotVec[2]))
  }
  const tf = pendingTransforms.get(id)
  if (tf) {
    tf.rotation = rotVec
  }
}

function onRotationAxisChange(axis: 'x' | 'y' | 'z'): void {
  const rx = Number(selectedRotation.x) || 0
  const ry = Number(selectedRotation.y) || 0
  const rz = Number(selectedRotation.z) || 0
  const vec: [number, number, number] = [rx, ry, rz]
  if (axis === 'x') {
    vec[0] = rx
  } else if (axis === 'y') {
    vec[1] = ry
  } else {
    vec[2] = rz
  }
  updateSelectedWidgetRotation(vec)
}

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

/** 将当前选中模型的 prop 变更通知到 Model 实例（必须用 storyboard 里已加入的实例，不能用 store.getModel 的 clone） */
function notifyModelPropUpdate(key: string, value: unknown): void {
  const id = selectedWidgetId.value
  if (!id) return
  const sb = storyboardRef.value as BaseStoryBoard | null
  const model = sb?.getModelByName(id)
  if (model) model.propUpdate(key, value)
}

function addCustomProp(): void {
  const key = String(newPropKey.value ?? '').trim()
  if (!key) return
  const obj = selectedWidgetCustomProps.value
  const val = newPropValue.value
  const num = Number(val)
  const value = Number.isFinite(num) ? num : String(val ?? '')
  obj[key] = value
  newPropKey.value = ''
  newPropValue.value = ''
  notifyModelPropUpdate(key, value)
}

function setCustomPropValue(key: string, value: string): void {
  const obj = selectedWidgetCustomProps.value
  const num = Number(value)
  const parsed = Number.isFinite(num) ? num : value
  obj[key] = parsed
  notifyModelPropUpdate(key, parsed)
}

function removeCustomProp(key: string): void {
  const obj = selectedWidgetCustomProps.value
  delete obj[key]
  notifyModelPropUpdate(key, undefined)
}

onMounted(async () => {
  await nextTick()
  // 初始化 3D world：主区域容器内创建 renderer/canvas，并在资源加载完成后回调 onFrameworkLoaded
  setup3D('#panelx-editor3d-world', onFrameworkLoaded, () => [])
})

onUnmounted(() => {
  try {
    worldRef.value?.destroy?.()
  } catch {
    // ignore
  }
  loaderRef.value = null
  worldRef.value = null
  storyboardRef.value = null
})

function exportConfig() {
  const payload: DashboardConfig = {
    design: { ...config.design },
    widgets2D: [],
    widgets3D: config.widgets3D?.length
      ? (config.widgets3D as WidgetConfig3D[]).map((w) => ({
          id: w.id,
          type: w.type,
          worldSize: w.worldSize ?? { x: sceneWorldSize.value.x, y: sceneWorldSize.value.y, z: sceneWorldSize.value.z },
          visible: w.visible,
          props: {
            ...(w.props ? { ...w.props } : {}),
            sceneLights: {
              ambient: sceneLights.ambient,
              hemisphere: sceneLights.hemisphere,
              point: sceneLights.point
            }
          }
        }))
      : []
  }
  payload.background = editorBackgroundColor.value
  if (config.debug != null) payload.debug = config.debug
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-config-3d.json'
  a.click()
  URL.revokeObjectURL(url)
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
}
.panelx-editor3d-widget-tag.active {
  border: 1px solid #38bdf8;
}
.panelx-editor3d-widget-tag-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
