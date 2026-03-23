export type CommandRequest = {
  /** 命令 key，用于在命令表中查找对应函数 */
  key: string
  /** 命令参数（任意 JSON 兼容结构） */
  params?: unknown
}

export type CommandHandler = (params?: unknown) => void

/**
 * 命令管理器：把 UI 触发的“命令 JSON”映射到已注册的执行函数。
 * - register(key, handler)：注册命令
 * - execute({key, params})：按 key 找 handler 并执行
 */
export class CommandManager {
  private readonly handlers = new Map<string, CommandHandler>()

  /** 注册（可覆盖同名 key） */
  register(key: string, handler: CommandHandler): void {
    const k = String(key || '').trim()
    if (!k) return
    if (typeof handler !== 'function') return
    this.handlers.set(k, handler)
  }

  /** 执行命令；找不到 key 时直接忽略（不抛错，避免 UI 阻塞） */
  execute(req: CommandRequest): void {
    const k = String(req?.key || '').trim()
    if (!k) return
    const h = this.handlers.get(k)
    if (!h) return
    h(req.params)
  }
}

