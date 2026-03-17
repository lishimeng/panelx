export interface DesignXZCoordConfig {
  /** 是否启用该坐标系（由调用方控制） */
  enabled: boolean
  /** 左上角基准点在「3D 设计坐标」中的 x */
  originX: number
  /** 左上角基准点在「3D 设计坐标」中的 y（映射到 world 的 z） */
  originY: number
}

export function safeNonZeroScale(scale: unknown, fallback = 1): number {
  const s = Number(scale)
  return Number.isFinite(s) && s !== 0 ? s : fallback
}

/**
 * 输入坐标（以左上角为 0,0）-> 3D 设计坐标（dx,dy）-> world XZ（按比例尺缩放）
 */
export function designInputToWorldXZ(
  inputX: unknown,
  inputY: unknown,
  originX: unknown,
  originY: unknown,
  scale: unknown
): { x: number; z: number } {
  const dx = (Number(originX) || 0) + (Number(inputX) || 0)
  const dy = (Number(originY) || 0) + (Number(inputY) || 0)
  const s = safeNonZeroScale(scale, 1)
  return { x: dx * s, z: dy * s }
}

/**
 * world XZ -> 3D 设计坐标（dx,dy）-> 输入坐标（以左上角为 0,0）
 */
export function worldXZToDesignInput(
  worldX: unknown,
  worldZ: unknown,
  originX: unknown,
  originY: unknown,
  scale: unknown
): { x: number; y: number } {
  const s = safeNonZeroScale(scale, 1)
  const dx = (Number(worldX) || 0) / s
  const dy = (Number(worldZ) || 0) / s
  return {
    x: dx - (Number(originX) || 0),
    y: dy - (Number(originY) || 0)
  }
}

