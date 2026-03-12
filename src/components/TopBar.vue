<template>
  <div class="panelx-topbar" :style="rootStyle">
    <div class="panelx-topbar-left">
      <span class="panelx-topbar-datetime">{{ datetime }}</span>
    </div>
    <div class="panelx-topbar-right">
      <span class="panelx-topbar-item">
        <span class="icon">🌡</span>
        <span>室内温度 {{ temperature }}</span>
      </span>
      <span class="panelx-topbar-item">
        <span class="icon">💧</span>
        <span>室内湿度 {{ humidity }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** 时间、温湿度均由外部传入，无内部自动刷新 */
const props = withDefaults(
  defineProps<{
    /** 日期时间字符串，由父组件按业务间隔刷新传入 */
    datetime?: string
    /** 温度，如 25℃ */
    temperature?: string
    /** 湿度，如 50%rh */
    humidity?: string
    /** 背景，支持 CSS 颜色或渐变，默认透明 */
    background?: string
  }>(),
  {
    datetime: '',
    temperature: '25℃',
    humidity: '50%rh',
    background: 'transparent'
  }
)

const rootStyle = computed(() => ({
  background: props.background
}))

const datetime = computed(() => props.datetime)
const temperature = computed(() => props.temperature ?? '25℃')
const humidity = computed(() => props.humidity ?? '50%rh')
</script>

<style scoped>
/* 容器高度 = paddingTop + paddingBottom + fontSize×lineHeight；令三者之和 = 100% 高度 */
/* padding 各 15% 高度 → 行高占 70% 高度 → fontSize×1.2 = 0.7×H → fontSize = 58.33cqh */
.panelx-topbar {
  container-type: size;
  container-name: topbar;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0.15cqh 1.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: clamp(0.625rem, 58.33cqh, 1.75rem);
  line-height: 1.2;
  box-sizing: border-box;
}
.panelx-topbar-left {
  display: flex;
  align-items: center;
}
.panelx-topbar-datetime {
  color: rgba(0, 212, 255, 0.9);
}
.panelx-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.8em;
}
.panelx-topbar-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
}
.panelx-topbar-item .icon {
  opacity: 0.9;
  font-size: 1em;
}
</style>
