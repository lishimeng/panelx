/** 转为有限数值，非法时回退到 fallback。 */
export function toFiniteNumber(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** 限制到 [0, 1] 区间。 */
export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** 百分比转 [0,1] 透明度；非法输入回退 fallback。 */
export function percentToOpacityUnit(v: unknown, fallback = 1): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return clamp01(n / 100)
}

/** 转为正数（> min），非法或不满足条件时回退 fallback。 */
export function toPositiveNumber(v: unknown, fallback: number, min = 0): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return n > min ? n : fallback
}

/** 转为正数（> min），不满足时返回 undefined。 */
export function toPositiveNumberOrUndefined(v: unknown, min = 0): number | undefined {
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n > min ? n : undefined
}

