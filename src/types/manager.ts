/**
 * 流式控制统一请求体：command / property / camera 同构。
 * - `key`：处理器路由键
 * - `id`：目标实例 id；相机等场景可省略（CommandManager / PropertyManager 会在运行时要求非空 id）
 * - `params`：业务参数
 */
export type ControlRequest = {
  key: string
  id?: string
  params?: unknown
}

/** 语义别名，与 {@link ControlRequest} 相同 */
export type CommandRequest = ControlRequest
/** 语义别名，与 {@link ControlRequest} 相同 */
export type PropertyRequest = ControlRequest
/** 语义别名，与 {@link ControlRequest} 相同 */
export type CameraRequest = ControlRequest

/**
 * 2D 组件增量：`kind: 'widget'` 时 `request` 仍为 {@link ControlRequest}。
 * 约定 `key === WIDGET_PATCH_REQUEST_KEY`，`params` 含 **`patch`**（合并进组件 props）与可选 **`refresh`**。
 */
export const WIDGET_PATCH_REQUEST_KEY = 'widget.patch' as const

/**
 * 编辑器属性 JSON 调试入口请求。
 * 用于 executeProperty({ json }) 这类调用。
 */
export type PropertyJsonExecuteRequest = {
  json?: string
}

export type ControlDomain = '2d' | '3d'
export type ControlAction = 'command' | 'property' | 'camera' | 'chart' | 'other'

export type ControlHeader = {
  domain: ControlDomain
  action: ControlAction
}

/**
 * 统一控制载荷：用于流引擎内部分发到 CommandManager / PropertyManager。
 */
export type ControlPayload =
  | { kind: 'command'; request: ControlRequest }
  | { kind: 'property'; request: ControlRequest }
  | { kind: 'camera'; request: ControlRequest }
  | { kind: 'widget'; request: ControlRequest }

/** 从 `kind: 'widget'` 载荷解析出 patch / refresh（供 Dashboard 等消费） */
export function widgetPayloadPatch(
  payload: Extract<ControlPayload, { kind: 'widget' }>
): { id: string; patch: Record<string, unknown>; refresh: boolean } | null {
  const id = String(payload.request.id ?? '').trim()
  if (!id) return null
  const p = payload.request.params
  if (!p || typeof p !== 'object') return null
  const rec = p as Record<string, unknown>
  const patch = rec.patch
  if (!patch || typeof patch !== 'object') return null
  return { id, patch: patch as Record<string, unknown>, refresh: rec.refresh !== false }
}

/**
 * 流引擎统一消息壳：便于跟踪来源、时间与链路。
 */
export type ControlEnvelope = {
  sourceId: string
  timestamp: number
  traceId?: string
  priority?: number
  header: ControlHeader
  payload: ControlPayload
}

/**
 * 全局 datasource（SSE / polling）解析结果：不经由 widget patch 嵌套，直接交给 Dashboard 连接器。
 */
export type DatasourceRoutedEvent = {
  kind: 'datasource_routed'
  sourceId: string
  targetId?: string
  route: ControlHeader
  data: unknown
}

export type ControlSourceEvent = ControlEnvelope | DatasourceRoutedEvent

function isControlDomain(v: unknown): v is ControlDomain {
  return v === '2d' || v === '3d'
}

function isControlAction(v: unknown): v is ControlAction {
  return v === 'command' || v === 'property' || v === 'camera' || v === 'chart' || v === 'other'
}

/** `parseMessage` / `parseResponse` 可返回；`sourceId` 可由 {@link SSESource} 补全。 */
export function isDatasourceRoutedParseItem(v: unknown): v is Omit<DatasourceRoutedEvent, 'sourceId'> & { sourceId?: string } {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (o.kind !== 'datasource_routed') return false
  const r = o.route
  if (!r || typeof r !== 'object') return false
  const rr = r as Record<string, unknown>
  return isControlDomain(rr.domain) && isControlAction(rr.action)
}

export function isDatasourceRoutedEvent(e: ControlSourceEvent): e is DatasourceRoutedEvent {
  return (e as DatasourceRoutedEvent).kind === 'datasource_routed'
}

export type ControlSourceStatus = 'idle' | 'running' | 'stopped' | 'error'
export type ControlPush = (event: ControlSourceEvent) => void

/**
 * 控制数据源接口：start 后持续通过 push 输出事件，stop 停止输出。
 */
export type ControlSource = {
  id: string
  start: (push: ControlPush) => void | Promise<void>
  stop: () => void | Promise<void>
  status?: () => ControlSourceStatus
}

export type BackendDataSourceType = 'polling' | 'sse'

export type BackendDataSourceBaseConfig = {
  type: BackendDataSourceType
  key: string
  /** Dashboard 运行时仅允许一个数据源 enable=true */
  enable?: boolean
}

export type BackendPollingSourceConfig = BackendDataSourceBaseConfig & {
  type: 'polling'
  /** 完整 URL（优先级高于 host/path） */
  url?: string
  /** 主机地址，如 https://api.example.com；不填默认当前 origin */
  host?: string
  /** 接口路径，如 /api/stats；不填使用默认值 */
  path?: string
  interval?: number
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}

export type BackendSSESourceConfig = BackendDataSourceBaseConfig & {
  type: 'sse'
  /** 完整 URL（优先级高于 host/path） */
  url?: string
  /** 主机地址，如 https://api.example.com；不填默认当前 origin */
  host?: string
  /** SSE 路径，如 /api/sse；不填使用默认值 */
  path?: string
}

export type BackendDataSourceConfig = BackendPollingSourceConfig | BackendSSESourceConfig

