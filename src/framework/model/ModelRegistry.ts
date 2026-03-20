import type { Model } from './Model'

/**
 * 模型支持的单个属性定义：可在编辑器中展示并限制为枚举或自由输入。
 */
export interface PropDefinition {
  /** 属性键名，与 props[key] 对应 */
  key: string
  /** 展示用标签，不填则用 key */
  label?: string
  /** 可选预置枚举，有则编辑器用下拉选择；无则自由输入 */
  enum?: (string | number)[]
  /**
   * 默认值：用于 Editor 右侧 Props 面板展示（当当前实例的 custom[prop.key] 为空时）
   * 注意：仅用于 UI 展示，不会自动写入到运行时模型；模型仍使用自身 constructor 内的默认 cfg。
   */
  default?: unknown
  /**
   * 渲染类型提示：Editor 用于决定使用何种输入控件。
   * - `color`：渲染颜色调色板（type="color"）并提供 hex 文本输入
   * - 其它值目前未做强制（未定义时回退为普通文本输入）
   */
  type?: 'string' | 'number' | 'boolean' | 'color'
}

/**
 * 模型类型定义：描述一种可注册的 3D 模型类型，均继承自 Model。
 * 外部可注册自定义类型，并通过 getTypes() 获取「可用模型列表」。
 */
export interface ModelTypeDefinition {
  /** 类型唯一 id，如 'gltf'、'fbx'、'simple'，创建实例时传入 */
  id: string
  /** 展示用名称，供外部列表/编辑器显示 */
  label: string
  /** 可选分类，如 'loadable'、'builtin' */
  category?: string
  /** 编辑器左侧分组展示：'decoration' 装饰物、'equipment' 设备、'infrastructure' 基建，未设或其它值归入「其他」 */
  group?: string
  /**
   * 根据配置创建模型实例。
   * 配置通常包含 name；可加载类型需 source 与 category（或 format 映射为 category）。
   */
  create: (config: ModelRegistryCreateConfig) => Model
  /** 该类型支持的 prop 列表，注册时从 Model 类或配置读取；有 enum 的用下拉，无则自由输入 */
  supportedProps?: PropDefinition[]
}

/** 创建模型时的通用配置：name 必填，其余由具体类型使用 */
export interface ModelRegistryCreateConfig {
  /** 模型实例名称（对应 Model.modelName） */
  name: string
  /** 资源地址（ModelLoadable 等可加载类型必填） */
  source?: string
  /** 加载类别/格式，如 'gltf'、'fbx'（与 ModelTypeDefinition.id 或 Loader 约定一致） */
  format?: string
  category?: string
  [key: string]: unknown
}

/**
 * 3D 模型注册表：提供「可用的模型类型列表」供外部调用，并支持按类型创建 Model 实例。
 * 框架内置类型（gltf、fbx、simple）会在首次使用时注册；外部可继续 register 自定义类型。
 */
export class ModelRegistry {
  private readonly types = new Map<string, ModelTypeDefinition>()

  /**
   * 注册一种模型类型。同 id 再次注册会覆盖。
   */
  register(def: ModelTypeDefinition): void {
    this.types.set(def.id, def)
  }

  /** 取消注册 */
  unregister(id: string): boolean {
    return this.types.delete(id)
  }

  /**
   * 获取所有已注册的模型类型列表（供外部展示/下拉选择）。
   */
  getTypes(): ModelTypeDefinition[] {
    return Array.from(this.types.values())
  }

  /**
   * 根据 id 获取单个类型定义。
   */
  getType(id: string): ModelTypeDefinition | undefined {
    return this.types.get(id)
  }

  /**
   * 根据类型 id 和配置创建模型实例；类型未注册时返回 null。
   */
  createModel(id: string, config: ModelRegistryCreateConfig): Model | null {
    const def = this.types.get(id)
    if (!def) return null
    try {
      return def.create(config)
    } catch (e) {
      console.error('[ModelRegistry] createModel failed:', id, config, e)
      return null
    }
  }

  /** 是否已注册该类型 */
  has(id: string): boolean {
    return this.types.has(id)
  }
}

/** 全局单例，供框架与外部统一使用 */
export const modelRegistry = new ModelRegistry()
