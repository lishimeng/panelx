import {
    AmbientLight,
    AxesHelper,
    Camera,
    Color,
    DirectionalLight,
    GridHelper,
    HemisphereLight,
    Light,
    Object3D,
    Scene,
    Vector2,
} from "three";
import {LayerDef} from "../LayerDef.ts";
import type {StoryBoard} from "../StoryBoard.ts";
import {CSS3DObjManager} from "./CSS3DObjManager.ts";
import type {Model} from "../model/Model.ts";

/** 可选场景配置：背景、灯光、相机（与 Scene3DConfig 对应字段一致） */
export interface Scene3DSceneOptions {
    /** 背景：undefined/null 透明，number 为十六进制颜色 */
    background?: number | null
    /** 灯光强度，不填用默认 */
    lights?: { ambient?: number; hemisphere?: number; directional?: number }
    /** 正交相机时可见高度的一半（世界单位），用于 resize 时更新投影 */
    orthographicSize?: number
}

export abstract class BaseStoryBoard implements StoryBoard {
    private readonly _name: string
    private _scene!: Scene
    windowSize: Vector2 = new Vector2()
    private readonly _camera: Camera
    children: Object3D[] = []
    private _fullScreen: boolean
    size?: Vector2
    _position?: Vector2
    innerStoryboards: StoryBoard[] = []
    _lightIntensity: number
    private readonly _sceneOptions?: Scene3DSceneOptions

    lightMap: Map<string, Light> = new Map()

    css3dManager: CSS3DObjManager = new CSS3DObjManager()
    protected constructor(name: string, camera: Camera, options?: Scene3DSceneOptions) {
        this._fullScreen = true
        this._lightIntensity = 1.8
        this._name = name
        this._camera = camera
        this._sceneOptions = options

        this.initScene()
        this.initLight()
        this.initAxesHelper()
        this.camera.layers.enableAll()
    }

    get name(): string {
        return this._name
    }
    get scene(): Scene {
        return this._scene
    }
    get camera(): Camera {
        return this._camera
    }
    get fullScreen(): boolean {
        return this._fullScreen
    }
    get position(): Vector2 | undefined {
        return this._position
    }
    onWindowResize(size: Vector2): void {
        this.windowSize = size
        const cam = this.camera as {
            aspect?: number
            left?: number
            right?: number
            top?: number
            bottom?: number
            updateProjectionMatrix?: () => void
        }
        const aspect = size.x / size.y
        const orthoSize = this._sceneOptions?.orthographicSize
        if (orthoSize != null && cam.left !== undefined && cam.right !== undefined && cam.top !== undefined && cam.bottom !== undefined) {
            cam.left = -orthoSize * aspect
            cam.right = orthoSize * aspect
            cam.top = orthoSize
            cam.bottom = -orthoSize
        } else if (cam.aspect != null) {
            cam.aspect = aspect
        }
        if (cam.updateProjectionMatrix) cam.updateProjectionMatrix()
    }
    changeSize(position: Vector2, size: Vector2): void {
        this._position = position
        this.size = size
        this._fullScreen = false
    }
    useFullScreen(): void {
        this._fullScreen = true
    }
    private initScene(): void {
        this._scene = new Scene()
        const bg = this._sceneOptions?.background
        this._scene.background = (bg !== undefined && bg !== null) ? new Color(bg) : null
        const gridHelper = new GridHelper(300, 300, 0x2c2c2c, 0x888888)

        gridHelper.layers.set(LayerDef.helper)
        this._scene.add(gridHelper)
    }
    private initAxesHelper(): void {
        const axesHelper = new AxesHelper(5)
        axesHelper.layers.set(LayerDef.helper)
        this._scene.add(axesHelper)
    }

    private initLight(): void {
        const ambientLight = new AmbientLight(0xffffff, 1.8 * this._lightIntensity)
        ambientLight.layers.enableAll()
        this._scene.add(ambientLight)
        this.lightMap.set('ambientLight', ambientLight)

        const hesLight = new HemisphereLight(0xffffff, 0xaaaaaa)
        hesLight.intensity = 2 * this._lightIntensity
        hesLight.layers.enableAll()
        this._scene.add(hesLight)
        this.lightMap.set('hesLight', hesLight)

        const dirLight = new DirectionalLight(0xffffff, 2.5 * this._lightIntensity)
        dirLight.position.set(5, 5, 5)
        dirLight.layers.enableAll()
        this._scene.add(dirLight)
        this.lightMap.set('dirLight', dirLight)

        const lights = this._sceneOptions?.lights
        if (lights) {
            console.log('lights', lights)
            if (lights.ambient != null) {
                this.lightMap.get('ambientLight')!.intensity = lights.ambient
                console.log('ambientLight', this.lightMap.get('ambientLight')!.intensity)
            }
            if (lights.hemisphere != null) {
                this.lightMap.get('hesLight')!.intensity = lights.hemisphere
                console.log('hesLight', this.lightMap.get('hesLight')!.intensity)
            }
            if (lights.directional != null) {
                this.lightMap.get('dirLight')!.intensity = lights.directional
                console.log('dirLight', this.lightMap.get('dirLight')!.intensity)
            }
        }
    }

    changeLight(lightName: string, intensity: number): void {
        this.lightMap.get(lightName)!.intensity = intensity
        console.log('changeLight', lightName, intensity)
    }
    getInnerStoryBoards(): StoryBoard[] {
        return this.innerStoryboards
    }
    addStoryboard(sb: StoryBoard): void {
        this.innerStoryboards.push(sb)
    }

    /**
     * 添加
     * @param m
     */
    addModel(m: Model) {
       if (m.scene) {
           if (m.isCss3d) this.css3dManager.register(m.scene)
           this.add(m.scene)
       }
    }

    /**
     * 添加到场景中
     * @param obj
     */
    add(obj: Object3D): void {
        this.children.push(obj)
        this._scene.add(obj)
    }

    getSize(): Vector2 {
        return this.size ?? this.windowSize.clone()
    }

    update(delta: number) {
        if (this.innerStoryboards.length == 0) {
            return
        }
        for (let i = 0; i < this.innerStoryboards.length; i++) {
            let item = this.innerStoryboards[i]
            item.update(delta)
        }
    }

    updateControls(): void {
    }

    destroy(): void {

    }

    onActivate(): void {
        this.css3dManager.onActivate()
        this.innerStoryboards.forEach((sb: StoryBoard) => {
            sb.onActivate()
        })
    }
    onDeactivate(): void {
        this.css3dManager.onDeactivate()
        this.innerStoryboards.forEach((sb: StoryBoard) => {
            sb.onDeactivate()
        })
    }
}