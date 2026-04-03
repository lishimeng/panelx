import type { ControlPush, ControlSource, ControlSourceStatus, DatasourceRoutedEvent } from '../../types'
import { isDatasourceRoutedParseItem } from '../../types'
import { formatDataChainDetail } from '../../core/comm/dataChainLog'
import { normalizeControlEnvelope } from './normalizers'

/** 与常见 SSE 服务端 `event:` 命名约定对齐；仅 `onmessage` 时需自行解析或改用 `namedEvents` */
export const DEFAULT_SSE_NAMED_EVENTS = [
  'open',
  '2d_chart',
  '2d_other',
  '2d_property',
  '3d_command',
  '3d_property',
  'meta_connected'
] as const

export type SSESourceOptions = {
  sourceId: string
  url: string
  /** 若只监听单一命名事件（默认不设置） */
  eventName?: string
  /** 除 `message` 外额外监听的 SSE 事件名（与测试服务 `event:` 一致） */
  namedEvents?: readonly string[]
  reconnectMs?: number
  maxReconnectMs?: number
  parseMessage?: (message: MessageEvent<string>, eventName?: string) => unknown | unknown[]
  logger?: (entry: Record<string, unknown>) => void
}

export class SSESource implements ControlSource {
  readonly id: string
  private readonly url: string
  private readonly eventName?: string
  private readonly namedEvents: readonly string[]
  private readonly reconnectMs: number
  private readonly maxReconnectMs: number
  private readonly parseMessage: (message: MessageEvent<string>, eventName?: string) => unknown | unknown[]
  private readonly logger: (entry: Record<string, unknown>) => void

  private es: EventSource | null = null
  private push: ControlPush | null = null
  private currentStatus: ControlSourceStatus = 'idle'
  private retryMs: number
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SSESourceOptions) {
    this.id = options.sourceId
    this.url = options.url
    this.eventName = options.eventName
    this.namedEvents = options.namedEvents ?? DEFAULT_SSE_NAMED_EVENTS
    this.reconnectMs = Math.max(200, Math.trunc(options.reconnectMs ?? 1000))
    this.maxReconnectMs = Math.max(this.reconnectMs, Math.trunc(options.maxReconnectMs ?? 15000))
    this.retryMs = this.reconnectMs
    this.parseMessage =
      options.parseMessage ??
      ((msg) => {
        try {
          return JSON.parse(msg.data)
        } catch {
          return null
        }
      })
    this.logger = options.logger ?? ((entry) => console.log('[SSESource]', entry))
  }

  async start(push: ControlPush): Promise<void> {
    await this.stop()
    this.push = push
    this.currentStatus = 'running'
    this.retryMs = this.reconnectMs
    this.logger({ type: 'sse_client_status', sourceId: this.id, status: 'starting', url: this.url })
    this.connect()
  }

  async stop(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    if (this.es) this.es.close()
    this.es = null
    this.push = null
    this.currentStatus = 'stopped'
    this.logger({ type: 'sse_client_status', sourceId: this.id, status: 'stopped' })
  }

  status(): ControlSourceStatus {
    return this.currentStatus
  }

  private connect(): void {
    if (!this.push || this.currentStatus === 'stopped') return
    const es = new EventSource(this.url)
    this.es = es
    this.logger({
      type: 'sse_client_status',
      sourceId: this.id,
      status: 'connecting',
      url: this.url,
      eventName: this.eventName ?? 'message'
    })

    es.onopen = () => {
      this.currentStatus = 'running'
      this.retryMs = this.reconnectMs
      this.logger({ type: 'sse_client_status', sourceId: this.id, status: 'connected' })
    }

    const handler = (event: MessageEvent<string>): void => {
      if (!this.push) return
      const sseEventType = ((event as MessageEvent).type || this.eventName || 'message').trim()
      const mapped = this.parseMessage(event, sseEventType)
      const list = Array.isArray(mapped) ? mapped : [mapped]
      let receivedCount = 0
      for (const item of list) {
        const p = this.push
        if (!p) break
        if (isDatasourceRoutedParseItem(item)) {
          const sid = String(item.sourceId ?? this.id).trim() || this.id
          const routed: DatasourceRoutedEvent = {
            kind: 'datasource_routed',
            sourceId: sid,
            targetId: item.targetId,
            route: item.route,
            data: item.data
          }
          p(routed)
          receivedCount += 1
          continue
        }
        const env = normalizeControlEnvelope(this.id, item)
        if (!env) continue
        p(env)
        receivedCount += 1
      }
      const evType = (event as MessageEvent).type || 'message'
      const raw = typeof event.data === 'string' ? event.data : String(event.data ?? '')
      this.logger({
        type: 'sse_data_received',
        sourceId: this.id,
        eventType: evType,
        eventName: this.eventName ?? evType,
        rawLength: raw.length,
        envelopeCount: receivedCount,
        rawData: formatDataChainDetail(raw, 16000)
      })
    }

    if (this.eventName) {
      es.addEventListener(this.eventName, handler as EventListener)
    } else {
      es.addEventListener('message', handler as EventListener)
      const seen = new Set<string>()
      for (const name of this.namedEvents) {
        const n = String(name ?? '').trim()
        if (!n || n === 'message' || seen.has(n)) continue
        seen.add(n)
        es.addEventListener(n, handler as EventListener)
      }
    }

    es.onerror = () => {
      if (this.currentStatus === 'stopped') return
      this.currentStatus = 'error'
      this.logger({ type: 'sse_client_status', sourceId: this.id, status: 'error', retryMs: this.retryMs })
      this.logger({ type: 'sse_error', sourceId: this.id, retryMs: this.retryMs })
      es.close()
      this.es = null
      this.retryTimer = setTimeout(() => {
        this.currentStatus = 'running'
        this.logger({ type: 'sse_client_status', sourceId: this.id, status: 'reconnecting', retryMs: this.retryMs })
        this.retryMs = Math.min(this.retryMs * 2, this.maxReconnectMs)
        this.connect()
      }, this.retryMs)
    }
  }
}

