/**
 * 按「文件路径 + typeId」批量注册 ModelLoadable，供应用/二次开发在启动时注入可加载模型列表。
 */
import { modelRegistry } from './ModelRegistry'
import type { ModelRegistryCreateConfig } from './ModelRegistry'
import { ModelLoadable } from './ModelLoadable'

export interface LoadableModelDefinition {
  id: string
  label: string
  typeId: string
  source: string
  name?: string
}

let lastDefinitions: LoadableModelDefinition[] = []

/**
 * 将每条定义注册为 `category: loadable` 的 `ModelLoadable`（同 id 再次注册会覆盖注册表项）。
 */
export function registerLoadableModelDefinitions(definitions: readonly LoadableModelDefinition[]): void {
  lastDefinitions = [...definitions]
  for (const item of definitions) {
    if (!item.id || !item.source || !item.typeId) continue
    const source = item.source
    const typeId = item.typeId
    const label = item.label || item.id
    modelRegistry.register({
      id: item.id,
      label,
      category: 'loadable',
      group: 'loadable',
      create(config: ModelRegistryCreateConfig) {
        const name = config.name ?? config.id ?? item.id
        return new ModelLoadable(name, typeId, source)
      }
    })
  }
}

/** 返回最近一次传入 `registerLoadableModelDefinitions` 的列表副本（未调用过则为空数组） */
export function getLoadableModelDefinitions(): LoadableModelDefinition[] {
  return [...lastDefinitions]
}
