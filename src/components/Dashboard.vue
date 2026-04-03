<template>
  <div
    ref="containerRef"
    class="panelx-dashboard"
    :style="containerStyle"
  >
    <!-- ??1 ??????????3D ??????backgroundLayer ????widgets3D ?? 3D ??-->
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
    <!-- ??2 ????????????????-->
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
  WidgetConfig3D,
  WidgetType2D,
  BackgroundLayerImage
} from '../types/dashboard'
import type { DesignRect } from '../types/size'
import type {
  BackendDataSourceConfig,
  CommandRequest,
  ControlAction,
  ControlDomain,
  ControlPayload,
  PropertyRequest
} from '../types'
import { WIDGET_PATCH_REQUEST_KEY, isDatasourceRoutedEvent, widgetPayloadPatch } from '../types'
import {
  PollingSource,
  SSESource,
  globalDatasourceRegistry,
  pickControlRequestFields,
  toControlEnvelope
} from '../utils/controlSources'
import { StreamEngine } from '../utils/StreamEngine'
import {
  WidgetDataKey,
  SetWidgetDataKey,
  UpdateWidgetDataKey,
  UpdateWidgetKey,
  WidgetRefreshVersionKey
} from '../types/injections'
import { dataChainLog, formatDataChainDetail } from '../core/comm/dataChainLog'
import Scene3DFramework from './Scene3DFramework.vue'
import { getWidgetComponent } from '../widgets'
import { widgets3DToScene3DConfig } from '../utils/widgets3DToScene3D'
import type { BackgroundLayerConfig } from '../types/dashboard'

const scene3dBgRef = ref<any>(null)

const props = defineProps<{
  config: DashboardConfig
  /** 与 editor 配置 datasources 对齐；enable=true 的项参与推流。路由目标为 payload.id。 */
  datasources?: BackendDataSourceConfig[]
}>()

const config = computed(() => props.config)

/** ??widgets3D ?? backgroundLayer ????widgets3D ?? 3D ??????Configurable ??????????*/
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

/** ?????? dashboard ??????????widget ??props.theme ??????*/
provide('dashboardTheme', computed(() => config.value.theme))
/** ?????????????????? widget ?? */
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
/** ????????px ??vw/vh ?? */
const viewportSize = ref<{ width: number; height: number }>({ width: 0, height: 0 })

const design = computed(() => config.value.design)
const visibleWidgets = computed(() =>
  (config.value.widgets2D || []).filter((w) => w.visible !== false)
)

/** ??widget id ???????????? config ????????????*/
const widgetData = ref<Record<string, Record<string, unknown>>>({})
/** ??instanceId ???????updateWidget(id) ????widget ??watch ????*/
const widgetRefreshVersion = ref<Record<string, number>>({})

/** ????????widgetData???? widget id ????props????????????widgetData ????config */
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

/** ??????????widgetData[id]???????config ?? props */
function getWidgetProps(w: WidgetConfig2D): Record<string, unknown> {
  const data = widgetData.value[w.id]
  if (data && Object.keys(data).length > 0) return data
  return (w.props ?? {}) as Record<string, unknown>
}

/** ??widget id ???????????????????????????? */
provide(WidgetDataKey, widgetData)
provide(SetWidgetDataKey, (id: string, patch: Record<string, unknown>) => {
  const cur = widgetData.value[id]
  widgetData.value = { ...widgetData.value, [id]: { ...(cur ?? {}), ...patch } }
})

/** ????widget ???????????????????????? */
function updateWidgetData(instanceId: string, patch: Record<string, unknown>) {
  const cur = widgetData.value[instanceId]
  widgetData.value = { ...widgetData.value, [instanceId]: { ...(cur ?? {}), ...patch } }
  dataChainLog('Dashboard.updateWidgetData', {
    instanceId,
    patchKeys: Object.keys(patch),
    patch: formatDataChainDetail(patch, 16000)
  })
}
/** ????widget ?????????????????widget ?? watch widgetRefreshVersion ????*/
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

/** Dashboard ?????????????????? dataEngine??*/
const dataEngine = new StreamEngine(undefined, undefined, undefined, {
  widgetSink: (payload) => {
    const w = widgetPayloadPatch(payload)
    if (!w) return
    updateWidgetData(w.id, w.patch)
    if (w.refresh) updateWidget(w.id)
  },
  commandSink: (request: CommandRequest) => {
    const scene = scene3dBgRef.value as { executeCommand?: (r: CommandRequest) => void } | null
    dataChainLog('Dashboard.commandExecute', {
      key: request.key,
      targetModelId: request.id,
      params: formatDataChainDetail(request.params ?? null, 8000),
      sceneReady: Boolean(scene && typeof scene.executeCommand === 'function')
    })
    scene?.executeCommand?.(request)
  },
  propertySink: (request) => scene3dBgRef.value?.executeProperty?.(request)
  ,
  cameraSink: (request) => scene3dBgRef.value?.executeCamera?.(request)
})
const dashboardOwnerId = `dashboard_${Math.random().toString(36).slice(2)}`
const retainedDatasourceKeys = new Set<string>()
const engineSourceIds = new Set<string>()
const sourceUnsubs = new Map<string, () => void>()

function parseRouteToken(token: string): { domain: ControlDomain; action: ControlAction } | null {
  const t = String(token ?? '').trim().toLowerCase()
  const [d, a] = t.split('_')
  const domain = d === '2d' || d === '3d' ? d : null
  const action = a === 'command' || a === 'property' || a === 'camera' || a === 'chart' || a === 'other' ? a : null
  if (!domain || !action) return null
  return { domain, action }
}

function toBooleanLike(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'false' || s === '0' || s === 'off' || s === 'no') return false
    if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true
  }
  return Boolean(v)
}

function to2DPropertyPatch(
  widget: WidgetConfig2D,
  data: unknown
): { patch: Record<string, unknown>; refresh: boolean } | null {
  const req = (data ?? {}) as { key?: unknown; id?: unknown; params?: unknown }
  const key = String(req?.key ?? '').trim()
  const id = String(req?.id ?? '').trim()
  if (id && id !== widget.id) return null
  const params = (req?.params ?? {}) as Record<string, unknown>

  // 2D property handler: direct visible toggle
  if (key === 'widget.visible' || key === '2d.visible' || key === 'model.visible') {
    return { patch: { visible: toBooleanLike(params.visible) }, refresh: true }
  }
  if (key === 'widget.propUpdate' || key === '2d.propUpdate') {
    const propKey = String(params.propKey ?? '').trim()
    if (!propKey) return null
    return { patch: { [propKey]: params.value }, refresh: true }
  }

  // Fallback: treat property payload params as widget patch directly.
  if (params && typeof params === 'object') {
    return { patch: params, refresh: true }
  }
  return null
}

function toPayloadByRoute(
  widget: WidgetConfig2D | null,
  route: { domain: ControlDomain; action: ControlAction },
  data: unknown
): ControlPayload | null {
  if (route.domain === '2d') {
    if (!widget) return null
    if (route.action === 'property') {
      const propertyUpdate = to2DPropertyPatch(widget, data)
      if (!propertyUpdate) return null
      return {
        kind: 'widget',
        request: {
          key: WIDGET_PATCH_REQUEST_KEY,
          id: widget.id,
          params: { patch: propertyUpdate.patch, refresh: propertyUpdate.refresh }
        }
      }
    }
    const req = (data ?? {}) as Record<string, unknown>
    const hasParamsField = 'params' in req && req.params !== null && typeof req.params === 'object'
    if (hasParamsField) {
      const params = req.params as Record<string, unknown>
      if (params.patch != null && typeof params.patch === 'object' && !Array.isArray(params.patch)) {
        return {
          kind: 'widget',
          request: {
            key: WIDGET_PATCH_REQUEST_KEY,
            id: widget.id,
            params: {
              patch: params.patch as Record<string, unknown>,
              refresh: params.refresh !== false
            }
          }
        }
      }
      const isChart =
        route.action === 'chart' || widget.type === 'chart' || widget.type === 'glassChart'
      if (isChart) {
        const inner =
          'options' in params && params.options !== undefined ? params.options : params
        return {
          kind: 'widget',
          request: {
            key: WIDGET_PATCH_REQUEST_KEY,
            id: widget.id,
            params: { patch: { options: inner } as Record<string, unknown>, refresh: true }
          }
        }
      }
      return {
        kind: 'widget',
        request: {
          key: WIDGET_PATCH_REQUEST_KEY,
          id: widget.id,
          params: { patch: params as Record<string, unknown>, refresh: true }
        }
      }
    }
    const legacy = req
    const isChart =
      route.action === 'chart' || widget.type === 'chart' || widget.type === 'glassChart'
    const patch = isChart
      ? ({
          options: 'options' in legacy && legacy.options !== undefined ? legacy.options : legacy
        } as Record<string, unknown>)
      : legacy
    return {
      kind: 'widget',
      request: { key: WIDGET_PATCH_REQUEST_KEY, id: widget.id, params: { patch, refresh: true } }
    }
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
  if (route.action === 'camera') {
    const req = data as { key?: unknown; id?: unknown; params?: unknown }
    const key = String(req?.key ?? '').trim()
    if (!key) return null
    const id = String(req?.id ?? '').trim()
    return { kind: 'camera', request: { key, id: id || undefined, params: req?.params } }
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
              parseMessage: (message, sseEventType) => {
                let parsed: unknown
                try {
                  parsed = JSON.parse(message.data)
                } catch {
                  parsed = null
                }
                if (!parsed || typeof parsed !== 'object') return []

                const rec = parsed as Record<string, unknown>
                const routeFromEvent =
                  parseRouteToken(String(sseEventType ?? '').trim()) ??
                  parseRouteToken(String(rec.event ?? '').trim())
                const list = Array.isArray(parsed) ? parsed : [parsed]
                const out: RoutedSourceData[] = []
                for (const item of list) {
                  if (!item || typeof item !== 'object' || Array.isArray(item)) continue
                  const row = item as Record<string, unknown>
                  const route =
                    routeFromEvent ??
                    parseRouteToken(String(row.event ?? '').trim()) ??
                    parseRouteToken(
                      `${String(row.domain ?? '2d').toLowerCase()}_${String(row.action ?? 'other').toLowerCase()}`
                    )
                  if (!route) continue
                  const targetId = String(row.id ?? '').trim()
                  if (!targetId && !(route.domain === '3d' && route.action === 'camera')) continue
                  out.push({ targetId: targetId || undefined, route, data: pickControlRequestFields(row) })
                }
                return out.map((it) => ({
                  kind: 'datasource_routed' as const,
                  sourceId: dsConfig.key,
                  targetId: it.targetId,
                  route: { domain: it.route.domain, action: it.route.action },
                  data: it.data
                }))
              }
            })
            await source.start((ev) => {
              if (isDatasourceRoutedEvent(ev)) {
                emit({
                  targetId: ev.targetId,
                  route: ev.route,
                  data: ev.data
                })
              }
            })
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
                const out: RoutedSourceData[] = []
                const list: unknown[] = Array.isArray(body)
                  ? body
                  : body && typeof body === 'object'
                    ? [body]
                    : []
                for (const raw of list) {
                  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue
                  const obj = raw as Record<string, unknown>
                  let route = parseRouteToken(String(obj.event ?? '').trim())
                  if (!route) {
                    route = parseRouteToken(
                      `${String(obj.domain ?? '2d').toLowerCase()}_${String(obj.action ?? 'other').toLowerCase()}`
                    )
                  }
                  if (!route) continue
                  const targetId = String(obj.id ?? '').trim()
                  if (!targetId && !(route.domain === '3d' && route.action === 'camera')) continue
                  out.push({ targetId: targetId || undefined, route, data: pickControlRequestFields(obj) })
                }
                return out.map((it) => ({
                  kind: 'datasource_routed' as const,
                  sourceId: dsConfig.key,
                  targetId: it.targetId,
                  route: { domain: it.route.domain, action: it.route.action },
                  data: it.data
                }))
              }
            })
            await source.start((ev) => {
              if (isDatasourceRoutedEvent(ev)) {
                emit({
                  targetId: ev.targetId,
                  route: ev.route,
                  data: ev.data
                })
              }
            })
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

/** 将全局 datasource 接入 dataEngine；targetId 与 2D/3D 组件 id 匹配。 */
async function setupDataSourceConnector() {
  await cleanupConnectorState()

  const list = props.datasources ?? []
  const activeDatasource = pickActiveDatasource(list)
  const widgets2d = config.value.widgets2D ?? []
  const widgets3d = config.value.widgets3D ?? []
  const widget2DById = new Map<string, WidgetConfig2D>()
  for (const w of widgets2d) {
    const wid = String(w.id ?? '').trim()
    if (wid) widget2DById.set(wid, w)
  }
  const widget3DById = new Map<string, WidgetConfig3D>()
  for (const w of widgets3d) {
    const wid = String(w.id ?? '').trim()
    if (wid) widget3DById.set(wid, w)
  }
  if (!activeDatasource || (widget2DById.size === 0 && widget3DById.size === 0)) return

  const dsConfig = activeDatasource
  await ensureGlobalDatasource(dsConfig)
  const sourceId = `${dashboardOwnerId}:${dsConfig.key}:all_widgets`
  dataEngine.registerSource({
    id: sourceId,
    start: async (push) => {
      const unsub = await globalDatasourceRegistry.subscribe(dsConfig.key, (data) => {
        const routed = data as RoutedSourceData
        const tid = routed.targetId ? String(routed.targetId).trim() : ''
        if (routed.route.domain === '3d' && routed.route.action === 'camera') {
          const payload = toPayloadByRoute(null, routed.route, routed.data)
          if (!payload) return
          dataChainLog('Dashboard.connector.routed', {
            datasourceKey: dsConfig.key,
            domain: routed.route.domain,
            action: routed.route.action,
            targetId: '(camera)',
            data: formatDataChainDetail(routed.data, 16000),
            payloadKind: payload.kind
          })
          push(toControlEnvelope(sourceId, routed.route, payload))
          return
        }
        if (!tid) return
        if (routed.route.domain === '2d') {
          const w2 = widget2DById.get(tid)
          if (!w2) {
            dataChainLog('Dashboard.connector.skip', {
              reason: 'widget_2d_not_found',
              datasourceKey: dsConfig.key,
              targetId: tid,
              knownIdsSample: [...widget2DById.keys()].slice(0, 12)
            })
            return
          }
          const payload = toPayloadByRoute(w2, routed.route, routed.data)
          if (!payload) {
            dataChainLog('Dashboard.connector.skip', {
              reason: 'payload_null',
              datasourceKey: dsConfig.key,
              targetId: tid,
              action: routed.route.action
            })
            return
          }
          dataChainLog('Dashboard.connector.routed', {
            datasourceKey: dsConfig.key,
            domain: routed.route.domain,
            action: routed.route.action,
            targetId: tid,
            widgetType: w2.type,
            data: formatDataChainDetail(routed.data, 16000),
            payloadKind: payload.kind
          })
          push(toControlEnvelope(sourceId, routed.route, payload))
          return
        }
        if (routed.route.domain === '3d') {
          if (!widget3DById.has(tid)) {
            dataChainLog('Dashboard.connector.skip', {
              reason: 'widget_3d_not_found',
              datasourceKey: dsConfig.key,
              targetId: tid
            })
            return
          }
          const payload = toPayloadByRoute(null, routed.route, routed.data)
          if (!payload) {
            dataChainLog('Dashboard.connector.skip', {
              reason: 'payload_null',
              datasourceKey: dsConfig.key,
              targetId: tid,
              domain: '3d'
            })
            return
          }
          dataChainLog('Dashboard.connector.routed', {
            datasourceKey: dsConfig.key,
            domain: routed.route.domain,
            action: routed.route.action,
            targetId: tid,
            data: formatDataChainDetail(routed.data, 16000),
            payloadKind: payload.kind
          })
          push(toControlEnvelope(sourceId, routed.route, payload))
        }
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
    widgets2DCount: widget2DById.size,
    widgets3DCount: widget3DById.size,
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

/** widget ???layoutUnit=percent ???????? 0-100???? sizeManager?px ????vw/vh/rem??*/
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
  () =>
    [
      props.config?.widgets2D?.length ?? 0,
      props.config?.widgets3D?.length ?? 0,
      props.datasources?.length ?? 0
    ] as const,
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
/* ??????????????1 ???? 2 ????????? WebGL canvas */
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
