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
          <Dashboard :config="demoConfig" />
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
import type { DashboardConfig, Scene3DConfig } from './types/dashboard'

const view = ref<'editor' | 'screen' | 'scene3d' | 'workshop' | 'verify'>('editor')
const isStandaloneWorkshop = ref(false)

function openWorkshopTab() {
  const u = new URL(window.location.href)
  u.searchParams.set('workshop', '1')
  // 避免保留原来的 view 状态（可选），统一由参数决定
  window.open(u.toString(), '_blank', 'noopener,noreferrer')
}

/** TopBar 业务数据：时间每 2.3 秒刷新，温湿度由外部传入 */
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

let topBarRefreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const u = new URL(window.location.href)
  if (u.searchParams.get('workshop') === '1') {
    isStandaloneWorkshop.value = true
    view.value = 'workshop'
    if (typeof document !== 'undefined') document.title = '晶圆加工车间可视化大屏'
  }
  topBarDateTime.value = formatTopBarTime()
  topBarRefreshTimer = setInterval(() => {
    topBarDateTime.value = formatTopBarTime()
  }, 2300)
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
    hemisphere: 50,
    point: 100
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
      id: 'd1',
      type: 'decoration',
      layout: { x: 640, y: 160, width: 220, height: 140 },
      visible: true,
      props: { variant: 'corner' }
    }
  ]
}

/** 车间大屏 demo：仿晶圆加工车间可视化（3D 背景 + 玻璃面板图表） */
const workshopSceneConfig: Scene3DConfig = {
  ...scene3DConfig,
  statsStyle: 0,
  background: 0x0d1b2a
}

const left = 1
const right = 1500
const widgetWidth = 400
const widgetHeight = 260

// 车间大屏 layout：设计稿 1920×1080；TopBar 时间/温湿度由上方 ref 注入，时间每 2.3s 刷新
const workshopWidgetsBase: DashboardConfig['widgets2D'] = [
    { id: 'ws-title', type: 'screenTitle', layout: { x: 0, y: 0, width: 1920, height: 120 }, visible: true, props: { text: '水溶膜加工车间数字化大屏' } },
    { id: 'ws-topbar', type: 'topBar', layout: { x: 0, y: 20, width: 1920, height: 40 }, visible: true, props: { datetime: '', temperature: '25℃', humidity: '50%rh' } },
    // left side
    { id: 'ws-order', type: 'glassChart', layout: { x: left, y: 120, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '订单总览', subTitle: 'ORDER REVIEW', chartHeight: '175px', options: { tooltip: { trigger: 'item' }, graphic: [{ type: 'text', left: 'center', top: '48%', style: { text: '17.05%', fill: '#00d4ff', fontSize: 18, fontWeight: 'bold' } }, { type: 'text', left: 'center', top: '58%', style: { text: '已完成 10000 订单', fill: 'rgba(255,255,255,0.85)', fontSize: 11 } }], series: [{ type: 'pie', radius: ['52%', '74%'], center: ['50%', '50%'], data: [{ value: 17.05, name: '已完成', itemStyle: { color: '#00d4ff' } }, { value: 82.95, name: '进行中', itemStyle: { color: 'rgba(0,212,255,0.2)' } }], label: { show: false } }] } } },
    { id: 'ws-staff', type: 'glassChart', layout: { x: left, y: 390, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '在岗人员设备情况', subTitle: 'PERSONNEL EQUIPMENT', chartHeight: '198px', options: { grid: { left: 44, right: 24, top: 28, bottom: 36 }, xAxis: { type: 'category', data: ['FTN', 'CVD', 'FGQ', 'FVD', 'AQI'], axisLine: { lineStyle: { color: 'rgba(0,212,255,0.4)' } }, axisLabel: { color: '#fff', fontSize: 11 } }, yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } }, axisLabel: { color: 'rgba(255,255,255,0.8)' } }, legend: { bottom: 0, textStyle: { color: '#fff', fontSize: 10 }, data: ['A班次', 'B班次'] }, series: [{ name: 'A班次', data: [92, 88, 95, 78, 85], type: 'bar', itemStyle: { color: '#00d4ff' } }, { name: 'B班次', data: [85, 90, 88, 82, 88], type: 'bar', itemStyle: { color: 'rgba(0,212,255,0.5)' } }] } } },
    { id: 'ws-capacity', type: 'progressList', layout: { x: left, y: 660, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '产线生产进度', subTitle: 'PRODUCTION PROGRESS', items: [{ label: '产线一', value: '10000', percent: 53.33 }, { label: '产线二', value: '12000', percent: 82.5 }, { label: '产线三', value: '9800', percent: 48.2 }, { label: '产线四', value: '17284', percent: 86.1 }] } },
    // right side
    { id: 'ws-cycle', type: 'glassChart', layout: { x: right, y: 120, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '生产周期', subTitle: 'PRODUCTION CYCLE · 4班次', chartHeight: '140px', options: { grid: { left: 48, right: 48, top: 24, bottom: 24 }, xAxis: { type: 'category', data: ['1#', '2#', '3#', '4#', '5#', '6#'], axisLabel: { color: '#fff' }, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.4)' } } }, yAxis: { type: 'value', show: false }, series: [{ data: [51, 54, 50, 55, 53, 52], type: 'bar', itemStyle: { color: '#00d4ff' }, label: { show: true, position: 'top', color: '#fff', formatter: '{c} min' } }] } } },
    { id: 'ws-yield', type: 'glassChart', layout: { x: right, y: 390, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '良品合格率', chartHeight: '160px', options: { grid: { left: 44, right: 24, top: 24, bottom: 36 }, xAxis: { type: 'category', data: ['FVD', 'CVD', 'AQI', 'FGQ'], axisLine: { lineStyle: { color: 'rgba(0,212,255,0.4)' } }, axisLabel: { color: '#fff' } }, yAxis: { type: 'value', axisLabel: { color: 'rgba(255,255,255,0.8)' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } } }, legend: { bottom: 0, textStyle: { color: '#fff', fontSize: 10 }, data: ['A班次', 'B班次'] }, series: [{ name: 'A班次', data: [98.2, 97.5, 99.0, 98.6], type: 'bar', itemStyle: { color: '#00d4ff' } }, { name: 'B班次', data: [97.8, 98.2, 98.5, 97.9], type: 'bar', itemStyle: { color: 'rgba(0,212,255,0.5)' } }] } } },
    { id: 'ws-rate', type: 'glassChart', layout: { x: right, y: 660, width: widgetWidth, height: widgetHeight }, visible: true, props: { title: '近7日交付合格率', subTitle: 'DELIVERY QUALIFICATION RATE', chartHeight: '178px', options: { grid: { left: 44, right: 24, top: 28, bottom: 36 }, xAxis: { type: 'category', data: ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07'], axisLine: { lineStyle: { color: 'rgba(0,212,255,0.4)' } }, axisLabel: { color: '#fff', fontSize: 10 } }, yAxis: { type: 'value', axisLabel: { color: 'rgba(255,255,255,0.8)' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } } }, legend: { bottom: 0, textStyle: { color: '#fff', fontSize: 10 }, data: ['A班次', 'B班次', 'C班次'] }, series: [{ name: 'A班次', data: [98.2, 98.5, 97.8, 99.0, 98.6, 99.2, 98.8], type: 'line', smooth: true, lineStyle: { color: '#00d4ff' }, itemStyle: { color: '#00d4ff' } }, { name: 'B班次', data: [97.5, 98.0, 98.2, 98.5, 97.9, 98.4, 99.0], type: 'line', smooth: true, lineStyle: { color: 'rgba(0,212,255,0.7)' }, itemStyle: { color: 'rgba(0,212,255,0.7)' } }, { name: 'C班次', data: [98.0, 97.8, 98.5, 98.2, 98.8, 98.0, 98.5], type: 'line', smooth: true, lineStyle: { color: 'rgba(0,212,255,0.5)' }, itemStyle: { color: 'rgba(0,212,255,0.5)' } }] } } },
    { id: 'ws-output', type: 'glassChart', layout: { x: right-450*3-150, y: 760, width: widgetWidth*4.5, height: widgetHeight }, visible: true, props: { title: '近7日产品产量', chartHeight: '160px', options: { grid: { left: 44, right: 24, top: 24, bottom: 36 }, xAxis: { type: 'category', data: ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07'], axisLine: { lineStyle: { color: 'rgba(0,212,255,0.4)' } }, axisLabel: { color: '#fff', fontSize: 10 } }, yAxis: { type: 'value', axisLabel: { color: 'rgba(255,255,255,0.8)' }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } } }, legend: { bottom: 0, textStyle: { color: '#fff', fontSize: 10 }, data: ['A班次', 'B班次', 'C班次'] }, series: [{ name: 'A班次', data: [3200, 3500, 3100, 3800, 3600, 3400, 3700], type: 'line', smooth: true, lineStyle: { color: '#00d4ff' }, itemStyle: { color: '#00d4ff' }, areaStyle: { color: 'rgba(0,212,255,0.15)' } }, { name: 'B班次', data: [2800, 3200, 3300, 2900, 3500, 3200, 3400], type: 'line', smooth: true, lineStyle: { color: 'rgba(0,212,255,0.7)' }, itemStyle: { color: 'rgba(0,212,255,0.7)' }, areaStyle: { color: 'rgba(0,212,255,0.08)' } }, { name: 'C班次', data: [3000, 3100, 3400, 3200, 3300, 3500, 3600], type: 'line', smooth: true, lineStyle: { color: 'rgba(0,212,255,0.5)' }, itemStyle: { color: 'rgba(0,212,255,0.5)' }, areaStyle: { color: 'rgba(0,212,255,0.06)' } }] } } },
    // device card
    { id: 'ws-device', type: 'deviceCard', layout: { x: 1200, y: 360, width: 200, height: 170 }, visible: true, props: { items: [{ label: '设备编号', value: 'KS002', icon: '▸' }, { label: '所属产线', value: '产线四', icon: '▸' }, { label: '当前执行工单', value: 'GD000002', icon: '▸' }, { label: '当日产量', value: '17284 片', icon: '▸' }, { label: '设备OEE', value: '75%', icon: '▸' }] } },
    // bottom nav
    { id: 'ws-nav', type: 'bottomNav', layout: { x: 0, y: 952, width: 1920, height: 88 }, visible: true, props: { items: [{ label: '全屏总览', active: true }, { label: '设备监控' }, { label: '故障监控' }] } }
  ]

const workshopDemoConfig = computed<DashboardConfig>(() => ({
  design: { width: 1920, height: 1080 },
  backgroundLayer: { type: 'scene3d', config: workshopSceneConfig },
  widgets2D: workshopWidgetsBase.map((w) =>
    w.id === 'ws-topbar'
      ? { ...w, props: { ...w.props, datetime: topBarDateTime.value, temperature: topBarTemperature.value, humidity: topBarHumidity.value } }
      : w
  )
}))
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
  padding: 12px 24px;
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
  gap: 8px;
  flex-shrink: 0;
}
.panelx-demo-header button {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
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
  padding: 24px;
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
}
.panelx-demo-standalone-workshop .panelx-demo-main {
  height: 100%;
  flex: 1;
  min-height: 0;
}
.panelx-demo-standalone-workshop .panelx-demo-screen.panelx-demo-workshop {
  height: 100%;
}
.panelx-demo-standalone-workshop .panelx-dashboard-wrap {
  height: 100%;
  align-items: flex-start;
  justify-content: center;
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
