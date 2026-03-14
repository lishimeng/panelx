import type { DataSource } from '../../types/comm'
import type { PollingSourceConfig } from '../../types/comm'
import { request } from '../../api/request'
import { dataChainLog } from './dataChainLog'

export class PollingSource<T = unknown> implements DataSource<T> {
  private config: PollingSourceConfig
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners: Array<(data: T) => void> = []
  /** 按 logicCode 订阅：响应体为 Record<logicCode, data> 时按 key 分发 */
  private logicCodeListeners: Map<string, Array<(data: unknown) => void>> = new Map()

  constructor(config: PollingSourceConfig) {
    this.config = config
  }

  getKey(): string {
    return this.config.key
  }

  start(): void {
    if (this.timer) return
    dataChainLog('PollingSource.start', {
      key: this.config.key,
      url: this.config.url,
      interval: this.config.interval
    })
    const fetchData = async () => {
      try {
        const res = this.config.method === 'POST'
          ? await request.post<unknown>(this.config.url, this.config.body)
          : await request.get<unknown>(this.config.url)
        const data = res.data
        dataChainLog('PollingSource.fetch', {
          key: this.config.key,
          genericListeners: this.listeners.length,
          logicCodeListeners: this.logicCodeListeners.size
        })
        this.listeners.forEach((cb) => cb(data as T))
        if (data && typeof data === 'object' && !Array.isArray(data) && this.logicCodeListeners.size > 0) {
          const obj = data as Record<string, unknown>
          this.logicCodeListeners.forEach((cbs, logicCode) => {
            if (logicCode in obj) {
              dataChainLog('PollingSource.dispatch', {
                key: this.config.key,
                logicCode,
                callbacks: cbs.length
              })
              cbs.forEach((cb) => cb(obj[logicCode]))
            }
          })
        }
      } catch (e) {
        dataChainLog('PollingSource.fetch.error', {
          key: this.config.key,
          message: String(e)
        })
      }
    }
    fetchData()
    this.timer = setInterval(fetchData, this.config.interval)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onData(callback: (data: T) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  /** 按 logicCode 订阅：当响应体为 Record<logicCode, data> 时，将 data[logicCode] 推送给该回调 */
  onDataByLogicCode(logicCode: string, callback: (data: unknown) => void): () => void {
    if (!this.logicCodeListeners.has(logicCode)) this.logicCodeListeners.set(logicCode, [])
    this.logicCodeListeners.get(logicCode)!.push(callback)
    dataChainLog('PollingSource.onDataByLogicCode.subscribe', {
      key: this.config.key,
      logicCode
    })
    return () => {
      const cbs = this.logicCodeListeners.get(logicCode)!
      const next = cbs.filter((l) => l !== callback)
      if (next.length === 0) this.logicCodeListeners.delete(logicCode)
      else this.logicCodeListeners.set(logicCode, next)
    }
  }
}
