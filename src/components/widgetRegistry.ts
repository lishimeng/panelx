/**
 * 2D Widget 类型与组件的注册表，供 Dashboard 等使用
 */

import type { WidgetType2D } from '../types/dashboard'
import Chart from './Chart.vue'
import Table from './Table.vue'
import Decoration from './Decoration.vue'
import Stat from './Stat.vue'
import Card from './Card.vue'
import Panel from './Panel.vue'
import ScreenTitle from './ScreenTitle.vue'
import TopBar from './TopBar.vue'
import GlassChart from './GlassChart.vue'
import DeviceCard from './DeviceCard.vue'
import BottomNav from './BottomNav.vue'
import ProgressList from './ProgressList.vue'
import ScaleRuler from './ScaleRuler.vue'

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
  deviceCard: DeviceCard,
  bottomNav: BottomNav,
  progressList: ProgressList,
  scaleRuler: ScaleRuler
}

/** 根据类型取组件，未注册时回退为 Panel */
export function getWidgetComponent(type: WidgetType2D): unknown {
  return widgetComponentMap[type] ?? Panel
}
