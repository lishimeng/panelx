/** Dashboard 配置：仅描述布局与组件属性，不包含业务数据 */

import type { DesignRect } from './size'
import type { WorldSize } from './size'

/** 组件类型标识 */
export type WidgetType2D =
  | 'chart'
  | 'table'
  | 'decoration'
  | 'stat'
  | 'card'
  | 'panel'
  | 'screenTitle'
  | 'topBar'
  | 'glassChart'
  | 'deviceCard'
  | 'bottomNav'
  | 'progressList'
  | 'scaleRuler'
export type WidgetType3D = 'scene3d' | 'model3d'
export type WidgetType = WidgetType2D | WidgetType3D

/** 2D 组件在 dashboard 中的配置（设计稿坐标） */
export interface WidgetConfig2D {
  id: string
  type: WidgetType2D
  /**
   * 在设计稿中的位置与尺寸（DesignRect）。
   * 与 config.design 同坐标系，如 design 为 1920×1080 时，layout.height=56 表示「设计稿里 56 单位」，
   * 实际渲染会按 scale 缩放，小屏下会按比例缩小。配置文件内为设计稿数值（仅配置以 px 为单位）。
   */
  layout: DesignRect
  /** 通用外观 */
  title?: string
  visible?: boolean
  /** 逻辑编号，由编辑器配置，用于与数据源绑定（如 SSE 的 event、Polling 的响应 key） */
  logicCode?: string
  /** 绑定的数据源 key（对应 DataSourceConfig.key），不填则不绑定 */
  datasourceKey?: string
  /** 组件独有属性，由各组件类型定义 */
  props?: Record<string, unknown>
}

/** 3D 组件配置 */
export interface WidgetConfig3D {
  id: string
  type: WidgetType3D
  /** 3D 世界尺寸/范围 */
  worldSize?: WorldSize
  visible?: boolean
  props?: Record<string, unknown>
}

export type WidgetConfig = WidgetConfig2D | WidgetConfig3D

/** 大屏设计稿尺寸（用于 2D 比例换算） */
export interface DesignScreen {
  width: number
  height: number
}

/**
 * Dashboard 分层：按层号从下到上叠放
 * - 1 层：背景层（图片或 3D 场景）
 * - 2 层：内容层（透明背景，图表、卡片等）
 */

/** 背景层类型：图片 */
export interface BackgroundLayerImage {
  type: 'image'
  /** 图片地址 */
  url: string
  /** 对象适配方式，同 CSS object-fit，默认 cover */
  fit?: 'fill' | 'contain' | 'cover' | 'none'
}

/** 背景层类型：3D 场景 */
export interface BackgroundLayerScene3D {
  type: 'scene3d'
  /** 3D 场景配置，与 Scene3DFramework 一致 */
  config: Scene3DConfig
}

/** 第 1 层：背景层配置，不填则无背景（透明或由外层容器决定） */
export type BackgroundLayerConfig = BackgroundLayerImage | BackgroundLayerScene3D

/**
 * Dashboard 级主题：作为整屏默认，并作为所有 widget 的默认主题；
 * 单个 widget 的 props.theme 可覆盖。
 */
export interface DashboardTheme {
  /** 图表主题（ECharts），如 macaron / dark / light，对所有 glassChart/chart 生效 */
  chartTheme?: 'dark' | 'light' | 'macaron'
  /** 可扩展：如 primaryColor, fontSize 等 */
  [key: string]: unknown
}

/** Dashboard 完整配置 */
export interface DashboardConfig {
  /** 设计稿尺寸，如 1920x1080（仅配置文件为 px，加载后用于换算） */
  design: DesignScreen
  /** 根容器背景，CSS background 值，如 "transparent"、"#0a1929"、"linear-gradient(...)"；不填默认透明 */
  background?: string
  /** 第 1 层：背景层（图片或 3D 场景），不填则无背景 */
  backgroundLayer?: BackgroundLayerConfig
  /** 第 2 层：2D 组件列表（图表、统计、装饰等），透明背景 */
  widgets2D: WidgetConfig2D[]
  /** 3D 组件列表（可选，可后续扩展） */
  widgets3D?: WidgetConfig3D[]
  /** 整屏主题，统一作为所有 widget 的默认主题；单个 widget 的 props.theme 可覆盖 */
  theme?: DashboardTheme
  /** layout 单位：px=设计稿像素（来自配置），percent=加载后转换的 0-100，渲染时不再使用 px */
  layoutUnit?: 'px' | 'percent'
  /** 调试开关：加载配置后会同步到 localStorage，控制数据链等全局日志；组件内用 logManager.isDebugEnabled() 判断 */
  debug?: boolean
}

/** 3D 模型文件格式 */
export type Model3DFormat = 'gltf' | 'fbx'

/** 3D 场景中单个模型的配置（参考 widgets2D 的配置方式） */
export interface Model3DItemConfig {
  /** 模型唯一 id，用于从 store 获取实例 */
  id: string
  /** 模型资源地址，如 /models/RobotExpressive.glb、/models/product-line.glb、/models/product_line.fbx */
  source: string
  /** 格式：gltf 或 fbx，默认 gltf */
  format?: Model3DFormat
  /** 是否显示 */
  visible?: boolean
  /** 所在图层，用于控制显示/射线等，不填为默认层 0。单层传 number，多图层传 number[] */
  layer?: number | number[]
  /** 位置 [x, y, z] */
  position?: [number, number, number]
  /** 旋转欧拉角 [x, y, z] 弧度，不设则为 [0, 0, 0] */
  rotation?: [number, number, number]
  /** 统一缩放 */
  scale?: number
}

/** 3D 场景内信息框状态类型（影响样式：红=故障、黄=预警、绿=正常），已推荐用 colorPreset */
export type Scene3DInfoBoxStatusType = 'normal' | 'warning' | 'fault'

/** 信息框预制颜色：info=蓝/青、success=绿、warning=黄、error=红 */
export type Scene3DInfoBoxColorPreset = 'info' | 'success' | 'warning' | 'error'

/** 信息框自定义颜色（可选覆盖预制中的某一项或多项） */
export interface Scene3DInfoBoxColorOverride {
  /** 背景，如 rgba(20, 60, 100, 0.88) */
  bg?: string
  /** 边框与角线，如 rgba(0, 212, 255, 0.8) */
  border?: string
  /** 外发光 box-shadow，如 0 0 20px rgba(0,212,255,0.5) */
  glow?: string
  /** 状态/高亮文字颜色，如 rgb(120, 200, 255) */
  statusColor?: string
}

/** 3D 场景内悬浮信息框配置（绑定到模型或指定坐标，科技感红/黄/蓝框） */
export interface Scene3DInfoBoxConfig {
  /** 唯一 id */
  id: string
  /** 绑定的模型 id，与 position 二选一；有 modelId 时框显示在模型上方 */
  modelId?: string
  /** 固定世界坐标 [x,y,z]，与 modelId 二选一 */
  position?: [number, number, number]
  /** 相对模型或 position 的偏移，默认 [0, 1.2, 0] 表示模型上方 */
  offset?: [number, number, number]
  /** 旋转欧拉角 [x, y, z] 弧度，不设则为 [0, 0, 0] */
  rotation?: [number, number, number]
  /** 设备类型/标题，如「光刻机」 */
  title: string
  /** 设备编号，如 GKJ015 */
  equipmentId: string
  /** 状态文案，如「正常」「故障」「预警」 */
  status: string
  /** 状态类型（兼容旧配置，与 colorPreset 映射：fault→error, normal→success 绿, warning→warning） */
  statusType?: Scene3DInfoBoxStatusType
  /** 预制颜色：info / success / warning / error，优先于 statusType */
  colorPreset?: Scene3DInfoBoxColorPreset
  /** 自定义颜色，覆盖预制中的对应项 */
  color?: Scene3DInfoBoxColorOverride
  /** 运行时长，如 3.5 h */
  runningTime?: string
  /** 异常信息（故障时显示） */
  message?: string
  /** 屏幕特效：none/scanlines/noise/glitch/all */
  fx?: 'none' | 'scanlines' | 'noise' | 'glitch' | 'all'
  /** 是否显示 */
  visible?: boolean
}

/** 3D 场景灯光强度配置（不填则使用内置默认值） */
export interface Scene3DLightConfig {
  /** 环境光强度 */
  ambient?: number
  /** 半球光强度 */
  hemisphere?: number
  /** 点光源强度 */
  point?: number
}

/** 3D 相机类型 */
export type Scene3DCameraType = 'perspective' | 'orthographic'

/** 相机某一图层的显示配置 */
export interface Scene3DCameraLayerItem {
  /** 层号（如 LayerDef.default） */
  layer: number
  /** 该层是否在相机中显示 */
  enable: boolean
}

/** 3D 相机配置 */
export interface Scene3DCameraConfig {
  /** 相机类型，默认 perspective */
  type?: Scene3DCameraType
  /** 正交相机时可见高度的一半（世界单位），默认 5 */
  orthographicSize?: number
  /** 相机各图层的显示配置，完全覆盖默认。不填时默认仅 layer=0 可显示 */
  layers?: Scene3DCameraLayerItem[]
}

/** 3D 场景配置（在 App 中配置，传给 Scene3DFramework） */
export interface Scene3DConfig {
  /** 要加载并加入场景的模型列表 */
  models?: Model3DItemConfig[]
  /** 场景内悬浮信息框（绑定模型或指定坐标，红/黄科技感框） */
  infoBoxes?: Scene3DInfoBoxConfig[]
  /** Stats 显示：0 隐藏 1 仅 FPS 2 全部 */
  statsStyle?: 0 | 1 | 2
  /** 场景背景：十六进制颜色如 "#0d1b2a"，"transparent" 或不填为透明 */
  background?: string | null
  /** 灯光强度，不填则使用内置默认 */
  lights?: Scene3DLightConfig
  /** 相机配置：类型（透视/正交）及正交时的 size */
  camera?: Scene3DCameraConfig
}
