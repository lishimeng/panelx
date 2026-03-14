<template>
  <div class="panelx-demo" :class="{ 'panelx-demo-standalone-workshop': isStandaloneWorkshop, 'panelx-demo-standalone-configurable': isStandaloneConfigurable }">
    <header v-if="!isStandaloneWorkshop && !isStandaloneConfigurable" class="panelx-demo-header">
      <h1>PanelX 数字化大屏</h1>
      <nav>
        <button
          :class="{ active: view === 'editor' }"
          @click="view = 'editor'"
        >
          编辑器
        </button>
        <button
          class="panelx-demo-header-open"
          @click="openWorkshopTab()"
          title="新标签页打开（无顶部导航）"
        >
          车间大屏（新标签）
        </button>
        <button
          class="panelx-demo-header-open"
          @click="openConfigurableTab()"
          title="新标签页打开（无顶部导航）"
        >
          配置加载大屏
        </button>
      </nav>
    </header>
    <main class="panelx-demo-main">
      <Editor v-if="view === 'editor'" />
      <div
        v-else-if="view === 'workshop'"
        class="panelx-demo-screen panelx-demo-workshop"
        :style="{ background: workshopDemoConfig?.background ?? 'transparent' }"
      >
        <div class="panelx-dashboard-wrap">
          <Dashboard :config="workshopDemoConfig" :datasources="editorDatasources" />
        </div>
      </div>
      <div
        v-else-if="view === 'configurable'"
        class="panelx-demo-screen panelx-demo-configurable"
      >
        <DashboardWithLoader />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Editor } from './editor'
import { Dashboard, DashboardWithLoader } from './components'
import { convertDashboardConfigPxToPercent } from './core/size'
import type { DashboardConfig } from './types/dashboard'
import type { DataSourceConfig } from './types/comm'
import { setDebugFromConfig } from './utils/logManager'

const view = ref<'editor' | 'workshop' | 'configurable'>('editor')

/** 数据源列表（从 editor_config 加载），供大屏/车间视图的 Dashboard 绑定 widget */
const editorDatasources = ref<DataSourceConfig[]>([])
const isStandaloneWorkshop = ref(false)
const isStandaloneConfigurable = ref(false)

function openWorkshopTab() {
  const u = new URL(window.location.href)
  u.searchParams.set('workshop', '1')
  window.open(u.toString(), '_blank', 'noopener,noreferrer')
}

function openConfigurableTab() {
  const u = new URL(window.location.href)
  u.searchParams.set('configurable', '1')
  window.open(u.toString(), '_blank', 'noopener,noreferrer')
}

/** 车间大屏配置：先空白，由异步加载 JSON（模拟 API）填充 */
const workshopBaseConfig = ref<DashboardConfig>({
  design: { width: 2560, height: 1080 },
  widgets2D: []
})

/** 模拟 API：异步加载车间大屏 JSON 配置；加载后立刻将 layout 从 px 转为 percent，并同步 debug 到 localStorage */
async function loadWorkshopConfig() {
  const mod = await import('./demo/dashboard_config.json')
  const base = mod.default as unknown as DashboardConfig
  setDebugFromConfig(base.debug ?? false)
  workshopBaseConfig.value = convertDashboardConfigPxToPercent({ ...base } as DashboardConfig)
}

/** TopBar 业务数据：时间、温湿度 */
const topBarDateTime = ref('')
const topBarTemperature = ref('25℃')
const topBarHumidity = ref('50%rh')

const WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function formatTopBarTime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const week = WEEK_NAMES[d.getDay()]
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${week} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 单独函数刷新 TopBar 显示（时间每 2.3 秒调用） */
function refreshTopBar() {
  topBarDateTime.value = formatTopBarTime()
  // 温湿度可由外部 API 更新后写入 topBarTemperature / topBarHumidity
}

let topBarRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const mod = await import('./editor/editor_config.json')
    const loaded = mod.default as { datasources?: DataSourceConfig[] }
    if (loaded?.datasources?.length) editorDatasources.value = loaded.datasources
  } catch {
    // ignore
  }
  const u = new URL(window.location.href)
  if (u.searchParams.get('workshop') === '1') {
    isStandaloneWorkshop.value = true
    view.value = 'workshop'
    if (typeof document !== 'undefined') document.title = '水溶膜工车间数字化大屏'
    loadWorkshopConfig()
  } else if (u.searchParams.get('configurable') === '1') {
    isStandaloneConfigurable.value = true
    view.value = 'configurable'
    if (typeof document !== 'undefined') document.title = '配置加载大屏'
  }
  refreshTopBar()
  topBarRefreshTimer = setInterval(refreshTopBar, 2300)
})

onUnmounted(() => {
  if (topBarRefreshTimer) {
    clearInterval(topBarRefreshTimer)
    topBarRefreshTimer = null
  }
})

/** 车间大屏展示用配置：在 base 上注入 TopBar 时间/温湿度 */
const workshopDemoConfig = computed<DashboardConfig>(() => {
  const base = workshopBaseConfig.value
  return {
    ...base,
    widgets2D: base.widgets2D.map((w) =>
      w.id === 'ws-topbar'
        ? { ...w, props: { ...w.props, datetime: topBarDateTime.value, temperature: topBarTemperature.value, humidity: topBarHumidity.value } }
        : w
    )
  }
})
</script>

<style>
body {
  background: #1a1a2e;
}
.panelx-demo {
  min-height: 100vh;
  max-height: 100vh;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.panelx-demo-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #1a1a2e;
  color: #eee;
  min-width: 0;
}
.panelx-demo-header-open {
  border-style: dashed;
  opacity: 0.9;
}
.panelx-demo-header h1 {
  margin: 0;
  font-size: 1.25rem;
}
.panelx-demo-header nav {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.panelx-demo-header button {
  padding: 0.5rem 1rem;
  border: 0.0625rem solid rgba(255,255,255,0.3);
  border-radius: 0.375rem;
  background: transparent;
  color: #eee;
  cursor: pointer;
}
.panelx-demo-header button.active {
  background: #1890ff;
  border-color: #1890ff;
}
.panelx-demo-main {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-width: 100%;
}
.panelx-demo-screen {
  flex: 1;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  background: #1a1a2e;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}
.panelx-demo-workshop {
  /* 背景由 config.background 控制，默认透明，见模板 :style */
  padding: 0;
  align-items: stretch;
  justify-content: stretch;
}
.panelx-demo-configurable {
  padding: 0;
  align-items: stretch;
  justify-content: stretch;
}
.panelx-demo-configurable .panelx-dashboard-with-loader {
  width: 100%;
  height: 100%;
}
.panelx-demo-screen .panelx-dashboard-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
}
.panelx-demo-workshop .panelx-dashboard-wrap {
  align-items: flex-start;
  justify-content: center;
}
/* 独立 Tab 车间大屏：整页占满视口，无 header */
.panelx-demo-standalone-workshop {
  height: 100vh;
  overflow: hidden;
}
.panelx-demo-standalone-workshop .panelx-demo-main {
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}
.panelx-demo-standalone-workshop .panelx-demo-screen.panelx-demo-workshop {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.panelx-demo-standalone-workshop .panelx-dashboard-wrap {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* 独立 Tab 配置加载大屏：整页占满视口，无 header */
.panelx-demo-standalone-configurable {
  height: 100vh;
  overflow: hidden;
}
.panelx-demo-standalone-configurable .panelx-demo-main {
  height: 100vh;
  min-height: 0;
  overflow: hidden;
}
.panelx-demo-standalone-configurable .panelx-demo-screen.panelx-demo-configurable {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.panelx-demo-standalone-configurable .panelx-dashboard-with-loader {
  width: 100%;
  height: 100%;
}
</style>
