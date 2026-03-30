const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.png$/

import widget_chart_bar from '../assets/widget-preview/widget_chart_bar.png?inline'
import widget_climate from '../assets/widget-preview/widget_climate.png?inline'
import widget_heatmap from '../assets/widget-preview/widget_heatmap.png?inline'
import widget_text_panel from '../assets/widget-preview/widget_text_panel.png?inline'
import widget_time from '../assets/widget-preview/widget_time.png?inline'
import widget_title from '../assets/widget-preview/widget_title.png?inline'

const previewMap: Record<string, string> = {
  'widget_chart_bar.png': widget_chart_bar,
  'widget_climate.png': widget_climate,
  'widget_heatmap.png': widget_heatmap,
  'widget_text_panel.png': widget_text_panel,
  'widget_time.png': widget_time,
  'widget_title.png': widget_title
}

/**
 * 根据文件名返回样例图 URL（data URL）；无则返回 undefined。
 * 配置中 sampleImage 填文件名即可，如 "widget_title.png"。
 *
 * 注意：这里使用 ?inline 强制将 PNG 内联进 JS，避免 CDN/base/web 代理路径问题。
 */
export function getWidgetSampleImageUrl(filename: string | undefined): string | undefined {
  if (!filename || !String(filename).trim()) return undefined
  const name = String(filename).trim()
  if (!SAFE_NAME.test(name)) return undefined
  return previewMap[name]
}
