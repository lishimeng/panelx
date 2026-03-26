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
      <label class="panelx-editor-merge-3d">
        <input v-model="enable3DMerge" type="checkbox" />
        <span>导出/预览合并 3D 草稿</span>
      </label>
      <p class="panelx-editor-merge-3d-hint">
        请先在 Editor3D 点击「保存草稿」（键 {{ EDITOR_3D_DRAFT_KEY }}）
      </p>
      <div
        v-if="mergeToast"
        class="panelx-editor-merge-toast"
        :class="{ 'panelx-editor-merge-toast--warn': mergeToast.kind === 'warn' }"
        role="status"
      >
        {{ mergeToast.text }}
      </div>
      <button type="button" class="panelx-editor-btn" @click="exportConfig">
        导出配置
      </button>
      <input
        ref="importConfigInputRef"
        type="file"
        accept=".json,application/json"
        class="panelx-editor-file-input"
        @change="onImportConfigChange"
      />
      <button type="button" class="panelx-editor-btn" @click="triggerImportConfig">
        导入配置
      </button>
      <p class="panelx-editor-merge-3d-hint">
        导入完整大屏 JSON；仅编辑 2D，backgroundLayer / widgets3D / scene3D 等仅保存、不在此解析或渲染
      </p>
      <button type="button" class="panelx-editor-btn" @click="previewDashboard">
        预览
      </button>
      <div class="panelx-editor-merge-3d-hint">数据源探针：{{ datasourceProbeRunning ? '运行中' : '已停止' }}</div>
      <InlineNotice :text="datasourceProbeHint" :variant="datasourceProbeHintVariant" />
      <button type="button" class="panelx-editor-btn" :disabled="datasourceProbeRunning" @click="startDatasourceProbeManual">
        启动数据源
      </button>
      <button type="button" class="panelx-editor-btn" :disabled="!datasourceProbeRunning" @click="stopDatasourceProbeManual">
        停止数据源
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
                <!-- 实时渲染层：在编辑器中直接渲染组件实例（不拦截鼠标，避免影响拖拽/缩放） -->
                <div class="panelx-editor-widgets-live-layer" aria-hidden="true">
                  <div
                    v-for="w in config.widgets2D"
                    :key="w.id"
                    class="panelx-editor-widget-live"
                    :style="widgetFrameStyle(w)"
                  >
                    <div class="panelx-editor-widget-live-inner" :style="widgetLiveInnerStyle">
                      <component
                        :is="getWidgetComponent(w.type)"
                        :key="widgetLiveKey(w)"
                        v-bind="(getWidgetLiveProps(w)) as Record<string, unknown>"
                      />
                    </div>
                  </div>
                </div>

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
        <div class="panelx-editor-prop-group">
          <h4>实例</h4>
          <div class="panelx-editor-field">
            <label>组件实例ID</label>
            <input
              :value="selectedConfig.id"
              type="text"
              placeholder="唯一实例ID"
              title="用于数据路由与运行时定位"
              @change="renameSelectedWidgetId(($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="panelx-editor-prop-group">
          <h4>数据源</h4>
          <div class="panelx-editor-field">
            <label>实例ID</label>
            <div class="panelx-editor-props-empty">
              使用组件 `id` 作为数据路由标识（后端 payload.widgetId / payload.id）。
            </div>
          </div>
          <div class="panelx-editor-field">
            <label>活动数据源</label>
            <div class="panelx-editor-props-empty">
              {{ activeDatasourceLabel }}
            </div>
          </div>
        </div>
        <div v-if="propConfigList.length" class="panelx-editor-prop-group">
          <h4>组件属性</h4>
          <div
            v-for="propDef in propConfigList"
            :key="propDef.key"
            class="panelx-editor-field"
          >
            <label :title="`${propDef.label}（${propDef.key}）`">
              {{ propDef.label }}<span class="panelx-editor-prop-key"> · {{ propDef.key }}</span>
            </label>
            <template v-if="propDef.type === 'color'">
              <ColorPickerField
                :model-value="String(getProp(selectedConfig, propDef) ?? '')"
                @update:model-value="setProp(selectedConfig, propDef, $event)"
              />
            </template>
            <template
              v-else-if="
                propDef.enum &&
                propDef.enum.length > 0 &&
                (propDef.type === 'string' || propDef.type === 'number')
              "
            >
              <select
                class="panelx-editor-select"
                :value="selectDisplayString(selectedConfig, propDef)"
                @change="onPropSelectChange(selectedConfig, propDef, ($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-if="!enumContainsValue(propDef, getProp(selectedConfig, propDef))"
                  :value="selectDisplayString(selectedConfig, propDef)"
                >
                  {{ getProp(selectedConfig, propDef) }}（当前）
                </option>
                <option v-for="opt in propDef.enum" :key="String(opt)" :value="String(opt)">
                  {{ opt }}
                </option>
              </select>
            </template>
            <template v-else-if="propDef.type === 'string'">
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
import { useRouter } from 'vue-router'
import type { DashboardConfig, WidgetConfig2D } from '../types/dashboard'
import type { EditorConfig, RegisteredWidgetDef } from '../types/editor'
import { isDebugEnabled, setDebugFromConfig } from '../utils/logManager'
import { getWidgetSampleImageUrl } from '../assets/editor-samples'
import { getWidgetComponent, getWidgetDefaultProps, getWidgetPropConfig } from '../widgets/widgetRegistry'
import type { WidgetPropDef } from '../types/widgets'
import SizeSettingsDialog from './SizeSettingsDialog.vue'
import InlineNotice from './components/InlineNotice.vue'
import ColorPickerField from './components/ColorPickerField.vue'
import {
  EDITOR_3D_DRAFT_KEY,
  loadEditor3DDraft,
  loadEnable3DMergeFromStorage,
  mergeDashboardWith3DDraft,
  saveEnable3DMergeToStorage
} from '../utils/editor3dDraft'
import { loadDatasourceConfigFromStorage } from '../utils/datasourceConfigStorage'
import { resolveDatasourceUrl } from '../utils/resolveDatasourceUrl'
import { startSseDatasourceProbe } from '../utils/sseDatasourceProbe'
import { dataChainLog } from '../core/comm/dataChainLog'

const router = useRouter()

const PREVIEW_STORAGE_KEY = 'PanelX_EDITOR_PREVIEW_CONFIG'

const DESIGN = { width: 1920, height: 1080 }

const DESIGN_SIZE_STORAGE_KEY = 'PanelX_DESIGN_SIZE'

function getDesignSizeFromStorage(): { width: number; height: number } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(DESIGN_SIZE_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { width?: unknown; height?: unknown }
    const w = Number(o?.width)
    const h = Number(o?.height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null
    return { width: Math.floor(w), height: Math.floor(h) }
  } catch {
    return null
  }
}

function saveDesignSizeToStorage(width: number, height: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DESIGN_SIZE_STORAGE_KEY, JSON.stringify({ width, height }))
  } catch {
    // ignore
  }
}

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
/** 数据源列表，供右侧栏「绑定数据源」下拉使用 */
const datasourceCatalog = ref<EditorConfig['datasources']>([])
const datasourceList = computed(() => datasourceCatalog.value ?? [])
let stopDatasourceProbe: (() => void) | null = null
const datasourceProbeRunning = ref(false)
const datasourceProbeHint = ref('')
const datasourceProbeHintVariant = ref<'info' | 'success' | 'warn' | 'error'>('info')
let datasourceProbeHintTimer: ReturnType<typeof setTimeout> | null = null
type EditorDatasource = NonNullable<EditorConfig['datasources']>[number]
const activeDatasourceLabel = computed(() => {
  const list = datasourceList.value ?? []
  const enabled = list.filter((d) => d.enable === true)
  const active = enabled[0] ?? list[0]
  if (!active) return '未配置'
  return `${active.key} (${active.type})`
})

function logEditor2DDatasourceState(stage: string, list: EditorDatasource[]): void {
  const enabled = list.filter((d) => d.enable === true)
  const active = enabled[0] ?? list[0]
  dataChainLog('Editor2D.datasource', {
    stage,
    count: list.length,
    enabledCount: enabled.length,
    activeKey: active?.key ?? '',
    activeType: active?.type ?? '',
    keys: list.map((d) => d.key)
  })
}

function setDatasourceProbeHint(text: string, variant: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  datasourceProbeHint.value = text
  datasourceProbeHintVariant.value = variant
  if (datasourceProbeHintTimer) clearTimeout(datasourceProbeHintTimer)
  datasourceProbeHintTimer = setTimeout(() => {
    datasourceProbeHint.value = ''
    datasourceProbeHintTimer = null
  }, 3000)
}

function pickActiveDatasource(list: EditorDatasource[]) {
  const enabled = list.filter((d) => d.enable === true)
  return enabled[0] ?? list[0] ?? null
}

function startDatasourceProbe(list: EditorDatasource[]): void {
  stopDatasourceProbe?.()
  stopDatasourceProbe = null
  datasourceProbeRunning.value = false
  const active = pickActiveDatasource(list)
  if (!active) {
    dataChainLog('Editor2D.datasourceProbe', { stage: 'skip', reason: 'no_active_datasource' })
    return
  }
  const url = resolveDatasourceUrl(active)
  if (active.type === 'sse') {
    datasourceProbeRunning.value = true
    const stop = startSseDatasourceProbe(
      url,
      (entry) => dataChainLog('Editor2D.datasourceProbe', entry),
      { key: active.key, sourceTag: 'Editor2D' }
    )
    stopDatasourceProbe = () => {
      stop()
      datasourceProbeRunning.value = false
    }
    return
  }
  let timer: ReturnType<typeof setInterval> | null = null
  const poll = async () => {
    try {
      const res = await fetch(url, { method: active.method ?? 'GET' })
      const text = await res.text()
      dataChainLog('Editor2D.datasourceProbe', {
        stage: 'data',
        type: 'polling',
        key: active.key,
        status: res.status,
        rawLength: text.length
      })
    } catch (err) {
      dataChainLog('Editor2D.datasourceProbe', {
        stage: 'error',
        type: 'polling',
        key: active.key,
        message: String(err)
      })
    }
  }
  void poll()
  timer = setInterval(() => void poll(), Math.max(500, Number(active.interval ?? 2000)))
  datasourceProbeRunning.value = true
  stopDatasourceProbe = () => {
    if (timer) clearInterval(timer)
    timer = null
    datasourceProbeRunning.value = false
  }
}

function startDatasourceProbeManual(): void {
  dataChainLog('Editor2D.datasourceProbe.control', {
    action: 'start',
    running: datasourceProbeRunning.value,
    datasourceCount: datasourceCatalog.value?.length ?? 0
  })
  startDatasourceProbe(datasourceCatalog.value ?? [])
  setDatasourceProbeHint(datasourceProbeRunning.value ? '数据源已启动' : '未找到可启动的数据源', datasourceProbeRunning.value ? 'success' : 'warn')
}

function stopDatasourceProbeManual(): void {
  dataChainLog('Editor2D.datasourceProbe.control', {
    action: 'stop',
    running: datasourceProbeRunning.value
  })
  stopDatasourceProbe?.()
  stopDatasourceProbe = null
  datasourceProbeRunning.value = false
  setDatasourceProbeHint('数据源已停止', 'info')
}

const config = reactive<DashboardConfig>({
  design: { ...(getDesignSizeFromStorage() ?? DESIGN) },
  widgets2D: []
})

/** 为 true 时，导出/预览会在 localStorage `EDITOR_3D_DRAFT` 有值时合并 widgets3D / scene3D（由 Editor3D「保存草稿」写入） */
const enable3DMerge = ref(loadEnable3DMergeFromStorage())
watch(enable3DMerge, (v) => saveEnable3DMergeToStorage(v))

/** 仅当 `isDebugEnabled()` 时输出合并过程的详细日志 */
function logMerge3DDraft(draft: DashboardConfig | null, merged: DashboardConfig | null, plain: DashboardConfig): void {
  if (!isDebugEnabled()) return
  const tag = '[Editor2D][merge3D]'
  let rawLen = 0
  let rawPreview = ''
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(EDITOR_3D_DRAFT_KEY)
      rawLen = raw?.length ?? 0
      rawPreview = raw ? raw.slice(0, 160) + (raw.length > 160 ? '…' : '') : ''
    } catch {
      rawLen = -1
    }
  }
  console.info(`${tag} enable3DMerge=${enable3DMerge.value} localStorage键=${EDITOR_3D_DRAFT_KEY} 原始字符串长度=${rawLen}`)

  if (!draft) {
    console.warn(
      `${tag} 解析后 draft 为空（可能 JSON 无效或键不存在）。请确认与 Editor3D 同源、且已点击「保存草稿」。`
    )
    return
  }

  const w3 = draft.widgets3D
  const summary = {
    design: draft.design,
    widgets3D条数: Array.isArray(w3) ? w3.length : '非数组',
    widgets3D摘要:
      Array.isArray(w3) && w3.length
        ? w3.map((w) => ({
            id: w.id,
            typeId: (w.props as Record<string, unknown> | undefined)?.typeId
          }))
        : [],
    hasScene3D: Boolean(draft.scene3D),
    scene3DKeys: draft.scene3D ? Object.keys(draft.scene3D) : [],
    background: draft.background,
    rawPreview
  }
  console.info(`${tag} 已读出 draft 摘要`, summary)

  if (merged) {
    console.info(`${tag} 合并结果`, {
      合并后widgets3D条数: merged.widgets3D?.length ?? 0,
      合并后hasScene3D: Boolean(merged.scene3D),
      合并后background: merged.background,
      合并前2D有backgroundLayer: Boolean(plain.backgroundLayer),
      合并后backgroundLayer: merged.backgroundLayer
    })
    try {
      console.log(`${tag}[debug] draft 完整对象`, draft)
      console.log(`${tag}[debug] merged 完整对象`, merged)
    } catch {
      // ignore
    }
  }
}

/** 最近一次 buildExportPayload 的合并结果，供导出/预览后显示侧栏提示 */
const lastMerge3DStats = ref<{ merged: boolean; widgets3DCount: number } | null>(null)

const mergeToast = ref<{ text: string; kind: 'ok' | 'warn' } | null>(null)
let mergeToastTimer: ReturnType<typeof setTimeout> | null = null

function showMergeToastFromStats(): void {
  if (mergeToastTimer) {
    clearTimeout(mergeToastTimer)
    mergeToastTimer = null
  }
  if (!enable3DMerge.value) {
    mergeToast.value = null
    return
  }
  const s = lastMerge3DStats.value
  if (!s) {
    mergeToast.value = null
    return
  }
  if (s.merged && s.widgets3DCount > 0) {
    mergeToast.value = { kind: 'ok', text: `已合并 3D 草稿（${s.widgets3DCount} 个实例）` }
  } else if (!s.merged) {
    mergeToast.value = { kind: 'warn', text: '未找到有效 3D 草稿，已仅使用当前 2D 配置' }
  } else {
    mergeToast.value = { kind: 'warn', text: '3D 草稿中无实例，已导出当前配置' }
  }
  mergeToastTimer = setTimeout(() => {
    mergeToast.value = null
    mergeToastTimer = null
  }, 5000)
}

function buildExportPayload(): DashboardConfig {
  const plain = JSON.parse(JSON.stringify(config)) as DashboardConfig
  const latestDatasource = loadDatasourceConfigFromStorage()
  datasourceCatalog.value = latestDatasource
  logEditor2DDatasourceState('export', latestDatasource)
  if (isDebugEnabled()) {
    console.info('[Editor2D] datasource merged on export', {
      count: latestDatasource.length,
      keys: latestDatasource.map((d) => d.key)
    })
  }
  plain.datasources = latestDatasource.map((ds) => ({ ...ds }))
  lastMerge3DStats.value = null
  if (!enable3DMerge.value) return plain

  const draft = loadEditor3DDraft()
  if (!draft) {
    lastMerge3DStats.value = { merged: false, widgets3DCount: 0 }
    logMerge3DDraft(null, null, plain)
    return plain
  }

  const merged = mergeDashboardWith3DDraft(plain, draft)
  lastMerge3DStats.value = { merged: true, widgets3DCount: merged.widgets3D?.length ?? 0 }
  logMerge3DDraft(draft, merged, plain)
  return merged
}

const showSizeDialog = ref(false)
/** 尺寸展示单位（仅展示，与对话框同步） */
const designSizeUnit = ref<'px' | 'cm' | 'm' | 'km'>('px')
function onSizeConfirm(payload: { width: number; height: number }) {
  config.design.width = payload.width
  config.design.height = payload.height
  saveDesignSizeToStorage(payload.width, payload.height)
}

const importConfigInputRef = ref<HTMLInputElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)
const selectedId = ref<string | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const canvasInnerRef = ref<HTMLElement | null>(null)
const liveCanvasVersion = ref(0)
let liveCanvasRO: ResizeObserver | null = null
const rulerTopRef = ref<HTMLElement | null>(null)
const rulerLeftRef = ref<HTMLElement | null>(null)

let dragItem: RegisteredWidgetDef | null = null


/** 设计稿尺寸（保证为有效整数，避免标尺除零或 NaN） */
const designSize = computed(() => {
  const w = Math.max(1, Math.floor(Number(config.design?.width) || DESIGN.width))
  const h = Math.max(1, Math.floor(Number(config.design?.height) || DESIGN.height))
  return { width: Number.isFinite(w) ? w : DESIGN.width, height: Number.isFinite(h) ? h : DESIGN.height }
})

/**
 * editor 预览缩放系数：
 * - 基于「画布实际像素 / 设计稿尺寸」计算
 * - 仅作用于 live 渲染层，用于让 px 字号/线宽观感更接近 runtime
 */
const editorLiveScale = computed(() => {
  // 依赖 liveCanvasVersion，确保 ResizeObserver 触发后重算
  liveCanvasVersion.value
  const wrap = canvasWrapRef.value
  const dw = designSize.value.width
  const dh = designSize.value.height
  if (!wrap || dw <= 0 || dh <= 0) return 1
  const sx = wrap.clientWidth / dw
  const sy = wrap.clientHeight / dh
  const s = Math.min(sx, sy)
  if (!Number.isFinite(s) || s <= 0) return 1
  return Math.max(0.1, s)
})

const widgetLiveInnerStyle = computed<Record<string, string>>(() => {
  const s = editorLiveScale.value
  if (Math.abs(s - 1) < 0.001) return {} as Record<string, string>
  return {
    transform: `scale(${s})`,
    transformOrigin: 'left top',
    width: `${100 / s}%`,
    height: `${100 / s}%`
  }
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

/**
 * 编辑器中的 ECharts（chart/glassChart）在容器尺寸变化时偶发不触发内部 resize。
 * 这里在关键尺寸变更时更新 key，确保重建并得到正确画布尺寸。
 */
function widgetLiveKey(w: WidgetConfig2D): string {
  if (w.type === 'chart' || w.type === 'glassChart') {
    return `${w.id}:${w.layout.width}x${w.layout.height}:v${liveCanvasVersion.value}`
  }
  return w.id
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
    const mod = await import('./editor_config.json')
    const loaded = mod.default as EditorConfig
    if (loaded?.registeredWidgets?.length) editorConfig.value = loaded
  } catch {
    // 使用 FALLBACK_WIDGETS
  }
  datasourceCatalog.value = loadDatasourceConfigFromStorage()
  logEditor2DDatasourceState('mounted', datasourceCatalog.value)
  if (isDebugEnabled()) {
    console.info('[Editor2D] datasource loaded from localStorage', {
      count: datasourceCatalog.value.length,
      keys: datasourceCatalog.value.map((d) => d.key)
    })
  }
  document.addEventListener('keydown', onEditorKeydown)
  const target = canvasInnerRef.value ?? canvasWrapRef.value
  if (target) {
    liveCanvasRO = new ResizeObserver(() => {
      liveCanvasVersion.value++
    })
    liveCanvasRO.observe(target)
  }
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
  if (isDebugEnabled()) {
    console.log('[Editor] 创建 widget 实例', {
    widget: { id: w.id, type: w.type, layout: w.layout },
    registeredWidget: { type: dragItem.type, label: dragItem.label, sampleImage: dragItem.sampleImage },
    resolvedSampleImageUrl: sampleImageUrl ?? '(空)'
  })
  }
  
  dragItem = null
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

function enumContainsValue(propDef: WidgetPropDef, value: unknown): boolean {
  const list = propDef.enum ?? []
  if (list.length === 0) return true
  if (propDef.type === 'number') {
    const n = Number(value)
    return list.some((e) => Number(e) === n)
  }
  return list.some((e) => String(e) === String(value ?? ''))
}

function selectDisplayString(w: WidgetConfig2D, propDef: WidgetPropDef): string {
  const v = getProp(w, propDef)
  return propDef.type === 'number' ? String(v ?? '') : String(v ?? '')
}

function onPropSelectChange(w: WidgetConfig2D, propDef: WidgetPropDef, raw: string) {
  if (propDef.type === 'number') {
    const n = Number(raw)
    setProp(w, propDef, Number.isFinite(n) ? n : propDef.default)
  } else {
    setProp(w, propDef, raw)
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

/** 实时渲染 props：默认 props + 当前实例 props（用于配置缺省时仍可正常渲染） */
function getWidgetLiveProps(w: WidgetConfig2D): Record<string, unknown> {
  return { ...getWidgetDefaultProps(w.type), ...(w.props ?? {}) }
}

function showWarnToast(text: string): void {
  if (mergeToastTimer) {
    clearTimeout(mergeToastTimer)
    mergeToastTimer = null
  }
  mergeToast.value = { kind: 'warn', text }
  mergeToastTimer = setTimeout(() => {
    mergeToast.value = null
    mergeToastTimer = null
  }, 3000)
}

function renameSelectedWidgetId(raw: string): void {
  const cur = selectedConfig.value
  if (!cur) return
  const next = String(raw ?? '').trim()
  if (!next) {
    showWarnToast('组件实例ID不能为空')
    return
  }
  if (next === cur.id) return
  if (config.widgets2D.some((w) => w !== cur && w.id === next)) {
    showWarnToast(`组件实例ID重复：${next}`)
    return
  }
  cur.id = next
  selectedId.value = next
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
  stopDatasourceProbeManual()
  if (datasourceProbeHintTimer) clearTimeout(datasourceProbeHintTimer)
  datasourceProbeHintTimer = null
  document.removeEventListener('keydown', onEditorKeydown)
  liveCanvasRO?.disconnect()
  liveCanvasRO = null
  if (mergeToastTimer) {
    clearTimeout(mergeToastTimer)
    mergeToastTimer = null
  }
})

function exportConfig() {
  const payload = buildExportPayload()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-config.json'
  a.click()
  URL.revokeObjectURL(url)
  showMergeToastFromStats()
}

function previewDashboard() {
  try {
    const plain = buildExportPayload()
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(plain))
  } catch {
    // ignore
  }
  showMergeToastFromStats()
  const href = router.resolve({ name: 'configurable', query: { source: 'local' } }).href
  window.open(href, '_blank', 'noopener')
}

function cloneDashboardDeep<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/** 运行时 layoutUnit=percent 时，将 2D layout 转回设计稿 px，供画布与拖拽使用 */
function dashboardPercentLayoutsToDesignPx(cfg: DashboardConfig): DashboardConfig {
  const dw = Math.max(1, Math.floor(Number(cfg.design?.width) || DESIGN.width))
  const dh = Math.max(1, Math.floor(Number(cfg.design?.height) || DESIGN.height))
  const widgets2D = cfg.widgets2D.map((w) => {
    const ly = w.layout
    if (!ly) return w
    return {
      ...w,
      layout: {
        x: (Number(ly.x) / 100) * dw,
        y: (Number(ly.y) / 100) * dh,
        width: (Number(ly.width) / 100) * dw,
        height: (Number(ly.height) / 100) * dh
      }
    }
  })
  return { ...cfg, widgets2D, layoutUnit: 'px' }
}

function parseImportedDashboardJson(raw: string): DashboardConfig | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    alert('JSON 解析失败')
    return null
  }
  if (!data || typeof data !== 'object') {
    alert('配置文件格式无效')
    return null
  }
  const o = data as Record<string, unknown>
  const design = o.design
  const widgets2D = o.widgets2D
  if (!design || typeof design !== 'object') {
    alert('需包含 design 对象')
    return null
  }
  const d = design as Record<string, unknown>
  if (typeof d.width !== 'number' || typeof d.height !== 'number') {
    alert('design 需包含数字类型的 width、height')
    return null
  }
  if (!Array.isArray(widgets2D)) {
    alert('需包含 widgets2D 数组')
    return null
  }
  return data as DashboardConfig
}

function applyDashboardImport(parsed: DashboardConfig): void {
  const base = cloneDashboardDeep(parsed)
  const normalized =
    base.layoutUnit === 'percent' ? dashboardPercentLayoutsToDesignPx(base) : base

  setDebugFromConfig(normalized.debug ?? false)

  config.design = {
    width: Math.max(1, Math.floor(Number(normalized.design.width) || DESIGN.width)),
    height: Math.max(1, Math.floor(Number(normalized.design.height) || DESIGN.height))
  }
  saveDesignSizeToStorage(config.design.width, config.design.height)

  config.widgets2D = normalized.widgets2D.map((w) => cloneDashboardDeep(w))

  const c = config as Record<string, unknown>
  const setOrDel = (key: keyof DashboardConfig) => {
    const v = normalized[key]
    if (v !== undefined) {
      c[key as string] = cloneDashboardDeep(v)
    } else {
      delete c[key as string]
    }
  }

  setOrDel('background')
  setOrDel('backgroundLayer')
  setOrDel('widgets3D')
  setOrDel('scene3D')
  setOrDel('theme')
  setOrDel('datasources')
  setOrDel('layoutUnit')
  setOrDel('debug')

  selectedId.value = config.widgets2D[0]?.id ?? null
}

function triggerImportConfig() {
  importConfigInputRef.value?.click()
}

function onImportConfigChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parseImportedDashboardJson(text)
      if (!parsed) return
      applyDashboardImport(parsed)
    } catch (err) {
      alert('导入失败：' + (err instanceof Error ? err.message : String(err)))
    }
  }
  reader.onerror = () => alert('读取文件失败')
  reader.readAsText(file, 'utf-8')
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
.panelx-editor-merge-3d {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  color: #333;
}
.panelx-editor-merge-3d-hint {
  font-size: 0.65rem;
  color: #888;
  margin: 0 0 0.5rem 0;
  line-height: 1.35;
}
.panelx-editor-merge-toast {
  font-size: 0.75rem;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
  line-height: 1.35;
  background: #ecfdf5;
  color: #065f46;
  border: 0.0625rem solid #a7f3d0;
}
.panelx-editor-merge-toast--warn {
  background: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
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
.panelx-editor-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
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
.panelx-editor-widgets-layer {
  z-index: 2;
}
.panelx-editor-widgets-live-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 1;
}
.panelx-editor-widget-live {
  position: absolute;
  left: 0;
  top: 0;
  right: auto;
  bottom: auto;
}
.panelx-editor-widget-live-inner {
  width: 100%;
  height: 100%;
}
.panelx-editor-widget-live :deep(*) {
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
  background: transparent;
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
  display: none;
}
.panelx-editor-placeholder-default {
  display: none;
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
.panelx-editor-prop-key {
  margin-left: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #94a3b8;
  word-break: break-all;
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
