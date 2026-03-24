import type { PropertyRequest } from '../types'
import type { Model } from '../framework'
import { degToRad } from './angle'
import { toFiniteNumber, toPositiveNumber } from './number'

type ModelGetter = (id: string) => Model | null | undefined

export function create3DPropertyHandlers(getModelById: ModelGetter): {
  propUpdate: (req: PropertyRequest) => void
  position: (req: PropertyRequest) => void
  rotationDeg: (req: PropertyRequest) => void
  scale: (req: PropertyRequest) => void
  visible: (req: PropertyRequest) => void
} {
  const propUpdate = (req: PropertyRequest): void => {
    const p = (req.params ?? {}) as Record<string, unknown>
    const model = getModelById(req.id)
    const propKey = typeof p.propKey === 'string' ? p.propKey : ''
    if (!model || !propKey) return
    model.propUpdate(propKey, p.value)
  }

  const position = (req: PropertyRequest): void => {
    const p = (req.params ?? {}) as Record<string, unknown>
    const model = getModelById(req.id)
    if (!model?.scene) return
    model.scene.position.set(
      toFiniteNumber(p.x, model.scene.position.x),
      toFiniteNumber(p.y, model.scene.position.y),
      toFiniteNumber(p.z, model.scene.position.z)
    )
  }

  const rotationDeg = (req: PropertyRequest): void => {
    const p = (req.params ?? {}) as Record<string, unknown>
    const model = getModelById(req.id)
    if (!model?.scene) return
    model.scene.rotation.set(
      degToRad(toFiniteNumber(p.x, 0)),
      degToRad(toFiniteNumber(p.y, 0)),
      degToRad(toFiniteNumber(p.z, 0))
    )
  }

  const scale = (req: PropertyRequest): void => {
    const p = (req.params ?? {}) as Record<string, unknown>
    const model = getModelById(req.id)
    if (!model?.scene) return

    const scalar = toPositiveNumber(p.scale, -1)
    if (scalar > 0) {
      model.scene.scale.setScalar(scalar)
      return
    }
    model.scene.scale.set(
      Math.max(0.0001, toFiniteNumber(p.x, model.scene.scale.x)),
      Math.max(0.0001, toFiniteNumber(p.y, model.scene.scale.y)),
      Math.max(0.0001, toFiniteNumber(p.z, model.scene.scale.z))
    )
  }

  const visible = (req: PropertyRequest): void => {
    const p = (req.params ?? {}) as Record<string, unknown>
    const model = getModelById(req.id)
    if (!model?.scene) return
    model.scene.visible = Boolean(p.visible)
  }

  return { propUpdate, position, rotationDeg, scale, visible }
}

