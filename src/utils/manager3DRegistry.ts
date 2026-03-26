import type { CameraRequest, CommandRequest, PropertyRequest } from '../types'
import type { CommandManager } from './CommandManager'
import type { CameraManager } from './CameraManager'
import type { PropertyManager } from './PropertyManager'

export const COMMAND_KEYS = {
  rotateTo: 'editor3d.rotateTo',
  moveTo: 'editor3d.moveTo',
  moveToAnchor: 'editor3d.moveToAnchor',
  applyAutoRotate: 'editor3d.applyAutoRotateToSelected'
} as const

export const PROPERTY_KEYS = {
  propUpdate: 'model.propUpdate',
  position: 'model.position',
  rotationDeg: 'model.rotationDeg',
  scale: 'model.scale',
  visible: 'model.visible'
} as const

export const CAMERA_KEYS = {
  moveTo: 'camera.moveTo',
  zoomTo: 'camera.zoomTo'
} as const

type CommandHandlerSet = {
  rotateTo: (req: CommandRequest) => void
  moveTo: (req: CommandRequest) => void
  moveToAnchor: (req: CommandRequest) => void
  applyAutoRotate: (req: CommandRequest) => void
}

type PropertyHandlerSet = {
  propUpdate: (req: PropertyRequest) => void
  position: (req: PropertyRequest) => void
  rotationDeg: (req: PropertyRequest) => void
  scale: (req: PropertyRequest) => void
  visible: (req: PropertyRequest) => void
}

type CameraHandlerSet = {
  moveTo: (req: CameraRequest) => void
  zoomTo: (req: CameraRequest) => void
}

export function register3DCommandHandlers(manager: CommandManager, handlers: CommandHandlerSet): void {
  manager.register(COMMAND_KEYS.rotateTo, handlers.rotateTo)
  manager.register(COMMAND_KEYS.moveTo, handlers.moveTo)
  manager.register(COMMAND_KEYS.moveToAnchor, handlers.moveToAnchor)
  manager.register(COMMAND_KEYS.applyAutoRotate, handlers.applyAutoRotate)
}

export function register3DPropertyHandlers(manager: PropertyManager, handlers: PropertyHandlerSet): void {
  manager.register(PROPERTY_KEYS.propUpdate, handlers.propUpdate)
  manager.register(PROPERTY_KEYS.position, handlers.position)
  manager.register(PROPERTY_KEYS.rotationDeg, handlers.rotationDeg)
  manager.register(PROPERTY_KEYS.scale, handlers.scale)
  manager.register(PROPERTY_KEYS.visible, handlers.visible)
}

export function register3DCameraHandlers(manager: CameraManager, handlers: CameraHandlerSet): void {
  manager.register(CAMERA_KEYS.moveTo, handlers.moveTo)
  manager.register(CAMERA_KEYS.zoomTo, handlers.zoomTo)
}

