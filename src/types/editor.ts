import type { WidgetType2D } from './dashboard'

/** 编辑器可注册的单个 widget 定义 */
export interface RegisteredWidgetDef {
  /** 组件类型，与 Dashboard widgets2D[].type 一致 */
  type: WidgetType2D
  /** 在编辑器侧边栏中的显示名称 */
  label: string
  /** 拖入画布时的默认尺寸（设计稿像素） */
  defaultSize: { width: number; height: number }
  /** 可选：在编辑器组件列表中展示的示例图 URL，如 /editor-samples/stat.png */
  sampleImage?: string
  /** 可选：该 widget 的默认 props，拖入时使用 */
  defaultProps?: Record<string, unknown>
}

/** 编辑器配置文件结构：可注册的 widget 列表等 */
export interface EditorConfig {
  /** 可注册的 2D 组件列表，顺序即侧边栏展示顺序 */
  registeredWidgets: RegisteredWidgetDef[]
}
