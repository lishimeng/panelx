<template>
  <GlassPanel
    :title="title"
    :sub-title="subTitle"
    :title-font-size="titleFontSize"
    :sub-title-font-size="subTitleFontSize"
    :tab-color="tabColor"
    :show-tab="showTab"
    :panel-opacity="panelOpacity"
    :panel-border-visible="panelBorderVisible"
    :panel-border-opacity="panelBorderOpacity"
  >
    <div ref="viewportRef" class="panelx-progress-list-content" :style="viewportStyle">
      <div
        ref="trackRef"
        class="panelx-progress-list-track"
        :style="{
          transform: `translateY(-${currentOffsetPx}px)`,
          transition: transitionEnabled ? `transform ${transitionDurationMs}ms ease-in-out` : 'none'
        }"
        @transitionend="onTrackTransitionEnd"
      >
        <div
          v-for="(item, i) in renderedItems"
          :key="`${item.label}-${item.value}-${item.percent}-${i}`"
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
    </div>
  </GlassPanel>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import GlassPanel from './GlassPanel.vue'

type ProgressItem = { label: string; value: string | number; percent: number }

const props = defineProps<{
  title?: string
  subTitle?: string
  titleFontSize?: string
  subTitleFontSize?: string
  tabColor?: 'blue' | 'cyan' | 'yellow' | 'green' | 'orange' | 'purple'
  showTab?: boolean
  /** 面板背景透明度（0~1） */
  panelOpacity?: number
  /** 是否显示面板边框 */
  panelBorderVisible?: boolean
  /** 面板边框透明度（0~1） */
  panelBorderOpacity?: number
  /** 最大可见条数（超出后自动向上循环滚动） */
  maxRows?: number
  /** 自动滚动步进间隔（毫秒） */
  scrollIntervalMs?: number
  /** 每步滚动动画时长（毫秒） */
  scrollDurationMs?: number
  items: ProgressItem[]
}>()

const viewportRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const rowHeightPx = ref(0)
const currentIndex = ref(0)
const transitionEnabled = ref(true)
let scrollTimer: ReturnType<typeof setInterval> | null = null

const normalizedItems = computed<ProgressItem[]>(() => (Array.isArray(props.items) ? props.items : []))
const visibleCount = computed(() => {
  const n = Math.floor(Number(props.maxRows))
  if (!Number.isFinite(n)) return 5
  return Math.max(1, n)
})
function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
const scrollIntervalMs = computed(() => {
  return clampInt(props.scrollIntervalMs, 1600, 200, 60000)
})
const transitionDurationMs = computed(() => {
  const upper = Math.max(80, scrollIntervalMs.value - 20)
  return clampInt(props.scrollDurationMs, 350, 80, upper)
})
const shouldScroll = computed(() => normalizedItems.value.length > visibleCount.value)
const renderedItems = computed<ProgressItem[]>(() => {
  if (!shouldScroll.value) return normalizedItems.value
  const first = normalizedItems.value[0]
  return first ? [...normalizedItems.value, first] : normalizedItems.value
})
const currentOffsetPx = computed(() => currentIndex.value * rowHeightPx.value)
const viewportStyle = computed(() => {
  if (rowHeightPx.value <= 0) return {}
  return { height: `${rowHeightPx.value * visibleCount.value}px` }
})

function stopAutoScroll(): void {
  if (!scrollTimer) return
  clearInterval(scrollTimer)
  scrollTimer = null
}

async function measureRowHeight(): Promise<void> {
  await nextTick()
  const el = trackRef.value?.querySelector('.panelx-progress-list-row') as HTMLElement | null
  rowHeightPx.value = el ? el.offsetHeight : 0
}

async function restartAutoScroll(): Promise<void> {
  stopAutoScroll()
  currentIndex.value = 0
  transitionEnabled.value = false
  await measureRowHeight()
  if (!shouldScroll.value || rowHeightPx.value <= 0) return
  transitionEnabled.value = true
  scrollTimer = setInterval(() => {
    if (!shouldScroll.value) return
    currentIndex.value += 1
  }, scrollIntervalMs.value)
}

function onTrackTransitionEnd(): void {
  if (!shouldScroll.value) return
  const total = normalizedItems.value.length
  if (total <= 0) return
  if (currentIndex.value < total) return
  // 到达“克隆首行”后无缝跳回顶部
  transitionEnabled.value = false
  currentIndex.value = 0
  requestAnimationFrame(() => {
    transitionEnabled.value = true
  })
}

watch(
  () => [normalizedItems.value.length, visibleCount.value, scrollIntervalMs.value],
  () => {
    void restartAutoScroll()
  },
  { immediate: true }
)

onUnmounted(() => stopAutoScroll())
</script>

<style scoped>
.panelx-progress-list-content {
  padding: 0 0.375rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panelx-progress-list-track {
  display: flex;
  flex-direction: column;
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
