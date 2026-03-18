/**
 * Widget 统一 prop 配置格式，供 Editor 展示、解析 config 与后续数据更新使用
 */

/** 单个 prop 的定义（统一格式） */
export interface WidgetPropDef {
  /** 属性键名，与 props[key] 对应 */
  key: string
  /** 在编辑器中展示的标签 */
  label: string
  /** 编辑/校验用类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** 默认值 */
  default?: unknown
}

/** 某类 Widget 的注册信息：默认 props + prop 配置列表 */
export interface WidgetTypeRegItem {
  /** 该类型默认 props（拖入/解析 config 时使用） */
  defaultProps: Record<string, unknown>
  /** prop 配置列表，供 Editor 展示与解析 config 时使用 */
  propConfig: WidgetPropDef[]
}

/** Dashboard 内按 widget id 存储的 props 数据（配置加载后填充，便于按 id 更新） */
export type WidgetDataMap = Record<string, Record<string, unknown>>

/** 按 widget id 局部更新数据的函数（供外部/子组件调用，实现配置数据更新） */
export type SetWidgetDataFn = (id: string, patch: Record<string, unknown>) => void
