/**
 * Dashboard 大屏尺寸计算
 * - 屏幕实际尺寸、设计(design)尺寸
 * - 设计宽高比 >= 1 则宽度占满，否则高度占满
 */

import type { DashboardConfig } from '../../types/dashboard'

export interface DashboardSizeInput {
  /** 屏幕（容器）宽度 */
  screenWidth: number
  /** 屏幕（容器）高度 */
  screenHeight: number
  /** 设计稿宽度 */
  designWidth: number
  /** 设计稿高度 */
  designHeight: number
}

export interface DashboardSizeResult {
  /** 计算后的实际宽度（用于 SizeManager2D.actualWidth） */
  actualWidth: number
  /** 计算后的实际高度（actualWidth / designRatio） */
  actualHeight: number
  /** 缩放比例 scale = actualWidth / designWidth */
  scale: number
}

const LOG_PREFIX = '[DashboardSize]'

/**
 * 根据屏幕尺寸与设计尺寸，计算大屏实际宽高。
 * 设计宽高比 >= 1 时以宽度占满屏幕，< 1 时以高度占满屏幕。
 */
export function computeDashboardActualSize(input: DashboardSizeInput): DashboardSizeResult {
  const { screenWidth, screenHeight, designWidth, designHeight } = input

  const screenRatio = screenWidth / screenHeight
  const designRatio = designWidth / designHeight

  let actualWidth: number
  if (designRatio >= 1) {
    actualWidth = Math.max(1, Math.floor(screenWidth))
  } else {
    actualWidth = Math.max(1, Math.floor(screenHeight * designRatio))
  }

  const actualHeight = actualWidth / designRatio
  const scale = actualWidth / designWidth
  const actualRatio = actualWidth / actualHeight

  console.log(LOG_PREFIX, '屏幕尺寸:', { width: screenWidth, height: screenHeight })
  console.log(LOG_PREFIX, '屏幕宽高比:', screenRatio.toFixed(4))
  console.log(LOG_PREFIX, 'design 尺寸:', { width: designWidth, height: designHeight })
  console.log(LOG_PREFIX, 'design 宽高比:', designRatio.toFixed(4))
  console.log(LOG_PREFIX, '计算后尺寸:', { width: actualWidth, height: Math.round(actualHeight) })
  console.log(LOG_PREFIX, '计算后宽高比:', actualRatio.toFixed(4))

  return {
    actualWidth,
    actualHeight,
    scale
  }
}

/** 视口尺寸，用于 px → vw/vh 换算 */
export interface ViewportSize {
  width: number
  height: number
}

const REM_BASE = 16

/** px → vw 字符串；视口为 0 时回退为 rem，系统内不输出 px */
export function pxToVw(px: number, viewportWidth: number): string {
  if (!viewportWidth) return pxToRem(px)
  return `${(px / viewportWidth) * 100}vw`
}

/** px → vh 字符串；视口为 0 时回退为 rem */
export function pxToVh(px: number, viewportHeight: number): string {
  if (!viewportHeight) return pxToRem(px)
  return `${(px / viewportHeight) * 100}vh`
}

/** px → rem 字符串，base 默认 16 */
export function pxToRem(px: number, base: number = REM_BASE): string {
  return `${px / base}rem`
}

/** 将字符串中的 'Npx' 转为 'Nrem'（base=16），非 px 字符串原样返回 */
function stringPxToRem(s: string, base: number = REM_BASE): string {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(String(s))
  return m ? `${Number(m[1]) / base}rem` : s
}

/** 递归将对象中值为 'Npx' 的字符串转为 rem */
function propsPxToRem(obj: unknown): unknown {
  if (obj == null) return obj
  if (typeof obj === 'string') return stringPxToRem(obj)
  if (Array.isArray(obj)) return obj.map(propsPxToRem)
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = propsPxToRem(v)
    return out
  }
  return obj
}

/** 将 ECharts options.grid 的像素值转为百分比，随图表尺寸缩放 */
function convertGridPxToPercent(
  options: Record<string, unknown> | undefined,
  chartWidth: number,
  chartHeight: number
): void {
  const grid = options?.grid as { left?: number; right?: number; top?: number; bottom?: number } | undefined
  if (!grid || chartWidth <= 0 || chartHeight <= 0) return
  const out: Record<string, string> = {}
  if (typeof grid.left === 'number') out.left = `${(grid.left / chartWidth) * 100}%`
  if (typeof grid.right === 'number') out.right = `${(grid.right / chartWidth) * 100}%`
  if (typeof grid.top === 'number') out.top = `${(grid.top / chartHeight) * 100}%`
  if (typeof grid.bottom === 'number') out.bottom = `${(grid.bottom / chartHeight) * 100}%`
  Object.assign(grid, out)
}

/** 配置中 layout 为设计稿 px，加载后立刻转为 percent(0-100)，渲染阶段不再使用 px */
export function convertDashboardConfigPxToPercent(config: DashboardConfig): DashboardConfig {
  const design = config.design
  const dw = design?.width || 1920
  const dh = design?.height || 1080
  const widgets2D = config.widgets2D.map((w) => {
    const layout = w.layout
    const next = { ...w }
    if (w.props) {
      next.props = propsPxToRem(w.props) as Record<string, unknown>
      const options = (next.props as Record<string, unknown>).options as Record<string, unknown> | undefined
      if (layout && options) convertGridPxToPercent(options, layout.width, layout.height)
    }
    if (layout) {
      next.layout = {
        x: (layout.x / dw) * 100,
        y: (layout.y / dh) * 100,
        width: (layout.width / dw) * 100,
        height: (layout.height / dh) * 100
      }
    }
    return next
  })
  return { ...config, widgets2D, layoutUnit: 'percent' as const }
}
