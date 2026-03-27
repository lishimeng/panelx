<template>
  <div class="panelx-topbar-time" :style="rootStyle">
    <span class="panelx-topbar-time-text">{{ currentTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 背景，支持 CSS 颜色或渐变，默认透明 */
    background?: string
    /** 字号（CSS 值），如 1.25rem / 28px / clamp(...) */
    fontSize?: string
  }>(),
  {
    background: 'transparent',
    fontSize: 'clamp(0.625rem, 58.33cqh, 1.75rem)'
  }
)

const rootStyle = computed(() => ({
  background: props.background,
  '--panelx-topbar-time-font-size': String(props.fontSize || 'clamp(0.625rem, 58.33cqh, 1.75rem)')
}))

const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

function formatNow(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const h = pad(now.getHours())
  const mi = pad(now.getMinutes())
  const s = pad(now.getSeconds())
  return `${y}-${m}-${d} ${h}:${mi}:${s}`
}

onMounted(() => {
  currentTime.value = formatNow()
  timer = setInterval(() => {
    currentTime.value = formatNow()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  timer = null
})
</script>

<style scoped>
.panelx-topbar-time {
  container-type: size;
  container-name: topbar-time;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0.15cqh 0.8rem;
  box-sizing: border-box;
  color: rgba(0, 212, 255, 0.92);
  font-size: var(--panelx-topbar-time-font-size, clamp(0.625rem, 58.33cqh, 1.75rem));
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panelx-topbar-time-text {
  letter-spacing: 0.02em;
}
</style>

