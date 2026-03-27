<template>
  <div
    ref="rootRef"
    class="panelx-heatmap2d"
    :class="className"
    :style="{ borderRadius: `${borderRadius}px` }"
  >
    <div v-if="title" class="panelx-heatmap2d-title">{{ title }}</div>
    <canvas ref="canvasRef" class="panelx-heatmap2d-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { Heatmap2DProps } from '../types/components'
import { parseCssColorToRgba } from '../utils/cssColor'

const props = withDefaults(defineProps<Heatmap2DProps>(), {
  data: () => [
    [0, 0.25, 0.5, 0.75, 1],
    [0.2, 0.4, 0.6, 0.8, 1],
    [0.1, 0.3, 0.5, 0.7, 0.9]
  ],
  min: undefined,
  max: undefined,
  colorLow: '#0c4a6e',
  colorHigh: '#f97316',
  showGrid: true,
  cellGap: 1,
  smoothIntensity: 2,
  borderRadius: 2,
  showValues: false,
  valueFontSize: 10,
  title: ''
})

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function normalizeMatrix(raw: unknown): number[][] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: number[][] = []
  for (const row of raw) {
    if (!Array.isArray(row)) continue
    const nums: number[] = []
    for (const v of row) {
      const n = Number(v)
      nums.push(Number.isFinite(n) ? n : NaN)
    }
    if (nums.length) out.push(nums)
  }
  return out
}

const matrix = computed(() => normalizeMatrix(props.data))

function finiteRange(values: number[]): { min: number; max: number } | null {
  const f = values.filter((v) => Number.isFinite(v))
  if (!f.length) return null
  let lo = f[0]
  let hi = f[0]
  for (const v of f) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return { min: lo, max: hi }
}

function allValues(mat: number[][]): number[] {
  const acc: number[] = []
  for (const row of mat) {
    for (const v of row) {
      if (Number.isFinite(v)) acc.push(v)
    }
  }
  return acc
}

function lerpRgba(
  low: { r: number; g: number; b: number; a: number },
  high: { r: number; g: number; b: number; a: number },
  t: number
): { r: number; g: number; b: number; a: number } {
  const k = Math.max(0, Math.min(1, t))
  return {
    r: low.r + (high.r - low.r) * k,
    g: low.g + (high.g - low.g) * k,
    b: low.b + (high.b - low.b) * k,
    a: low.a + (high.a - low.a) * k
  }
}

function draw(): void {
  const canvas = canvasRef.value
  const root = rootRef.value
  if (!canvas || !root) return

  const mat = matrix.value
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const rect = root.getBoundingClientRect()
  const titleH = props.title ? 28 : 0
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height - titleH))

  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  if (!mat.length) {
    ctx.fillStyle = 'rgba(15,23,42,0.85)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText('无有效热力数据（需二维 number[][]）', 8, 20)
    return
  }

  const rows = mat.length
  const cols = Math.max(...mat.map((r) => r.length), 1)
  const gridVisible = props.showGrid !== false
  const gap = gridVisible ? Math.max(0, props.cellGap) : 0
  const smoothIntensity = Math.max(1, Math.min(4, Math.round(Number(props.smoothIntensity) || 2)))
  const vals = allValues(mat)
  const auto = finiteRange(vals)
  const vmin = props.min != null && Number.isFinite(props.min) ? props.min : auto?.min ?? 0
  const vmax = props.max != null && Number.isFinite(props.max) ? props.max : auto?.max ?? 1
  const span = vmax - vmin || 1

  const totalGapX = gap * Math.max(0, cols - 1)
  const totalGapY = gap * Math.max(0, rows - 1)
  const cellW = (w - totalGapX) / cols
  const cellH = (h - totalGapY) / rows
  const low = parseCssColorToRgba(props.colorLow) ?? { r: 12, g: 74, b: 110, a: 1 }
  const high = parseCssColorToRgba(props.colorHigh) ?? { r: 249, g: 115, b: 22, a: 1 }
  const nodata = { r: 30, g: 41, b: 59, a: 0.9 }

  // 先按“更低分辨率”绘制，再平滑放大；smoothIntensity 越高越平滑
  const sampleCols = Math.max(1, Math.ceil(cols / smoothIntensity))
  const sampleRows = Math.max(1, Math.ceil(rows / smoothIntensity))
  const heatCanvas = document.createElement('canvas')
  heatCanvas.width = sampleCols
  heatCanvas.height = sampleRows
  const heatCtx = heatCanvas.getContext('2d')
  if (!heatCtx) return
  const img = heatCtx.createImageData(sampleCols, sampleRows)
  const buffer = img.data
  for (let sri = 0; sri < sampleRows; sri++) {
    const centerRi = Math.min(rows - 1, Math.floor(((sri + 0.5) / sampleRows) * rows))
    const row = mat[centerRi] ?? []
    for (let sci = 0; sci < sampleCols; sci++) {
      const centerCi = Math.min(cols - 1, Math.floor(((sci + 0.5) / sampleCols) * cols))
      const v = centerCi < row.length ? row[centerCi] : NaN
      let color = nodata
      if (Number.isFinite(v)) {
        const t = Math.max(0, Math.min(1, (v - vmin) / span))
        color = lerpRgba(low, high, t)
      }
      const idx = (sri * sampleCols + sci) * 4
      buffer[idx] = Math.round(color.r)
      buffer[idx + 1] = Math.round(color.g)
      buffer[idx + 2] = Math.round(color.b)
      buffer[idx + 3] = Math.round(color.a * 255)
    }
  }
  heatCtx.putImageData(img, 0, 0)

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(heatCanvas, 0, 0, w, h)
  ctx.restore()

  if (gap > 0) {
    // 用“抠除网格线”的方式保留 cellGap 外观
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    for (let ci = 1; ci < cols; ci++) {
      const x = Math.round((ci / cols) * w - gap / 2)
      ctx.fillRect(x, 0, gap, h)
    }
    for (let ri = 1; ri < rows; ri++) {
      const y = Math.round((ri / rows) * h - gap / 2)
      ctx.fillRect(0, y, w, gap)
    }
    ctx.restore()
  }

  if (props.showValues) {
    for (let ri = 0; ri < rows; ri++) {
      const row = mat[ri]
      for (let ci = 0; ci < cols; ci++) {
        const v = ci < row.length ? row[ci] : NaN
        if (!Number.isFinite(v) || cellW <= 18 || cellH <= 12) continue
        const t = Math.max(0, Math.min(1, (v - vmin) / span))
        const x = ci * (cellW + gap)
        const y = ri * (cellH + gap)
        ctx.fillStyle = t > 0.55 ? 'rgba(15,23,42,0.92)' : 'rgba(248,250,252,0.95)'
        ctx.font = `${props.valueFontSize}px ui-monospace, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(Number.isInteger(v) ? String(v) : v.toFixed(2), x + cellW / 2, y + cellH / 2)
      }
    }
  }
}

function scheduleDraw(): void {
  requestAnimationFrame(() => draw())
}

onMounted(() => {
  scheduleDraw()
  if (rootRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => scheduleDraw())
    resizeObserver.observe(rootRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [
    props.data,
    props.min,
    props.max,
    props.colorLow,
    props.colorHigh,
    props.showGrid,
    props.cellGap,
    props.smoothIntensity,
    props.borderRadius,
    props.showValues,
    props.valueFontSize,
    props.title
  ],
  () => scheduleDraw(),
  { deep: true }
)
</script>

<style scoped>
.panelx-heatmap2d {
  width: 100%;
  height: 100%;
  min-height: 4rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.35);
  border-radius: 6px;
  overflow: hidden;
}
.panelx-heatmap2d-title {
  flex: 0 0 auto;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: #cbd5e1;
  letter-spacing: 0.02em;
}
.panelx-heatmap2d-canvas {
  flex: 1 1 auto;
  display: block;
  width: 100%;
  min-height: 0;
}
</style>
