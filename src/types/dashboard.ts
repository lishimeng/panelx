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
export type WidgetType3D = 'scene3d' | 'model3d'
export type WidgetType = WidgetType2D | WidgetType3D

/** 2D 组件在 dashboard 中的配置（设计稿坐标） */
export interface WidgetConfig2D {
  id: string
  type: WidgetType2D
  /**
   * 在设计稿中的位置与尺寸（DesignRect）。
   * 与 config.design 同坐标系，如 design 为 1920×1080 时，layout.height=56 表示「设计稿里 56 单位」，
   * 实际渲染会按 scale = actualWidth/1920 缩放，所以最终像素 ≈ 56×scale，小屏下会小于 56px。
   */
  layout: DesignRect
  /** 通用外观 */
  title?: string
  visible?: boolean
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

/** Dashboard 完整配置 */
export interface DashboardConfig {
  /** 设计稿尺寸，如 1920x1080 */
  design: DesignScreen
  /** 第 1 层：背景层（图片或 3D 场景），不填则无背景 */
  backgroundLayer?: BackgroundLayerConfig
  /** 第 2 层：2D 组件列表（图表、统计、装饰等），透明背景 */
  widgets2D: WidgetConfig2D[]
  /** 3D 组件列表（可选，可后续扩展） */
  widgets3D?: WidgetConfig3D[]
  /** 主题/全局外观（可选） */
  theme?: Record<string, unknown>
}

/** 3D 模型文件格式 */
export type Model3DFormat = 'gltf' | 'fbx'

/** 3D 场景中单个模型的配置（参考 widgets2D 的配置方式） */
export interface Model3DItemConfig {
  /** 模型唯一 id，用于从 store 获取实例 */
  id: string
  /** 模型资源地址，如 /RobotExpressive.glb、/product_line.fbx */
  source: string
  /** 格式：gltf 或 fbx，默认 gltf */
  format?: Model3DFormat
  /** 是否显示 */
  visible?: boolean
  /** 所在图层，用于控制显示/射线等，不填为默认层 0。单层传 number，多图层传 number[] */
  layer?: number | number[]
  /** 位置 [x, y, z] */
  position?: [number, number, number]
  /** 统一缩放 */
  scale?: number
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
  /** Stats 显示：0 隐藏 1 仅 FPS 2 全部 */
  statsStyle?: 0 | 1 | 2
  /** 场景背景：不填或 null 为透明，填十六进制颜色如 0x000000 为纯色 */
  background?: number | null
  /** 灯光强度，不填则使用内置默认 */
  lights?: Scene3DLightConfig
  /** 相机配置：类型（透视/正交）及正交时的 size */
  camera?: Scene3DCameraConfig
}
