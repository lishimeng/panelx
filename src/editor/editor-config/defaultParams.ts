import type { EditorConfig } from '../../types/editor'

export const editorBuiltinDefaultParams: NonNullable<EditorConfig['widgetPropData']>['defaultParams'] = {
  stat: { value: 0, label: '指标' },
  chart: {
    seriesType: 'bar',
    options: { xAxis: { type: 'category', data: ['A', 'B', 'C'] }, yAxis: { type: 'value' }, series: [{ data: [120, 200, 150] }] },
    height: '100%',
    width: '100%'
  },
  glassChart: {
    title: '图表',
    subTitle: 'CHART',
    titleFontSize: '0.75rem',
    subTitleFontSize: '0.5rem',
    tabColor: 'blue',
    showTab: false,
    panelOpacity: 0.75,
    panelBorderVisible: true,
    panelBorderOpacity: 0.6,
    panelShadowVisible: true,
    panelShadowOpacity: 1,
    seriesType: 'bar',
    options: { xAxis: { type: 'category', data: ['A', 'B', 'C'] }, yAxis: { type: 'value' }, series: [{ data: [120, 200, 150] }] }
  },
  textPanel2D: {
    title: '关于',
    subTitle: 'INTRODUCTION',
    titleFontSize: '0.75rem',
    subTitleFontSize: '0.5rem',
    bodyFontSize: '0.75rem',
    tabColor: 'cyan',
    showTab: true,
    panelOpacity: 0.75,
    panelBorderVisible: true,
    panelBorderOpacity: 0.6,
    panelShadowVisible: true,
    panelShadowOpacity: 1,
    sections: [{ content: '用于展示文字说明。|支持用 | 分行。|可用 [[高亮内容]] 标记关键字。' }]
  },
  tableChart: {
    title: '近期检修记录',
    subTitle: 'RECENT MAINTENANCE',
    titleFontSize: '0.75rem',
    subTitleFontSize: '0.5rem',
    tabColor: 'cyan',
    showTab: true,
    panelOpacity: 0.75,
    panelBorderVisible: true,
    panelBorderOpacity: 0.6,
    panelShadowVisible: true,
    panelShadowOpacity: 1,
    maxRows: 6,
    updateMode: 'replace',
    columns: [
      { key: 'levelName', title: '报警等级', width: '72px', align: 'left' },
      { key: 'part', title: '检修部位', width: 'auto', align: 'left' },
      { key: 'result', title: '处理结果', width: '84px', align: 'left' },
      { key: 'time', title: '检修时间', width: '92px', align: 'right' }
    ],
    rows: [
      { levelName: '一级', badgeColor: '#2584ff', part: 'XXXXXXX', result: '已处理', time: '2025.02.05' },
      { levelName: '二级', badgeColor: '#ff9535', part: 'XXXXXXX', result: '已处理', time: '2025.02.06' },
      { levelName: '三级', badgeColor: '#36cc85', part: 'XXXXXXX', result: '未处理', time: '2025.02.12' }
    ],
    badgeKey: 'levelName',
    badgeColorKey: 'badgeColor'
  },
  table: {
    columns: [{ key: 'name', title: '名称' }, { key: 'value', title: '数值' }],
    data: [{ name: '项目1', value: 100 }, { name: '项目2', value: 200 }]
  },
  card: { title: '卡片' },
  panel: { title: '面板' },
  decoration: { variant: 'corner' },
  deviceCard: { items: [{ label: '设备', value: '-', icon: '▸' }] },
  progressList: {
    title: '进度',
    subTitle: 'PROGRESS',
    titleFontSize: '0.75rem',
    subTitleFontSize: '0.5rem',
    tabColor: 'cyan',
    showTab: true,
    panelOpacity: 0.75,
    panelBorderVisible: true,
    panelBorderOpacity: 0.6,
    panelShadowVisible: true,
    panelShadowOpacity: 1,
    maxRows: 5,
    scrollIntervalMs: 1600,
    scrollDurationMs: 350,
    items: [{ label: '项1', value: '100', percent: 60 }, { label: '项2', value: '200', percent: 80 }]
  },
  screenTitle: {
    text: '大屏标题',
    borderVisible: false,
    borderColor: '#ff4d4f',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
    titleFontSize: '3rem'
  },
  topBarTime: { background: 'transparent', fontSize: 'clamp(0.625rem, 58.33cqh, 1.75rem)' },
  topBarClimate: {
    temperature: '25℃',
    humidity: '50%rh',
    background: 'transparent',
    fontSize: 'clamp(0.625rem, 58.33cqh, 1.75rem)'
  },
  topBar: { datetime: '', temperature: '25℃', humidity: '50%rh', background: 'transparent' },
  bottomNav: { items: [{ label: '首页', icon: '▸', active: true }, { label: '数据', icon: '' }] },
  infoBox2D: {
    title: 'INFO BOX',
    subtitle: 'SUBTITLE',
    metaLeft: 'LEFT',
    metaRight: 'RIGHT',
    content: '内容1|内容2',
    note: 'Note',
    colorPreset: 'cyan',
    fx: 'scanlines'
  },
  heatmap2d: {
    title: '热力分布',
    data: [
      [0, 0.25, 0.5, 0.75, 1],
      [0.2, 0.4, 0.6, 0.8, 1],
      [0.1, 0.3, 0.5, 0.7, 0.9]
    ],
    colorLow: '#0c4a6e',
    colorHigh: '#f97316',
    showGrid: true,
    gridColor: '#e2e8f0',
    gridOpacity: 0.35,
    cellGap: 1,
    smoothIntensity: 2,
    colorSteps: 0,
    borderRadius: 6,
    showValues: false
  },
  marqueeText: {
    text: '生产公告：当前 2 号线维护中，预计 14:30 恢复，请注意调度安排。',
    highlightColor: '#ffffff',
    speedSec: 12,
    loopCount: 0,
    color: '#d7ecff',
    fontSize: '0.875rem',
    fontWeight: 500,
    gap: '3rem',
    background: 'transparent'
  }
}

