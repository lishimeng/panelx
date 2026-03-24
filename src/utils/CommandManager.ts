import type { CommandRequest } from '../types'
export type { CommandRequest } from '../types'

export type CommandHandler = (req: CommandRequest) => void

export type CommandManagerOptions = {
  /** 是否启用执行日志（默认启用） */
  enabled?: boolean
  /**
   * 日志输出函数（默认使用 console.log）
   * 建议传入能记录到你自己的日志系统的函数。
   */
  logger?: (entry: Record<string, unknown>) => void
}

/**
 * 命令管理器：把 UI 触发的“命令 JSON”映射到已注册的执行函数。
 * - register(key, handler)：注册命令
 * - execute({key, params})：按 key 找 handler 并执行
 */
export class CommandManager {
  private readonly handlers = new Map<string, CommandHandler>()
  private readonly enabled: boolean
  private readonly logger: (entry: Record<string, unknown>) => void

  /** 注册（可覆盖同名 key） */
  register(key: string, handler: CommandHandler): void {
    const k = String(key || '').trim()
    if (!k) return
    if (typeof handler !== 'function') return
    this.handlers.set(k, handler)
  }

  constructor(options?: CommandManagerOptions) {
    this.enabled = options?.enabled ?? true
    this.logger = options?.logger ?? ((entry) => console.log('[CommandManager]', entry))
  }

  /** 执行命令；找不到 key 时直接忽略（不抛错，避免 UI 阻塞） */
  execute(req: CommandRequest): void {
    const k = String(req?.key || '').trim()
    const id = String(req?.id || '').trim()
    if (!k) return
    if (!id) return
    if (this.enabled) {
      // 避免日志里塞进超大对象；params 可能很长，但一般可读
      this.logger({ type: 'execute', key: k, id, params: req?.params ?? null })
    }
    const h = this.handlers.get(k)
    if (!h) {
      if (this.enabled) {
        this.logger({ type: 'missing_handler', key: k, id })
      }
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

