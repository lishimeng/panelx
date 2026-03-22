import type { DashboardConfig } from '../types/dashboard'

/** Editor3D 保存的草稿键，供 Editor2D 导出/预览时合并 */
export const EDITOR_3D_DRAFT_KEY = 'EDITOR_3D_DRAFT'

/** Editor2D 侧「导出时合并 3D 草稿」开关（可选持久化） */
export const EDITOR_ENABLE_3D_MERGE_KEY = 'PanelX_EDITOR_ENABLE_3D_MERGE'

export function saveEditor3DDraft(payload: DashboardConfig): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(EDITOR_3D_DRAFT_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

export function loadEditor3DDraft(): DashboardConfig | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(EDITOR_3D_DRAFT_KEY)
    if (!raw?.trim()) return null
    const o = JSON.parse(raw) as DashboardConfig
    if (!o || typeof o !== 'object') return null
    return o
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[editor3dDraft] 解析 EDITOR_3D_DRAFT 失败，请检查是否为合法 JSON', e)
    }
    return null
  }
}

export function clearEditor3DDraft(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(EDITOR_3D_DRAFT_KEY)
  } catch {
    // ignore
  }
}

/**
 * 将 Editor3D 草稿合并进 2D 编辑器的 Dashboard 配置（2D 为主，附加 widgets3D / scene3D 等）。
 */
export function mergeDashboardWith3DDraft(base: DashboardConfig, draft: DashboardConfig): DashboardConfig {
  const out = JSON.parse(JSON.stringify(base)) as DashboardConfig
  if (draft.widgets3D !== undefined) {
    out.widgets3D = JSON.parse(JSON.stringify(draft.widgets3D))
  }
  if (draft.scene3D) {
    out.scene3D = JSON.parse(JSON.stringify(draft.scene3D))
  }
  // 根背景：草稿中非空时采用 3D 编辑器背景（大屏根节点与 Dashboard 背景一致时常用）
  const bg = draft.background
  if (typeof bg === 'string' && bg.trim() !== '') {
    out.background = bg
  }
  if (draft.debug != null) {
    out.debug = draft.debug
  }
  // Dashboard 若存在 backgroundLayer（如图片背景），会优先于 widgets3D 生成的 3D 层，导致「合并了 3D 但看不到场景」
  const w3 = out.widgets3D
  if (Array.isArray(w3) && w3.length > 0) {
    out.backgroundLayer = undefined
  }
  return out
}

export function loadEnable3DMergeFromStorage(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const v = localStorage.getItem(EDITOR_ENABLE_3D_MERGE_KEY)
    return v === '1' || v === 'true'
  } catch {
    return false
  }
}

export function saveEnable3DMergeToStorage(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(EDITOR_ENABLE_3D_MERGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}
