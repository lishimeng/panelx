import type {
  CameraRequest,
  CommandRequest,
  ControlEnvelope,
  ControlPayload,
  ControlSource,
  ControlSourceEvent,
  ControlSourceStatus,
  PropertyRequest
} from '../types'
import { isDatasourceRoutedEvent } from '../types'
import type { CommandManager } from './CommandManager'
import type { CameraManager } from './CameraManager'
import type { PropertyManager } from './PropertyManager'

export type EngineStatus = 'idle' | 'running' | 'paused' | 'stopped'
export type QueueDropPolicy = 'drop_oldest' | 'drop_newest'

export type StreamEngineOptions = {
  maxQueueSize?: number
  dropPolicy?: QueueDropPolicy
  logger?: (entry: Record<string, unknown>) => void
  commandSink?: (request: CommandRequest, event: ControlEnvelope) => void
  propertySink?: (request: PropertyRequest, event: ControlEnvelope) => void
  cameraSink?: (request: CameraRequest, event: ControlEnvelope) => void
  widgetSink?: (payload: Extract<ControlPayload, { kind: 'widget' }>, event: ControlEnvelope) => void
}

type SourceRuntime = {
  source: ControlSource
  status: ControlSourceStatus
  lastError?: unknown
}

type EngineStats = {
  status: EngineStatus
  queueSize: number
  droppedCount: number
  consumedCount: number
  sourceCount: number
}

export class StreamEngine {
  private readonly commandManager?: CommandManager
  private readonly propertyManager?: PropertyManager
  private readonly cameraManager?: CameraManager
  private readonly maxQueueSize: number
  private readonly dropPolicy: QueueDropPolicy
  private readonly logger: (entry: Record<string, unknown>) => void

  private readonly queue: ControlSourceEvent[] = []
  private readonly sourceMap = new Map<string, SourceRuntime>()
  private status: EngineStatus = 'idle'
  private droppedCount = 0
  private consumedCount = 0
  private flushing = false

  private readonly commandSink?: (request: CommandRequest, event: ControlEnvelope) => void
  private readonly propertySink?: (request: PropertyRequest, event: ControlEnvelope) => void
  private readonly cameraSink?: (request: CameraRequest, event: ControlEnvelope) => void
  private readonly widgetSink?: (payload: Extract<ControlPayload, { kind: 'widget' }>, event: ControlEnvelope) => void

  constructor(commandManager?: CommandManager, propertyManager?: PropertyManager, cameraManager?: CameraManager, options?: StreamEngineOptions) {
    this.commandManager = commandManager
    this.propertyManager = propertyManager
    this.cameraManager = cameraManager
    this.maxQueueSize = Math.max(1, Math.trunc(options?.maxQueueSize ?? 2000))
    this.dropPolicy = options?.dropPolicy ?? 'drop_oldest'
    this.logger = options?.logger ?? ((entry) => console.log('[StreamEngine]', entry))
    this.commandSink = options?.commandSink
    this.propertySink = options?.propertySink
    this.cameraSink = options?.cameraSink
    this.widgetSink = options?.widgetSink
  }

  registerSource(source: ControlSource): void {
    const id = String(source?.id ?? '').trim()
    if (!id) return
    if (this.sourceMap.has(id)) {
      this.logger({ type: 'source_replace', sourceId: id })
    }
    this.sourceMap.set(id, { source, status: 'idle' })
    if (this.status === 'running') {
      void this.startSource(id)
    }
  }

  async unregisterSource(sourceId: string): Promise<void> {
    const id = String(sourceId ?? '').trim()
    if (!id) return
    const rt = this.sourceMap.get(id)
    if (!rt) return
    await this.stopSource(rt)
    this.sourceMap.delete(id)
  }

  async start(): Promise<void> {
    if (this.status === 'running') return
    this.status = 'running'
    for (const id of this.sourceMap.keys()) {
      await this.startSource(id)
    }
    this.flush()
  }

  stop(): void {
    this.status = 'stopped'
    for (const rt of this.sourceMap.values()) {
      void this.stopSource(rt)
    }
  }

  pause(): void {
    if (this.status !== 'running') return
    this.status = 'paused'
  }

  resume(): void {
    if (this.status !== 'paused') return
    this.status = 'running'
    this.flush()
  }

  async dispose(): Promise<void> {
    this.stop()
    for (const rt of this.sourceMap.values()) {
      await this.stopSource(rt)
    }
    this.sourceMap.clear()
    this.queue.length = 0
    this.status = 'stopped'
  }

  getStatus(): EngineStatus {
    return this.status
  }

  getStats(): EngineStats {
    return {
      status: this.status,
      queueSize: this.queue.length,
      droppedCount: this.droppedCount,
      consumedCount: this.consumedCount,
      sourceCount: this.sourceMap.size
    }
  }

  private async startSource(sourceId: string): Promise<void> {
    const rt = this.sourceMap.get(sourceId)
    if (!rt) return
    try {
      rt.status = 'running'
      await rt.source.start((event: ControlSourceEvent) => this.push(event))
    } catch (err) {
      rt.status = 'error'
      rt.lastError = err
      this.logger({ type: 'source_start_error', sourceId, error: String(err) })
    }
  }

  private async stopSource(rt: SourceRuntime): Promise<void> {
    try {
      await rt.source.stop()
      rt.status = 'stopped'
    } catch (err) {
      rt.status = 'error'
      rt.lastError = err
      this.logger({ type: 'source_stop_error', sourceId: rt.source.id, error: String(err) })
    }
  }

  private push(event: ControlSourceEvent): void {
    if (!event) return
    if (isDatasourceRoutedEvent(event)) {
      this.logger({ type: 'datasource_routed_ignored', sourceId: event.sourceId, reason: 'not_queued_in_stream_engine' })
      return
    }
    if (!event.payload) return
    if (this.queue.length >= this.maxQueueSize) {
      this.droppedCount++
      if (this.dropPolicy === 'drop_oldest') this.queue.shift()
      else return
      this.logger({ type: 'queue_drop', policy: this.dropPolicy, maxQueueSize: this.maxQueueSize })
    }
    this.queue.push(event)
    this.flush()
  }

  private flush(): void {
    if (this.flushing) return
    if (this.status !== 'running') return
    this.flushing = true
    try {
      while (this.status === 'running' && this.queue.length > 0) {
        const event = this.queue.shift()
        if (!event) continue
        this.dispatch(event as ControlEnvelope)
        this.consumedCount++
      }
    } finally {
      this.flushing = false
    }
  }

  private dispatch(event: ControlEnvelope): void {
    const payload = event.payload
    if (payload.kind === 'command') {
      if (this.commandSink) this.commandSink(payload.request as CommandRequest, event)
      else this.commandManager?.execute(payload.request as CommandRequest)
      return
    }
    if (payload.kind === 'property') {
      if (this.propertySink) this.propertySink(payload.request as PropertyRequest, event)
      else this.propertyManager?.execute(payload.request as PropertyRequest)
      return
    }
    if (payload.kind === 'camera') {
      if (this.cameraSink) this.cameraSink(payload.request as CameraRequest, event)
      else this.cameraManager?.execute(payload.request as CameraRequest)
      return
    }
    if (this.widgetSink) {
      this.widgetSink(payload, event)
      return
    }
    this.logger({ type: 'missing_widget_sink', sourceId: event.sourceId })
  }
}

