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
import GlassChart from './GlassChart.vue'
import TextPanel2D from './TextPanel2D.vue'
import DeviceCard from './DeviceCard.vue'
import TableChart from './TableChart.vue'
import BottomNav from './BottomNav.vue'
import ProgressList from './ProgressList.vue'
import ScaleRuler from './ScaleRuler.vue'
import InfoBox2D from './InfoBox2D.vue'

export const widgetComponentMap: Record<WidgetType2D, unknown> = {
  chart: Chart,
  table: Table,
  decoration: Decoration,
  stat: Stat,
  card: Card,
  panel: Panel,
  screenTitle: ScreenTitle,
  topBar: TopBar,
  glassChart: GlassChart,
  textPanel2D: TextPanel2D,
  tableChart: TableChart,
  deviceCard: DeviceCard,
  bottomNav: BottomNav,
  progressList: ProgressList,
  scaleRuler: ScaleRuler,
  infoBox2D: InfoBox2D
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

export { widgetTypeReg, getWidgetDefaultProps, getWidgetPropConfig }

/** 根据类型取完整注册信息（defaultProps + propConfig），供 Editor 展示与解析 config */
export function getWidgetTypeReg(type: WidgetType2D): WidgetTypeRegItem {
  return widgetTypeReg[type] ?? { defaultProps: {}, propConfig: [] }
}
