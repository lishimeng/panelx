import {AnimationAction, AnimationClip, AnimationMixer, Object3D, Scene, Vector3} from "three";
import {ModelInstanceStore} from "../ModelInstanceStore.ts";
import type { PropDefinition } from "./ModelRegistry";

export class Model extends Object3D{
    modelName: string
    scene?: Scene
    animationsClips?: AnimationClip[]
    updateEnable: boolean = false
    isCss3d: boolean = false
    modelStore?: ModelInstanceStore
    actions!: Map<string, AnimationAction>
    actionMixer!: AnimationMixer
    layer: number[] = []
    /** 模型自定义属性，由编辑器或配置传入，暂不在 Model 内部逻辑中使用 */
    props?: Record<string, unknown>
    /** 子类可覆盖：该模型支持的 prop 列表，用于编辑器展示与枚举/自由输入 */
    static supportedProps?: PropDefinition[]

    /** 旋转速度（弧度/秒），由 update 驱动 */
    private rotateSpeed: Vector3 = new Vector3(Math.PI, Math.PI, Math.PI)
    /** 旋转任务是否进行中：调用 rotate/rotateTo 后打开，到达目标后关闭 */
    rotating: boolean = false
    /** 旋转任务目标（欧拉角，弧度） */
    private rotateTarget?: Vector3
    /** 启动旋转任务时的初始剩余角度（用于 10% 收敛阈值） */
    private rotateInitialRemaining?: Vector3

    /** 移动速度（单位/秒），由 update 驱动 */
    private moveSpeed: Vector3 = new Vector3(1, 1, 1)
    /** 移动任务是否进行中：调用 move/moveTo 后打开，到达目标后关闭 */
    moving: boolean = false
    /** 移动任务目标位置 */
    private moveTarget?: Vector3
    /** 启动移动任务时的初始剩余距离（用于 10% 收敛阈值） */
    private moveInitialRemaining?: Vector3

    constructor(name: string) {
        super()
        this.modelName = name
    }

    setScene(scene: Scene) {
        this.scene = scene
    }
    setAnimations(animations?: AnimationClip[]) {
        if (animations) {
            this.animations = animations
            this.animationsClips = animations
        }
    }

    initActions(): void {
        this.actions = new Map()
        if (!this.animationsClips || !this.scene) {
            return
        }
        this.actionMixer = new AnimationMixer(this.scene)
        for (let i = 0; i < this.animationsClips.length; i++) {
            const clip = this.animationsClips[i] as AnimationClip
            const action = this.actionMixer.clipAction(clip)
            console.log('action', clip.name)
            this.actions.set(clip.name, action)
        }
        this.scene.traverse((child) => {
            const skinned = child as { isSkinnedMesh?: boolean; bind?: (s: unknown, m: unknown) => void; skeleton?: { needsUpdate: boolean }; bindMatrix?: unknown }
            if (skinned.isSkinnedMesh && skinned.bind && skinned.skeleton) {
                skinned.bind(skinned.skeleton, skinned.bindMatrix)
                skinned.skeleton.needsUpdate = true
            }
        })
    }



    setPosition(x: number, y: number, z: number) {
        this.scene?.position.set(x,y,z)
    }

    /**
     * 设置移动速度（单位/秒）。
     * - 传 number：三个轴同速
     * - 传 Vector3：分别设置 x/y/z
     */
    setMoveSpeed(speed: number | Vector3): void {
        if (typeof speed === 'number') {
            const s = Math.max(0, speed)
            this.moveSpeed.set(s, s, s)
            return
        }
        this.moveSpeed.set(Math.max(0, speed.x), Math.max(0, speed.y), Math.max(0, speed.z))
    }

    /** 移动：参数为增量向量（xyz 各自的位移）。等价于 moveTo(current + delta) */
    move(delta: Vector3): void {
        const obj = this.scene ?? this
        const target = new Vector3(obj.position.x + delta.x, obj.position.y + delta.y, obj.position.z + delta.z)
        this.moveTo(target)
    }

    /** 移动到：参数为最终位置向量。由 update 执行任务 */
    moveTo(target: Vector3): void {
        const obj = this.scene ?? this
        const current = obj.position.clone()
        const remaining = new Vector3(target.x - current.x, target.y - current.y, target.z - current.z)
        this.moveTarget = target.clone()
        this.moveInitialRemaining = new Vector3(Math.abs(remaining.x), Math.abs(remaining.y), Math.abs(remaining.z))
        this.moving = true
    }

    /**
     * 设置旋转速度（弧度/秒）。
     * - 传 number：三个轴同速
     * - 传 Vector3：分别设置 x/y/z
     */
    setRotateSpeed(speed: number | Vector3): void {
        if (typeof speed === 'number') {
            const s = Math.max(0, speed)
            this.rotateSpeed.set(s, s, s)
            return
        }
        this.rotateSpeed.set(Math.max(0, speed.x), Math.max(0, speed.y), Math.max(0, speed.z))
    }

    /** 旋转：参数为增量向量（xyz 各自弧度）。等价于 rotateTo(current + delta) */
    rotate(delta: Vector3): void {
        const obj = this.scene ?? this
        const target = new Vector3(obj.rotation.x + delta.x, obj.rotation.y + delta.y, obj.rotation.z + delta.z)
        this.rotateTo(target)
    }

    /** 旋转到：参数为最终向量（xyz 各自弧度）。由 update 执行任务 */
    rotateTo(target: Vector3): void {
        const obj = this.scene ?? this
        const current = new Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z)
        const remaining = new Vector3(
            target.x - current.x,
            target.y - current.y,
            target.z - current.z
        )
        this.rotateTarget = target.clone()
        this.rotateInitialRemaining = new Vector3(Math.abs(remaining.x), Math.abs(remaining.y), Math.abs(remaining.z))
        this.rotating = true
    }

    update(delta: number) {
        const obj = this.scene ?? this

        // 移动任务
        if (this.moving && this.moveTarget) {
            const currentPos = obj.position.clone()
            const diffPos = new Vector3(
                this.moveTarget.x - currentPos.x,
                this.moveTarget.y - currentPos.y,
                this.moveTarget.z - currentPos.z
            )
            const initPos = this.moveInitialRemaining ?? new Vector3(Math.abs(diffPos.x), Math.abs(diffPos.y), Math.abs(diffPos.z))
            const snapThresholdPos = new Vector3(initPos.x * 0.1, initPos.y * 0.1, initPos.z * 0.1)
            const stepPos = new Vector3(this.moveSpeed.x * delta, this.moveSpeed.y * delta, this.moveSpeed.z * delta)
            const nextPos = currentPos.clone()

            if (Math.abs(diffPos.x) <= snapThresholdPos.x) nextPos.x = this.moveTarget.x
            else nextPos.x += Math.sign(diffPos.x) * Math.min(Math.abs(diffPos.x), stepPos.x)

            if (Math.abs(diffPos.y) <= snapThresholdPos.y) nextPos.y = this.moveTarget.y
            else nextPos.y += Math.sign(diffPos.y) * Math.min(Math.abs(diffPos.y), stepPos.y)

            if (Math.abs(diffPos.z) <= snapThresholdPos.z) nextPos.z = this.moveTarget.z
            else nextPos.z += Math.sign(diffPos.z) * Math.min(Math.abs(diffPos.z), stepPos.z)

            obj.position.set(nextPos.x, nextPos.y, nextPos.z)

            const donePos = nextPos.x === this.moveTarget.x && nextPos.y === this.moveTarget.y && nextPos.z === this.moveTarget.z
            if (donePos) {
                this.moving = false
                this.moveTarget = undefined
                this.moveInitialRemaining = undefined
            }
        }

        // 旋转任务
        if (!this.rotating || !this.rotateTarget) {
            return
        }
        const current = new Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z)
        const diff = new Vector3(
            this.rotateTarget.x - current.x,
            this.rotateTarget.y - current.y,
            this.rotateTarget.z - current.z
        )

        const init = this.rotateInitialRemaining ?? new Vector3(Math.abs(diff.x), Math.abs(diff.y), Math.abs(diff.z))
        const snapThreshold = new Vector3(init.x * 0.1, init.y * 0.1, init.z * 0.1)

        const step = new Vector3(this.rotateSpeed.x * delta, this.rotateSpeed.y * delta, this.rotateSpeed.z * delta)

        const next = current.clone()
        // x
        if (Math.abs(diff.x) <= snapThreshold.x) {
            next.x = this.rotateTarget.x
        } else {
            const m = Math.min(Math.abs(diff.x), step.x)
            next.x += Math.sign(diff.x) * m
        }
        // y
        if (Math.abs(diff.y) <= snapThreshold.y) {
            next.y = this.rotateTarget.y
        } else {
            const m = Math.min(Math.abs(diff.y), step.y)
            next.y += Math.sign(diff.y) * m
        }
        // z
        if (Math.abs(diff.z) <= snapThreshold.z) {
            next.z = this.rotateTarget.z
        } else {
            const m = Math.min(Math.abs(diff.z), step.z)
            next.z += Math.sign(diff.z) * m
        }

        obj.rotation.set(next.x, next.y, next.z)

        const done =
            next.x === this.rotateTarget.x &&
            next.y === this.rotateTarget.y &&
            next.z === this.rotateTarget.z
        if (done) {
            this.rotating = false
            this.rotateTarget = undefined
            this.rotateInitialRemaining = undefined
        }
    }

    /**
     * 编辑器或外部更新某个 prop 时调用，子类可覆盖以响应（如切 preset、改颜色）。
     * 基类仅打 log，不修改内部状态。
     */
    propUpdate(key: string, value: unknown): void {
        console.log(`[Model] propUpdate ${this.modelName} key=${key} value=`, value)
    }

}