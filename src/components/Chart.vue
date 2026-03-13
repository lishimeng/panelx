<template>
  <div 
    ref="chartRef" 
    :style="{ width, height }" 
    :class="className"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { registerEchartsMacaronTheme, mergeMacaronRoundOptions } from '../theme/echartsMacaron'
import type { ChartProps } from '../types/components'

const props = defineProps<ChartProps>()
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const width = props.width || '100%'
const height = props.height || '25rem'

function getOptionsToSet(): import('echarts').EChartsOption {
  return mergeMacaronRoundOptions(props.options)
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

onMounted(() => {
  initChart()
})

watch(() => props.theme, () => {
  initChart()
})

watch(() => props.options, () => {
  if (chartInstance) {
    chartInstance.setOption(getOptionsToSet())
  }
}, { deep: true })

watch(() => props.loading, (loading) => {
  if (chartInstance) {
    chartInstance.showLoading(loading ? 'default' : undefined)
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

/** 数据更新接口：外部喂数据时调用 */
function setOption(option: import('echarts').EChartsOption) {
  if (chartInstance) {
    chartInstance.setOption(mergeMacaronRoundOptions(option))
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