<template>
  <GlassPanel :title="title" :sub-title="subTitle">
    <div class="panelx-glass-chart-body">
      <Chart
        :options="chartOptions"
        width="100%"
        :height="chartHeight || '100%'"
        :theme="chartTheme"
      />
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import GlassPanel from './GlassPanel.vue'
import Chart from './Chart.vue'

const props = withDefaults(
  defineProps<{
    title: string
    /** 英文副标题，如 ORDER REVIEW */
    subTitle?: string
    options: EChartsOption
    chartHeight?: string
    theme?: 'dark' | 'light'
  }>(),
  {
    chartHeight: '100%',
    theme: 'dark'
  }
)

const chartOptions = computed(() => props.options)
const chartHeight = computed(() => props.chartHeight ?? '100%')
const chartTheme = computed(() => (props.theme === 'dark' ? 'dark' : undefined))
</script>

<style scoped>
.panelx-glass-chart-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panelx-glass-chart-body :deep(div) {
  width: 100% !important;
  flex: 1 !important;
  min-height: 0 !important;
}
</style>
