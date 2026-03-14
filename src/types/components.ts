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