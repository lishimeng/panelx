/**
 * Examples（二次开发）模型注册入口。
 *
 * - 框架提供内置模型；二次开发模型放在 `src/examples/models/`，由本入口通过 glob 收集并注册。
 * - `import.meta.glob` 须留在调用方（Vite 静态分析），具体执行见 `framework/model/localModelRegistration`。
 */
import {
  registerLocalModelModules,
  type LocalModelModule
} from '../framework/model/localModelRegistration'

let registered = false

export function registerExampleModels(): void {
  if (registered) return
  registered = true

  const localModules = import.meta.glob('./models/**/*.local.ts', { eager: true }) as Record<
    string,
    LocalModelModule
  >
  registerLocalModelModules(localModules)
}
