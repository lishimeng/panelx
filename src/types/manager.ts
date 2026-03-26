/**
 * 通用命令请求：用于 CommandManager 与各层 executeCommand API。
 */
export type CommandRequest = {
  key: string
  id: string
  params?: unknown
}

/**
 * 通用属性请求：用于 PropertyManager 与各层 executeProperty API。
 */
export type PropertyRequest = {
  key: string
  id: string
  params?: unknown
}

/**
 * 相机请求：用于 CameraManager 与各层 executeCamera API。
 * id 可选（预留多相机场景），当前默认主相机。
 */
export type CameraRequest = {
  key: string
  id?: string
  params?: unknown
}

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
  | { kind: 'command'; request: CommandRequest }
  | { kind: 'property'; request: PropertyRequest }
  | { kind: 'camera'; request: CameraRequest }
  | { kind: 'widget'; widgetId: string; patch: Record<string, unknown>; refresh?: boolean }

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

export type ControlSourceStatus = 'idle' | 'running' | 'stopped' | 'error'
export type ControlPush = (event: ControlEnvelope) => void

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

