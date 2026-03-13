<template>
  <div class="panelx-scale-ruler">
    <div class="panelx-scale-ruler-bar">
      <span class="panelx-scale-ruler-tick" />
      <span class="panelx-scale-ruler-tick panelx-scale-ruler-tick-mid" />
      <span class="panelx-scale-ruler-tick" />
    </div>
    <div class="panelx-scale-ruler-label">
      <span v-if="scale > 0">1 : {{ ratioText }}</span>
      <span v-else>—</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'

interface DashboardViewport {
  viewportSize: { width: number; height: number }
  scale: number
  designWidth: number
  designHeight: number
}

const dashboardViewport = inject<ComputedRef<DashboardViewport>>('dashboardViewport')

const scale = computed(() => dashboardViewport?.value?.scale ?? 0)

/** 显示用比例：1 设计单位 = scale 屏单位 */
const ratioText = computed(() => {
  const s = scale.value
  if (s <= 0) return '—'
  if (s >= 0.99 && s <= 1.01) return '1'
  return s.toFixed(2)
})
</script>

<style scoped>
.panelx-scale-ruler {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 0.25rem;
  color: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  line-height: 1.2;
  user-select: none;
}

.panelx-scale-ruler-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 2.5rem;
  height: 0.5rem;
}

.panelx-scale-ruler-tick {
  width: 0.0625rem;
  height: 0.25rem;
  background: currentColor;
}

.panelx-scale-ruler-tick-mid {
  height: 0.5rem;
}

.panelx-scale-ruler-label {
  font-variant-numeric: tabular-nums;
}
</style>
