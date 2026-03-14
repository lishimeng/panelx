/**
 * 各 Widget 类型的统一 prop 配置（defaultProps + propConfig），供 Editor 展示与解析 config 使用
 */

import type { WidgetType2D } from '../types/dashboard'
import type { WidgetTypeRegItem } from '../types/widgets'

const chartDefaultOptions = {
  xAxis: { type: 'category' as const, data: ['A', 'B', 'C'] },
  yAxis: { type: 'value' as const },
  series: [{ data: [120, 200, 150], type: 'bar' as const }]
}

export const widgetTypeReg: Record<WidgetType2D, WidgetTypeRegItem> = {
  stat: {
    defaultProps: { value: 0, label: '指标' },
    propConfig: [
      { key: 'value', label: '数值', type: 'number', default: 0 },
      { key: 'label', label: '标签', type: 'string', default: '指标' }
    ]
  },
  chart: {
    defaultProps: { options: chartDefaultOptions, seriesType: 'bar', height: '100%', width: '100%' },
    propConfig: [
      { key: 'seriesType', label: '系列类型', type: 'string', default: 'bar' },
      { key: 'options', label: '图表配置', type: 'object', default: chartDefaultOptions },
      { key: 'height', label: '高度', type: 'string', default: '100%' },
      { key: 'width', label: '宽度', type: 'string', default: '100%' }
    ]
  },
  table: {
    defaultProps: {
      columns: [{ key: 'name', title: '名称' }, { key: 'value', title: '数值' }],
      data: [{ name: '项目1', value: 100 }, { name: '项目2', value: 200 }]
    },
    propConfig: [
      { key: 'columns', label: '列配置', type: 'array', default: [] },
      { key: 'data', label: '数据', type: 'array', default: [] }
    ]
  },
  decoration: {
    defaultProps: { variant: 'corner' },
    propConfig: [{ key: 'variant', label: '变体', type: 'string', default: 'corner' }]
  },
  card: {
    defaultProps: { title: '卡片' },
    propConfig: [{ key: 'title', label: '标题', type: 'string', default: '卡片' }]
  },
  panel: {
    defaultProps: { title: '面板' },
    propConfig: [{ key: 'title', label: '标题', type: 'string', default: '面板' }]
  },
  screenTitle: {
    defaultProps: { text: '大屏标题' },
    propConfig: [{ key: 'text', label: '标题文字', type: 'string', default: '大屏标题' }]
  },
  topBar: {
    defaultProps: {
      datetime: '',
      temperature: '25℃',
      humidity: '50%rh',
      background: 'transparent'
    },
    propConfig: [
      { key: 'datetime', label: '日期时间', type: 'string', default: '' },
      { key: 'temperature', label: '温度', type: 'string', default: '25℃' },
      { key: 'humidity', label: '湿度', type: 'string', default: '50%rh' },
      { key: 'background', label: '背景', type: 'string', default: 'transparent' }
    ]
  },
  glassChart: {
    defaultProps: {
      title: '图表',
      subTitle: 'CHART',
      seriesType: 'bar',
      options: chartDefaultOptions
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '图表' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'CHART' },
      { key: 'seriesType', label: '系列类型', type: 'string', default: 'bar' },
      { key: 'options', label: '图表配置', type: 'object', default: chartDefaultOptions }
    ]
  },
  deviceCard: {
    defaultProps: { items: [{ label: '设备', value: '-', icon: '▸' }] },
    propConfig: [{ key: 'items', label: '设备项', type: 'array', default: [] }]
  },
  bottomNav: {
    defaultProps: {
      items: [
        { label: '首页', icon: '▸', active: true },
        { label: '数据', icon: '' }
      ]
    },
    propConfig: [{ key: 'items', label: '导航项', type: 'array', default: [] }]
  },
  progressList: {
    defaultProps: {
      title: '进度',
      subTitle: 'PROGRESS',
      items: [{ label: '项1', value: '100', percent: 60 }]
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '进度' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'PROGRESS' },
      { key: 'items', label: '列表项', type: 'array', default: [] }
    ]
  },
  /** 比例尺从 Dashboard provide 的 dashboardViewport 读取 scale，无可配置 props */
  scaleRuler: {
    defaultProps: {},
    propConfig: []
  }
}

export function getWidgetDefaultProps(type: WidgetType2D): Record<string, unknown> {
  return { ...widgetTypeReg[type].defaultProps }
}

export function getWidgetPropConfig(type: WidgetType2D): WidgetTypeRegItem['propConfig'] {
  return widgetTypeReg[type].propConfig
}
