/** 数据通信：统一框架，轮询/SSE 等各自实现 */

export type DataSourceType = 'polling' | 'sse'

export interface DataSourceBaseConfig {
  type: DataSourceType
  /** 唯一标识 */
  key: string
}

/** API 轮询配置；响应体若为 Record<logicCode, unknown> 则按 key 分发，否则整包推送给所有订阅者 */
export interface PollingSourceConfig extends DataSourceBaseConfig {
  type: 'polling'
  url: string
  interval: number
  /** 请求方法 */
  method?: 'GET' | 'POST'
  /** 请求体（POST） */
  body?: Record<string, unknown>
}

/** SSE 配置：逻辑编号与 SSE 事件名绑定，用于按 event 分发到对应 widget */
export interface SSESourceConfig extends DataSourceBaseConfig {
  type: 'sse'
  url: string
  /** 逻辑编号 -> SSE 事件名（event type），收到该 event 时向对应 logicCode 的 widget 推送数据 */
  eventByLogicCode?: Record<string, string>
}

export type DataSourceConfig = PollingSourceConfig | SSESourceConfig

export interface DataSource<T = unknown> {
  getKey(): string
  start(): void
  stop(): void
  /** 订阅数据更新 */
  onData(callback: (data: T) => void): () => void
}
