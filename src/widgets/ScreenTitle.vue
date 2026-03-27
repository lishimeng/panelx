<template>
  <div ref="rootRef" class="panelx-screen-title" :style="rootStyle">
    <span class="panelx-screen-title-line line-l" />
    <div class="panelx-screen-title-wrap">
      <div class="panelx-screen-title-bg" />
      <h1 class="panelx-screen-title-text">{{ text }}</h1>
    </div>
    <span class="panelx-screen-title-line line-r" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
  text: string
  borderVisible?: boolean
  borderColor?: string
  borderWidth?: number
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
  borderRadius?: number
  titleFontSize?: string
}>(),
  {
    borderVisible: false,
    borderColor: '#ff4d4f',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    titleFontSize: '3rem'
  }
)

const rootRef = ref<HTMLElement | null>(null)
const titleUnitPx = ref(12)
let resizeObserver: ResizeObserver | null = null
const rootStyle = computed(() => {
  const bw = Number.isFinite(props.borderWidth) ? Math.max(0, Number(props.borderWidth)) : 0
  const radius = Number.isFinite(props.borderRadius) ? Math.max(0, Number(props.borderRadius)) : 0
  return {
    '--panelx-title-unit': `${titleUnitPx.value}px`,
    '--panelx-title-font-size': String(props.titleFontSize || '3rem'),
    border: props.borderVisible ? `${bw}px ${props.borderStyle} ${props.borderColor}` : 'none',
    borderRadius: `${radius}px`
  }
})

function updateTitleScale(): void {
  const root = rootRef.value
  if (!root) return
  const parent = root.parentElement
  // Use layout height (clientHeight) instead of transformed height (getBoundingClientRect),
  // so Editor2D live preview (which applies transform: scale) stays consistent with runtime.
  const parentH = parent?.clientHeight ?? 0
  if (!Number.isFinite(parentH) || parentH <= 0) return
  // 按父容器高度比例缩放；不设上限（此前 Math.min(28, …) 会在约 175px 父高后锁死字号）。
  const next = Math.max(10, parentH * 0.16)
  titleUnitPx.value = Number(next.toFixed(2))
}

onMounted(async () => {
  await nextTick()
  updateTitleScale()
  resizeObserver = new ResizeObserver(() => {
    updateTitleScale()
  })
  if (rootRef.value) {
    resizeObserver.observe(rootRef.value)
    if (rootRef.value.parentElement) resizeObserver.observe(rootRef.value.parentElement)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped>
/* 根节点高度随内容，避免 height:100% 把调试边框拉满整格留白。
   字号仍由脚本用「父槽位高度」计算 titleUnitPx。 */
.panelx-screen-title {
  position: relative;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-size: var(--panelx-title-unit, 12px);
  gap: 1.75em;
  width: 100%;
  height: auto;
  min-height: 0;
  padding: 0;
}
.panelx-screen-title-line {
  flex: 1;
  max-width: 15em;
  height: 0.125em;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.5),
    rgba(0, 212, 255, 0.8),
    transparent
  );
}
.panelx-screen-title-line.line-r {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.8),
    rgba(0, 212, 255, 0.5),
    transparent
  );
}
.panelx-screen-title-wrap {
  position: relative;
  padding: 0 1.25em;
}
.panelx-screen-title-bg {
  position: absolute;
  inset: -0.375em -0.75em;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, transparent 50%, rgba(0, 212, 255, 0.05) 100%);
  border: 0.0625em solid rgba(0, 212, 255, 0.35);
  clip-path: polygon(0 0, calc(100% - 0.75em) 0, 100% 0.75em, 100% 100%, 0.75em 100%, 0 calc(100% - 0.75em));
}
.panelx-screen-title-text {
  position: relative;
  margin: 0;
  font-size: var(--panelx-title-font-size, 3rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  text-shadow: 0 0 1.5rem rgba(0, 212, 255, 0.6), 0 0 3rem rgba(0, 212, 255, 0.35);
  letter-spacing: 0.12em;
  white-space: nowrap;
}
</style>
