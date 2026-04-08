import { type GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { LoadingManager, Mesh, Object3D, Scene, Texture, TextureLoader } from 'three'
import { ModelTemplateStore } from './ModelTemplateStore.ts'
import { ModelLoadable } from './model/ModelLoadable.ts'
import type { Model } from './model/Model.ts'

const DEFAULT_VISIBLE_COLOR = 0x888888

/** 带 color 和可选的 PBR/emissive 的材质类型 */
type MaterialWithColor = import('three').Material & {
    color?: { getHex: () => number; setHex: (n: number) => void }
    metalness?: number
    roughness?: number
    emissive?: { setHex: (n: number) => void }
    emissiveIntensity?: number
}

function ensureMaterialsVisible(root: Object3D): void {
    root.traverse((obj: Object3D) => {
        if (!(obj as Mesh).isMesh) return
        const mesh = obj as Mesh
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of materials) {
            if (!mat) continue
            const m = mat as MaterialWithColor
            // 纯黑或极暗的 color 用中性灰兜底
            if (m.color && typeof m.color.getHex === 'function') {
                const hex = m.color.getHex()
                if (hex === 0 || hex < 0x111111) {
                    m.color.setHex(DEFAULT_VISIBLE_COLOR)
                }
            }
            // PBR：无环境贴图时高 metalness 会发黑，降低 metalness 让 base color 显色（绿/白等）
            if (typeof m.metalness === 'number') {
                m.metalness = Math.min(m.metalness, 0.25)
            }
            if (typeof m.roughness === 'number') {
                m.roughness = Math.max(m.roughness, 0.5)
            }
            // 用 base color 补一点自发光，确保绿/白等非红材质在光照不足时也能看见
            if (m.color && typeof m.color.getHex === 'function' && m.emissive && typeof m.emissive.setHex === 'function') {
                m.emissive.setHex(m.color.getHex())
                if (typeof m.emissiveIntensity === 'number') {
                    m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.15)
                } else {
                    (m as MaterialWithColor).emissiveIntensity = 0.15
                }
            }
        }
    })
}

export class Loader {

    manager: LoadingManager
    gltfLoader: GLTFLoader
    fbxLoader: FBXLoader
    textureLoader: TextureLoader

    afterLoadComplete: () => void

    private readonly modelTemplateStore: ModelTemplateStore

    constructor(onCompleted: () => void) {
        this.afterLoadComplete = onCompleted
        this.modelTemplateStore = new ModelTemplateStore()
        this.manager = new LoadingManager()

        this.manager.onStart = (source: string, loaded: number, total: number) => {
            console.log("on_start", source, loaded, total)
        }
        this.manager.onLoad = () => {
            console.log('load completed')
            if (onCompleted) {
                onCompleted()
            }
        }
        this.manager.onProgress = (source: string, loaded: number, total: number) => {
            console.log('progress', loaded + '/' + total, source)
        }
        this.manager.onError = (source) => {
            console.log("load", source, "fail")
        }

        this.gltfLoader = new GLTFLoader(this.manager)
        this.fbxLoader = new FBXLoader(this.manager)
        this.textureLoader = new TextureLoader(this.manager)
    }

    getTemplateStore(): ModelTemplateStore {
        return this.modelTemplateStore
    }

    load(m: Model):boolean {
        let loadable = false
        if (m instanceof ModelLoadable) {
            loadable = true
            let model = m as ModelLoadable
            let category = model.modelCategory
            switch (category) {
                case 'gltf':
                    console.log('load gltf', model.source)
                    this.loadGltf(model.source, (obj: GLTF) => {
                        const scene = (obj.scene || obj.scenes?.[0]) as unknown as Scene
                        model.onLoad(scene, obj.animations)
                    })
                    break
                case 'fbx':
                    console.log('load fbx', model.source)
                    this.loadFbx(model.source, (group, animations) => {
                        ensureMaterialsVisible(group)
                        const scene = new Scene()
                        scene.add(group)
                        model.onLoad(scene, animations)
                    })
                    break
                case 'texture':
                console.log('load texture', model.source)
                this.loadTexture(model.source, (obj: Texture) => {
                    this.getTemplateStore().addTexture(model.modelName, obj)
                })
                break
            }
        }
        return loadable
    }

    loadModels() {
        let res = this.modelTemplateStore.getTemplateMap()
        let hasLoadable = false

        for (const [name, model] of res.entries()) {
            console.log("model:", name)
            let loadable = this.load(model)
            if (loadable) {
                hasLoadable = loadable
            }
        }
        if (!hasLoadable) { // 无加载类型
            if (this.afterLoadComplete) {
                this.afterLoadComplete()
            }
        }
    }

    loadGltf(source: string, h:(obj:GLTF)=>void) {
        this.gltfLoader.load(source, (gltf: GLTF) => {
            // console.log("加载gltf模型", source)
            // console.log(gltf)
            if (h) {
                h(gltf)
            }
        })
    }

    loadFbx(
        source: string,
        h: (group: import('three').Group, animations: import('three').AnimationClip[]) => void
    ): void {
        this.fbxLoader.load(
            source,
            (group) => {
                const animations = (group as unknown as { animations?: import('three').AnimationClip[] }).animations ?? []
                if (h) h(group, animations)
            },
            undefined,
            (err) => console.error('FBX load error', source, err)
        )
    }

    loadTexture(source: string, h: (obj: Texture) => void): void {
        this.textureLoader.load(source, (texture: Texture) => {
            if (h) h(texture)
        })
    }
}