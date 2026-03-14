<template>
  <div 
    ref="chartRef" 
    :style="{ width, height }" 
    :class="className"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { registerEchartsMacaronTheme, mergeMacaronRoundOptions } from '../theme/echartsMacaron'
import type { ChartProps } from '../types/components'

const props = defineProps<ChartProps>()
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

const width = props.width || '100%'
const height = props.height || '25rem'

const defaultSeriesType = 'bar'

/** 用编辑器配置的 seriesType 补全 options.series[].type（数据源可能不带 type） */
function ensureSeriesType(
  options: import('echarts').EChartsOption,
  seriesType?: string
): import('echarts').EChartsOption {
  const type = seriesType || defaultSeriesType
  const series = options.series
  if (!Array.isArray(series)) return options
  return {
    ...options,
    series: series.map((s) =>
      typeof s === 'object' && s !== null
        ? { ...s, type: (s as { type?: string }).type ?? type }
        : s
    )
  }
}

function getOptionsToSet(): import('echarts').EChartsOption {
  const merged = mergeMacaronRoundOptions(props.options)
  return ensureSeriesType(merged, props.seriesType)
}

function initChart() {
  if (!chartRef.value) return
  registerEchartsMacaronTheme()
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  chartInstance = echarts.init(chartRef.value, props.theme)
  chartInstance.setOption(getOptionsToSet())
}

function resizeChart() {
  if (chartInstance?.getDom()) {
    chartInstance.resize()
  }
}

onMounted(() => {
  initChart()
  nextTick(() => {
    if (!chartRef.value) return
    resizeChart()
    resizeObserver = new ResizeObserver(() => resizeChart())
    resizeObserver.observe(chartRef.value)
  })
})

watch(() => props.theme, () => {
  initChart()
})

watch(
  () => [props.options, props.seriesType] as const,
  () => {
    if (chartInstance) {
      chartInstance.setOption(getOptionsToSet())
    }
  },
  { deep: true }
)

watch(() => props.loading, (loading) => {
  if (chartInstance) {
    chartInstance.showLoading(loading ? 'default' : undefined)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

/** 数据更新接口：外部喂数据时调用 */
function setOption(option: import('echarts').EChartsOption) {
  if (chartInstance) {
    const merged = mergeMacaronRoundOptions(option)
    chartInstance.setOption(ensureSeriesType(merged, props.seriesType))
  }
}

defineExpose({
  setOption
})
</script>

<style scoped>
.chart-container {
  position: relative;
}
</style>