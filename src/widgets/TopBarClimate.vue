<template>
  <div class="panelx-topbar-climate" :style="rootStyle">
    <span class="panelx-topbar-climate-item">
      <span class="icon">🌡</span>
      <span>温度 {{ temperature }}</span>
    </span>
    <span class="panelx-topbar-climate-item">
      <span class="icon">💧</span>
      <span>湿度 {{ humidity }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    temperature?: string
    humidity?: string
    background?: string
    /** 字号（CSS 值），如 1.25rem / 28px / clamp(...) */
    fontSize?: string
  }>(),
  {
    temperature: '--℃',
    humidity: '--%rh',
    background: 'transparent',
    fontSize: 'clamp(0.625rem, 58.33cqh, 1.75rem)'
  }
)

const rootStyle = computed(() => ({
  background: props.background,
  '--panelx-topbar-climate-font-size': String(props.fontSize || 'clamp(0.625rem, 58.33cqh, 1.75rem)')
}))

const temperature = computed(() => props.temperature ?? '--℃')
const humidity = computed(() => props.humidity ?? '--%rh')
</script>

<style scoped>
.panelx-topbar-climate {
  container-type: size;
  container-name: topbar-climate;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8em;
  width: 100%;
  height: 100%;
  padding: 0.15cqh 0.8rem;
  box-sizing: border-box;
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--panelx-topbar-climate-font-size, clamp(0.625rem, 58.33cqh, 1.75rem));
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
}

.panelx-topbar-climate-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
}

.panelx-topbar-climate-item .icon {
  opacity: 0.9;
}
</style>

