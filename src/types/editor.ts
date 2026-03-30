import type { WidgetType2D } from './dashboard'
import type { BackendDataSourceConfig } from './manager'

/** 编辑器可注册的单个 widget 定义 */
export interface RegisteredWidgetDef {
  /** 组件类型，与 Dashboard widgets2D[].type 一致 */
  type: WidgetType2D
  /** 在编辑器侧边栏中的显示名称 */
  label: string
  /** 可选：分组路径（如 "图表/趋势图"），用于左侧组件树展示 */
  group?: string
  /** 拖入画布时的默认尺寸（设计稿像素） */
  defaultSize: { width: number; height: number }
  /** 可选：在编辑器组件列表中展示的示例图文件名，如 "widget_title.png"（由 editor 子入口提供预览图 data URL 映射） */
  sampleImage?: string
  /** 可选：该 widget 的默认 props，拖入时使用（优先级低于 widgetPropData.defaultParams） */
  defaultProps?: Record<string, unknown>
}

/**
 * 编辑器内 prop 数据：默认参数 + 预留 dashboard 数据
 * - defaultParams：按类型配置默认参数，拖入画布时优先使用
 * - dashboardData：预留，后续支持按 widget id 的 dashboard 运行时数据
 */
export interface WidgetPropData {
  /** 按 widget 类型配置的默认参数，拖入时优先于 registeredWidgets[].defaultProps 与 registry */
  defaultParams?: Partial<Record<WidgetType2D, Record<string, unknown>>>
  /** 预留：按 widget id 的 dashboard 数据，后续加载/保存 dashboard 时与 Dashboard.widgetData 对接 */
  dashboardData?: Record<string, Record<string, unknown>>
}

/** 编辑器配置文件结构：可注册的 widget 列表、prop 数据、数据源等 */
export interface EditorConfig {
  /** 可注册的 2D 组件列表，顺序即侧边栏展示顺序 */
  registeredWidgets: RegisteredWidgetDef[]
  /** 可选：prop 数据（默认参数 + 预留 dashboard 数据） */
  widgetPropData?: WidgetPropData
  /** 可选：数据源列表，供 widget 绑定（逻辑编号 <-> SSE event / Polling 响应 key） */
  datasources?: BackendDataSourceConfig[]
}
