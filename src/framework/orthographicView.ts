/**
 * 正交相机可视半高（orthographic 的 top/bottom 半径）相对「world 高度一半」的放宽倍数。
 * 大于 1 时视野略大，减少边缘裁切过紧的感觉。
 */
export const ORTHOGRAPHIC_FRUSTUM_SCALE = 1.15

/** 正交相机近裁剪面（世界单位）；略小可减少近裁平面切入模型。 */
export const ORTHOGRAPHIC_N_CLIP = 0.001
/** 正交相机远裁剪面（世界单位）。 */
export const ORTHOGRAPHIC_F_CLIP = 10000

/** 与 worldSize / widget.worldSize 等结构兼容。 */
export type WorldSizeLike = { x?: number; y?: number; z?: number }

/**
 * 由场景轴对齐包围盒尺寸推导正交相机的「半高」halfH（用于 cam.top = halfH、cam.bottom = -halfH）。
 * 使用外接球半径 sqrt(x²+y²+z²)/2：任意轨道旋转下，包围盒在相机平面上的投影不会超出该圆（比 max(x,y,z)/2 更保守）。
 */
export function orthographicHalfFromWorldSize(ws: WorldSizeLike | undefined): number {
  const x = Number(ws?.x)
  const y = Number(ws?.y)
  const z = Number(ws?.z)
  const ax = Number.isFinite(x) && x > 0 ? x : 0
  const ay = Number.isFinite(y) && y > 0 ? y : 0
  const az = Number.isFinite(z) && z > 0 ? z : 0
  const d = Math.sqrt(ax * ax + ay * ay + az * az)
  const minD = 0.0001
  return Math.max(d / 2, minD / 2)
}

/**
 * 轨道相机与 target（通常为原点）的最小距离：须大于场景轴对齐包围盒的外接球半径，
 * 否则相机落在球内，近/远裁平面会切入几何体（侧视时出现水平/带状裁切）。
 */
export function minOrthographicOrbitDistanceFromWorldSize(ws: WorldSizeLike | undefined): number {
  const R = orthographicHalfFromWorldSize(ws)
  return Math.max(R * 1.05, 12)
}

/** 至少有一轴为有限正数时才认为 worldSize 可用于推断正交半高。 */
export function worldSizeHasPositiveExtent(ws: WorldSizeLike | undefined): boolean {
  const x = Number(ws?.x)
  const y = Number(ws?.y)
  const z = Number(ws?.z)
  return [x, y, z].some((n) => Number.isFinite(n) && n > 0)
}
