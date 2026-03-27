import type { EditorConfig } from '../../types/editor'

export const editorBuiltinRegisteredWidgets: EditorConfig['registeredWidgets'] = [
  { type: 'screenTitle', label: '大屏标题', group: '布局导航', defaultSize: { width: 1920, height: 80 }, sampleImage: 'widget_title.png' },
  { type: 'topBarTime', label: '时间组件', group: '布局导航', defaultSize: { width: 420, height: 48 }, sampleImage: 'widget_time.png' },
  { type: 'topBarClimate', label: '温湿度组件', group: '布局导航', defaultSize: { width: 280, height: 48 }, sampleImage: 'widget_climate.png' },
  { type: 'bottomNav', label: '底栏', group: '布局导航', defaultSize: { width: 1920, height: 56 }, sampleImage: '' },
  { type: 'chart', label: '图表', group: '数据可视化/图表', defaultSize: { width: 480, height: 280 }, sampleImage: '' },
  { type: 'glassChart', label: '玻璃图表', group: '数据可视化/图表', defaultSize: { width: 380, height: 220 }, sampleImage: 'widget_chart_bar.png' },
  { type: 'tableChart', label: '数据列表(table_chart)', group: '数据可视化/图表', defaultSize: { width: 340, height: 260 }, sampleImage: '' },
  { type: 'table', label: '表格', group: '数据可视化/表格', defaultSize: { width: 400, height: 260 }, sampleImage: '' },
  { type: 'stat', label: '指标', group: '业务组件', defaultSize: { width: 280, height: 100 }, sampleImage: '' },
  { type: 'deviceCard', label: '设备卡片', group: '业务组件', defaultSize: { width: 320, height: 280 }, sampleImage: '' },
  { type: 'progressList', label: '进度列表', group: '业务组件', defaultSize: { width: 340, height: 200 }, sampleImage: '' },
  { type: 'textPanel2D', label: '文字面板', group: '信息展示', defaultSize: { width: 340, height: 220 }, sampleImage: 'widget_text_panel.png' },
  { type: 'card', label: '卡片', group: '信息展示', defaultSize: { width: 320, height: 180 }, sampleImage: '' },
  { type: 'panel', label: '面板', group: '信息展示', defaultSize: { width: 360, height: 200 }, sampleImage: '' },
  { type: 'infoBox2D', label: '2D信息框', group: '信息展示', defaultSize: { width: 320, height: 160 }, sampleImage: '' },
  { type: 'marqueeText', label: '走马灯文字', group: '信息展示', defaultSize: { width: 420, height: 40 }, sampleImage: '' },
  { type: 'heatmap2d', label: '热力图', group: '数据可视化/图表', defaultSize: { width: 400, height: 260 }, sampleImage: 'widget_heatmap.png' },
  { type: 'decoration', label: '装饰', group: '装饰元素', defaultSize: { width: 120, height: 120 }, sampleImage: '' },
  { type: 'scaleRuler', label: '比例尺', group: '装饰元素', defaultSize: { width: 120, height: 48 }, sampleImage: '' }
]

