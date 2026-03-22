import {
    AdditiveBlending,
    HalfFloatType,
    Mesh,
    NoToneMapping,
    OrthographicCamera,
    PCFSoftShadowMap,
    PlaneGeometry,
    REVISION,
    Scene,
    ShaderMaterial,
    SRGBColorSpace,
    Uniform,
    Vector2,
    WebGLRenderTarget,
    WebGLRenderer
} from 'three'
import type { StoryBoard } from "./StoryBoard.ts"
import { FrequencyManager } from "./FrequencyManager.ts"
import { LayerDef } from "./LayerDef.ts"
import { StatsWrapper } from "./StatsWrapper.ts"
import { bindConfig } from "./util.ts"
import { CSS3DRenderer } from "three/examples/jsm/Addons.js"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const defaultUpdateFrequency = 1
const defaultBloom = { strength: 0.9, radius: 0.35, threshold: 0.8 }

export type BloomConfig = {
    strength?: number
    radius?: number
    threshold?: number
}

export class World {
    private storyBoardStore: StoryBoard[] = []
    private windowSize: Vector2 = new Vector2()
    private renderer!: WebGLRenderer
    private cssRenderer!: CSS3DRenderer
    private composer!: EffectComposer
    private renderPass!: RenderPass
    private bloomPass!: UnrealBloomPass
    private bloomEnabled: boolean = false
    /** 仅 Bloom 层参与泛光时：先存“纯 Bloom 层”图，再叠加“纯泛光”(composer-纯层) */
    private bloomLayerOnlyRT!: WebGLRenderTarget
    private bloomQuadScene!: Scene
    private bloomQuadCamera!: OrthographicCamera
    private bloomQuadMesh!: Mesh<PlaneGeometry, ShaderMaterial>
    private stats: StatsWrapper = new StatsWrapper()
    private container!: Element
    private contextLost: boolean = false

    private frequencyManager: FrequencyManager = new FrequencyManager(defaultUpdateFrequency)

    private windowSizeVersion = 0
    private boundResizeHandler = () => this.onWindowResize()

    constructor(selector: string) {
        let c = document.querySelector(selector)
        if (c == null) {
            console.log("no target", selector)
            return
        }
        this.container = c!
        let size = this.getSize()
        console.log("world size", size.x, size.y)

        this.init()
        this.animateLoop()

        bindConfig()
    }

    /**
     * world scene 的物理尺寸：优先使用容器自身尺寸，保证 canvas 与容器一致并占满
     */
    getSize(): Vector2 {
        const el = this.container as HTMLElement
        const w = el.clientWidth || (el.parentElement?.clientWidth ?? 0)
        const h = el.clientHeight || (el.parentElement?.clientHeight ?? 0)
        return new Vector2(w, h)
    }

    private init() {
        // 初始化渲染器
        this.initRender()
        // 监听场景大小改变，重新渲染尺寸
        window.addEventListener('resize', this.boundResizeHandler)


    }

    /**
     * 0.hide 1.show(fps) 2.showAll
     */
    statsStyle(style: number) {
        this.stats.statsStyle(style)
    }

    private animateLoop() {
        this.animate()
    }

    private initRender() {
        let size = this.getSize()
        this.renderer = new WebGLRenderer({antialias:true,alpha:true})//设置抗锯齿
        this.renderer.setClearAlpha(0)

        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.outputColorSpace = SRGBColorSpace
        // 关闭色调映射，保证写入 Composer 的是线性 HDR，Bloom 才能看到 >1 的亮度
        this.renderer.toneMapping = NoToneMapping
        this.renderer.toneMappingExposure = 1
        this.renderer.setSize(size.x, size.y)
        this.renderer.autoClear = false
        // this.renderer.setClearAlpha(0.1)
        // this.renderer.setClearColor(0x000000, 1)
        this.renderer.domElement.style.display = 'block'
        this.renderer.domElement.style.width = '100%'
        this.renderer.domElement.style.height = '100%'
        this.renderer.domElement.style.position = 'absolute'
        this.renderer.domElement.style.left = '0'
        this.renderer.domElement.style.top = '0'
        // 添加到容器
        this.container.appendChild(this.renderer.domElement)

        // ---------------------------------------------
        this.cssRenderer = new CSS3DRenderer()
        this.cssRenderer.setSize(size.x,size.y)
        this.cssRenderer.domElement.style.position = 'absolute'
        this.cssRenderer.domElement.style.top = '0'
        this.cssRenderer.domElement.style.left = '0'
        this.cssRenderer.domElement.style.right = '0'
        this.cssRenderer.domElement.style.bottom = '0'
        this.cssRenderer.domElement.style.width = '100%'
        this.cssRenderer.domElement.style.height = '100%'
        this.cssRenderer.domElement.style.pointerEvents = 'none'
        this.container.appendChild(this.cssRenderer.domElement)

        console.log('THREE.REVISION:', REVISION);

        console.log('WebGL支持级别:', this.renderer.getContext().getParameter(this.renderer.getContext().VERSION))
        // 生产构建关闭着色器错误检查，减轻驱动侧开销；开发时便于发现问题
        this.renderer.debug.checkShaderErrors = import.meta.env.DEV
        this.renderer.shadowMap.type = PCFSoftShadowMap; // 激活高级渲染特性

        // post-processing: bloom（仅对高亮像素生效）
        this.renderPass = new RenderPass(undefined as any, undefined as any)
        this.bloomPass = new UnrealBloomPass(
            new Vector2(size.x, size.y),
            defaultBloom.strength,
            defaultBloom.radius,
            defaultBloom.threshold
        )
        this.composer = new EffectComposer(this.renderer)
        this.composer.setPixelRatio(window.devicePixelRatio)
        this.composer.setSize(size.x, size.y)
        this.composer.addPass(this.renderPass)
        this.composer.addPass(this.bloomPass)
        this.composer.renderToScreen = false
        this.bloomLayerOnlyRT = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType })
        this.bloomLayerOnlyRT.texture.name = 'World.bloomLayerOnly'
        // 只叠加「泛光」= (Composer 输出 - 纯 Bloom 层)，避免底图粉红 + 整图叠加导致过曝发白
        this.bloomQuadCamera = new OrthographicCamera(-1, 1, 1, -1, -1, 1)
        this.bloomQuadScene = new Scene()
        this.bloomQuadMesh = new Mesh(
            new PlaneGeometry(2, 2),
            new ShaderMaterial({
                uniforms: {
                    tComposer: new Uniform(null as unknown as import('three').Texture),
                    tBloomLayer: new Uniform(null as unknown as import('three').Texture)
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tComposer;
                    uniform sampler2D tBloomLayer;
                    varying vec2 vUv;
                    void main() {
                        vec4 a = texture2D(tComposer, vUv);
                        vec4 b = texture2D(tBloomLayer, vUv);
                        gl_FragColor = max(vec4(0.0), a - b);
                    }
                `,
                depthTest: false,
                depthWrite: false,
                blending: AdditiveBlending,
                transparent: true
            })
        )
        this.bloomQuadScene.add(this.bloomQuadMesh)
        this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
            // 必须 preventDefault，否则浏览器可能不尝试恢复
            e.preventDefault()
            this.contextLost = true
            console.error("WebGL 上下文丢失！")
            console.log(e)
        })
        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.warn("WebGL 上下文已恢复")
            this.contextLost = false
            // three 会在恢复后继续工作，但部分资源可能需要业务侧重新加载/重建
        })
    }

    /**
     * 切换场景, 切换前的场景将会变成旧场景, 旧场景可以指定一个处理器做处理(destroy), 如果不指定处理器将默认执行destroy
     * @param storyBoard 新的场景
     * @param handleOldSb 旧场景处理器
     */
    sceneTo(storyBoard: StoryBoard, _handleOldSb?: (sb: StoryBoard)=>void) {
        this.storyBoardStore.push(storyBoard)
    }

    /** 供外部挂载 OrbitControls 等使用 */
    getRendererDom(): HTMLCanvasElement {
        return this.renderer.domElement
    }

    /** 设置 bloom 开关与参数（默认仅增强 emissive 高亮区域） */
    setBloom(enabled: boolean, cfg?: BloomConfig): void {
        this.bloomEnabled = enabled
        if (cfg?.strength != undefined) this.bloomPass.strength = cfg.strength
        if (cfg?.radius != undefined) this.bloomPass.radius = cfg.radius
        if (cfg?.threshold != undefined) this.bloomPass.threshold = cfg.threshold
    }

    /** 停止渲染并释放资源，组件卸载时调用 */
    destroy(): void {
        window.removeEventListener('resize', this.boundResizeHandler)
        this.renderer.setAnimationLoop(null)
        this.bloomLayerOnlyRT?.dispose()
        this.renderer.dispose()
        this.cssRenderer.domElement.remove()
        this.renderer.domElement.remove()
    }

    /**
     * 当前的场景
     * @private
     */
    private getSb(): StoryBoard|undefined {
        if (this.storyBoardStore.length == 0) {
            return undefined
        } else {
            return this.storyBoardStore[0]
        }
    }

    private render() {
        if (this.contextLost) {
            return
        }
        this.stats.update()
        let delta = this.frequencyManager.update()
        if (delta <= 0) {
            return
        }
        this.renderer.clear()
        let sb = this.getSb()
        if (!sb) {
            return
        }
        this.renderStoryboard(sb, delta)
        // 如果有子界面, 渲染子界面, 只嵌套处理一层
        let children = sb.getInnerStoryBoards()
        if (children != undefined && children.length > 0) {
            for (let i=0; i<children.length; i++) {
                let innerSb = children[i]
                this.renderStoryboard(innerSb, delta)
                this.renderer.clearDepth()
            }
        }

        this.windowSizeVersion = 0 // 重置resize标记

        // 执行"切换场景"命令后,下一帧执行切换
        if (this.storyBoardStore.length > 1) { // has old
            let sb = this.storyBoardStore.shift()
            if (!sb) {
                return
            }
        }
    }

    private renderStoryboard(sb: StoryBoard, delta: number) {
        if (this.windowSizeVersion > 0) {
            sb.onWindowResize(this.windowSize)
        }
        sb.update(delta)
        if (!sb.fullScreen) {
            let size = sb.getSize()
            let pos = sb.position
            this.renderer.setViewport(pos?.x ?? 0, pos?.y ?? 0, size.x, size.y)
        } else {
            let size = this.getSize()
            this.renderer.setViewport(0, 0, size.x, size.y)
        }
        if (this.bloomEnabled) {
            const cam = sb.camera
            const w = sb.fullScreen ? this.getSize().x : sb.getSize().x
            const h = sb.fullScreen ? this.getSize().y : sb.getSize().y
            // 保存相机当前图层（编辑器/运行时可能已限制可见层），避免被 enableAll 覆盖
            const savedLayersMask = cam.layers.mask
            // 1) 用当前相机图层渲染主场景（尊重相机图层开关）
            this.renderer.setRenderTarget(null)
            this.renderer.clear(true, true, false)
            this.renderer.render(sb.scene, cam)
            // 2) 仅 Bloom 层渲染到 RT，再进 Composer 得到「Bloom 层+泛光」
            //    且需尊重相机当前 mask：若相机未开启 Bloom 层，则不生成 Bloom 叠加
            const bloomBit = 1 << LayerDef.bloom
            const bloomEnabledInCamera = (savedLayersMask & bloomBit) !== 0
            cam.layers.mask = bloomEnabledInCamera ? bloomBit : 0
            const pr = window.devicePixelRatio
            this.bloomLayerOnlyRT.setSize(Math.round(w * pr), Math.round(h * pr))
            this.renderer.setRenderTarget(this.bloomLayerOnlyRT)
            this.renderer.clear(true, true, false)
            this.renderer.render(sb.scene, cam)
            this.renderPass.scene = sb.scene
            this.renderPass.camera = cam
            this.composer.setSize(w, h)
            this.composer.setPixelRatio(window.devicePixelRatio)
            this.composer.render()
            cam.layers.mask = savedLayersMask
            // 3) 只叠加「泛光」= composer - 纯 Bloom 层，避免粉红过曝成白
            this.bloomQuadMesh.material.uniforms.tComposer.value = this.composer.readBuffer.texture
            this.bloomQuadMesh.material.uniforms.tBloomLayer.value = this.bloomLayerOnlyRT.texture
            this.renderer.setRenderTarget(null)
            this.renderer.render(this.bloomQuadScene, this.bloomQuadCamera)
        } else {
            this.renderer.render(sb.scene, sb.camera)
        }
        this.cssRenderer.render(sb.scene, sb.camera)
    }

    private animate() {
        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    private onWindowResize() {
        let size = this.getSize()
        this.renderer.setSize(size.x, size.y)
        this.composer.setSize(size.x, size.y)
        this.bloomLayerOnlyRT.setSize(size.x, size.y)
        this.cssRenderer.setSize(size.x, size.y)
        this.windowSize = size
        this.windowSizeVersion++
    }

    /** 供外部在容器尺寸变化时调用，使 3D 画布与容器一致并居中 */
    notifyResize(): void {
        this.onWindowResize()
    }
}
