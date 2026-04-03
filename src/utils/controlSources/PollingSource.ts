import type { ControlPush, ControlSource, ControlSourceStatus, DatasourceRoutedEvent } from '../../types'
import { isDatasourceRoutedParseItem } from '../../types'
import { normalizeControlEnvelope } from './normalizers'

export type PollingSourceOptions = {
  sourceId: string
  url: string
  intervalMs?: number
  init?: RequestInit
  parseResponse?: (data: unknown) => unknown | unknown[]
  logger?: (entry: Record<string, unknown>) => void
}

export class PollingSource implements ControlSource {
  readonly id: string
  private readonly url: string
  private readonly intervalMs: number
  private readonly init?: RequestInit
  private readonly parseResponse: (data: unknown) => unknown | unknown[]
  private readonly logger: (entry: Record<string, unknown>) => void

  private timer: ReturnType<typeof setInterval> | null = null
  private push: ControlPush | null = null
  private currentStatus: ControlSourceStatus = 'idle'

  constructor(options: PollingSourceOptions) {
    this.id = options.sourceId
    this.url = options.url
    this.intervalMs = Math.max(100, Math.trunc(options.intervalMs ?? 1000))
    this.init = options.init
    this.parseResponse = options.parseResponse ?? ((v) => v)
    this.logger = options.logger ?? ((entry) => console.log('[PollingSource]', entry))
  }

  async start(push: ControlPush): Promise<void> {
    await this.stop()
    this.push = push
    this.currentStatus = 'running'
    this.timer = setInterval(() => {
      void this.tick()
    }, this.intervalMs)
    await this.tick()
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.push = null
    this.currentStatus = 'stopped'
  }

  status(): ControlSourceStatus {
    return this.currentStatus
  }

  private async tick(): Promise<void> {
    if (!this.push || this.currentStatus !== 'running') return
    try {
      const res = await fetch(this.url, this.init)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as unknown
      const mapped = this.parseResponse(body)
      const rawList = Array.isArray(mapped) ? mapped : [mapped]
      const list = rawList.filter(
        (item): item is Record<string, unknown> =>
          item != null && typeof item === 'object' && !Array.isArray(item)
      )
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
          continue
        }
        const env = normalizeControlEnvelope(this.id, item)
        if (!env) continue
        p(env)
      }
    } catch (err) {
      this.currentStatus = 'error'
      this.logger({ type: 'poll_error', sourceId: this.id, error: String(err) })
      this.currentStatus = 'running'
    }
  }
}

