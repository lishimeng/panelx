<template>
  <div
    ref="containerRef"
    class="panelx-dashboard"
    :style="containerStyle"
  >
    <!-- 第 1 层：背景层（图片或 3D 场景）；无 backgroundLayer 时可由 widgets3D 生成 3D 层 -->
    <div v-if="effectiveBackgroundLayer" class="panelx-dashboard-layer panelx-dashboard-layer-bg">
      <template v-if="effectiveBackgroundLayer.type === 'image'">
        <img
          :src="effectiveBackgroundLayer.url"
          :style="backgroundImageStyle"
          class="panelx-dashboard-bg-image"
          alt=""
        />
      </template>
      <Scene3DFramework
        v-else-if="effectiveBackgroundLayer.type === 'scene3d'"
        :config="effectiveBackgroundLayer.config"
        ref="scene3dBgRef"
        class="panelx-dashboard-bg-scene3d"
      />
    </div>
    <!-- 第 2 层：内容层（透明背景，图表等） -->
    <div class="panelx-dashboard-layer panelx-dashboard-layer-content">
      <template v-for="w in visibleWidgets" :key="w.id">
        <div
          v-if="getActualRect(w)"
          class="panelx-dashboard-widget"
          :style="getWidgetStyle(w)"
        >
          <component
            :is="getComponent(w.type)"
            v-bind="(getWidgetProps(w)) as Record<string, unknown>"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { SizeManager2D } from '../core/size'
import { getViewportAndScale, pxToVw, pxToVh, pxToRem } from '../utils/viewport'
import { resolveDatasourceUrl } from '../utils/resolveDatasourceUrl'
import type {
  DashboardConfig,
  WidgetConfig2D,
  WidgetType2D,
  BackgroundLayerImage
} from '../types/dashboard'
import type { DesignRect } from '../types/size'
import type { BackendDataSourceConfig, CommandRequest, ControlAction, ControlDomain, ControlPayload, PropertyRequest } from '../types'
import { PollingSource, SSESource, globalDatasourceRegistry, toControlEnvelope } from '../utils/controlSources'
import { SceneControlStreamEngine } from '../utils/SceneControlStreamEngine'
import {
  WidgetDataKey,
  SetWidgetDataKey,
  UpdateWidgetDataKey,
  UpdateWidgetKey,
  WidgetRefreshVersionKey
} from '../types/injections'
import { dataChainLog } from '../core/comm/dataChainLog'
import Scene3DFramework from './Scene3DFramework.vue'
import { getWidgetComponent } from '../widgets'
import { widgets3DToScene3DConfig } from '../utils/widgets3DToScene3D'
import type { BackgroundLayerConfig } from '../types/dashboard'

const scene3dBgRef = ref<any>(null)

const props = defineProps<{
  config: DashboardConfig
  /** 数据源列表（与 editor_config.datasources 一致）；仅一个 enable=true 生效，优先按 payload.widgetId/id 定位 */
  datasources?: BackendDataSourceConfig[]
}>()

const config = computed(() => props.config)

/** 有 widgets3D 且无 backgroundLayer 时，由 widgets3D 生成 3D 背景层，供 Configurable 加载编辑器导出配置 */
const effectiveBackgroundLayer = computed((): BackgroundLayerConfig | undefined => {
  if (config.value.backgroundLayer) return config.value.backgroundLayer
  const list = config.value.widgets3D
  if (list?.length) {
    return {
      type: 'scene3d',
      config: widgets3DToScene3DConfig(list, { background: config.value.background, scene: config.value.scene3D })
    }
  }
  return undefined
})

/** 向子组件提供 dashboard 级主题（整屏默认），widget 内 props.theme 可单独覆盖 */
provide('dashboardTheme', computed(() => config.value.theme))
/** 向子组件提供视口与比例尺，供比例尺等 widget 使用 */
provide(
  'dashboardViewport',
  computed(() => ({
    viewportSize: viewportSize.value,
    scale: sizeManager.value?.scale ?? 0,
    designWidth: getDesignSize().width,
    designHeight: getDesignSize().height
  }))
)

const containerRef = ref<HTMLElement | null>(null)
const sizeManager = ref<SizeManager2D | null>(null)
const sizeVersion = ref(0)
const actualWidthUsed = ref<number | null>(null)
/** 视口尺寸，用于 px → vw/vh 换算 */
const viewportSize = ref<{ width: number; height: number }>({ width: 0, height: 0 })

const design = computed(() => config.value.design)
const visibleWidgets = computed(() =>
  (config.value.widgets2D || []).filter((w) => w.visible !== false)
)

/** 按 widget id 预置的数据，配置加载后从 config 填充，便于后续数据更新 */
const widgetData = ref<Record<string, Record<string, unknown>>>({})
/** 按 instanceId 的刷新版本号，updateWidget(id) 时自增，widget 可 watch 以重绘 */
const widgetRefreshVersion = ref<Record<string, number>>({})

/** 配置加载后同步 widgetData：为每个 widget id 写入其 props，便于后续数据更新只改 widgetData 而不动 config */
function syncWidgetDataFromConfig() {
  const list = config.value.widgets2D || []
  const next: Record<string, Record<string, unknown>> = {}
  for (const w of list) {
    next[w.id] = { ...(w.props ?? {}) }
  }
  widgetData.value = next
  dataChainLog('Dashboard.syncWidgetDataFromConfig', {
    widgetCount: list.length,
    ids: list.map((w) => w.id)
  })
}

watch(
  () => config.value.widgets2D?.length ?? 0,
  () => syncWidgetDataFromConfig(),
  { immediate: true }
)
watch(
  () => config.value.widgets2D?.map((w) => w.id).join(',') ?? '',
  () => syncWidgetDataFromConfig()
)

/** 供模板使用：优先取 widgetData[id]，无则回退到 config 中的 props */
function getWidgetProps(w: WidgetConfig2D): Record<string, unknown> {
  const data = widgetData.value[w.id]
  if (data && Object.keys(data).length > 0) return data
  return (w.props ?? {}) as Record<string, unknown>
}

/** 按 widget id 的数据供外部注入使用；配置加载后已填充，便于后续数据更新 */
provide(WidgetDataKey, widgetData)
provide(SetWidgetDataKey, (id: string, patch: Record<string, unknown>) => {
  const cur = widgetData.value[id]
  widgetData.value = { ...widgetData.value, [id]: { ...(cur ?? {}), ...patch } }
})

/** 更新某 widget 的数据（仅改数据，不触发展示刷新；外部模块调用） */
function updateWidgetData(instanceId: string, patch: Record<string, unknown>) {
  const cur = widgetData.value[instanceId]
  widgetData.value = { ...widgetData.value, [instanceId]: { ...(cur ?? {}), ...patch } }
  dataChainLog('Dashboard.updateWidgetData', {
    instanceId,
    patchKeys: Object.keys(patch)
  })
}
/** 触发某 widget 刷新展示（外部在更新数据后可调用，widget 通过 watch widgetRefreshVersion 重绘） */
function updateWidget(instanceId: string) {
  widgetRefreshVersion.value = {
    ...widgetRefreshVersion.value,
    [instanceId]: (widgetRefreshVersion.value[instanceId] ?? 0) + 1
  }
  dataChainLog('Dashboard.updateWidget', { instanceId })
}
provide(UpdateWidgetDataKey, updateWidgetData)
provide(UpdateWidgetKey, updateWidget)
provide(WidgetRefreshVersionKey, widgetRefreshVersion)

/** Dashboard 后端数据统一入口：所有后端数据必须经 dataEngine。 */
const dataEngine = new SceneControlStreamEngine(undefined, undefined, {
  widgetSink: (payload) => {
    updateWidgetData(payload.widgetId, payload.patch)
    if (payload.refresh !== false) updateWidget(payload.widgetId)
  },
  commandSink: (request) => scene3dBgRef.value?.executeCommand?.(request),
  propertySink: (request) => scene3dBgRef.value?.executeProperty?.(request)
})
const dashboardOwnerId = `dashboard_${Math.random().toString(36).slice(2)}`
const retainedDatasourceKeys = new Set<string>()
const engineSourceIds = new Set<string>()
const sourceUnsubs = new Map<string, () => void>()

function parseRouteToken(token: string): { domain: ControlDomain; action: ControlAction } | null {
  const t = String(token ?? '').trim().toLowerCase()
  const [d, a] = t.split('_')
  const domain = d === '2d' || d === '3d' ? d : null
  const action = a === 'command' || a === 'property' || a === 'chart' || a === 'other' ? a : null
  if (!domain || !action) return null
  return { domain, action }
}

function toPayloadByRoute(widget: WidgetConfig2D, route: { domain: ControlDomain; action: ControlAction }, data: unknown): ControlPayload | null {
  if (route.domain === '2d') {
    const patch =
      route.action === 'chart' || widget.type === 'chart' || widget.type === 'glassChart'
        ? ({ options: data } as Record<string, unknown>)
        : ((data as Record<string, unknown>) ?? {})
    return { kind: 'widget', widgetId: widget.id, patch, refresh: true }
  }
  if (route.action === 'command') {
    const req = data as { key?: unknown; id?: unknown; params?: unknown }
    const key = String(req?.key ?? '').trim()
    const id = String(req?.id ?? '').trim()
    if (!key || !id) return null
    return { kind: 'command', request: { key, id, params: req?.params } }
  }
  if (route.action === 'property') {
    const req = data as { key?: unknown; id?: unknown; params?: unknown }
    const key = String(req?.key ?? '').trim()
    const id = String(req?.id ?? '').trim()
    if (!key || !id) return null
    return { kind: 'property', request: { key, id, params: req?.params } }
  }
  return null
}

type RoutedSourceData = {
  targetId?: string
  route: { domain: ControlDomain; action: ControlAction }
  data: unknown
}

function buildDatasourceHash(dsConfig: BackendDataSourceConfig): string {
  return JSON.stringify(dsConfig)
}

async function ensureGlobalDatasource(dsConfig: BackendDataSourceConfig): Promise<void> {
  const hash = buildDatasourceHash(dsConfig)
  if (dsConfig.type === 'sse') {
    await globalDatasourceRegistry.getOrCreate(
      dsConfig.key,
      () => {
        let source: SSESource | null = null
        return {
          start: async (emit) => {
            source = new SSESource({
              sourceId: dsConfig.key,
              url: resolveDatasourceUrl(dsConfig),
              logger: (entry) => dataChainLog('Dashboard.sseClient', entry),
              parseMessage: (message) => {
                let parsed: unknown
                try {
                  parsed = JSON.parse(message.data)
                } catch {
                  parsed = null
                }
                if (!parsed) return []
                const list = Array.isArray(parsed) ? parsed : [parsed]
                const out: RoutedSourceData[] = []
                for (const item of list) {
                  const rec = item as Record<string, unknown>
                  const targetId = String(rec.widgetId ?? rec.id ?? '').trim()
                  const route = parseRouteToken(String(rec.event ?? ''))
                  if (!targetId || !route) continue
                  out.push({ targetId, route, data: rec.payload })
                }
                return out.map((it) => ({
                  header: { domain: it.route.domain, action: it.route.action },
                  payload: { kind: 'widget', widgetId: '__route_only__', patch: { __routed: it } }
                }))
              }
            })
            await source.start((env) => emit((env as any).payload.patch.__routed as RoutedSourceData))
          },
          stop: async () => {
            await source?.stop()
            source = null
          }
        }
      },
      hash
    )
  } else {
    await globalDatasourceRegistry.getOrCreate(
      dsConfig.key,
      () => {
        let source: PollingSource | null = null
        return {
          start: async (emit) => {
            source = new PollingSource({
              sourceId: dsConfig.key,
              url: resolveDatasourceUrl(dsConfig),
              intervalMs: dsConfig.interval ?? 1000,
              init: {
                method: dsConfig.method ?? 'GET',
                body: dsConfig.body ? JSON.stringify(dsConfig.body) : undefined,
                headers: dsConfig.body ? { 'Content-Type': 'application/json' } : undefined
              },
              parseResponse: (body) => {
                const rec = (body ?? {}) as Record<string, unknown>
                const out: RoutedSourceData[] = []
                const list = Array.isArray(body) ? body : Object.values(rec)
                for (const raw of list) {
                  if (!raw || typeof raw !== 'object') continue
                  const obj = raw as Record<string, unknown>
                  const route = parseRouteToken(`${obj.domain ?? '2d'}_${obj.action ?? 'other'}`)
                  const targetId = String(obj.widgetId ?? obj.id ?? '').trim()
                  if (!route || !targetId) continue
                  out.push({ targetId, route, data: obj.payload })
                }
                return out.map((it) => ({
                  header: { domain: it.route.domain, action: it.route.action },
                  payload: { kind: 'widget', widgetId: '__route_only__', patch: { __routed: it } }
                }))
              }
            })
            await source.start((env) => emit((env as any).payload.patch.__routed as RoutedSourceData))
          },
          stop: async () => {
            await source?.stop()
            source = null
          }
        }
      },
      hash
    )
  }
  if (!retainedDatasourceKeys.has(dsConfig.key)) {
    globalDatasourceRegistry.retain(dsConfig.key, dashboardOwnerId)
    retainedDatasourceKeys.add(dsConfig.key)
  }
}

async function cleanupConnectorState(): Promise<void> {
  dataEngine.stop()
  for (const sourceId of [...engineSourceIds]) {
    await dataEngine.unregisterSource(sourceId)
  }
  engineSourceIds.clear()
  for (const unsub of sourceUnsubs.values()) unsub()
  sourceUnsubs.clear()
  for (const key of [...retainedDatasourceKeys]) {
    await globalDatasourceRegistry.release(key, dashboardOwnerId)
    retainedDatasourceKeys.delete(key)
  }
}

function pickActiveDatasource(list: BackendDataSourceConfig[]): BackendDataSourceConfig | null {
  const enabled = list.filter((d) => d.enable === true)
  if (enabled.length > 1) {
    dataChainLog('Dashboard.connector.error', {
      reason: 'multiple datasource enabled',
      keys: enabled.map((d) => d.key)
    })
    return enabled[0] ?? null
  }
  if (enabled.length === 1) return enabled[0]
  return list[0] ?? null
}

/** 将 config.widgets2D 绑定到活动 datasource：按 targetId(=widgetId/id) 路由 */
async function setupDataSourceConnector() {
  await cleanupConnectorState()

  const list = props.datasources ?? []
  const activeDatasource = pickActiveDatasource(list)
  const widgets = config.value.widgets2D ?? []
  const widgetById = new Map<string, WidgetConfig2D>()
  for (const w of widgets) {
    const wid = String(w.id ?? '').trim()
    if (wid) widgetById.set(wid, w)
  }
  const bound = widgets
  if (!activeDatasource || bound.length === 0) return

  const dsConfig = activeDatasource
  await ensureGlobalDatasource(dsConfig)
  const sourceId = `${dashboardOwnerId}:${dsConfig.key}:all_widgets`
  dataEngine.registerSource({
    id: sourceId,
    start: async (push) => {
      const unsub = await globalDatasourceRegistry.subscribe(dsConfig.key, (data) => {
        const routed = data as RoutedSourceData
        const targetWidget = routed.targetId ? widgetById.get(routed.targetId) : undefined
        if (!targetWidget) return
        const payload = toPayloadByRoute(targetWidget, routed.route, routed.data)
        if (!payload) return
        push(toControlEnvelope(sourceId, routed.route, payload))
      })
      sourceUnsubs.set(sourceId, unsub)
    },
    stop: () => {
      const unsub = sourceUnsubs.get(sourceId)
      unsub?.()
      sourceUnsubs.delete(sourceId)
    }
  })
  engineSourceIds.add(sourceId)
  dataChainLog('Dashboard.connector.bind', {
    datasourceKey: dsConfig.key,
    widgetCount: widgets.length,
    mode: 'targetId-only'
  })
  void dataEngine.start()
}

const backgroundImageStyle = computed((): Record<string, string> => {
  const bg = effectiveBackgroundLayer.value
  if (!bg || bg.type !== 'image') return {}
  const fit = (bg as BackgroundLayerImage).fit ?? 'cover'
  return {
    objectFit: fit,
    objectPosition: 'center center'
  }
})

function getDesignSize() {
  const d = design.value
  return d && d.width > 0 && d.height > 0 ? d : { width: 1920, height: 1080 }
}

const containerStyle = computed((): Record<string, string> => {
  sizeVersion.value
  const sm = sizeManager.value
  const vp = viewportSize.value
  const base = {
    background: config.value.background ?? 'transparent',
    position: 'relative' as const,
    boxSizing: 'border-box' as const
  }
  if (!sm) {
    return {
      ...base,
      width: '100%',
      maxWidth: '100%',
      minHeight: '25rem'
    }
  }
  const w = actualWidthUsed.value ?? (containerRef.value?.offsetWidth ?? 0)
  const h = sm.actualHeight
  const useVwVh = vp.width > 0 && vp.height > 0
  return {
    ...base,
    width: w > 0 ? (useVwVh ? pxToVw(w, vp.width) : pxToRem(w)) : '100%',
    maxWidth: '100%',
    height: useVwVh ? pxToVh(h, vp.height) : pxToRem(h),
    maxHeight: '100%',
    marginLeft: 'auto',
    marginRight: 'auto'
  }
})

function ensureSizeManager() {
  const d = getDesignSize()
  const vs = getViewportAndScale(containerRef.value, d.width, d.height)
  if (!vs) return

  if (!sizeManager.value) {
    sizeManager.value = new SizeManager2D({
      designWidth: d.width,
      designHeight: d.height,
      actualWidth: vs.actualWidth
    })
  } else {
    sizeManager.value.setActualWidth(vs.actualWidth)
  }
  actualWidthUsed.value = vs.actualWidth
  viewportSize.value = vs.viewportSize
  sizeVersion.value++
}

/** widget 展示：layoutUnit=percent 时用配置转换后的 0-100；否则用 sizeManager（px 换算为 vw/vh/rem） */
function getActualRect(w: WidgetConfig2D): { x: number; y: number; width: number; height: number } | null {
  if (!w.layout) return null
  if (config.value.layoutUnit === 'percent') return w.layout as DesignRect
  const sm = sizeManager.value
  if (!sm) return null
  return sm.designToActual(w.layout as DesignRect)
}

function getWidgetStyle(w: WidgetConfig2D): Record<string, string> {
  const rect = getActualRect(w)
  if (!rect) return {}
  if (config.value.layoutUnit === 'percent') {
    return {
      position: 'absolute',
      left: `${rect.x}%`,
      top: `${rect.y}%`,
      width: `${rect.width}%`,
      height: `${rect.height}%`,
      boxSizing: 'border-box'
    }
  }
  const vp = viewportSize.value
  const useVwVh = vp.width > 0 && vp.height > 0
  return {
    position: 'absolute',
    left: useVwVh ? pxToVw(rect.x, vp.width) : pxToRem(rect.x),
    top: useVwVh ? pxToVh(rect.y, vp.height) : pxToRem(rect.y),
    width: useVwVh ? pxToVw(rect.width, vp.width) : pxToRem(rect.width),
    height: useVwVh ? pxToVh(rect.height, vp.height) : pxToRem(rect.height),
    boxSizing: 'border-box'
  }
}

function getComponent(type: WidgetType2D) {
  return getWidgetComponent(type)
}

watch(
  () => [props.config?.widgets2D?.length ?? 0, props.datasources?.length ?? 0] as const,
  () => void setupDataSourceConnector(),
  { immediate: true }
)

let ro: ResizeObserver | null = null
let roParent: ResizeObserver | null = null
onMounted(() => {
  const run = () => nextTick(ensureSizeManager)
  run()
  if (containerRef.value) {
    ro = new ResizeObserver(run)
    ro.observe(containerRef.value)
    const parent = containerRef.value.parentElement
    if (parent) {
      roParent = new ResizeObserver(run)
      roParent.observe(parent)
    }
  }
})
onUnmounted(() => {
  void dataEngine.dispose()
  void cleanupConnectorState()
  ro?.disconnect()
  roParent?.disconnect()
})

function executeCommand(req: CommandRequest): void {
  scene3dBgRef.value?.executeCommand?.(req)
}

function executeProperty(req: PropertyRequest): void {
  scene3dBgRef.value?.executeProperty?.(req)
}

function registerControlSource(source: unknown): void {
  dataEngine.registerSource(source as any)
}

function startControlEngine(): void {
  void dataEngine.start()
}

function stopControlEngine(): void {
  dataEngine.stop()
}

function pauseControlEngine(): void {
  dataEngine.pause()
}

function resumeControlEngine(): void {
  dataEngine.resume()
}

defineExpose({
  executeCommand,
  executeProperty,
  registerControlSource,
  startControlEngine,
  stopControlEngine,
  pauseControlEngine,
  resumeControlEngine
})
</script>

<style scoped>
.panelx-dashboard {
  overflow: hidden;
  position: relative;
  max-width: 100%;
  box-sizing: border-box;
}
/* 分层：两层绝对定位叠放，层 1 在下、层 2 在上；内容层需高于 WebGL canvas */
.panelx-dashboard-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.panelx-dashboard-layer-bg {
  z-index: 0;
  isolation: isolate;
}
.panelx-dashboard-layer-content {
  z-index: 10;
  background: transparent;
  pointer-events: none;
  isolation: isolate;
  transform: translateZ(0);
}
.panelx-dashboard-layer-content .panelx-dashboard-widget {
  pointer-events: auto;
}
.panelx-dashboard-bg-image {
  width: 100%;
  height: 100%;
  display: block;
}
.panelx-dashboard-bg-scene3d {
  width: 100%;
  height: 100%;
}
.panelx-dashboard-widget {
  overflow: hidden;
}
</style>
