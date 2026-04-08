import { Model } from './model/Model.ts'
import type { Object3D, Texture } from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

/**
 * 已加载模型的模板登记库（name → 母版 Model），语义为资源仓库而非「场景实例池」。
 * 入场景使用的独立实例请通过 {@link ModelTemplateStore.createModelInstance} 从母版克隆；
 * 已挂到 StoryBoard 的实例请用 `BaseStoryBoard.getModelByName`，勿与仓库克隆混淆。
 */
export class ModelTemplateStore {
  private readonly templates: Map<string, Model>
  private readonly texture: Map<string, Texture>

  constructor() {
    this.templates = new Map<string, Model>()
    this.texture = new Map<string, Texture>()
  }

  /** 母版登记 Map（可变引用）；值为已加载的模板 Model，非场景中的运行实例 */
  getTemplateMap(): Map<string, Model> {
    return this.templates
  }

  addModel(name: string, model: Model): void {
    this.templates.set(name, model)
  }

  /**
   * 按名称从登记库取出母版并深度克隆为新的 Model（含 scene / 骨骼等），每次调用返回新实例。
   */
  createModelInstance(name: string): Model | undefined {
    const m = this.templates.get(name)
    if (m == undefined) {
      return undefined
    }
    const model = m.clone()
    if (m.animationsClips && m.animationsClips?.length > 0) {
      model.setScene(SkeletonUtils.clone(m.scene!) as import('three').Scene)
    } else {
      const clonedScene = m.scene?.clone(true)
      if (clonedScene) model.setScene(clonedScene)
    }

    model.isCss3d = m.isCss3d
    model.modelName = m.modelName
    model.updateEnable = m.updateEnable
    model.layer = m.layer
    model.animationsClips = m.animationsClips
    model.initActions()
    if (model.layer.length > 0) {
      const firstLayer = model.layer[0]
      model.scene?.traverse((child: Object3D) => {
        if (!child) {
          return
        }
        child.layers.set(firstLayer)
        if (model.layer.length > 1) {
          for (const layerNumber of model.layer) {
            child.layers.enable(layerNumber)
          }
        }
      })
    }

    model.modelTemplateStore = this
    return model
  }

  addTexture(name: string, texture: Texture): void {
    this.texture.set(name, texture)
  }

  getTexture(name: string): Texture | undefined {
    return this.texture.get(name)
  }
}
