/**
 * PanelX 3D 框架入口
 * 封装 World / StoryBoard / Loader / Model 等，供大屏 3D 场景使用
 */

export { World } from './World'
export { setup3D } from './WorldSetup'
export type { StoryBoard, StoryBoardController } from './StoryBoard'
export { Loader } from './Loder'
export { BaseStoryBoard } from './storyboard/BaseStoryBoard'
export { SimpleStoryBoard } from './storyboard/SimpleStoryBoard'
export { ControlsStoryBoard } from './storyboard/ControlsStoryBoard'
export { SpriteStoryBoard } from './storyboard/SpriteStoryBoard'
export { Model } from './model/Model'
export { ModelLoadable } from './model/ModelLoadable'
export { SimpleModel } from './model/SimpleModel'
export { ModelTemplateStore } from './ModelTemplateStore'
/** @deprecated 使用 {@link ModelTemplateStore} */
export { ModelTemplateStore as ModelInstanceStore } from './ModelTemplateStore'
export { ModelRegistry, modelRegistry } from './model/ModelRegistry'
export type { ModelTypeDefinition, ModelRegistryCreateConfig, PropDefinition } from './model/ModelRegistry'
export {
  registerLoadableModelDefinitions,
  getLoadableModelDefinitions
} from './model/loadableRegistration'
export type { LoadableModelDefinition } from './model/loadableRegistration'
export { registerLocalModelModules } from './model/localModelRegistration'
export type { LocalModelModule } from './model/localModelRegistration'
import './model/registerBuiltins'
export { LayerDef } from './LayerDef'
export {
  ORTHOGRAPHIC_FRUSTUM_SCALE,
  orthographicHalfFromWorldSize,
  initialOrthographicZoomFromWorldSize,
  minOrthographicOrbitDistanceFromWorldSize,
  worldSizeHasPositiveExtent,
  ORTHOGRAPHIC_N_CLIP,
  ORTHOGRAPHIC_F_CLIP,
  type WorldSizeLike
} from './orthographicView'
export { FrequencyManager } from './FrequencyManager'
export { StatsWrapper } from './StatsWrapper'
export { genOrthographicCamera } from './Cameras'
export { debugEnabled, bindConfig, releaseMesh, Format, StaticConfig } from './util'
export type { Director } from './Director'
export { BaseDirector } from './director/BaseDirector'
export { FrameManager, FrameItem } from './director/FrameManager'
export { SceneDirector } from './director/SceneDirector'
