import type { DataSource } from '../../types/comm'
import type { SSESourceConfig } from '../../types/comm'
import { dataChainLog } from './dataChainLog'

export class SSESource<T = unknown> implements DataSource<T> {
  private config: SSESourceConfig
  private eventSource: EventSource | null = null
  private listeners: Array<(data: T) => void> = []
  /** 按事件类型订阅：eventType -> callbacks，用于与 widget 的 logicCode 绑定（eventByLogicCode） */
  private eventListeners: Map<string, Array<(data: T) => void>> = new Map()

  constructor(config: SSESourceConfig) {
    this.config = config
  }

  getKey(): string {
    return this.config.key
  }

  start(): void {
    if (this.eventSource) return
    dataChainLog('SSESource.start', { key: this.config.key, url: this.config.url })
    const es = new EventSource(this.config.url)
    this.eventSource = es
    es.onopen = () => {
      dataChainLog('SSESource.connected', { key: this.config.key })
    }
    es.onmessage = (event) => {
      this.dispatch(event.data, 'message')
    }
    es.onerror = () => {
      dataChainLog('SSESource.error', { key: this.config.key, message: 'EventSource onerror' })
    }
    this.eventListeners.forEach((_, eventType) => this.attachEvent(es, eventType))
  }

  private attachEvent(es: EventSource, eventType: string): void {
    es.addEventListener(eventType, (event: MessageEvent) => {
      this.dispatch(event.data, eventType)
    })
  }

  private dispatch(raw: string, eventType: string): void {
    let data: T
    try {
      data = JSON.parse(raw) as T
    } catch {
      data = raw as unknown as T
    }
    const genericCount = this.listeners.length
    const eventCbs = this.eventListeners.get(eventType)
    const eventCount = eventCbs?.length ?? 0
    dataChainLog('SSESource.dispatch', {
      key: this.config.key,
      eventType,
      genericListeners: genericCount,
      eventListeners: eventCount
    })
    this.listeners.forEach((cb) => cb(data))
    if (eventCbs) eventCbs.forEach((cb) => cb(data))
  }

  stop(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  onData(callback: (data: T) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  /** 按 SSE 事件类型订阅，用于 logicCode 与 event 绑定：eventByLogicCode[logicCode] === eventType */
  onEvent(eventType: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
      if (this.eventSource) this.attachEvent(this.eventSource, eventType)
      dataChainLog('SSESource.onEvent.subscribe', {
        key: this.config.key,
        eventType
      })
    }
    this.eventListeners.get(eventType)!.push(callback)
    return () => {
      const cbs = this.eventListeners.get(eventType)!
      const next = cbs.filter((l) => l !== callback)
      if (next.length === 0) this.eventListeners.delete(eventType)
      else this.eventListeners.set(eventType, next)
    }
  }
}
