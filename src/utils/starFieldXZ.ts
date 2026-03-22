/**
 * XZ 平面星空粒子：固定方向缓慢漂移、少数随机闪烁（每显示帧更新一次，避免 Bloom 多 pass 重复积分）
 */
import type { Points } from 'three'
import { CanvasTexture, Float32BufferAttribute, LinearFilter, SRGBColorSpace } from 'three'

/**
 * 为 PointsMaterial 提供「圆形光点」贴图（无 map 时 Three.js 默认是方形点）。
 * 中心亮、边缘柔化，配合 additive 更接近日星点。
 */
export function createStarPointSpriteTexture(size = 64): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('createStarPointSpriteTexture: 2d context unavailable')
  }
  const half = size / 2
  const grd = ctx.createRadialGradient(half, half, 0, half, half, half)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.12, 'rgba(255,255,255,0.95)')
  grd.addColorStop(0.4, 'rgba(255,255,255,0.4)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.08)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  return tex
}

export type StarFieldXZAnimationOptions = {
  count: number
  halfW: number
  halfD: number
  planeY: number
  twinkleRatio?: number
  speedMin?: number
  speedMax?: number
}

function wrapCoord(v: number, half: number): number {
  const span = 2 * half
  if (span <= 0) return v
  let x = v + half
  x = ((x % span) + span) % span
  return x - half
}

/**
 * 启动动画循环，返回 `stop()` 用于取消 rAF（组件卸载时务必调用）
 */
export function startStarFieldXZAnimation(points: Points, opt: StarFieldXZAnimationOptions): () => void {
  const {
    count,
    halfW,
    halfD,
    planeY,
    twinkleRatio = 0.22,
    speedMin = 0.018,
    speedMax = 0.055
  } = opt

  const geom = points.geometry
  const posAttr = geom.getAttribute('position') as Float32BufferAttribute
  const colAttr = geom.getAttribute('color') as Float32BufferAttribute
  if (!posAttr?.array || !colAttr?.array) {
    return () => {}
  }

  const pos = posAttr.array as Float32Array
  const col = colAttr.array as Float32Array

  const baseColor = new Float32Array(count * 3)
  baseColor.set(col)

  const vel = new Float32Array(count * 3)
  const twinkle = new Uint8Array(count)
  const twinklePhase = new Float32Array(count)
  const twinkleSpeed = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const sp = speedMin + Math.random() * (speedMax - speedMin)
    const ix = i * 3
    vel[ix] = Math.cos(angle) * sp
    vel[ix + 1] = 0
    vel[ix + 2] = Math.sin(angle) * sp

    twinkle[i] = Math.random() < twinkleRatio ? 1 : 0
    twinklePhase[i] = Math.random() * Math.PI * 2
    twinkleSpeed[i] = 1.2 + Math.random() * 2.8
  }

  let raf = 0
  let last = performance.now() / 1000

  function tick() {
    raf = requestAnimationFrame(tick)
    const now = performance.now() / 1000
    const dt = Math.min(0.05, now - last)
    last = now

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      pos[ix] += vel[ix] * dt
      pos[ix + 1] = planeY
      pos[ix + 2] += vel[ix + 2] * dt

      pos[ix] = wrapCoord(pos[ix], halfW)
      pos[ix + 2] = wrapCoord(pos[ix + 2], halfD)

      let m = 1
      if (twinkle[i]) {
        m = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(now * twinkleSpeed[i] + twinklePhase[i]))
      }
      col[ix] = baseColor[ix] * m
      col[ix + 1] = baseColor[ix + 1] * m
      col[ix + 2] = baseColor[ix + 2] * m
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  }

  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
  }
}
