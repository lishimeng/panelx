import { ref } from 'vue'
import { Vector3 } from 'three'
import type { Model } from '../../framework'
import type { CommandRequest, PropertyJsonExecuteRequest, PropertyRequest } from '../../types'
import { CommandManager } from '../../utils/CommandManager'
import { PropertyManager } from '../../utils/PropertyManager'
import { create3DCommandHandlers } from '../../utils/manager3DCommandHandlers'
import { create3DPropertyHandlers } from '../../utils/manager3DHandlers'
import { register3DCommandHandlers, register3DPropertyHandlers } from '../../utils/manager3DRegistry'

type AutoRotatePayload = { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }

type UseEditor3DManagersOptions = {
  getModelById: (id: string) => Model | null
  mapMoveParamsToWorld: (params: Record<string, unknown>) => Vector3
  resolveAnchorId: (params: Record<string, unknown>) => string
  onAnchorResolved: (targetWorld: Vector3) => void
  onApplyAutoRotate: (id: string, next: AutoRotatePayload) => void
}

export function useEditor3DManagers(options: UseEditor3DManagersOptions) {
  const commandManager = new CommandManager()
  const propertyManager = new PropertyManager()

  const propertyRequestJson = ref('{"key":"model.visible","id":"model-id","params":{"visible":true}}')
  const propertyRequestError = ref('')
  let propertyRequestErrorTimer: ReturnType<typeof setTimeout> | null = null

  register3DCommandHandlers(
    commandManager,
    create3DCommandHandlers({
      getModelById: options.getModelById,
      mapMoveParamsToWorld: options.mapMoveParamsToWorld,
      resolveAnchorId: options.resolveAnchorId,
      onAnchorResolved: options.onAnchorResolved,
      onApplyAutoRotate: options.onApplyAutoRotate
    })
  )

  register3DPropertyHandlers(propertyManager, create3DPropertyHandlers(options.getModelById))

  function executeCommand(req: CommandRequest): void {
    commandManager.execute(req)
  }

  function executeProperty(req: PropertyJsonExecuteRequest): void {
    const setPropertyError = (message: string): void => {
      propertyRequestError.value = message
      if (propertyRequestErrorTimer) clearTimeout(propertyRequestErrorTimer)
      propertyRequestErrorTimer = setTimeout(() => {
        propertyRequestError.value = ''
        propertyRequestErrorTimer = null
      }, 3000)
    }

    const raw = String(req?.json ?? '').trim()
    if (!raw) {
      const msg = '[Editor3D] executeProperty: 请求 JSON 不能为空'
      console.error(msg)
      setPropertyError('请求 JSON 不能为空')
      return
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PropertyRequest>
      const key = String(parsed?.key ?? '').trim()
      const id = String(parsed?.id ?? '').trim()
      if (!key || !id) {
        const msg = '[Editor3D] executeProperty: JSON 必须包含非空 key 和 id'
        console.error(msg, parsed)
        setPropertyError('JSON 必须包含非空 key 和 id')
        return
      }
      propertyRequestError.value = ''
      propertyManager.execute({ key, id, params: parsed?.params })
    } catch (err) {
      const msg = '[Editor3D] executeProperty: JSON 解析失败'
      console.error(msg, err)
      setPropertyError('JSON 解析失败')
    }
  }

  function cleanupEditor3DManagers(): void {
    if (propertyRequestErrorTimer) {
      clearTimeout(propertyRequestErrorTimer)
      propertyRequestErrorTimer = null
    }
  }

  return {
    propertyRequestJson,
    propertyRequestError,
    executeCommand,
    executeProperty,
    cleanupEditor3DManagers
  }
}

