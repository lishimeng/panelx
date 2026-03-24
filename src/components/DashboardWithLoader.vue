<template>
  <div class="panelx-dashboard-with-loader">
    <template v-if="!configLoaded">
      <div class="panelx-dashboard-with-loader-blank">
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,application/json"
          class="panelx-dashboard-with-loader-input"
          @change="onFileChange"
        />
        <button
          type="button"
          class="panelx-dashboard-with-loader-btn"
          @click="triggerFileSelect"
        >
          加载配置
        </button>
        <div v-if="loadFrom === 'localStorage'" class="panelx-dashboard-with-loader-hint">
          未从本地读取到配置，请回到编辑器点击“预览”。
        </div>
      </div>
    </template>
    <div v-else class="panelx-dashboard-with-loader-wrap">
      <Dashboard ref="dashboardRef" :config="runtimeConfig" :datasources="editorDatasources" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Dashboard from './Dashboard.vue'
import { convertDashboardConfigPxToPercent } from '../core/size'
import { setDebugFromConfig } from '../utils/logManager'
import type { DashboardConfig } from '../types/dashboard'
import type { DataSourceConfig } from '../types/comm'
import type { CommandRequest, PropertyRequest } from '../types'

const props = withDefaults(
  defineProps<{
    /** file=手动选择配置文件；localStorage=从 localStorage 读取 */
    loadFrom?: 'file' | 'localStorage'
    /** localStorage key（loadFrom=localStorage 时使用） */
    storageKey?: string
  }>(),
  { loadFrom: 'file', storageKey: 'PanelX_EDITOR_PREVIEW_CONFIG' }
)

const loadFrom = computed(() => props.loadFrom ?? 'file')

const configLoaded = ref(false)
/** 数据源列表（从 editor_config 加载），供绑定 datasourceKey 的 widget 使用 */
const editorDatasources = ref<DataSourceConfig[]>([])

onMounted(async () => {
  try {
    const mod = await import('../editor/editor_config.json')
    const loaded = mod.default as { datasources?: DataSourceConfig[] }
    if (loaded?.datasources?.length) editorDatasources.value = loaded.datasources
  } catch {
    // 无 editor_config 时无数据源
  }

  if (loadFrom.value === 'localStorage') {
    const cfg = readConfigFromLocalStorage(props.storageKey)
    if (cfg) applyConfig(cfg)
  }
})
const dashboardConfig = ref<DashboardConfig>({
  design: { width: 1920, height: 1080 },
  widgets2D: []
})

const dashboardRef = ref<any>(null)

const fileInputRef = ref<HTMLInputElement | null>(null)

/** 预留：可由外部或默认流程调用的加载车间/大屏配置 */
function loadWorkshopConfig() {
  // 预留：例如从 API 或默认 JSON 加载后调用 applyConfig(result)
}

/** 用户选择文件后初始化 dashboard */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const raw = typeof reader.result === 'string' ? reader.result : ''
      const data = JSON.parse(raw) as unknown
      if (!data || typeof data !== 'object') {
        alert('配置文件格式无效')
        return
      }
      const design = (data as Record<string, unknown>).design
      const widgets2D = (data as Record<string, unknown>).widgets2D
      if (!design || !Array.isArray(widgets2D)) {
        alert('配置文件需包含 design 与 widgets2D')
        return
      }
      applyConfig(data as DashboardConfig)
    } catch (err) {
      alert('解析配置文件失败：' + (err instanceof Error ? err.message : String(err)))
    }
    input.value = ''
  }
  reader.readAsText(file, 'utf-8')
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

/** 应用配置并完成初始化（widget + 3D）；同步 config.debug 到 localStorage 以控制全局日志 */
function applyConfig(config: DashboardConfig) {
  setDebugFromConfig(config.debug ?? false)
  dashboardConfig.value = config
  configLoaded.value = true
}

function readConfigFromLocalStorage(key: string | undefined): DashboardConfig | null {
  if (typeof localStorage === 'undefined') return null
  const k = key && key.trim() ? key.trim() : 'PanelX_EDITOR_PREVIEW_CONFIG'
  try {
    const raw = localStorage.getItem(k)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const design = (data as Record<string, unknown>).design
    const widgets2D = (data as Record<string, unknown>).widgets2D
    if (!design || !Array.isArray(widgets2D)) return null
    return data as DashboardConfig
  } catch {
    return null
  }
}

/** 渲染用：将配置转为 percent，与现有 Dashboard 一致 */
const runtimeConfig = computed(() =>
  convertDashboardConfigPxToPercent({ ...dashboardConfig.value })
)

defineExpose({
  loadWorkshopConfig,
  configLoaded,
  applyConfig,
  executeCommand: (req: CommandRequest) => dashboardRef.value?.executeCommand?.(req),
  executeProperty: (req: PropertyRequest) => dashboardRef.value?.executeProperty?.(req)
})
</script>

<style scoped>
.panelx-dashboard-with-loader {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panelx-dashboard-with-loader-blank {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 20rem;
  background: rgba(0, 0, 0, 0.2);
}

.panelx-dashboard-with-loader-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.panelx-dashboard-with-loader-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: 0.125rem solid rgba(255, 255, 255, 0.5);
  border-radius: 0.5rem;
  background: transparent;
  color: #eee;
  cursor: pointer;
}

.panelx-dashboard-with-loader-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.8);
}
.panelx-dashboard-with-loader-hint {
  margin-left: 1rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.875rem;
}

.panelx-dashboard-with-loader-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
