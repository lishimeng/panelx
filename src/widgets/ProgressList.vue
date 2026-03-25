<template>
  <GlassPanel
    :title="title"
    :sub-title="subTitle"
    :tab-color="tabColor"
    :show-tab="showTab"
    :panel-opacity="panelOpacity"
    :panel-border-visible="panelBorderVisible"
    :panel-border-opacity="panelBorderOpacity"
  >
    <div class="panelx-progress-list-content">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="panelx-progress-list-row"
      >
        <span class="label">{{ item.label }}</span>
        <div class="bar-wrap">
          <div
            class="bar-fill"
            :style="{ width: `${Math.min(100, Math.max(0, item.percent))}%` }"
          />
        </div>
        <span class="value">{{ item.value }}</span>
        <span class="percent">{{ item.percent }}%</span>
      </div>
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import GlassPanel from './GlassPanel.vue'

defineProps<{
  title?: string
  subTitle?: string
  tabColor?: 'blue' | 'cyan' | 'yellow' | 'green' | 'orange' | 'purple'
  showTab?: boolean
  /** 面板背景透明度（0~1） */
  panelOpacity?: number
  /** 是否显示面板边框 */
  panelBorderVisible?: boolean
  /** 面板边框透明度（0~1） */
  panelBorderOpacity?: number
  items: Array<{ label: string; value: string | number; percent: number }>
}>()
</script>

<style scoped>
.panelx-progress-list-content {
  padding: 0 0.375rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panelx-progress-list-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.9);
}
.panelx-progress-list-row .label {
  min-width: 4rem;
  color: rgba(255, 255, 255, 0.8);
}
.panelx-progress-list-row .bar-wrap {
  flex: 1;
  height: 0.5rem;
  background: rgba(0, 212, 255, 0.15);
  border-radius: 0.25rem;
  overflow: hidden;
}
.panelx-progress-list-row .bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.6), rgba(0, 212, 255, 0.9));
  border-radius: 0.25rem;
  transition: width 0.3s ease;
}
.panelx-progress-list-row .value {
  min-width: 3.25rem;
  text-align: right;
  color: rgba(0, 212, 255, 0.95);
}
.panelx-progress-list-row .percent {
  min-width: 2.75rem;
  color: rgba(255, 255, 255, 0.8);
}
</style>
