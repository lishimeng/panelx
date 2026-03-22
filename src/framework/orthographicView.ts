/**
 * 正交相机可视半高（orthographic 的 top/bottom 半径）相对「world 高度一半」的放宽倍数。
 * 大于 1 时视野略大，减少边缘裁切过紧的感觉。
 */
export const ORTHOGRAPHIC_FRUSTUM_SCALE = 1.15
