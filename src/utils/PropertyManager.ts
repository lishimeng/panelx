import type { PropertyRequest } from '../types'
export type { PropertyRequest } from '../types'

export type PropertyHandler = (req: PropertyRequest) => void

export type PropertyManagerOptions = {
  /** 是否启用执行日志（默认启用） */
  enabled?: boolean
  /** 日志输出函数（默认 console.log） */
  logger?: (entry: Record<string, unknown>) => void
}

/**
 * 属性管理器：把“属性 JSON”映射到已注册的属性处理函数。
 * - register(key, handler)：注册属性处理器
 * - execute({key, params})：按 key 找 handler 并执行
 */
export class PropertyManager {
  private readonly handlers = new Map<string, PropertyHandler>()
  private readonly enabled: boolean
  private readonly logger: (entry: Record<string, unknown>) => void

  constructor(options?: PropertyManagerOptions) {
    this.enabled = options?.enabled ?? true
    this.logger = options?.logger ?? ((entry) => console.log('[PropertyManager]', entry))
  }

  register(key: string, handler: PropertyHandler): void {
    const k = String(key || '').trim()
    if (!k) return
    if (typeof handler !== 'function') return
    this.handlers.set(k, handler)
  }

  execute(req: PropertyRequest): void {
    const k = String(req?.key || '').trim()
    const id = String(req?.id || '').trim()
    if (!k) return
    if (!id) return
    if (this.enabled) this.logger({ type: 'execute', key: k, id, params: req?.params ?? null })

    const h = this.handlers.get(k)
    if (!h) {
      if (this.enabled) this.logger({ type: 'missing_handler', key: k, id })
      return
    }
    try {
      h(req)
    } catch (err) {
      if (this.enabled) {
        this.logger({
          type: 'execute_error',
          key: k,
          id,
          error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err)
        })
      }
    }
  }
}

