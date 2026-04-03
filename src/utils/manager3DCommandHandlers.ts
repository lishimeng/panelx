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

function targetIdFromRequest(req: CommandRequest): string | null {
  const id = String(req.id ?? '').trim()
  return id || null
}

function tryApplyForwardConfig(model: Model, params: Record<string, unknown>): void {
  const enable = params.forwardEnable
  if (typeof enable === 'boolean') model.setForwardEnabled(enable)
  const fx = params.forwardX
  const fy = params.forwardY
  const fz = params.forwardZ
  if (fx !== undefined || fy !== undefined || fz !== undefined) {
    model.setForwardAxis(
      new Vector3(
        toFiniteNumber(fx, 1),
        toFiniteNumber(fy, 0),
        toFiniteNumber(fz, 0)
      )
    )
  }
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
    const id = targetIdFromRequest(req)
    if (!id) return
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(id)
    if (!model?.scene) return

    const xDeg = toFiniteNumber(params.x, 0)
    const yDeg = toFiniteNumber(params.y, 0)
    const zDeg = toFiniteNumber(params.z, 0)
    const speed = toFiniteNumber(params.speed, Math.PI)
    model.setRotateSpeed(speed)
    model.rotateTo(new Vector3(degToRad(xDeg), degToRad(yDeg), degToRad(zDeg)))
  }

  const moveTo = (req: CommandRequest): void => {
    const id = targetIdFromRequest(req)
    if (!id) return
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(id)
    if (!model?.scene) return
    tryApplyForwardConfig(model, params)
    const target = mapMoveParamsToWorld(params)
    model.orientToTarget(target)
    model.setMoveSpeed(toFiniteNumber(params.speed, 1))
    model.moveTo(target)
  }

  const moveToAnchor = (req: CommandRequest): void => {
    const id = targetIdFromRequest(req)
    if (!id) return
    const params = (req.params ?? {}) as Record<string, unknown>
    const src = options.getModelById(id)
    const anchorId = resolveAnchorId(params)
    const anchor = anchorId ? options.getModelById(anchorId) : null
    if (!src?.scene || !anchor?.scene) return

    const srcObj = src.scene
    const target = anchor.scene.position
    console.log('[Editor3D.moveToAnchor.before]', {
      id,
      anchorId,
      current: { x: srcObj.position.x, y: srcObj.position.y, z: srcObj.position.z },
      target: { x: target.x, y: target.y, z: target.z },
      forwardEnable: typeof params.forwardEnable === 'boolean' ? params.forwardEnable : src.isForwardEnabled(),
      forwardAxis:
        params.forwardX !== undefined || params.forwardY !== undefined || params.forwardZ !== undefined
          ? {
              x: toFiniteNumber(params.forwardX, 1),
              y: toFiniteNumber(params.forwardY, 0),
              z: toFiniteNumber(params.forwardZ, 0)
            }
          : src.getForwardAxis(),
      rotationRad: { x: srcObj.rotation.x, y: srcObj.rotation.y, z: srcObj.rotation.z },
      quaternion: { x: srcObj.quaternion.x, y: srcObj.quaternion.y, z: srcObj.quaternion.z, w: srcObj.quaternion.w }
    })

    tryApplyForwardConfig(src, params)
    src.orientToTarget(target)
    console.log('[Editor3D.moveToAnchor.afterOrient]', {
      id,
      rotationRad: { x: srcObj.rotation.x, y: srcObj.rotation.y, z: srcObj.rotation.z },
      quaternion: { x: srcObj.quaternion.x, y: srcObj.quaternion.y, z: srcObj.quaternion.z, w: srcObj.quaternion.w }
    })
    src.setMoveSpeed(toFiniteNumber(params.speed, 1))
    src.moveTo(new Vector3(target.x, target.y, target.z))
    options.onAnchorResolved?.(new Vector3(target.x, target.y, target.z))
  }

  const applyAutoRotate = (req: CommandRequest): void => {
    const id = targetIdFromRequest(req)
    if (!id) return
    const params = (req.params ?? {}) as Record<string, unknown>
    const model = options.getModelById(id)
    if (!model?.scene) return

    const enabled = Boolean(params.enabled)
    const axisRaw = params.axis
    const axis = axisRaw === 'x' || axisRaw === 'y' || axisRaw === 'z' ? axisRaw : 'y'
    const speedDeg = toFiniteNumber(params.speedDeg, 30)
    const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
    model.setAutoRotateEnabled(enabled)
    model.setAutoRotateAxis(axisVec)
    model.setAutoRotateSpeed(degToRad(speedDeg))
    options.onApplyAutoRotate?.(id, { enabled, axis, speedDeg })
  }

  return { rotateTo, moveTo, moveToAnchor, applyAutoRotate }
}

