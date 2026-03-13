/**
 * Widget 样例图资源（assets 模式）
 * 从本目录收集图片，按文件名提供 URL，供编辑器侧栏与画布占位使用。
 */

const urlByFilename: Record<string, string> = {}

function getBasename(pathKey: string): string {
  return pathKey.replace(/^\.[/\\]/, '').replace(/\\/g, '/').split('/').pop() ?? pathKey
}

function collectOne(mod: Record<string, unknown>) {
  for (const pathKey of Object.keys(mod)) {
    const val = mod[pathKey]
    const url = typeof val === 'string' ? val : (val as { default?: string })?.default
    if (url) {
      urlByFilename[getBasename(pathKey)] = url
    }
  }
}

const png = import.meta.glob<{ default?: string }>('./*.png', { eager: true, query: '?url', import: 'default' })
const jpg = import.meta.glob<{ default?: string }>('./*.jpg', { eager: true, query: '?url', import: 'default' })
const jpeg = import.meta.glob<{ default?: string }>('./*.jpeg', { eager: true, query: '?url', import: 'default' })
const svg = import.meta.glob<{ default?: string }>('./*.svg', { eager: true, query: '?url', import: 'default' })
const gif = import.meta.glob<{ default?: string }>('./*.gif', { eager: true, query: '?url', import: 'default' })
const webp = import.meta.glob<{ default?: string }>('./*.webp', { eager: true, query: '?url', import: 'default' })

collectOne(png as Record<string, unknown>)
collectOne(jpg as Record<string, unknown>)
collectOne(jpeg as Record<string, unknown>)
collectOne(svg as Record<string, unknown>)
collectOne(gif as Record<string, unknown>)
collectOne(webp as Record<string, unknown>)

/**
 * 根据文件名返回样例图 URL；无则返回 undefined。
 * 配置中 sampleImage 填文件名即可，如 "stat.png"。
 */
export function getWidgetSampleImageUrl(filename: string | undefined): string | undefined {
  if (!filename || !String(filename).trim()) return undefined
  const name = String(filename).trim()
  return urlByFilename[name]
}
