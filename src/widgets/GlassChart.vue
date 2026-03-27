<template>
  <div class="panelx-glass-chart">
    <GlassPanel
      :title="title"
      :sub-title="subTitle"
      :title-font-size="titleFontSize"
      :sub-title-font-size="subTitleFontSize"
      :tab-color="tabColor"
      :show-tab="showTab"
      :panel-opacity="panelOpacity"
      :panel-border-visible="panelBorderVisible"
      :panel-border-opacity="panelBorderOpacity"
    >
      <div class="panelx-glass-chart-body">
      <Chart
        :options="chartOptions"
        :series-type="seriesType"
        width="100%"
        height="100%"
        class-name="panelx-glass-chart-echart"
        :theme="chartTheme"
      />
      </div>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { EChartsOption } from 'echarts'
import type { DashboardTheme } from '../types/dashboard'
import GlassPanel from './GlassPanel.vue'
import Chart from './Chart.vue'

const props = withDefaults(
  defineProps<{
    title: string
    /** 英文副标题，如 ORDER REVIEW */
    subTitle?: string
    /** 系列类型（bar/line/pie 等），由编辑器配置 */
    seriesType?: string
    options: EChartsOption
    chartHeight?: string
    /** 顶部色带颜色（blue/cyan/yellow/green/orange/purple） */
    tabColor?: 'blue' | 'cyan' | 'yellow' | 'green' | 'orange' | 'purple'
    titleFontSize?: string
    subTitleFontSize?: string
    /** 是否显示顶部色带 */
    showTab?: boolean
    /** 面板背景透明度（0~1） */
    panelOpacity?: number
    /** 是否显示面板边框 */
    panelBorderVisible?: boolean
    /** 面板边框透明度（0~1） */
    panelBorderOpacity?: number
    /** 单独配置本 widget 主题，覆盖 dashboard 级 theme */
    theme?: 'dark' | 'light' | 'macaron'
  }>(),
  {
    chartHeight: '100%',
    seriesType: 'bar',
    tabColor: 'blue',
    showTab: false,
    panelOpacity: undefined,
    panelBorderVisible: true,
    panelBorderOpacity: undefined,
    theme: undefined
  }
)
const tabColor = computed(() => props.tabColor ?? 'blue')
const showTab = computed(() => props.showTab === true)

const seriesType = computed(() => props.seriesType ?? 'bar')

const dashboardTheme = inject<{ value?: DashboardTheme }>('dashboardTheme')

const chartOptions = computed(() => props.options)
/** 优先级：本 widget props.theme > dashboard theme.chartTheme > 默认 macaron */
const chartTheme = computed(() => {
  const t = props.theme ?? dashboardTheme?.value?.chartTheme ?? 'macaron'
  return t === 'macaron' ? 'macaron' : t === 'dark' ? 'dark' : t === 'light' ? 'light' : undefined
})
</script>

<style scoped>
.panelx-glass-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.panelx-glass-chart-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.panelx-glass-chart-body :deep(.panelx-glass-chart-echart) {
  width: 100% !important;
  height: 100% !important;
  flex: 1 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
</style>
