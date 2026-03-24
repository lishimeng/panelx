import { reactive, ref, type Ref } from 'vue'
import type { Object3D } from 'three'
import type { DashboardConfig, WidgetConfig3D } from '../../types/dashboard'
import type { StoryBoard } from '../../framework'
import { BaseStoryBoard } from '../../framework/storyboard/BaseStoryBoard'
import { designInputToWorldXZ, worldXZToDesignInput } from '../../utils/coord3d'
import { degToRad } from '../../utils/angle'
import { toPositiveNumber } from '../../utils/number'

type PendingTransform = { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }

type UseEditor3DSelectionTransformOptions = {
  config: DashboardConfig
  storyboardRef: Ref<StoryBoard | null>
  addedModelNodes: Map<string, Object3D>
  pendingTransforms: Map<string, PendingTransform>
  designCoord: { enabled: boolean; originX: number; originY: number }
  worldScale: Ref<number>
}

export function useEditor3DSelectionTransform(options: UseEditor3DSelectionTransformOptions) {
  const selectedWidgetId = ref<string | null>(null)
  const anchorWidgetId = ref<string | null>(null)
  const selectedPosition = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const selectedScale = reactive<{ x: number; y: number; z: number }>({ x: 1, y: 1, z: 1 })
  const selectedScaleUniform = ref(1)
  const selectedRotation = reactive<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const axisLock = reactive<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false })

  function onSelectWidget(w: WidgetConfig3D): void {
    selectedWidgetId.value = w.id
    const pos = (w.props?.position as [number, number, number] | undefined) ?? [0, 0, 0]
    if (options.designCoord.enabled) {
      const ui = worldXZToDesignInput(pos[0] ?? 0, pos[2] ?? 0, options.designCoord.originX, options.designCoord.originY, options.worldScale.value)
      selectedPosition.x = ui.x
      selectedPosition.z = ui.y
    } else {
      selectedPosition.x = pos[0] ?? 0
      selectedPosition.z = pos[2] ?? 0
    }
    selectedPosition.y = pos[1] ?? 0

    const rawScale = (w.props?.scale as unknown) ?? 1
    let sx = 1
    let sy = 1
    let sz = 1
    if (Array.isArray(rawScale)) {
      sx = toPositiveNumber(rawScale[0], 1)
      sy = toPositiveNumber(rawScale[1], 1)
      sz = toPositiveNumber(rawScale[2], 1)
    } else if (typeof rawScale === 'number') {
      sx = sy = sz = toPositiveNumber(rawScale, 1)
    }
    selectedScale.x = sx
    selectedScale.y = sy
    selectedScale.z = sz
    selectedScaleUniform.value = sx

    const rot = (w.props?.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
    selectedRotation.x = rot[0] ?? 0
    selectedRotation.y = rot[1] ?? 0
    selectedRotation.z = rot[2] ?? 0
  }

  function onPositionInputChange(axis: 'x' | 'y' | 'z'): void {
    const id = selectedWidgetId.value
    if (!id) return
    if (axisLock[axis]) return
    const w = options.config.widgets3D?.find((item) => item.id === id)
    if (!w) return
    if (!w.props) w.props = {}
    const pos = (w.props.position as [number, number, number] | undefined) ?? [0, 0, 0]
    const currentWorld: [number, number, number] = [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0]

    let nextWorld: [number, number, number] = [...currentWorld] as [number, number, number]
    if (options.designCoord.enabled) {
      const xz = designInputToWorldXZ(
        Number(selectedPosition.x) || 0,
        Number(selectedPosition.z) || 0,
        options.designCoord.originX,
        options.designCoord.originY,
        options.worldScale.value
      )
      nextWorld = [xz.x, Number(selectedPosition.y) || 0, xz.z]
    } else {
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
      const value = axis === 'x' ? selectedPosition.x : axis === 'y' ? selectedPosition.y : selectedPosition.z
      nextWorld[idx] = Number(value) || 0
    }

    w.props.position = nextWorld
    const obj = options.addedModelNodes.get(id)
    if (obj) obj.position.set(nextWorld[0], nextWorld[1], nextWorld[2])
  }

  function updateSelectedWidgetScale(scaleVec: [number, number, number]): void {
    const id = selectedWidgetId.value
    if (!id) return
    const w = options.config.widgets3D?.find((item) => item.id === id)
    if (!w) return
    if (!w.props) w.props = {}
    w.props.scale = scaleVec
    const obj = options.addedModelNodes.get(id)
    if (obj) {
      const sb = options.storyboardRef.value as BaseStoryBoard | null
      const model = sb?.getModelByName(id) as unknown as { isCss3d?: boolean } | undefined
      const mul = model?.isCss3d ? 0.01 : 1
      obj.scale.set(scaleVec[0] * mul, scaleVec[1] * mul, scaleVec[2] * mul)
    }
    const tf = options.pendingTransforms.get(id)
    if (tf) tf.scale = scaleVec
  }

  function onScaleUniformChange(): void {
    const s = toPositiveNumber(selectedScaleUniform.value, 1)
    selectedScale.x = s
    selectedScale.y = s
    selectedScale.z = s
    selectedScaleUniform.value = s
    updateSelectedWidgetScale([s, s, s])
  }

  function onScaleAxisChange(axis: 'x' | 'y' | 'z'): void {
    const sx = Number(selectedScale.x) || 1
    const sy = Number(selectedScale.y) || 1
    const sz = Number(selectedScale.z) || 1
    const vec: [number, number, number] = [sx, sy, sz]
    if (axis === 'x') vec[0] = sx
    else if (axis === 'y') vec[1] = sy
    else vec[2] = sz
    updateSelectedWidgetScale(vec)
  }

  function updateSelectedWidgetRotation(rotVec: [number, number, number]): void {
    const id = selectedWidgetId.value
    if (!id) return
    const w = options.config.widgets3D?.find((item) => item.id === id)
    if (!w) return
    if (!w.props) w.props = {}
    w.props.rotation = rotVec
    const obj = options.addedModelNodes.get(id)
    if (obj) obj.rotation.set(degToRad(rotVec[0]), degToRad(rotVec[1]), degToRad(rotVec[2]))
    const tf = options.pendingTransforms.get(id)
    if (tf) tf.rotation = rotVec
  }

  function onRotationAxisChange(axis: 'x' | 'y' | 'z'): void {
    const rx = Number(selectedRotation.x) || 0
    const ry = Number(selectedRotation.y) || 0
    const rz = Number(selectedRotation.z) || 0
    const vec: [number, number, number] = [rx, ry, rz]
    if (axis === 'x') vec[0] = rx
    else if (axis === 'y') vec[1] = ry
    else vec[2] = rz
    updateSelectedWidgetRotation(vec)
  }

  return {
    selectedWidgetId,
    anchorWidgetId,
    selectedPosition,
    selectedScale,
    selectedScaleUniform,
    selectedRotation,
    axisLock,
    onSelectWidget,
    onPositionInputChange,
    onScaleUniformChange,
    onScaleAxisChange,
    onRotationAxisChange
  }
}

