/**
 * 二次开发：在此维护可加载模型列表，启动时交给框架注册。
 * 模型文件放在 public/models/；核心逻辑见 `framework/model/loadableRegistration`。
 */
import {
  registerLoadableModelDefinitions,
  getLoadableModelDefinitions,
  type LoadableModelDefinition
} from '../framework/model/loadableRegistration'

/** 可在此数组追加定义；原为 demo/loadableModels.json，已内联为空表 */
const items: LoadableModelDefinition[] = []

let registered = false

export function registerLoadableModels(): void {
  if (registered) return
  registered = true
  registerLoadableModelDefinitions(items)
}

export { getLoadableModelDefinitions }
export type { LoadableModelDefinition }
