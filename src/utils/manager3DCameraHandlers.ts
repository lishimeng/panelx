import type { CameraRequest } from '../types'
import { toFiniteNumber, toPositiveNumber } from './number'

type CameraLike = {
  position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }
  zoom?: number
  updateProjectionMatrix?: () => void
  lookAt?: (x: number, y: number, z: number) => void
}

type Create3DCameraHandlersOptions = {
  getCamera: () => CameraLike | null
}

export function create3DCameraHandlers(options: Create3DCameraHandlersOptions): {
  moveTo: (req: CameraRequest) => void
  zoomTo: (req: CameraRequest) => void
} {
  let stopMoveAnim: (() => void) | null = null

  const moveTo = (req: CameraRequest): void => {
    const cam = options.getCamera()
    if (!cam) return
    const p = (req.params ?? {}) as Record<string, unknown>
    const x0 = cam.position.x
    const y0 = cam.position.y
    const z0 = cam.position.z
    const x1 = toFiniteNumber(p.x, x0)
    const y1 = toFiniteNumber(p.y, y0)
    const z1 = toFiniteNumber(p.z, z0)
    const durationMs = toPositiveNumber(p.durationMs, 1000)
    stopMoveAnim?.()
    stopMoveAnim = null

    if (durationMs <= 1) {
      cam.position.set(x1, y1, z1)
      if (p.lookAt && typeof p.lookAt === 'object') {
        const lk = p.lookAt as Record<string, unknown>
        cam.lookAt?.(toFiniteNumber(lk.x, 0), toFiniteNumber(lk.y, 0), toFiniteNumber(lk.z, 0))
      }
      return
    }

    let stopped = false
    const startedAt = performance.now()
    const step = (now: number) => {
      if (stopped) return
      const t = Math.max(0, Math.min(1, (now - startedAt) / durationMs))
      cam.position.set(
        x0 + (x1 - x0) * t,
        y0 + (y1 - y0) * t,
        z0 + (z1 - z0) * t
      )
      if (p.lookAt && typeof p.lookAt === 'object') {
        const lk = p.lookAt as Record<string, unknown>
        cam.lookAt?.(toFiniteNumber(lk.x, 0), toFiniteNumber(lk.y, 0), toFiniteNumber(lk.z, 0))
      }
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    stopMoveAnim = () => {
      stopped = true
    }
  }

  const zoomTo = (req: CameraRequest): void => {
    const cam = options.getCamera()
    if (!cam || typeof cam.zoom !== 'number') return
    const p = (req.params ?? {}) as Record<string, unknown>
    const z = toPositiveNumber(p.zoom, cam.zoom)
    cam.zoom = z
    cam.updateProjectionMatrix?.()
  }

  return { moveTo, zoomTo }
}

