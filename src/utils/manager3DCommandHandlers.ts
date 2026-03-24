import { Vector3 } from 'three'
import type { Model } from '../framework'
import type { CommandRequest } from '../types'
import { degToRad } from './angle'
import { toFiniteNumber } from './number'

type ModelGetter = (id: string) => Model | null | undefined

type Create3DCommandHandlersOptions = {
  getModelById: ModelGetter
  mapMoveParamsToWorld?: (params: Record<string, unknown>) => Vector3
  resolveAnchorId?: (params: Record<string, unknown>) => string
  onAnchorResolved?: (targetWorld: Vector3) => void
  onApplyAutoRotate?: (id: string, next: { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }) => void
}

function defaultResolveAnchorId(params: Record<string, unknown>): string {
  if (typeof params.anchorWidgetId === 'string') return params.anchorWidgetId
  if (typeof params.anchorId === 'string') return params.anchorId
  return ''
}

function defaultMapMoveParamsToWorld(params: Record<string, unknown>): Vector3 {
  return new Vector3(toFiniteNumber(params.x, 0), toFiniteNumber(params.y, 0), toFiniteNumber(params.z, 0))
}

export function create3DCommandHandlers(options: Create3DCommandHandlersOptions): {
  rotateTo: (req: CommandRequest) => void
  moveTo: (req: CommandRequest) => void
  moveToAnchor: (req: CommandRequest) => void
  applyAutoRotate: (req: CommandRequest) => void
} {
  const mapMoveParamsToWorld = options.mapMoveParamsToWorld ?? defaultMapMoveParamsToWorld
  const resolveAnchorId = options.resolveAnchorId ?? defaultResolveAnchorId

  const rotateTo = (req: CommandRequest): void => {
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(req.id)
    if (!model?.scene) return

    const xDeg = toFiniteNumber(params.x, 0)
    const yDeg = toFiniteNumber(params.y, 0)
    const zDeg = toFiniteNumber(params.z, 0)
    const speed = toFiniteNumber(params.speed, Math.PI)
    model.setRotateSpeed(speed)
    model.rotateTo(new Vector3(degToRad(xDeg), degToRad(yDeg), degToRad(zDeg)))
  }

  const moveTo = (req: CommandRequest): void => {
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(req.id)
    if (!model?.scene) return
    model.setMoveSpeed(toFiniteNumber(params.speed, 1))
    model.moveTo(mapMoveParamsToWorld(params))
  }

  const moveToAnchor = (req: CommandRequest): void => {
    const params = (req.params ?? {}) as Record<string, unknown>
    const src = options.getModelById(req.id)
    const anchorId = resolveAnchorId(params)
    const anchor = anchorId ? options.getModelById(anchorId) : null
    if (!src?.scene || !anchor?.scene) return

    const target = anchor.scene.position
    src.setMoveSpeed(toFiniteNumber(params.speed, 1))
    src.moveTo(new Vector3(target.x, target.y, target.z))
    options.onAnchorResolved?.(new Vector3(target.x, target.y, target.z))
  }

  const applyAutoRotate = (req: CommandRequest): void => {
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(req.id)
    if (!model?.scene) return

    const enabled = Boolean(params.enabled)
    const axisRaw = params.axis
    const axis = axisRaw === 'x' || axisRaw === 'y' || axisRaw === 'z' ? axisRaw : 'y'
    const speedDeg = toFiniteNumber(params.speedDeg, 30)
    const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
    model.setAutoRotateEnabled(enabled)
    model.setAutoRotateAxis(axisVec)
    model.setAutoRotateSpeed(degToRad(speedDeg))
    options.onApplyAutoRotate?.(req.id, { enabled, axis, speedDeg })
  }

  return { rotateTo, moveTo, moveToAnchor, applyAutoRotate }
}

