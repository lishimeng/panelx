<template>
  <div class="panelx-demo" :class="{ 'panelx-demo-standalone-workshop': isStandaloneWorkshop }">
    <header v-if="!isStandaloneWorkshop" class="panelx-demo-header">
      <h1>PanelX 数字化大屏</h1>
      <nav>
        <button
          :class="{ active: view === 'editor' }"
          @click="view = 'editor'"
        >
          编辑器
        </button>
        <button
          :class="{ active: view === 'screen' }"
          @click="view = 'screen'"
        >
          大屏预览
        </button>
        <button
          :class="{ active: view === 'scene3d' }"
          @click="view = 'scene3d'"
        >
          3D 框架
        </button>
        <button
          class="panelx-demo-header-open"
          @click="openWorkshopTab()"
          title="新标签页打开（无顶部导航）"
        >
          车间大屏（新标签）
        </button>
        <button
          :class="{ active: view === 'verify' }"
          @click="view = 'verify'"
        >
          演示验证
        </button>
      </nav>
    </header>
    <main class="panelx-demo-main">
      <Editor v-if="view === 'editor'" />
      <div v-else-if="view === 'screen'" class="panelx-demo-screen">
        <div class="panelx-dashboard-wrap">
          <Dashboard :config="demoConfigRuntime" />
        </div>
      </div>
      <div v-else-if="view === 'workshop'" class="panelx-demo-screen panelx-demo-workshop">
        <div class="panelx-dashboard-wrap">
          <Dashboard :config="workshopDemoConfig" />
        </div>
      </div>
      <div v-else-if="view === 'scene3d'" class="panelx-demo-scene3d">
        <Scene3DFramework :config="scene3DConfig" />
      </div>
      <VerifyDemo v-else class="panelx-demo-verify" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Editor } from './editor'
import { Dashboard, Scene3DFramework } from './components'
import { VerifyDemo } from './demo'
import { LayerDef } from './framework'
import { convertDashboardConfigPxToPercent } from './core/size'
import type { DashboardConfig, Scene3DConfig } from './types/dashboard'

const view = ref<'editor' | 'screen' | 'scene3d' | 'workshop' | 'verify'>('editor')
const isStandaloneWorkshop = ref(false)

function openWorkshopTab() {
  const u = new URL(window.location.href)
  u.searchParams.set('workshop', '1')
  window.open(u.toString(), '_blank', 'noopener,noreferrer')
}

/** 车间大屏配置：先空白，由异步加载 JSON（模拟 API）填充 */
const workshopBaseConfig = ref<DashboardConfig>({
  design: { width: 2560, height: 1080 },
  widgets2D: []
})

/** 模拟 API：异步加载车间大屏 JSON 配置；加载后立刻将 layout 从 px 转为 percent，系统内不再使用 px */
async function loadWorkshopConfig() {
  const mod = await import('./demo/dashboard_config.json')
  const base = mod.default as unknown as DashboardConfig
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

onMounted(() => {
  const u = new URL(window.location.href)
  if (u.searchParams.get('workshop') === '1') {
    isStandaloneWorkshop.value = true
    view.value = 'workshop'
    if (typeof document !== 'undefined') document.title = '晶圆加工车间可视化大屏'
    loadWorkshopConfig()
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

/** 3D 场景配置：模型列表等（参考 widgets2D 的配置方式） */
const scene3DConfig: Scene3DConfig = {
  statsStyle: 2,
  // background: 0xeeeeee,
  /** 仅 ambient 时很多 GLB（PBR 材质）会发黑，需配合 hemisphere/point 才有明暗 */
  lights: {
    ambient: 100.5,
    hemisphere: 100,
    point: 300
  },
  camera: {
    type: 'orthographic',
    /** 相机图层显示配置，不填则默认仅 layer=0 可见 */
    layers: [
      { layer: LayerDef.default, enable: true },
      { layer: LayerDef.helper, enable: false },
    ],
  },
  models: [
    {
      id: 'ProductLine-1',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [-0.75-1.5, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-2',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [-0.75-1.5*2, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-3',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [-0.75-1.5*3, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-4',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [-0.75, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-5',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [0.75, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-6',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [0.75+1.5, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-7',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [0.75+1.5*2, 0.5, 0],
      scale: 5,
    },
    {
      id: 'ProductLine-8',
      source: '/product-line.glb',
      format: 'gltf',
      visible: true,
      position: [0.75+1.5*3, 0.5, 0],
      scale: 5,
    }
  ]
}

const demoConfig: DashboardConfig = {
  design: { width: 2560, height: 1080 },
  // 第 1 层：背景层（可选）。不填则无背景；也可用 type: 'image', url: '...'
  backgroundLayer: {
    type: 'scene3d',
    config: scene3DConfig
  },
  // 第 2 层：内容层（图表、统计等，透明背景）
  widgets2D: [
    {
      id: 's1',
      type: 'stat',
      layout: { x: 40, y: 40, width: 280, height: 100 },
      visible: true,
      props: { value: 123456, label: '总销售额', prefix: '¥', trend: 'up', trendValue: '12.5%' }
    },
    {
      id: 's2',
      type: 'stat',
      layout: { x: 340, y: 40, width: 280, height: 100 },
      visible: true,
      props: { value: 7890, label: '订单数', trend: 'up', trendValue: '8.3%' }
    },
    {
      id: 'c1',
      type: 'chart',
      layout: { x: 40, y: 160, width: 580, height: 360 },
      visible: true,
      props: {
        theme: 'macaron',
        options: {
          xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
          yAxis: { type: 'value' },
          series: [{ data: [120, 132, 101, 134, 90, 230], type: 'line', smooth: true }]
        },
        height: '100%',
        width: '100%'
      }
    },
    /** 马卡龙主题 + 圆角 测试：柱状图、饼图、折线（theme 默认 macaron，圆角由 Chart 统一合并） */
    {
      id: 'chart-style-test',
      type: 'glassChart',
      layout: { x: 640, y: 160, width: 420, height: 320 },
      visible: true,
      props: {
        title: '图表样式测试',
        subTitle: 'MACARON + ROUND',
        chartHeight: '15rem',
        theme: 'macaron',
        options: {
          tooltip: { trigger: 'axis' },
          grid: { left: 48, right: 24, top: 24, bottom: 48 },
          xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
          yAxis: { type: 'value' },
          series: [
            { name: '销量', data: [35, 62, 48, 88, 56], type: 'bar' },
            { name: '趋势', data: [30, 55, 70, 65, 90], type: 'line' }
          ]
        }
      }
    },
    {
      id: 'd1',
      type: 'decoration',
      layout: { x: 1080, y: 160, width: 220, height: 140 },
      visible: true,
      props: { variant: 'corner' }
    }
  ]
}

/** 大屏预览用配置：加载后立刻转为 percent，不再使用 px */
const demoConfigRuntime = computed(() => convertDashboardConfigPxToPercent({ ...demoConfig }))

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
  background: #0a1628;
  padding: 0;
  align-items: stretch;
  justify-content: stretch;
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
.panelx-demo-scene3d {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  position: relative;
  background: #0d0d12;
}
.panelx-demo-verify {
  height: 100%;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
}
</style>
