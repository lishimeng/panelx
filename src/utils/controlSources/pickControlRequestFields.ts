const CONTROL_KEYS = ['key', 'id', 'params'] as const

/**
 * 从 SSE / polling 解析出的对象中只保留 `ControlRequest` 三字段：`key` / `id` / `params`。
 * 去掉与 `event:` 重复的 `event` / `domain` / `action` 等，便于下游只处理业务体。
 */
export function pickControlRequestFields(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of CONTROL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      out[k] = row[k]
    }
  }
  return out
}
