/**
 * 各 Widget 类型的统一 prop 配置（defaultProps + propConfig），供 Editor 展示与解析 config 使用
 */

import type { WidgetType2D, BuiltinWidgetType2D } from '../types/dashboard'
import type { WidgetTypeRegItem } from '../types/widgets'

/** Glass 系组件 tab 色带（与 GlassPanel / GlassChart 等一致） */
const ENUM_TAB_COLOR = ['blue', 'cyan', 'yellow', 'green', 'orange', 'purple'] as const

/** ECharts 常用 series.type */
const ENUM_CHART_SERIES = ['bar', 'line', 'pie', 'scatter', 'radar', 'gauge', 'funnel', 'heatmap'] as const

const chartDefaultOptions = {
  xAxis: { type: 'category' as const, data: ['A', 'B', 'C'] },
  yAxis: { type: 'value' as const },
  series: [{ data: [120, 200, 150], type: 'bar' as const }]
}

export const widgetTypeReg: Record<BuiltinWidgetType2D, WidgetTypeRegItem> = {
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
      { key: 'seriesType', label: '系列类型', type: 'string', default: 'bar', enum: [...ENUM_CHART_SERIES] },
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
      { key: 'background', label: '背景', type: 'color', default: 'transparent' }
    ]
  },
  topBarTime: {
    defaultProps: {
      background: 'transparent'
    },
    propConfig: [{ key: 'background', label: '背景', type: 'color', default: 'transparent' }]
  },
  topBarClimate: {
    defaultProps: {
      temperature: '25℃',
      humidity: '50%rh',
      background: 'transparent'
    },
    propConfig: [
      { key: 'temperature', label: '温度', type: 'string', default: '25℃' },
      { key: 'humidity', label: '湿度', type: 'string', default: '50%rh' },
      { key: 'background', label: '背景', type: 'color', default: 'transparent' }
    ]
  },
  glassChart: {
    defaultProps: {
      title: '图表',
      subTitle: 'CHART',
      tabColor: 'blue',
      showTab: true,
      panelOpacity: 0.75,
      panelBorderVisible: true,
      panelBorderOpacity: 0.6,
      panelShadowVisible: true,
      panelShadowOpacity: 1,
      seriesType: 'bar',
      options: chartDefaultOptions
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '图表' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'CHART' },
      { key: 'tabColor', label: '顶部色带颜色', type: 'string', default: 'blue', enum: [...ENUM_TAB_COLOR] },
      { key: 'showTab', label: '显示顶部色带', type: 'boolean', default: true },
      { key: 'panelOpacity', label: '面板透明度(0-1)', type: 'number', default: 0.75 },
      { key: 'panelBorderVisible', label: '显示边框', type: 'boolean', default: true },
      { key: 'panelBorderOpacity', label: '边框透明度(0-1)', type: 'number', default: 0.6 },
      { key: 'panelShadowVisible', label: '显示阴影', type: 'boolean', default: true },
      { key: 'panelShadowOpacity', label: '阴影强度(0-1)', type: 'number', default: 1 },
      { key: 'seriesType', label: '系列类型', type: 'string', default: 'bar', enum: [...ENUM_CHART_SERIES] },
      { key: 'options', label: '图表配置', type: 'object', default: chartDefaultOptions }
    ]
  },
  textPanel2D: {
    defaultProps: {
      title: '关于',
      subTitle: 'INTRODUCTION',
      tabColor: 'cyan',
      showTab: true,
      panelOpacity: 0.75,
      panelBorderVisible: true,
      panelBorderOpacity: 0.6,
      panelShadowVisible: true,
      panelShadowOpacity: 1,
      sections: [
        {
          content:
            '用于展示文字说明。|支持用 | 分行。|可用 [[高亮内容]] 标记关键字。'
        }
      ]
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '关于' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'INTRODUCTION' },
      { key: 'tabColor', label: '顶部色带颜色', type: 'string', default: 'cyan', enum: [...ENUM_TAB_COLOR] },
      { key: 'showTab', label: '显示顶部色带', type: 'boolean', default: true },
      { key: 'panelOpacity', label: '面板透明度(0-1)', type: 'number', default: 0.75 },
      { key: 'panelBorderVisible', label: '显示边框', type: 'boolean', default: true },
      { key: 'panelBorderOpacity', label: '边框透明度(0-1)', type: 'number', default: 0.6 },
      { key: 'panelShadowVisible', label: '显示阴影', type: 'boolean', default: true },
      { key: 'panelShadowOpacity', label: '阴影强度(0-1)', type: 'number', default: 1 },
      { key: 'sections', label: '段落区块', type: 'array', default: [] }
    ]
  },
  tableChart: {
    defaultProps: {
      title: '近期检修记录',
      subTitle: 'RECENT MAINTENANCE',
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
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '近期检修记录' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'RECENT MAINTENANCE' },
      { key: 'tabColor', label: '顶部色带颜色', type: 'string', default: 'cyan', enum: [...ENUM_TAB_COLOR] },
      { key: 'showTab', label: '显示顶部色带', type: 'boolean', default: true },
      { key: 'panelOpacity', label: '面板透明度(0-1)', type: 'number', default: 0.75 },
      { key: 'panelBorderVisible', label: '显示边框', type: 'boolean', default: true },
      { key: 'panelBorderOpacity', label: '边框透明度(0-1)', type: 'number', default: 0.6 },
      { key: 'panelShadowVisible', label: '显示阴影', type: 'boolean', default: true },
      { key: 'panelShadowOpacity', label: '阴影强度(0-1)', type: 'number', default: 1 },
      { key: 'maxRows', label: '最大条数', type: 'number', default: 6 },
      { key: 'updateMode', label: '更新模式', type: 'string', default: 'replace', enum: ['replace', 'append'] },
      { key: 'columns', label: '列配置', type: 'array', default: [] },
      { key: 'rows', label: '数据行', type: 'array', default: [] },
      { key: 'badgeKey', label: 'Badge 字段', type: 'string', default: 'levelName' },
      { key: 'badgeColorKey', label: 'Badge 颜色字段', type: 'string', default: 'badgeColor' }
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
      tabColor: 'cyan',
      showTab: true,
      panelOpacity: 0.75,
      panelBorderVisible: true,
      panelBorderOpacity: 0.6,
      panelShadowVisible: true,
      panelShadowOpacity: 1,
      items: [{ label: '项1', value: '100', percent: 60 }]
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '进度' },
      { key: 'subTitle', label: '副标题', type: 'string', default: 'PROGRESS' },
      { key: 'tabColor', label: '顶部色带颜色', type: 'string', default: 'cyan', enum: [...ENUM_TAB_COLOR] },
      { key: 'showTab', label: '显示顶部色带', type: 'boolean', default: true },
      { key: 'panelOpacity', label: '面板透明度(0-1)', type: 'number', default: 0.75 },
      { key: 'panelBorderVisible', label: '显示边框', type: 'boolean', default: true },
      { key: 'panelBorderOpacity', label: '边框透明度(0-1)', type: 'number', default: 0.6 },
      { key: 'panelShadowVisible', label: '显示阴影', type: 'boolean', default: true },
      { key: 'panelShadowOpacity', label: '阴影强度(0-1)', type: 'number', default: 1 },
      { key: 'items', label: '列表项', type: 'array', default: [] }
    ]
  },
  infoBox2D: {
    defaultProps: {
      title: 'INFO BOX',
      subtitle: 'SUBTITLE',
      metaLeft: 'LEFT',
      metaRight: 'RIGHT',
      content: '内容1|内容2',
      note: 'Note',
      colorPreset: 'cyan',
      fx: 'scanlines'
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: 'INFO BOX' },
      { key: 'subtitle', label: '副标题', type: 'string', default: 'SUBTITLE' },
      { key: 'metaLeft', label: '左侧元信息', type: 'string', default: 'LEFT' },
      { key: 'metaRight', label: '右侧元信息', type: 'string', default: 'RIGHT' },
      { key: 'content', label: '内容（用 | 分行）', type: 'string', default: '内容1|内容2' },
      { key: 'note', label: '底部备注', type: 'string', default: 'Note' },
      {
        key: 'colorPreset',
        label: '配色预设',
        type: 'string',
        default: 'cyan',
        enum: ['cyan', 'green', 'yellow', 'red', 'info', 'success', 'warning', 'error']
      },
      { key: 'fx', label: '特效', type: 'string', default: 'scanlines', enum: ['scanlines', 'none'] }
    ]
  },
  /** 比例尺从 Dashboard provide 的 dashboardViewport 读取 scale，无可配置 props */
  scaleRuler: {
    defaultProps: {},
    propConfig: []
  },
  marqueeText: {
    defaultProps: {
      text: '生产公告：当前 2 号线维护中，预计 14:30 恢复，请注意调度安排。',
      speedSec: 12,
      loopCount: 0,
      highlightColor: '#ffffff',
      color: '#d7ecff',
      fontSize: '0.875rem',
      fontWeight: 500,
      gap: '3rem',
      background: 'transparent'
    },
    propConfig: [
      { key: 'text', label: '滚动文本', type: 'string', default: '滚动文字示例' },
      { key: 'highlightColor', label: '高亮颜色', type: 'color', default: '#ffffff' },
      { key: 'speedSec', label: '滚动周期(秒)', type: 'number', default: 12 },
      { key: 'loopCount', label: '滚动次数(0=无限)', type: 'number', default: 0 },
      { key: 'color', label: '文字颜色', type: 'color', default: '#d7ecff' },
      { key: 'fontSize', label: '字体大小', type: 'string', default: '0.875rem' },
      {
        key: 'fontWeight',
        label: '字体粗细',
        type: 'string',
        default: '500',
        enum: ['300', '400', '500', '600', '700', '800']
      },
      { key: 'gap', label: '文字间距', type: 'string', default: '3rem' },
      { key: 'background', label: '背景', type: 'color', default: 'transparent' }
    ]
  },
  heatmap2d: {
    defaultProps: {
      title: '热力分布',
      data: [
        [0, 0.25, 0.5, 0.75, 1],
        [0.2, 0.4, 0.6, 0.8, 1],
        [0.1, 0.3, 0.5, 0.7, 0.9]
      ],
      colorLow: '#0c4a6e',
      colorHigh: '#f97316',
      showGrid: true,
      cellGap: 1,
      smoothIntensity: 2,
      borderRadius: 6,
      showValues: false
    },
    propConfig: [
      { key: 'title', label: '标题', type: 'string', default: '热力分布' },
      {
        key: 'data',
        label: '热力数据(二维数组)',
        type: 'array',
        default: [
          [0, 0.25, 0.5, 0.75, 1],
          [0.2, 0.4, 0.6, 0.8, 1],
          [0.1, 0.3, 0.5, 0.7, 0.9]
        ]
      },
      { key: 'colorLow', label: '低值颜色', type: 'color', default: '#0c4a6e' },
      { key: 'colorHigh', label: '高值颜色', type: 'color', default: '#f97316' },
      { key: 'showGrid', label: '显示网格', type: 'boolean', default: true },
      { key: 'cellGap', label: '格间距(px)', type: 'number', default: 1 },
      { key: 'smoothIntensity', label: '平滑强度(1-4)', type: 'number', default: 2 },
      { key: 'borderRadius', label: '圆角(px)', type: 'number', default: 6 },
      { key: 'showValues', label: '显示数值', type: 'boolean', default: false },
      { key: 'valueFontSize', label: '数值字号', type: 'number', default: 10 }
    ]
  }
}

export function getWidgetDefaultProps(type: WidgetType2D): Record<string, unknown> {
  const reg = (widgetTypeReg as Record<string, WidgetTypeRegItem | undefined>)[type]
  return { ...(reg?.defaultProps ?? {}) }
}

export function getWidgetPropConfig(type: WidgetType2D): WidgetTypeRegItem['propConfig'] {
  const reg = (widgetTypeReg as Record<string, WidgetTypeRegItem | undefined>)[type]
  return reg?.propConfig ?? []
}
