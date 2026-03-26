import {AnimationAction, AnimationClip, AnimationMixer, Box3, Mesh, MeshBasicMaterial, Object3D, Quaternion, Scene, SphereGeometry, Vector3} from "three";
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

    /** 移动速度（单位/秒），由 update 驱动 */
    private moveSpeed: Vector3 = new Vector3(1, 1, 1)
    /** 移动任务是否进行中：调用 move/moveTo 后打开，到达目标后关闭 */
    moving: boolean = false
    /** 移动任务目标位置 */
    private moveTarget?: Vector3
    /** 前向功能开关：启用后，移动前先朝向目标 */
    private forwardEnabled: boolean = false
    /** 本地坐标系下“正前方”向量，默认 +X */
    private forwardAxis: Vector3 = new Vector3(1, 0, 0)
    /** snap 阈值：当某轴剩余小于该值时直接修正到目标（坐标单位/弧度单位） */
    private static readonly SNAP_EPS = 0.1

    /** 遮罩球体（用于可视化/选中提示） */
    private maskMesh?: Mesh
    private maskMat?: MeshBasicMaterial
    private maskColor: number = 0x38bdf8
    /** 透明度：0~1，默认 1（100%） */
    private maskOpacity: number = 1
    /** 遮罩半径（world 单位）。默认 3，可在 editor 中配置 */
    private maskRadiusWorld: number = 0.01

    /** 自旋转：开关 */
    private autoRotateEnabled: boolean = false
    /** 自旋转：轴（局部坐标系），默认为 Y 轴 */
    private autoRotateAxis: Vector3 = new Vector3(0, 1, 0)
    /** 自旋转：速度（弧度/秒） */
    private autoRotateSpeed: number = 0

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

    /** 设置遮罩颜色（十六进制 number 或 '#rrggbb'/'rrggbb'） */
    setMaskColor(color: number | string): void {
        const hex = this.parseColorToHex(color)
        if (hex == null) return
        this.maskColor = hex
        this.ensureMask()
        if (this.maskMat) this.maskMat.color.setHex(this.maskColor)
    }

    /** 设置遮罩是否可见（仅控制显示，不影响配置） */
    setMaskVisible(visible: boolean): void {
        this.ensureMask()
        if (this.maskMesh) this.maskMesh.visible = visible
    }

    /** 设置遮罩透明度（0~1），默认 1（100%） */
    setMaskOpacity(opacity: number): void {
        const v = Number(opacity)
        if (!Number.isFinite(v)) return
        this.maskOpacity = Math.min(1, Math.max(0, v))
        this.ensureMask()
        if (this.maskMat) this.maskMat.opacity = this.maskOpacity
    }

    getMaskOpacity(): number {
        return this.maskOpacity
    }

    /** 设置遮罩半径（world 单位） */
    setMaskRadiusWorld(radiusWorld: number): void {
        const v = Number(radiusWorld)
        if (!Number.isFinite(v) || v <= 0) return
        this.maskRadiusWorld = v
        if (this.maskMesh) this.refreshMask()
    }

    /** 刷新遮罩尺寸/位置（按模型外接圆/球计算） */
    refreshMask(): void {
        if (!this.maskMesh || !this.maskMat) return
        const root = this.scene ?? this
        root.updateMatrixWorld(true)

        // 避免把 mask 自身算进包围盒
        const prevVisible = this.maskMesh.visible
        this.maskMesh.visible = false
        const box = new Box3().setFromObject(root)
        this.maskMesh.visible = prevVisible

        if (!Number.isFinite(box.min.x) || box.isEmpty()) return

        const sizeWorld = new Vector3()
        const centerWorld = new Vector3()
        box.getSize(sizeWorld)
        box.getCenter(centerWorld)

        // 遮罩半径：按需求固定为 world 半径 3（不再随模型尺寸计算）
        const radiusWorld = Math.max(0.001, this.maskRadiusWorld)

        // mask 是 root 的子节点，需要把 world 中心换算到 root 的本地坐标
        const centerLocal = centerWorld.clone()
        root.worldToLocal(centerLocal)

        // 将 world 半径换算到 root 本地（考虑 root 的缩放）
        const worldScale = new Vector3()
        root.getWorldScale(worldScale)
        // 为保证“world 空间下是球体”，按各轴缩放分别抵消（避免非等比缩放导致椭球、尺寸看起来不对）
        const sx = Math.max(0.000001, worldScale.x)
        const sy = Math.max(0.000001, worldScale.y)
        const sz = Math.max(0.000001, worldScale.z)

        this.maskMesh.position.copy(centerLocal)
        this.maskMesh.scale.set(radiusWorld / sx, radiusWorld / sy, radiusWorld / sz)
    }

    private ensureMask(): void {
        if (this.maskMesh && this.maskMat) {
            // 可能模型变化，顺便刷新一次
            this.refreshMask()
            return
        }
        const root = this.scene ?? this
        this.maskMat = new MeshBasicMaterial({
            color: this.maskColor,
            transparent: true,
            opacity: this.maskOpacity,
            depthWrite: false,
            depthTest: false,
            wireframe: true
        })
        // 单位球体，后续用 scale 设置半径
        this.maskMesh = new Mesh(new SphereGeometry(1, 24, 16), this.maskMat)
        this.maskMesh.renderOrder = 999
        this.maskMesh.visible = false
        root.add(this.maskMesh)
        this.refreshMask()
    }

    private parseColorToHex(color: number | string): number | null {
        if (typeof color === 'number' && Number.isFinite(color)) return color
        if (typeof color !== 'string') return null
        const s = color.trim()
        if (!s) return null
        const hexStr = s.startsWith('#') ? s.slice(1) : s
        if (!/^[0-9a-fA-F]{6}$/.test(hexStr)) return null
        return parseInt(hexStr, 16)
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
        this.moveTarget = target.clone()
        this.moving = true
    }

    /** 设置“前向”开关 */
    setForwardEnabled(enabled: boolean): void {
        this.forwardEnabled = Boolean(enabled)
    }

    /** 获取“前向”开关状态 */
    isForwardEnabled(): boolean {
        return this.forwardEnabled
    }

    /** 设置“正前方”向量（本地坐标系） */
    setForwardAxis(axis: Vector3): void {
        const v = axis.clone()
        if (v.lengthSq() <= 1e-12) return
        v.normalize()
        this.forwardAxis.copy(v)
    }

    /** 获取“正前方”向量（副本） */
    getForwardAxis(): Vector3 {
        return this.forwardAxis.clone()
    }

    /** 若启用前向，则先将模型朝向目标，再执行移动 */
    orientToTarget(target: Vector3): void {
        if (!this.forwardEnabled) return
        const obj = this.scene ?? this
        const dirWorld = target.clone().sub(obj.getWorldPosition(new Vector3()))
        if (dirWorld.lengthSq() <= 1e-12) return
        const f = this.forwardAxis.clone()
        const fx = f.x
        const fz = f.z
        const planarForwardInvalid = Math.abs(fx) <= 1e-12 && Math.abs(fz) <= 1e-12
        if (planarForwardInvalid) {
            console.warn('[Model.orientToTarget] invalid planar forward axis, expected non-zero XZ projection', {
                modelName: this.modelName,
                forwardAxis: { x: f.x, y: f.y, z: f.z }
            })
        }
        if (planarForwardInvalid) return

        // 地面直线运动：只按 XZ 平面转向。用“当前朝向 -> 目标朝向”的增量角，避免初始姿态偏置导致不准。
        const worldQ = new Quaternion()
        obj.getWorldQuaternion(worldQ)
        const currentForwardWorld = f.clone().normalize().applyQuaternion(worldQ)
        currentForwardWorld.y = 0
        if (currentForwardWorld.lengthSq() <= 1e-12) return
        currentForwardWorld.normalize()

        const targetForwardWorld = dirWorld.clone()
        targetForwardWorld.y = 0
        if (targetForwardWorld.lengthSq() <= 1e-12) return
        targetForwardWorld.normalize()

        const currentYaw = Math.atan2(currentForwardWorld.z, currentForwardWorld.x)
        const targetYaw = Math.atan2(targetForwardWorld.z, targetForwardWorld.x)
        const deltaYawRaw = targetYaw - currentYaw
        const deltaYaw = Math.atan2(Math.sin(deltaYawRaw), Math.cos(deltaYawRaw))

        console.log('[Model.orientToTarget.beforeApply]', {
            modelName: this.modelName,
            target: { x: target.x, y: target.y, z: target.z },
            dirWorld: { x: dirWorld.x, y: dirWorld.y, z: dirWorld.z },
            forwardAxis: { x: f.x, y: f.y, z: f.z },
            currentForwardWorld: { x: currentForwardWorld.x, y: currentForwardWorld.y, z: currentForwardWorld.z },
            targetForwardWorld: { x: targetForwardWorld.x, y: targetForwardWorld.y, z: targetForwardWorld.z },
            targetYaw,
            currentYaw,
            deltaYaw,
            rotationBefore: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }
        })

        // 在 world 空间绕 Y 轴旋转，再换算回本地四元数，避免 Euler 造成的翻转/歧义。
        const qDeltaWorld = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deltaYaw)
        const targetWorldQ = qDeltaWorld.multiply(worldQ.clone())
        if (obj.parent) {
            const parentWorldQ = new Quaternion()
            obj.parent.getWorldQuaternion(parentWorldQ)
            const localQ = parentWorldQ.clone().invert().multiply(targetWorldQ)
            obj.quaternion.copy(localQ)
        } else {
            obj.quaternion.copy(targetWorldQ)
        }

        console.log('[Model.orientToTarget.afterApply]', {
            modelName: this.modelName,
            rotationAfter: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            quaternionAfter: { x: obj.quaternion.x, y: obj.quaternion.y, z: obj.quaternion.z, w: obj.quaternion.w }
        })
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
        this.rotateTarget = target.clone()
        this.rotating = true
    }

    /** 设置自旋转开关 */
    setAutoRotateEnabled(enabled: boolean): void {
        this.autoRotateEnabled = Boolean(enabled)
    }

    /** 设置自旋转轴（xyz 任意向量，会自动归一化；长度为 0 则忽略） */
    setAutoRotateAxis(axis: Vector3): void {
        const v = axis.clone()
        if (v.lengthSq() <= 1e-12) return
        v.normalize()
        this.autoRotateAxis.copy(v)
    }

    /** 设置自旋转速度（弧度/秒） */
    setAutoRotateSpeed(speedRadPerSec: number): void {
        const s = Number(speedRadPerSec)
        if (!Number.isFinite(s)) return
        this.autoRotateSpeed = s
    }

    update(delta: number) {
        const obj = this.scene ?? this

        // 动画：若存在 mixer，则每帧推进
        const anyThis = this as unknown as { actionMixer?: AnimationMixer }
        if (anyThis.actionMixer && typeof anyThis.actionMixer.update === 'function') {
            anyThis.actionMixer.update(delta)
        }

        // 自旋转：默认在没有显式旋转任务时生效，避免与 rotate/rotateTo 冲突
        if (this.autoRotateEnabled && !this.rotating && this.autoRotateSpeed !== 0) {
            const angle = this.autoRotateSpeed * delta
            if (Number.isFinite(angle) && angle !== 0) {
                obj.rotateOnAxis(this.autoRotateAxis, angle)
            }
        }

        // 移动任务
        if (this.moving && this.moveTarget) {
            const currentPos = obj.position.clone()
            const diffPos = new Vector3(
                this.moveTarget.x - currentPos.x,
                this.moveTarget.y - currentPos.y,
                this.moveTarget.z - currentPos.z
            )
            const snapThresholdPos = new Vector3(Model.SNAP_EPS, Model.SNAP_EPS, Model.SNAP_EPS)
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
            }
        }

        // 旋转任务
        if (!this.rotating || !this.rotateTarget) {
            // 即使不旋转，也可能需要在运动后刷新遮罩
            if (this.maskMesh) this.refreshMask()
            return
        }
        const current = new Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z)
        const diff = new Vector3(
            this.rotateTarget.x - current.x,
            this.rotateTarget.y - current.y,
            this.rotateTarget.z - current.z
        )

        const snapThreshold = new Vector3(Model.SNAP_EPS, Model.SNAP_EPS, Model.SNAP_EPS)

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
        }

        // 更新遮罩跟随（位置/旋转不影响包围盒中心在局部坐标下的计算，这里简单每帧刷新）
        if (this.maskMesh) this.refreshMask()
    }

    /**
     * 编辑器或外部更新某个 prop 时调用，子类可覆盖以响应（如切 preset、改颜色）。
     * 基类仅打 log，不修改内部状态。
     */
    propUpdate(key: string, value: unknown): void {
        console.log(`[Model] propUpdate ${this.modelName} key=${key} value=`, value)
    }

}