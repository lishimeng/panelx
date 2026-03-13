<template>
  <GlassPanel :title="title" :sub-title="subTitle">
    <div class="panelx-glass-chart-body">
      <Chart
        :options="chartOptions"
        width="100%"
        height="100%"
        :theme="chartTheme"
      />
    </div>
  </GlassPanel>
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
    options: EChartsOption
    chartHeight?: string
    /** 单独配置本 widget 主题，覆盖 dashboard 级 theme */
    theme?: 'dark' | 'light' | 'macaron'
  }>(),
  {
    chartHeight: '100%',
    theme: undefined
  }
)

const dashboardTheme = inject<{ value?: DashboardTheme }>('dashboardTheme')

const chartOptions = computed(() => props.options)
/** 优先级：本 widget props.theme > dashboard theme.chartTheme > 默认 macaron */
const chartTheme = computed(() => {
  const t = props.theme ?? dashboardTheme?.value?.chartTheme ?? 'macaron'
  return t === 'macaron' ? 'macaron' : t === 'dark' ? 'dark' : t === 'light' ? 'light' : undefined
})
</script>

<style scoped>
.panelx-glass-chart-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.panelx-glass-chart-body :deep(div) {
  width: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
</style>
