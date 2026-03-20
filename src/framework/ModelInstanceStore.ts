import {Model} from "./model/Model.ts";
import type {Object3D, Texture} from "three";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class ModelInstanceStore {
    private readonly r: Map<string, Model>
    private readonly texture: Map<string, Texture>

    constructor() {
        this.r = new Map<string, Model>()
        this.texture = new Map<string, Texture>()
    }

    getModels(): Map<string, Model> {
        return this.r
    }

    addModel(name: string, model: Model): void {
        this.r.set(name, model)
    }

    getModel(name: string): Model | undefined {
        let m = this.r.get(name)
        if (m == undefined) {
            return undefined
        }
        let model = m.clone()
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
            let firstLayer = model.layer[0]
            model.scene?.traverse((child: Object3D) => {
                if (!child) {
                    return
                }
                child.layers.set(firstLayer)
                if (model.layer.length > 1) {
                    for (let layerNumber of model.layer) {
                        child.layers.enable(layerNumber)
                    }
                }
            })
        }

        model.modelStore = this
        return model
    }

    addTexture(name: string, texture: Texture): void {
        this.texture.set(name, texture)
    }

    getTexture(name: string): Texture | undefined {
        return this.texture.get(name)
    }
}