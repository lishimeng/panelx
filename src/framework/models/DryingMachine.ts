import { MeshBasicMaterial, type Material, type Mesh } from "three";
import { ModelLoadable } from "../model/ModelLoadable";
import type { PropDefinition } from "../model/ModelRegistry";
import { LayerDef } from "../LayerDef";


export class DryingMachine extends ModelLoadable {
    static supportedProps: PropDefinition[] = [
        { key: 'levels', label: '颜色等级(1..N)，用 _ 分隔，如 1_2_2_4' }
    ]

    /** 需要染色的 mesh 列表（按顺序映射） */
    private readonly meshNames = [
        'Object004',
        'Object005',
        'Object006',
        'Object007',
        'Object008',
        'Object009'
    ] as const

    /** 调色板（等级从 1 开始） */
    private readonly palette: number[] = [
        0x000000,
        0x00FF00,
        0x0000FF,
        0xFFFF00,
    ]

    /** 复用材质缓存：按 palette 颜色预创建 */
    private readonly paletteMaterials: MeshBasicMaterial[]

    constructor(name = 'DryingMachine') {
        super(name, 'gltf', 'product-line.glb')
        this.layer.push(LayerDef.ui)
        this.layer.push(LayerDef.rayCast)
        this.paletteMaterials = this.palette.map((hex) => new MeshBasicMaterial({ color: hex }))
    }

    /** 设置某个 mesh 的颜色：替换 mesh.material 为复用材质（不修改原材质） */
    private setMeshColor(meshName: string, color: number): void {
        const idx = this.palette.indexOf(color)
        if (idx < 0) return
        const nextMat = this.paletteMaterials[idx]
        this.controlMaterial(meshName, (mesh: Mesh, _mat: Material) => {
            // three 的 mesh.material 可能是数组；这里统一替换
            const anyMesh = mesh as unknown as { material: unknown }
            if (Array.isArray(anyMesh.material)) {
                anyMesh.material = anyMesh.material.map(() => nextMat)
            } else {
                anyMesh.material = nextMat
            }
        })
    }

    /** levels: '1_2_2_4'（等级从 1 开始）。颜色数 < mesh 列表数：只改前 N 个；颜色数 > mesh 列表数：忽略多余 */
    setLevels(levels: string): void {
        const parts = String(levels ?? '').trim()
        if (!parts) return
        const tokens = parts.split('_').map((s) => s.trim()).filter(Boolean)
        for (let i = 0; i < tokens.length && i < this.meshNames.length; i++) {
            const level = Number(tokens[i])
            if (!Number.isFinite(level)) continue
            const idx = Math.floor(level) - 1
            if (idx < 0 || idx >= this.palette.length) continue
            this.setMeshColor(this.meshNames[i], this.palette[idx])
        }
    }

    override propUpdate(key: string, value: unknown): void {
        if (key === 'levels' && typeof value === 'string') {
            this.setLevels(value)
            return
        }
        super.propUpdate(key, value)
    }
}