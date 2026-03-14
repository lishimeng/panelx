/**
 * 全局调试日志开关：供数据链、组件内日志统一判断
 * - 加载 dashboard_config 后根据 config.debug 会刷新 localStorage（setDebugFromConfig）
 * - 需要判断日志开关的组件使用 isDebugEnabled() 后再打印
 */

const DEBUG_KEY = 'PanelX_DEBUG'

/** 加载 dashboard 配置后调用，将 config.debug 同步到 localStorage，后续 isDebugEnabled() 依此生效 */
export function setDebugFromConfig(debug: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DEBUG_KEY, debug ? '1' : '0')
}

/**
 * 是否开启调试日志（供所有组件统一使用）
 * 仅当 localStorage PanelX_DEBUG === '1' 时为 true，未设置或为 '0' 均为关。
 */
export function isDebugEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(DEBUG_KEY) === '1'
}
