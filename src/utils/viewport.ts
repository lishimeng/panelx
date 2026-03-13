/**
 * 视口与比例尺工具（可复用）
 * - 设计稿尺寸使用 px，与屏幕尺寸一起计算实际尺寸与 scale
 * - 供 Dashboard、比例尺组件等统一使用
 */

import {
  computeDashboardActualSize,
  pxToVw,
  pxToVh,
  pxToRem
} from '../core/size'
import type { ViewportSize, DashboardSizeInput, DashboardSizeResult } from '../core/size'

export type { ViewportSize, DashboardSizeInput, DashboardSizeResult }
export { pxToVw, pxToVh, pxToRem, computeDashboardActualSize }

export interface ViewportAndScale {
  viewportSize: ViewportSize
  actualWidth: number
  actualHeight: number
  scale: number
}

/**
 * 根据容器（或其父级/窗口）的屏幕尺寸与设计尺寸，计算视口与比例。
 * 供 Dashboard、比例尺等复用。
 */
export function getViewportAndScale(
  containerEl: HTMLElement | null,
  designWidth: number,
  designHeight: number
): ViewportAndScale | null {
  if (!containerEl || designWidth <= 0 || designHeight <= 0) return null
  const parent = containerEl.parentElement
  let screenW = parent ? parent.clientWidth : 0
  let screenH = parent ? parent.clientHeight : 0
  if (typeof window !== 'undefined' && (screenW <= 0 || screenH <= 0)) {
    screenW = screenW > 0 ? screenW : window.innerWidth
    screenH = screenH > 0 ? screenH : window.innerHeight
  }
  if (!screenW || !screenH) return null

  const result = computeDashboardActualSize({
    screenWidth: screenW,
    screenHeight: screenH,
    designWidth,
    designHeight
  })

  return {
    viewportSize: { width: screenW, height: screenH },
    actualWidth: result.actualWidth,
    actualHeight: result.actualHeight,
    scale: result.scale
  }
}
