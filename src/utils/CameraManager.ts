import type { CameraRequest } from '../types'
export type { CameraRequest } from '../types'

export type CameraHandler = (req: CameraRequest) => void

export type CameraManagerOptions = {
  enabled?: boolean
  logger?: (entry: Record<string, unknown>) => void
}

export class CameraManager {
  private readonly handlers = new Map<string, CameraHandler>()
  private readonly enabled: boolean
  private readonly logger: (entry: Record<string, unknown>) => void

  constructor(options?: CameraManagerOptions) {
    this.enabled = options?.enabled ?? true
    this.logger = options?.logger ?? ((entry) => console.log('[CameraManager]', entry))
  }

  register(key: string, handler: CameraHandler): void {
    const k = String(key || '').trim()
    if (!k) return
    if (typeof handler !== 'function') return
    this.handlers.set(k, handler)
  }

  execute(req: CameraRequest): void {
    const k = String(req?.key || '').trim()
    const id = String(req?.id || '').trim()
    if (!k) return
    if (this.enabled) this.logger({ type: 'execute', key: k, id: id || '(default)', params: req?.params ?? null })

    const h = this.handlers.get(k)
    if (!h) {
      if (this.enabled) this.logger({ type: 'missing_handler', key: k, id: id || '(default)' })
      return
    }
    try {
      h(req)
    } catch (err) {
      if (this.enabled) {
        this.logger({
          type: 'execute_error',
          key: k,
          id: id || '(default)',
          error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err)
        })
      }
    }
  }
}

