/**
 * 执行「本地模块」里导出的 `register(modelRegistry)`，用于二次开发在 *.local.ts 中挂接自定义 Model 类。
 */
import { modelRegistry } from './ModelRegistry'
import type { ModelRegistry } from './ModelRegistry'

export type LocalModelModule = { register?: (r: ModelRegistry) => void }

/**
 * @param modules 一般为 Vite `import.meta.glob`（eager）对 `*.local.ts` 的模块表
 */
export function registerLocalModelModules(modules: Record<string, LocalModelModule>): void {
  for (const mod of Object.values(modules)) {
    try {
      mod.register?.(modelRegistry)
    } catch (e) {
      console.warn('[ModelRegistry] register local model module failed:', e)
    }
  }
}
