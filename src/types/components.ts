import type { EChartsOption } from 'echarts'
import type { ThemeColorType } from './theme'

export interface PanelProps {
  title?: string
  description?: string
  loading?: boolean
  error?: string
  className?: string
}

export interface ChartProps {
  options: EChartsOption
  /** 系列类型（bar/line/pie 等），由编辑器配置；数据源下发的 series 若无 type 则用此值 */
  seriesType?: string
  height?: string | number
  width?: string | number
  loading?: boolean
  theme?: string
  className?: string
}

export interface CardProps {
  title?: string
  subtitle?: string
  footer?: string
  bordered?: boolean
  shadow?: boolean
  padding?: string | number
  className?: string
}

export interface StatProps {
  value: number | string
  label: string
  prefix?: string
  suffix?: string
  color?: ThemeColorType
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number | string
  className?: string
}

export interface GridProps {
  columns: number
  gap?: string | number
  className?: string
}

export interface GridItemProps {
  span?: number
  className?: string
}

export interface TableColumn {
  key: string
  title: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

export interface TableProps {
  columns: TableColumn[]
  data: Record<string, unknown>[]
  loading?: boolean
  className?: string
}

export interface DecorationProps {
  /** 装饰类型：角标、边框等 */
  variant?: 'corner' | 'border' | 'title'
  className?: string
}

export interface InfoBox2DProps {
  title?: string
  subtitle?: string
  metaLeft?: string
  metaRight?: string
  /** 支持用 `|` 分行 */
  content?: string
  note?: string
  /** 主题色预设（目前仅做视觉映射） */
  colorPreset?: 'cyan' | 'green' | 'yellow' | 'red' | string
  /** 特效：scanlines / none */
  fx?: 'scanlines' | 'none' | string
  className?: string
}

/** 二维热力图：行×列数值矩阵，自动按 min~max 映射到双色渐变 */
export interface Heatmap2DProps {
  /** 热力数值二维数组（行优先） */
  data: number[][]
  /** 颜色映射下限（缺省为数据最小值） */
  min?: number
  /** 颜色映射上限（缺省为数据最大值） */
  max?: number
  colorLow?: string
  colorHigh?: string
  /** 是否显示网格线 */
  showGrid?: boolean
  /** 单元格间隙（像素） */
  cellGap?: number
  /** 平滑强度（1~4，越大越平滑） */
  smoothIntensity?: number
  /** 容器圆角（像素） */
  borderRadius?: number
  /** 是否在格内显示数值 */
  showValues?: boolean
  valueFontSize?: number
  title?: string
  className?: string
}