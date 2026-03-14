<template>
  <div class="panelx-editor">
    <aside class="panelx-editor-sidebar">
      <h3>尺寸</h3>
      <div class="panelx-editor-size-display">
        <label class="panelx-editor-size-display-label">当前尺寸 ({{ designSizeUnit }})</label>
        <span class="panelx-editor-size-display-value">{{ designSize.width }} × {{ designSize.height }}</span>
      </div>
      <button type="button" class="panelx-editor-btn" @click="showSizeDialog = true">
        尺寸设置
      </button>
      <SizeSettingsDialog
        :visible="showSizeDialog"
        :width-px="designSize.width"
        :height-px="designSize.height"
        v-model:unit="designSizeUnit"
        @confirm="onSizeConfirm"
        @close="showSizeDialog = false"
      />
      <h3>组件</h3>
      <div
        v-for="item in widgetList"
        :key="item.type"
        class="panelx-editor-widget-item"
        :title="`${item.label}(${item.type})`"
        draggable="true"
        @dragstart="onDragStart($event, item)"
      >
        <div v-if="getSampleImageUrl(item.sampleImage)" class="panelx-editor-widget-preview">
          <img :src="getSampleImageUrl(item.sampleImage)!" :alt="item.label" />
        </div>
        <span class="panelx-editor-widget-label">{{ item.label }}</span>
      </div>
      <h3 class="mt-4">操作</h3>
      <button type="button" class="panelx-editor-btn" @click="exportConfig">
        导出配置
      </button>
      <button type="button" class="panelx-editor-btn" @click="loadDemo">
        加载示例
      </button>
      <button type="button" class="panelx-editor-btn" @click="loadWorkshopConfig">
        加载车间大屏配置
      </button>
    </aside>
    <main class="panelx-editor-main" ref="dropRef" @dragover.prevent @drop="onDrop">
      <div class="panelx-editor-ruler-outer" :style="rulerOuterStyle">
        <div class="panelx-editor-ruler-wrap">
          <div class="panelx-editor-ruler-top" ref="rulerTopRef">
          <span
            v-for="t in rulerTicksX"
            :key="'x-' + t"
            class="panelx-editor-ruler-tick"
            :style="{ left: (t / designSize.width) * 100 + '%' }"
          >
            {{ t }}
          </span>
        </div>
        <div class="panelx-editor-ruler-body">
          <div class="panelx-editor-ruler-left" ref="rulerLeftRef">
            <span
              v-for="t in rulerTicksY"
              :key="'y-' + t"
              class="panelx-editor-ruler-tick panelx-editor-ruler-tick-v"
              :style="{ top: (t / designSize.height) * 100 + '%' }"
            >
              {{ t }}
            </span>
          </div>
          <div
            class="panelx-editor-canvas-wrap"
            ref="canvasWrapRef"
          >
            <div
              class="panelx-editor-canvas-inner"
              ref="canvasInnerRef"
              @mousedown="onCanvasMouseDown"
            >
              <template v-if="config.widgets2D.length">
                <div class="panelx-editor-widgets-layer">
                  <div
                    v-for="w in config.widgets2D"
                    :key="w.id"
                    class="panelx-editor-widget-placeholder"
                    :class="{ active: selectedId === w.id }"
                    :style="widgetFrameStyle(w)"
                    @mousedown.prevent="onPlaceholderMouseDown($event, w)"
                  >
                    <img
                      v-if="widgetSampleImage(w)"
                      :src="widgetSampleImage(w)"
                      :alt="widgetLabel(w)"
                      class="panelx-editor-placeholder-img"
                    />
                    <div v-else class="panelx-editor-placeholder-default">
                      <span class="panelx-editor-placeholder-icon">▢</span>
                      <span class="panelx-editor-placeholder-label">{{ widgetLabel(w) }}</span>
                    </div>
                    <template v-if="selectedId === w.id">
                      <span
                        v-for="handle in resizeHandles"
                        :key="handle.key"
                        class="panelx-editor-resize-handle"
                        :class="handle.key"
                        :style="resizeHandleStyle(handle)"
                        @mousedown.prevent="onResizeStart($event, w, handle)"
                      />
                    </template>
                  </div>
                </div>
              </template>
              <div v-else class="panelx-editor-empty">
                从左侧拖入组件到此处
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
    <aside class="panelx-editor-props">
      <h3>属性</h3>
      <div v-if="config.widgets2D.length" class="panelx-editor-widget-list">
        <button
          v-for="w in config.widgets2D"
          :key="w.id"
          type="button"
          class="panelx-editor-widget-tab"
          :class="{ active: selectedId === w.id }"
          @click="selectedId = w.id"
        >
          {{ widgetLabel(w) }}
        </button>
      </div>
      <template v-if="selectedConfig">
        <div class="panelx-editor-prop-group">
          <h4>矩形 (x, y, w, h)</h4>
          <div class="panelx-editor-rect-row">
            <input
              v-model.number="selectedConfig.layout.x"
              type="number"
              min="0"
              step="1"
              title="x"
              placeholder="x"
            />
            <input
              v-model.number="selectedConfig.layout.y"
              type="number"
              min="0"
              step="1"
              title="y"
              placeholder="y"
            />
            <input
              v-model.number="selectedConfig.layout.width"
              type="number"
              min="1"
              step="1"
              title="宽度"
              placeholder="w"
            />
            <input
              v-model.number="selectedConfig.layout.height"
              type="number"
              min="1"
              step="1"
              title="高度"
              placeholder="h"
            />
          </div>
        </div>
        <div v-if="propConfigList.length" class="panelx-editor-prop-group">
          <h4>组件属性</h4>
          <div
            v-for="propDef in propConfigList"
            :key="propDef.key"
            class="panelx-editor-field"
          >
            <label :title="propDef.key">{{ propDef.label }}</label>
            <template v-if="propDef.type === 'string'">
              <input
                type="text"
                :value="getProp(selectedConfig, propDef)"
                @input="setProp(selectedConfig, propDef, ($event.target as HTMLInputElement).value)"
              />
            </template>
            <template v-else-if="propDef.type === 'number'">
              <input
                type="number"
                :value="getProp(selectedConfig, propDef)"
                @input="setProp(selectedConfig, propDef, Number((($event.target as HTMLInputElement).value)))"
              />
            </template>
            <template v-else-if="propDef.type === 'boolean'">
              <input
                type="checkbox"
                :checked="!!getProp(selectedConfig, propDef)"
                @change="setProp(selectedConfig, propDef, ($event.target as HTMLInputElement).checked)"
              />
            </template>
            <template v-else-if="propDef.type === 'object' || propDef.type === 'array'">
              <textarea
                class="panelx-editor-prop-json"
                :value="JSON.stringify(getProp(selectedConfig, propDef), null, 2)"
                @blur="setPropFromJson(selectedConfig, propDef, ($event.target as HTMLTextAreaElement).value)"
              />
            </template>
          </div>
        </div>
        <details class="panelx-editor-json-detail">
          <summary>完整配置 (JSON)</summary>
          <pre class="panelx-editor-pre">{{ selectedConfig }}</pre>
        </details>
      </template>
      <p v-else class="panelx-editor-props-empty">暂无组件，从左侧拖入</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import type { DashboardConfig, WidgetConfig2D, WidgetType2D } from '../types/dashboard'
import type { EditorConfig, RegisteredWidgetDef } from '../types/editor'
import { getWidgetSampleImageUrl } from '../assets/editor-samples'
import { getWidgetDefaultProps, getWidgetPropConfig } from '../widgets/widgetRegistry'
import type { WidgetPropDef } from '../types/widgets'
import SizeSettingsDialog from './SizeSettingsDialog.vue'

const DESIGN = { width: 1920, height: 1080 }

/** 内置默认组件列表（配置文件未加载或为空时使用） */
const FALLBACK_WIDGETS: RegisteredWidgetDef[] = [
  { type: 'stat', label: '指标', defaultSize: { width: 280, height: 100 } },
  { type: 'chart', label: '图表', defaultSize: { width: 480, height: 280 } },
  { type: 'table', label: '表格', defaultSize: { width: 400, height: 260 } },
  { type: 'card', label: '卡片', defaultSize: { width: 320, height: 180 } },
  { type: 'panel', label: '面板', defaultSize: { width: 360, height: 200 } },
  { type: 'decoration', label: '装饰', defaultSize: { width: 120, height: 120 } }
]

const editorConfig = ref<EditorConfig | null>(null)
const widgetList = computed(() => editorConfig.value?.registeredWidgets?.length ? editorConfig.value!.registeredWidgets : FALLBACK_WIDGETS)

const config = reactive<DashboardConfig>({
  design: { ...DESIGN },
  widgets2D: []
})

const showSizeDialog = ref(false)
/** 尺寸展示单位（仅展示，与对话框同步） */
const designSizeUnit = ref<'px' | 'cm' | 'm' | 'km'>('px')
function onSizeConfirm(payload: { width: number; height: number }) {
  config.design.width = payload.width
  config.design.height = payload.height
}

const dropRef = ref<HTMLElement | null>(null)
const selectedId = ref<string | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const canvasInnerRef = ref<HTMLElement | null>(null)
const rulerTopRef = ref<HTMLElement | null>(null)
const rulerLeftRef = ref<HTMLElement | null>(null)

let dragItem: RegisteredWidgetDef | null = null

let isDebug = false

/** 设计稿尺寸（保证为有效整数，避免标尺除零或 NaN） */
const designSize = computed(() => {
  const w = Math.max(1, Math.floor(Number(config.design?.width) || DESIGN.width))
  const h = Math.max(1, Math.floor(Number(config.design?.height) || DESIGN.height))
  return { width: Number.isFinite(w) ? w : DESIGN.width, height: Number.isFinite(h) ? h : DESIGN.height }
})

/** 主区域外壳：按设计尺寸宽高比等比例显示，并适应主区域不溢出 */
const rulerOuterStyle = computed(() => {
  const { width: dw, height: dh } = designSize.value
  return {
    aspectRatio: `${dw} / ${dh}`,
    maxWidth: '100%',
    maxHeight: '100%'
  }
})

/** 标尺最大刻度数量，避免尺寸过大时标尺挤成乱码 */
const RULER_MAX_TICKS = 30
/** 标尺刻度：水平 */
const rulerTicksX = computed(() => {
  const w = designSize.value.width
  if (w <= 0) return [0]
  const step = Math.max(1, Math.ceil(w / RULER_MAX_TICKS))
  const ticks: number[] = []
  for (let i = 0; i <= w; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] !== w) ticks.push(w)
  return ticks
})
/** 标尺刻度：垂直 */
const rulerTicksY = computed(() => {
  const h = designSize.value.height
  if (h <= 0) return [0]
  const step = Math.max(1, Math.ceil(h / RULER_MAX_TICKS))
  const ticks: number[] = []
  for (let i = 0; i <= h; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] !== h) ticks.push(h)
  return ticks
})

function getSampleImageUrl(filename: string | undefined): string | undefined {
  return getWidgetSampleImageUrl(filename)
}

function widgetSampleImage(w: WidgetConfig2D): string {
  const def = widgetList.value.find((item) => item.type === w.type)
  const url = getWidgetSampleImageUrl(def?.sampleImage)
  return url ?? ''
}

function widgetFrameStyle(w: WidgetConfig2D): Record<string, string> {
  const dw = designSize.value.width
  const dh = designSize.value.height
  if (!w.layout || !dw || !dh) return { visibility: 'hidden' }
  const x = Number(w.layout.x)
  const y = Number(w.layout.y)
  const ww = Number(w.layout.width)
  const wh = Number(w.layout.height)
  return {
    left: (x / dw) * 100 + '%',
    top: (y / dh) * 100 + '%',
    width: (ww / dw) * 100 + '%',
    height: (wh / dh) * 100 + '%'
  }
}

const resizeHandles: { key: string; pos: string; cursor: string }[] = [
  { key: 'n', pos: 'top', cursor: 'n-resize' },
  { key: 's', pos: 'bottom', cursor: 's-resize' },
  { key: 'e', pos: 'right', cursor: 'e-resize' },
  { key: 'w', pos: 'left', cursor: 'w-resize' },
  { key: 'nw', pos: 'top left', cursor: 'nw-resize' },
  { key: 'ne', pos: 'top right', cursor: 'ne-resize' },
  { key: 'sw', pos: 'bottom left', cursor: 'sw-resize' },
  { key: 'se', pos: 'bottom right', cursor: 'se-resize' }
]

function resizeHandleStyle(handle: { key: string; pos: string; cursor: string }): Record<string, string> {
  return { cursor: handle.cursor }
}

/** 拖拽：仅当移动超过阈值后才更新位置，否则视为点击选中 */
const DRAG_THRESHOLD = 4
let dragState: {
  w: WidgetConfig2D
  startX: number
  startY: number
  startLayout: { x: number; y: number }
  scaleX: number
  scaleY: number
  committed: boolean
} | null = null
let resizeState: {
  w: WidgetConfig2D
  handle: { key: string; pos: string }
  startX: number
  startY: number
  startLayout: { x: number; y: number; width: number; height: number }
  scaleX: number
  scaleY: number
} | null = null

function onCanvasMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.panelx-editor-widget-placeholder')) return
  selectedId.value = null
}

function onPlaceholderMouseDown(e: MouseEvent, w: WidgetConfig2D) {
  if ((e.target as HTMLElement).closest('.panelx-editor-resize-handle')) return
  selectedId.value = w.id
  const wrap = canvasWrapRef.value
  if (!wrap) return
  const scaleX = designSize.value.width / wrap.clientWidth
  const scaleY = designSize.value.height / wrap.clientHeight
  dragState = {
    w,
    startX: e.clientX,
    startY: e.clientY,
    startLayout: { x: w.layout.x, y: w.layout.y },
    scaleX,
    scaleY,
    committed: false
  }
  function onMove(ev: MouseEvent) {
    if (!dragState) return
    if (!dragState.committed) {
      const dx = ev.clientX - dragState.startX
      const dy = ev.clientY - dragState.startY
      if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return
      dragState.committed = true
    }
    const dx = (ev.clientX - dragState.startX) * dragState.scaleX
    const dy = (ev.clientY - dragState.startY) * dragState.scaleY
    dragState.w.layout.x = Math.max(0, Math.round(dragState.startLayout.x + dx))
    dragState.w.layout.y = Math.max(0, Math.round(dragState.startLayout.y + dy))
  }
  function onUp() {
    dragState = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onResizeStart(e: MouseEvent, w: WidgetConfig2D, handle: { key: string; pos: string }) {
  e.stopPropagation()
  const wrap = canvasWrapRef.value
  if (!wrap) return
  const cw = wrap.clientWidth
  const ch = wrap.clientHeight
  if (!cw || !ch) return
  const scaleX = designSize.value.width / cw
  const scaleY = designSize.value.height / ch
  resizeState = {
    w,
    handle,
    startX: e.clientX,
    startY: e.clientY,
    startLayout: { x: w.layout.x, y: w.layout.y, width: w.layout.width, height: w.layout.height },
    scaleX,
    scaleY
  }
  const dw = designSize.value.width
  const dh = designSize.value.height
  function onMove(ev: MouseEvent) {
    if (!resizeState) return
    const dx = (ev.clientX - resizeState.startX) * resizeState.scaleX
    const dy = (ev.clientY - resizeState.startY) * resizeState.scaleY
    const { startLayout, handle: h } = resizeState
    const key = h.key
    let x = startLayout.x
    let y = startLayout.y
    let width = startLayout.width
    let height = startLayout.height
    // 右侧或包含 e（如 se / ne）：向右拖动增加宽度
    if (key.includes('e')) width = Math.max(20, startLayout.width + dx)
    // 左侧或包含 w（如 sw / nw）：向左拖动，同时移动 x
    if (key.includes('w')) {
      x = startLayout.x + dx
      width = Math.max(20, startLayout.width - dx)
    }
    // 底部或包含 s：向下拖动增加高度
    if (key.includes('s')) height = Math.max(20, startLayout.height + dy)
    // 顶部或包含 n：向上拖动，同时移动 y
    if (key.includes('n')) {
      y = startLayout.y + dy
      height = Math.max(20, startLayout.height - dy)
    }
    resizeState.w.layout.x = Math.max(0, Math.round(x))
    resizeState.w.layout.y = Math.max(0, Math.round(y))
    resizeState.w.layout.width = Math.min(dw - resizeState.w.layout.x, Math.max(20, Math.round(width)))
    resizeState.w.layout.height = Math.min(dh - resizeState.w.layout.y, Math.max(20, Math.round(height)))
  }
  function onUp() {
    resizeState = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

onMounted(async () => {
  try {
    const mod = await import('../demo/editor_config.json')
    const loaded = mod.default as EditorConfig
    if (loaded?.registeredWidgets?.length) editorConfig.value = loaded
  } catch {
    // 使用 FALLBACK_WIDGETS
  }
  document.addEventListener('keydown', onEditorKeydown)
})

function onDragStart(e: DragEvent, item: RegisteredWidgetDef) {
  dragItem = item
  e.dataTransfer!.setData('text/plain', item.type)
  e.dataTransfer!.effectAllowed = 'copy'
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (!dragItem) return
  const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const layout = createLayoutAtDrop(dragItem, e) ?? defaultLayout(dragItem, config.widgets2D.length)
  const w: WidgetConfig2D = {
    id,
    type: dragItem.type,
    layout,
    visible: true,
    props: defaultProps(dragItem)
  }
  config.widgets2D.push(w)
  selectedId.value = id
  const sampleImageUrl = getWidgetSampleImageUrl(dragItem.sampleImage)
  if (isDebug) {
    console.log('[Editor] 创建 widget 实例', {
    widget: { id: w.id, type: w.type, layout: w.layout },
    registeredWidget: { type: dragItem.type, label: dragItem.label, sampleImage: dragItem.sampleImage },
    resolvedSampleImageUrl: sampleImageUrl ?? '(空)'
  })
  }
  
  dragItem = null
}

function getWidgetDef(type: WidgetType2D): RegisteredWidgetDef | undefined {
  return widgetList.value.find((item) => item.type === type)
}

/** 根据鼠标放下位置创建 layout，使组件中心落在鼠标位置（设计稿坐标） */
function createLayoutAtDrop(def: RegisteredWidgetDef, e: DragEvent): { x: number; y: number; width: number; height: number } | null {
  const canvasEl = canvasInnerRef.value ?? canvasWrapRef.value
  if (!canvasEl) return null
  const rect = canvasEl.getBoundingClientRect()
  const cx = e.clientX
  const cy = e.clientY
  if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return null
  const relX = cx - rect.left
  const relY = cy - rect.top
  const dw = designSize.value.width
  const dh = designSize.value.height
  if (!rect.width || !rect.height || !dw || !dh) return null
  const designX = (relX / rect.width) * dw
  const designY = (relY / rect.height) * dh
  const { width: defW, height: defH } = def.defaultSize
  let x = designX - defW / 2
  let y = designY - defH / 2
  x = Math.max(0, Math.min(dw - defW, Math.round(x)))
  y = Math.max(0, Math.min(dh - defH, Math.round(y)))
  return { x, y, width: defW, height: defH }
}

function defaultLayout(def: RegisteredWidgetDef, index: number): { x: number; y: number; width: number; height: number } {
  const pad = 20
  const { width: defW, height: defH } = def.defaultSize
  const cols = Math.max(1, Math.floor((DESIGN.width - pad) / (defW + pad)))
  const c = index % cols
  const r = Math.floor(index / cols)
  return {
    x: pad + c * (defW + pad),
    y: pad + r * (defH + pad),
    width: defW,
    height: defH
  }
}

/** 解析默认 props：widgetPropData.defaultParams[type] > registeredWidgets[].defaultProps > registry */
function defaultProps(def: RegisteredWidgetDef): Record<string, unknown> {
  const fromConfig = editorConfig.value?.widgetPropData?.defaultParams?.[def.type]
  if (fromConfig && Object.keys(fromConfig).length > 0) return { ...fromConfig }
  if (def.defaultProps && Object.keys(def.defaultProps).length > 0) return { ...def.defaultProps }
  return getWidgetDefaultProps(def.type)
}

const selectedConfig = computed(() => {
  if (!selectedId.value) return null
  return config.widgets2D.find((w) => w.id === selectedId.value) ?? null
})

/** 当前选中组件的 prop 配置列表，供右侧栏渲染 */
const propConfigList = computed(() => {
  if (!selectedConfig.value) return []
  return getWidgetPropConfig(selectedConfig.value.type)
})

/** 读取组件 props 中的某一项，无则回退到 propDef.default */
function getProp(w: WidgetConfig2D, propDef: WidgetPropDef): unknown {
  const v = (w.props ?? {})[propDef.key]
  return v !== undefined && v !== null ? v : propDef.default
}

/** 写入组件 props，确保 props 对象存在 */
function setProp(w: WidgetConfig2D, propDef: WidgetPropDef, value: unknown) {
  if (!w.props) w.props = {}
  w.props[propDef.key] = value
}

/** object/array 类型：从 JSON 字符串解析并写入，失败则忽略 */
function setPropFromJson(w: WidgetConfig2D, propDef: WidgetPropDef, raw: string) {
  try {
    const v = raw.trim() ? JSON.parse(raw) : propDef.default
    setProp(w, propDef, v)
  } catch {
    // 解析失败不覆盖
  }
}

const typeLabelByType = computed(() => {
  const map: Record<string, string> = {}
  for (const item of widgetList.value) map[item.type] = item.label
  return map
})
function widgetLabel(w: WidgetConfig2D) {
  return typeLabelByType.value[w.type] || w.type
}

watch(
  () => config.widgets2D.length,
  (len) => {
    if (len > 0 && !selectedId.value) selectedId.value = config.widgets2D[0].id
  },
  { immediate: true }
)
watch(selectedConfig, (cur) => {
  if (!cur && config.widgets2D.length > 0) selectedId.value = config.widgets2D[0].id
})

/** 删除当前选中的组件实例（带确认） */
function deleteSelectedWidget() {
  if (!selectedId.value) return
  const idx = config.widgets2D.findIndex((w) => w.id === selectedId.value)
  if (idx < 0) return
  const w = config.widgets2D[idx]
  const label = typeLabelByType.value[w.type] || w.type
  if (!confirm(`确定删除组件「${label}」？`)) return
  config.widgets2D.splice(idx, 1)
  if (config.widgets2D.length === 0) {
    selectedId.value = null
    return
  }
  selectedId.value = config.widgets2D[Math.min(idx, config.widgets2D.length - 1)].id
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  const target = e.target as HTMLElement
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
  if (!selectedId.value) return
  e.preventDefault()
  deleteSelectedWidget()
}

onUnmounted(() => {
  document.removeEventListener('keydown', onEditorKeydown)
})

function exportConfig() {
  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

function loadDemo() {
  config.backgroundLayer = undefined
  config.widgets2D = [
    {
      id: 'stat1',
      type: 'stat',
      layout: { x: 20, y: 20, width: 300, height: 100 },
      visible: true,
      props: { value: 123456, label: '总销售额', prefix: '¥', trend: 'up', trendValue: '12.5%' }
    },
    {
      id: 'chart1',
      type: 'chart',
      layout: { x: 20, y: 140, width: 600, height: 400 },
      visible: true,
      props: {
        options: {
          xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
          yAxis: { type: 'value' },
          series: [{ data: [120, 132, 101, 134, 90, 230], type: 'line', smooth: true }]
        },
        height: '100%',
        width: '100%'
      }
    },
    {
      id: 'decoration1',
      type: 'decoration',
      layout: { x: 640, y: 140, width: 200, height: 120 },
      visible: true,
      props: { variant: 'corner' }
    }
  ]
}

async function loadWorkshopConfig() {
  const mod = await import('../demo/dashboard_config.json')
  const loaded = mod.default as unknown as DashboardConfig
  config.design = { ...loaded.design }
  config.backgroundLayer = loaded.backgroundLayer ? JSON.parse(JSON.stringify(loaded.backgroundLayer)) : undefined
  config.widgets2D = JSON.parse(JSON.stringify(loaded.widgets2D))
  selectedId.value = config.widgets2D[0]?.id ?? null
}
</script>

<style scoped>
.panelx-editor {
  display: grid;
  grid-template-columns: 20% 60% 20%;
  height: 100vh;
  font-size: 0.875rem;
}
.panelx-editor-sidebar {
  height: 100%;
  max-height: 100vh;
  padding: 1rem;
  padding-bottom: 2rem;
  border-right: 0.0625rem solid var(--color-border, #e8e8e8);
  background: var(--color-background, #f5f5f5);
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  min-width: 0;
}
.panelx-editor-sidebar h3 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: var(--color-secondary);
  text-transform: uppercase;
}
.panelx-editor-widget-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 0.375rem;
  cursor: grab;
  border: 0.0625rem solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}
.panelx-editor-widget-item:hover {
  border-color: var(--color-primary, #1890ff);
}
.panelx-editor-widget-preview {
  width: 4rem;
  height: 3rem;
  border-radius: 0.25rem;
  overflow: hidden;
  background: var(--color-background, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.panelx-editor-widget-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.panelx-editor-widget-label {
  font-size: 0.75rem;
  color: #333;
  text-align: center;
}
.mt-4 {
  margin-top: 1rem;
}
.panelx-editor-size-display {
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.25rem;
  background: #f8f8f8;
}
.panelx-editor-size-display-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
}
.panelx-editor-size-display-value {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: #333;
}
.panelx-editor-btn {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.25rem;
  background: white;
  cursor: pointer;
}
.panelx-editor-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}
.panelx-editor-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panelx-editor-ruler-outer {
  width: 100%;
  /* 不设 height，由 :style 的 aspectRatio 决定高度，避免与 height:100% 冲突导致比例失效（如 1920x1080 被拉成正方形） */
  position: relative;
  margin: 0 auto;
  flex-shrink: 0;
}
.panelx-editor-ruler-wrap {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  margin: 0;
  box-shadow: 0 0 0 0.0625rem rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  background: #252535;
}
.panelx-editor-ruler-top {
  height: 1.5rem;
  background: #2a2a3c;
  border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
  position: relative;
  flex-shrink: 0;
}
.panelx-editor-ruler-tick {
  position: absolute;
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.6);
  transform: translate(-50%, 0);
  top: 0.125rem;
}
.panelx-editor-ruler-tick-v {
  transform: translate(0, -50%);
  left: 0.25rem;
  top: 0;
}
.panelx-editor-ruler-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.panelx-editor-ruler-left {
  width: 1.75rem;
  flex-shrink: 0;
  background: #2a2a3c;
  border-right: 0.0625rem solid rgba(255, 255, 255, 0.1);
  position: relative;
}
.panelx-editor-canvas-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  background: #1e1e2e;
  width: 100%;
}
.panelx-editor-canvas-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
.panelx-editor-widgets-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  pointer-events: none;
}
.panelx-editor-widgets-layer > .panelx-editor-widget-placeholder {
  pointer-events: auto;
}
.panelx-editor-widget-placeholder {
  position: absolute;
  box-sizing: border-box;
  cursor: move;
  border: 0.125rem solid transparent;
  transition: border-color 0.15s;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  left: 0;
  top: 0;
  right: auto;
  bottom: auto;
}
.panelx-editor-widget-placeholder:hover {
  border-color: rgba(24, 144, 255, 0.5);
}
.panelx-editor-widget-placeholder.active {
  border-color: #1890ff;
  z-index: 5;
}
.panelx-editor-placeholder-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.panelx-editor-placeholder-default {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}
.panelx-editor-placeholder-icon {
  font-size: 1.5rem;
  line-height: 1;
}
.panelx-editor-placeholder-label {
  text-align: center;
  word-break: break-all;
}
.panelx-editor-resize-handle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  background: #1890ff;
  border: 0.0625rem solid #fff;
  border-radius: 0.125rem;
  pointer-events: auto;
  z-index: 10;
  flex-shrink: 0;
}
.panelx-editor-resize-handle.n { left: 50%; transform: translate(-50%, -50%); top: 0; }
.panelx-editor-resize-handle.s { left: 50%; transform: translate(-50%, -50%); bottom: 0; }
.panelx-editor-resize-handle.e { top: 50%; transform: translate(-50%, -50%); right: 0; }
.panelx-editor-resize-handle.w { top: 50%; transform: translate(-50%, -50%); left: 0; }
.panelx-editor-resize-handle.nw { left: 0; top: 0; transform: translate(-50%, -50%); }
.panelx-editor-resize-handle.ne { right: 0; top: 0; transform: translate(50%, -50%); }
.panelx-editor-resize-handle.sw { left: 0; bottom: 0; transform: translate(-50%, 50%); }
.panelx-editor-resize-handle.se { right: 0; bottom: 0; transform: translate(50%, 50%); }
.panelx-editor-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  border: 0.125rem dashed rgba(255, 255, 255, 0.2);
  border-radius: 0;
}
.panelx-editor-props {
  min-width: 0;
  min-height: 0;
  max-height: 100vh;
  padding: 1rem;
  border-left: 0.0625rem solid var(--color-border);
  background: #fafafa;
  overflow-y: auto;
  overflow-x: hidden;
}
.panelx-editor-props-empty {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: #999;
}
.panelx-editor-props h3 {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #666;
}
.panelx-editor-widget-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}
.panelx-editor-widget-tab {
  padding: 0.25rem 0.625rem;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
  background: #fff;
  font-size: 0.75rem;
  cursor: pointer;
}
.panelx-editor-widget-tab.active {
  border-color: #1890ff;
  background: #e6f7ff;
  color: #1890ff;
}
.panelx-editor-prop-group {
  margin-bottom: 1rem;
}
.panelx-editor-prop-group h4 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
}
.panelx-editor-rect-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
.panelx-editor-rect-row input {
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0.25rem;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  text-align: center;
  box-sizing: border-box;
}
.panelx-editor-rect-row input::placeholder {
  color: #999;
}
.panelx-editor-field {
  margin-bottom: 0.5rem;
}
.panelx-editor-field label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}
.panelx-editor-field input,
.panelx-editor-field .panelx-editor-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  box-sizing: border-box;
}
.panelx-editor-field .panelx-editor-prop-json {
  width: 100%;
  min-height: 4rem;
  padding: 0.375rem 0.5rem;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  resize: vertical;
  box-sizing: border-box;
}
.panelx-editor-field .panelx-editor-select {
  cursor: pointer;
  background: white;
}
.panelx-editor-json-detail {
  margin-top: 0.75rem;
  font-size: 0.75rem;
}
.panelx-editor-json-detail summary {
  cursor: pointer;
  color: #666;
}
.panelx-editor-pre {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  font-size: 0.6875rem;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f0f0f0;
  border-radius: 0.25rem;
  max-height: 12.5rem;
  overflow: auto;
}
</style>
