import { Vector3 } from 'three'
import type { BaseStoryBoard } from '../framework/storyboard/BaseStoryBoard'
import type { Model } from '../framework/model/Model'
import { designInputToWorldXZ, worldXZToDesignInput } from './coord3d'

/**
 * Editor3D 右侧命令区的“执行逻辑”集合。
 * 说明：Editor3D 负责维护 UI 状态（selectedWidgetId / moveCmd / rotateCmd / anchorWidgetId 等），
 * 这里负责把这些状态映射为对 Model 的操作（rotateTo / moveTo / autoRotate / 移动到锚点）。
 */
export type RotateCmdLike = { x: number; y: number; z: number; speed: number }
export type AutoRotateCmdLike = { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }
export type MoveCmdLike = { x: number; y: number; z: number; speed: number }
export type DesignCoordLike = { enabled: boolean; originX: number; originY: number }

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 按 storyboard 里的 modelName 获取对应的 Model 实例。 */
function getModelById(storyboard: BaseStoryBoard | null, id: string | null): Model | undefined {
  if (!id) return undefined
  return storyboard?.getModelByName(id)
}

/**
 * 执行一次“旋转到（角度）”命令。
 * - Editor 输入为角度（deg），Model 内部使用弧度（rad）。
 */
export function runRotateToOnceCommand(params: {
  selectedWidgetId: string | null
  storyboard: BaseStoryBoard | null
  rotateCmd: RotateCmdLike
}): void {
  const { selectedWidgetId, storyboard, rotateCmd } = params
  const model = getModelById(storyboard, selectedWidgetId)
  if (!model) return

  model.setRotateSpeed(Number.isFinite(rotateCmd.speed) ? rotateCmd.speed : Math.PI)
  // Editor 输入为“角度”，Model 内部使用“弧度”
  model.rotateTo(new Vector3(degToRad(rotateCmd.x || 0), degToRad(rotateCmd.y || 0), degToRad(rotateCmd.z || 0)))
}

/**
 * 将当前选中模型的“自旋转”配置应用到 Model，并同步写入 custom props，
 * 以便导出/导入后行为一致。
 */
export function applyAutoRotateToSelectedCommand(params: {
  selectedWidgetId: string | null
  storyboard: BaseStoryBoard | null
  autoRotateCmd: AutoRotateCmdLike
  setAutoRotateSettingsToCustom: (id: string, next: { enabled?: boolean; axis?: 'x' | 'y' | 'z'; speedDeg?: number }) => void
}): void {
  const { selectedWidgetId, storyboard, autoRotateCmd, setAutoRotateSettingsToCustom } = params
  const model = getModelById(storyboard, selectedWidgetId)
  if (!model) return

  const axis = autoRotateCmd.axis
  const axisVec = axis === 'x' ? new Vector3(1, 0, 0) : axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
  model.setAutoRotateAxis(axisVec)
  model.setAutoRotateSpeed(degToRad(autoRotateCmd.speedDeg || 0))
  model.setAutoRotateEnabled(Boolean(autoRotateCmd.enabled))

  setAutoRotateSettingsToCustom(selectedWidgetId!, {
    enabled: Boolean(autoRotateCmd.enabled),
    axis,
    speedDeg: autoRotateCmd.speedDeg
  })
}

/**
 * 执行一次“移动到（指定坐标）”命令。
 * - 若启用了设计坐标系（designCoord.enabled），则把 Editor 的 (x,z) 输入换算到 world 坐标；
 * - 否则直接把 (x,y,z) 作为 world 坐标使用。
 */
export function runMoveToOnceCommand(params: {
  selectedWidgetId: string | null
  storyboard: BaseStoryBoard | null
  moveCmd: MoveCmdLike
  designCoord: DesignCoordLike
  worldScale: number
}): void {
  const { selectedWidgetId, storyboard, moveCmd, designCoord, worldScale } = params
  const model = getModelById(storyboard, selectedWidgetId)
  if (!model) return

  model.setMoveSpeed(Number.isFinite(moveCmd.speed) ? moveCmd.speed : 1)

  if (designCoord.enabled) {
    const xz = designInputToWorldXZ(
      moveCmd.x || 0,
      moveCmd.z || 0,
      designCoord.originX,
      designCoord.originY,
      worldScale
    )
    model.moveTo(new Vector3(xz.x, moveCmd.y || 0, xz.z))
  } else {
    model.moveTo(new Vector3(moveCmd.x || 0, moveCmd.y || 0, moveCmd.z || 0))
  }
}

/**
 * 执行一次“移动到锚点（anchor）”命令。
 * - 目标位置：读取 anchor 模型当前的 scene.position；
 * - 写入到 moveCmd（同时复用 runMoveToOnceCommand 的移动速度与坐标系逻辑）。
 */
export function runMoveToAnchorOnceCommand(params: {
  selectedWidgetId: string | null
  anchorWidgetId: string | null
  storyboard: BaseStoryBoard | null
  moveCmd: MoveCmdLike
  designCoord: DesignCoordLike
  worldScale: number
}): void {
  const { selectedWidgetId, anchorWidgetId, storyboard, moveCmd, designCoord, worldScale } = params
  const srcModel = getModelById(storyboard, selectedWidgetId)
  const anchorModel = getModelById(storyboard, anchorWidgetId)
  if (!srcModel || !anchorModel) return

  const targetPos = anchorModel.scene?.position
  if (!targetPos) return

  // 把 anchor 的世界坐标转换为 moveCmd 输入坐标（若启用设计坐标系）
  if (designCoord.enabled) {
    const xz = worldXZToDesignInput(targetPos.x, targetPos.z, designCoord.originX, designCoord.originY, worldScale)
    moveCmd.x = xz.x
    moveCmd.z = xz.y
    moveCmd.y = targetPos.y
  } else {
    moveCmd.x = targetPos.x
    moveCmd.y = targetPos.y
    moveCmd.z = targetPos.z
  }

  // 复用 moveTo 一致的速度与 moveCmd 的坐标换算逻辑
  runMoveToOnceCommand({ selectedWidgetId, storyboard, moveCmd, designCoord, worldScale })
}

