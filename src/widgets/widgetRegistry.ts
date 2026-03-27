/**
 * 2D Widget 类型与组件的注册表，供 Dashboard、Editor 等使用
 */

import type { WidgetType2D } from '../types/dashboard'
import type { WidgetTypeRegItem } from '../types/widgets'
import Chart from './Chart.vue'
import Table from './Table.vue'
import Decoration from './Decoration.vue'
import Stat from './Stat.vue'
import Card from './Card.vue'
import Panel from './Panel.vue'
import ScreenTitle from './ScreenTitle.vue'
import TopBar from './TopBar.vue'
import TopBarTime from './TopBarTime.vue'
import TopBarClimate from './TopBarClimate.vue'
import GlassChart from './GlassChart.vue'
import TextPanel2D from './TextPanel2D.vue'
import DeviceCard from './DeviceCard.vue'
import TableChart from './TableChart.vue'
import BottomNav from './BottomNav.vue'
import ProgressList from './ProgressList.vue'
import ScaleRuler from './ScaleRuler.vue'
import InfoBox2D from './InfoBox2D.vue'
import MarqueeText from './MarqueeText.vue'
import Heatmap2D from './Heatmap2D.vue'

export const widgetComponentMap: Record<WidgetType2D, unknown> = {
  chart: Chart,
  table: Table,
  decoration: Decoration,
  stat: Stat,
  card: Card,
  panel: Panel,
  screenTitle: ScreenTitle,
  topBar: TopBar,
  topBarTime: TopBarTime,
  topBarClimate: TopBarClimate,
  glassChart: GlassChart,
  textPanel2D: TextPanel2D,
  tableChart: TableChart,
  deviceCard: DeviceCard,
  bottomNav: BottomNav,
  progressList: ProgressList,
  scaleRuler: ScaleRuler,
  infoBox2D: InfoBox2D,
  marqueeText: MarqueeText,
  heatmap2d: Heatmap2D
}

/** 根据类型取组件，未注册时回退为 Panel */
export function getWidgetComponent(type: WidgetType2D): unknown {
  return widgetComponentMap[type] ?? Panel
}

import {
  widgetTypeReg,
  getWidgetDefaultProps,
  getWidgetPropConfig
} from './widgetPropConfig'
import type { WidgetPropDef } from '../types/widgets'

export { widgetTypeReg, getWidgetDefaultProps, getWidgetPropConfig }

/** 根据类型取完整注册信息（defaultProps + propConfig），供 Editor 展示与解析 config */
export function getWidgetTypeReg(type: WidgetType2D): WidgetTypeRegItem {
  return (widgetTypeReg as Record<string, WidgetTypeRegItem | undefined>)[type] ?? { defaultProps: {}, propConfig: [] }
}

/** 外部注入：注册/覆盖 2D widget 组件与其 prop 配置 */
export function registerWidgetTypeExtension(input: {
  type: WidgetType2D
  component: unknown
  defaultProps?: Record<string, unknown>
  propConfig?: WidgetPropDef[]
}): void {
  if (!input?.type || !input.component) return
  ;(widgetComponentMap as Record<string, unknown>)[input.type] = input.component
  ;(widgetTypeReg as Record<string, WidgetTypeRegItem>)[input.type] = {
    defaultProps: { ...(input.defaultProps ?? {}) },
    propConfig: [...(input.propConfig ?? [])]
  }
}
