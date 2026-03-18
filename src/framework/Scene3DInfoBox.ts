import { CSS3DObject } from 'three/examples/jsm/Addons.js'
import type {
  Scene3DInfoBoxConfig,
  Scene3DInfoBoxColorPreset,
  Scene3DInfoBoxStatusType
} from '../types/dashboard'

type ThemeColors = { bg: string; border: string; glow: string; statusColor: string }

/** 预制颜色：info=蓝青、success=绿、warning=黄、error=红 */
export const INFO_BOX_PRESET_THEMES: Record<Scene3DInfoBoxColorPreset, ThemeColors> = {
  info: {
    bg: 'rgba(20, 60, 100, 0.88)',
    border: 'rgba(0, 212, 255, 0.75)',
    glow: '0 0 18px rgba(0, 180, 220, 0.45), inset 0 0 30px rgba(0,0,0,0.2)',
    statusColor: 'rgb(120, 200, 255)'
  },
  success: {
    bg: 'rgba(20, 80, 60, 0.88)',
    border: 'rgba(80, 255, 180, 0.75)',
    glow: '0 0 16px rgba(60, 220, 160, 0.45), inset 0 0 30px rgba(0,0,0,0.2)',
    statusColor: 'rgb(160, 255, 200)'
  },
  warning: {
    bg: 'rgba(140, 100, 20, 0.88)',
    border: 'rgba(255, 200, 80, 0.9)',
    glow: '0 0 20px rgba(255, 180, 60, 0.5), inset 0 0 30px rgba(0,0,0,0.2)',
    statusColor: 'rgb(255, 220, 120)'
  },
  error: {
    bg: 'rgba(140, 30, 30, 0.88)',
    border: 'rgba(255, 80, 80, 0.9)',
    glow: '0 0 20px rgba(255, 60, 60, 0.6), inset 0 0 30px rgba(0,0,0,0.2)',
    statusColor: 'rgb(255, 120, 120)'
  }
}

/** statusType 到 colorPreset 的兼容映射（normal=绿、warning=黄、fault=红） */
const STATUS_TO_PRESET: Record<Scene3DInfoBoxStatusType, Scene3DInfoBoxColorPreset> = {
  fault: 'error',
  normal: 'success',
  warning: 'warning'
}

function resolveTheme(config: Scene3DInfoBoxConfig): ThemeColors {
  const preset: Scene3DInfoBoxColorPreset =
    config.colorPreset ?? STATUS_TO_PRESET[config.statusType ?? 'fault']
  const base = INFO_BOX_PRESET_THEMES[preset]
  const over = config.color ?? {}
  return {
    bg: over.bg ?? base.bg,
    border: over.border ?? base.border,
    glow: over.glow ?? base.glow,
    statusColor: over.statusColor ?? base.statusColor
  }
}

/** 供外部在不重建 element 的情况下更新主题色 */
export function resolveScene3DInfoBoxTheme(config: Scene3DInfoBoxConfig): ThemeColors {
  return resolveTheme(config)
}

/** 创建 3D 场景内科技感信息框的 DOM 并包装为 CSS3DObject，需调用方设置 position 并 add 到 scene */
export function createScene3DInfoBox(config: Scene3DInfoBoxConfig): CSS3DObject {
  const theme = resolveTheme(config)

  const wrap = document.createElement('div')
  wrap.className = 'panelx-scene3d-infobox'
  wrap.style.cssText = `
    position: relative;
    width: 280px;
    box-sizing: border-box;
    padding: 12px 14px;
    background: ${theme.bg};
    border: 1px solid ${theme.border};
    box-shadow: ${theme.glow};
    border-radius: 8px;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    backdrop-filter: blur(8px);
    pointer-events: auto;
  `

  const corner = (pos: string) =>
    `<span style="position:absolute;width:10px;height:10px;border-color:${theme.border};border-style:solid;border-width:0;${pos}"></span>`
  const corners =
    corner('top:6px;left:6px;border-top-width:1px;border-left-width:1px') +
    corner('top:6px;right:6px;border-top-width:1px;border-right-width:1px') +
    corner('bottom:6px;left:6px;border-bottom-width:1px;border-left-width:1px') +
    corner('bottom:6px;right:6px;border-bottom-width:1px;border-right-width:1px')

  wrap.innerHTML = `
    ${corners}
    <div style="position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${theme.border};"></div>
    <div style="font-weight: 700; font-size: 14px; margin-bottom: 10px; color: rgba(255,255,255,0.95); letter-spacing: 0.02em;">${escapeHtml(config.title)}</div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
      <span style="color: rgba(255,255,255,0.85);">📋 设备编号 ${escapeHtml(config.equipmentId)}</span>
      <span style="color: ${theme.statusColor}; font-weight: 600;">⚠ ${escapeHtml(config.status)}</span>
    </div>
    ${config.runningTime ? `<div style="margin-bottom: 6px; color: rgba(255,255,255,0.85);">⏱ 设备运行时长 ${escapeHtml(config.runningTime)}</div>` : ''}
    ${config.message ? `<div style="margin-top: 8px; padding: 6px 8px; background: rgba(0,0,0,0.25); border-radius: 4px; color: ${theme.statusColor}; font-size: 11px;">▲ 设备异常信息 ${escapeHtml(config.message)}</div>` : ''}
  `

  const css3d = new CSS3DObject(wrap)
  // 让 1 单位 ≈ 100px 显示尺寸，便于在 3D 中与场景比例协调
  css3d.scale.setScalar(0.01)
  return css3d
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
