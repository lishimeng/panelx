import { ref } from 'vue'
import { Vector3 } from 'three'
import type { Model } from '../../framework'
import type { CommandRequest, PropertyJsonExecuteRequest, PropertyRequest } from '../../types'
import { CommandManager } from '../../utils/CommandManager'
import { PropertyManager } from '../../utils/PropertyManager'
import { create3DCommandHandlers } from '../../utils/manager3DCommandHandlers'
import { create3DPropertyHandlers } from '../../utils/manager3DHandlers'
import { register3DCommandHandlers, register3DPropertyHandlers } from '../../utils/manager3DRegistry'
import { StreamEngine } from '../../utils/StreamEngine'
import { SpawnSource } from '../../utils/controlSources'

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
  const controlEngine = new StreamEngine(commandManager, propertyManager)
  const controlEngineStatus = ref(controlEngine.getStatus())

  const demoSource = new SpawnSource({
    sourceId: 'editor-demo-auto-rotate',
    intervalMs: 2000,
    produce: () => ({
      header: { domain: '3d', action: 'command' },
      payload: {
        kind: 'command',
        request: {
          key: 'editor3d.applyAutoRotateToSelected',
          id: 'demo-robot',
          params: { enabled: true, axis: 'y', speedDeg: 30 }
        }
      }
    })
  })
  controlEngine.registerSource(demoSource)

  function syncEngineStatus(): void {
    controlEngineStatus.value = controlEngine.getStatus()
  }

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
        const msg = '[Editor3D] executeProperty: JSON 必须包含非空 key �?id'
        console.error(msg, parsed)
        setPropertyError('JSON 必须包含非空 key �?id')
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
    void controlEngine.dispose()
    syncEngineStatus()
  }

  async function startControlEngine(): Promise<void> {
    await controlEngine.start()
    syncEngineStatus()
  }

  function stopControlEngine(): void {
    controlEngine.stop()
    syncEngineStatus()
  }

  function pauseControlEngine(): void {
    controlEngine.pause()
    syncEngineStatus()
  }

  function resumeControlEngine(): void {
    controlEngine.resume()
    syncEngineStatus()
  }

  function registerControlSource(source: Parameters<StreamEngine['registerSource']>[0]): void {
    controlEngine.registerSource(source)
  }

  return {
    propertyRequestJson,
    propertyRequestError,
    controlEngineStatus,
    startControlEngine,
    stopControlEngine,
    pauseControlEngine,
    resumeControlEngine,
    registerControlSource,
    executeCommand,
    executeProperty,
    cleanupEditor3DManagers
  }
}

