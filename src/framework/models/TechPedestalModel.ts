/**
 * 科技底座（数字孪生风格）
 * - 下层：较大半透明平面（颜色更“深”、透明度更低）
 * - 上层：较薄长方体台面（更亮、透明度略高）
 * - 线框边：亮蓝描边，可与 Bloom 配合
 *
 * 配色参考：背景 #0f172a，主色 #38bdf8（可调）
 */
import {
  BoxGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Scene
} from 'three'
import { Model } from '../model/Model'
import type { PropDefinition } from '../model/ModelRegistry'
import { LayerDef } from '../LayerDef'

const DEFAULT_TECH_BLUE = '#38bdf8'

const BOTTOM_MESH_NAME = '__panelx_tech_ped_bottom__'
const TOP_MESH_NAME = '__panelx_tech_ped_top__'
const BOTTOM_EDGES_NAME = '__panelx_tech_ped_bottom_edges__'
const TOP_EDGES_NAME = '__panelx_tech_ped_top_edges__'

/** 与几何体创建尺寸一致，用于 scale 归一化 */
const BASE_BOTTOM_W = 5
const BASE_BOTTOM_D = 4
const BASE_TOP_W = 4
const BASE_TOP_H = 0.08
const BASE_TOP_D = 3

function normalizeHexColorInput(value: string): string {
  const s = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return s
}

type PedestalConfig = {
  color: string
  topWidth: number
  topDepth: number
  topHeight: number
  bottomWidth: number
  bottomDepth: number
  topOpacity: number
  bottomOpacity: number
  edgeBrightness: number
  gap: number
  bottomYOffset: number
  showEdges: boolean
  /** 线框单独走 Bloom 层（需场景开启 Bloom 且相机包含该层） */
  bloomEdges: boolean
}

export class TechPedestalModel extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'color', label: '科技蓝', default: DEFAULT_TECH_BLUE, type: 'color' },
    { key: 'topWidth', label: '上层台面宽(X)', default: 4 },
    { key: 'topDepth', label: '上层台面深(Z)', default: 3 },
    { key: 'topHeight', label: '上层厚度(Y)', default: 0.08 },
    { key: 'bottomWidth', label: '下层平面宽', default: 5 },
    { key: 'bottomDepth', label: '下层平面深', default: 4 },
    { key: 'topOpacity', label: '上层透明度', default: 0.42 },
    { key: 'bottomOpacity', label: '下层透明度', default: 0.22 },
    { key: 'edgeBrightness', label: '边线亮度(0~1)', default: 0.9 },
    { key: 'gap', label: '上下层间距', default: 0.02 },
    { key: 'bottomYOffset', label: '下层 Y 偏移', default: 0 },
    { key: 'showEdges', label: '显示线框边', default: true, type: 'boolean' },
    { key: 'bloomEdges', label: '边线走 Bloom 层', default: false, type: 'boolean' }
  ]

  private cfg: PedestalConfig

  private bottomGroup = new Group()
  private topGroup = new Group()

  private bottomMesh!: Mesh
  private topMesh!: Mesh
  private bottomEdges!: LineSegments
  private topEdges!: LineSegments

  private bottomMat!: MeshPhysicalMaterial
  private topMat!: MeshPhysicalMaterial
  private edgeLineMat!: LineBasicMaterial

  constructor(name = 'TechPedestal') {
    super(name)

    const defMap = Object.fromEntries(
      TechPedestalModel.supportedProps
        .filter((p) => p.default !== undefined)
        .map((p) => [p.key, p.default])
    ) as Record<string, unknown>

    const getNum = (k: string, fallback: number) => {
      const v = Number(defMap[k])
      return Number.isFinite(v) ? v : fallback
    }

    this.cfg = {
      color: typeof defMap.color === 'string' ? defMap.color : DEFAULT_TECH_BLUE,
      topWidth: Math.max(0.01, getNum('topWidth', 4)),
      topDepth: Math.max(0.01, getNum('topDepth', 3)),
      topHeight: Math.max(0.01, getNum('topHeight', 0.08)),
      bottomWidth: Math.max(0.01, getNum('bottomWidth', 5)),
      bottomDepth: Math.max(0.01, getNum('bottomDepth', 4)),
      topOpacity: Math.min(1, Math.max(0, getNum('topOpacity', 0.42))),
      bottomOpacity: Math.min(1, Math.max(0, getNum('bottomOpacity', 0.22))),
      edgeBrightness: Math.min(1, Math.max(0, getNum('edgeBrightness', 0.9))),
      gap: Math.max(0, getNum('gap', 0.02)),
      bottomYOffset: getNum('bottomYOffset', 0),
      showEdges: defMap.showEdges !== false,
      bloomEdges: defMap.bloomEdges === true
    }

    const planeGeom = new PlaneGeometry(BASE_BOTTOM_W, BASE_BOTTOM_D, 1, 1)
    const boxGeom = new BoxGeometry(BASE_TOP_W, BASE_TOP_H, BASE_TOP_D, 1, 1, 1)

    this.bottomMat = this.createFillMaterial(true)
    this.topMat = this.createFillMaterial(false)
    this.edgeLineMat = new LineBasicMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false
    })

    this.bottomMesh = new Mesh(planeGeom, this.bottomMat)
    this.bottomMesh.name = BOTTOM_MESH_NAME
    this.bottomMesh.rotation.x = -Math.PI / 2

    this.bottomEdges = new LineSegments(new EdgesGeometry(planeGeom), this.edgeLineMat)
    this.bottomEdges.name = BOTTOM_EDGES_NAME
    this.bottomEdges.rotation.x = -Math.PI / 2

    this.topMesh = new Mesh(boxGeom, this.topMat)
    this.topMesh.name = TOP_MESH_NAME

    this.topEdges = new LineSegments(new EdgesGeometry(boxGeom), this.edgeLineMat.clone())
    this.topEdges.name = TOP_EDGES_NAME

    this.bottomGroup.add(this.bottomMesh, this.bottomEdges)
    this.topGroup.add(this.topMesh, this.topEdges)

    const scene = new Scene()
    scene.add(this.bottomGroup, this.topGroup)
    this.setScene(scene)

    this.applyAll()
  }

  private createFillMaterial(isBottom: boolean): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      metalness: 0.12,
      roughness: 0.35,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      // 下层略暗：通过 emissive 权重区分“深度”
      emissiveIntensity: isBottom ? 0.08 : 0.22
    })
  }

  private applyMaterials(): void {
    const base = new Color().setStyle(normalizeHexColorInput(this.cfg.color))
    // 下层填充略向背景色靠拢，增强层次
    const bgTint = new Color(0x0f172a)
    const bottomFill = base.clone().lerp(bgTint, 0.35)

    this.topMat.color.copy(base)
    this.topMat.opacity = this.cfg.topOpacity
    this.topMat.emissive.copy(base)
    this.topMat.emissiveIntensity = 0.15 + this.cfg.edgeBrightness * 0.35

    this.bottomMat.color.copy(bottomFill)
    this.bottomMat.opacity = this.cfg.bottomOpacity
    this.bottomMat.emissive.copy(bottomFill)
    this.bottomMat.emissiveIntensity = 0.06 + this.cfg.edgeBrightness * 0.12

    const edgeAlpha = Math.min(1, Math.max(0, this.cfg.edgeBrightness))
    this.edgeLineMat.color.copy(base).multiplyScalar(0.85 + 0.35 * edgeAlpha)
    this.edgeLineMat.opacity = edgeAlpha

    // 上下层共用同一份 LineBasicMaterial 时，子线框 clone 的材质需同步
    const topEdgeMat = this.topEdges.material as LineBasicMaterial
    topEdgeMat.color.copy(this.edgeLineMat.color)
    topEdgeMat.opacity = edgeAlpha
  }

  private applyLayout(): void {
    const { bottomWidth, bottomDepth, topWidth, topDepth, topHeight, gap, bottomYOffset } = this.cfg

    this.bottomGroup.position.set(0, bottomYOffset + 0.001, 0)
    this.bottomGroup.scale.set(bottomWidth / BASE_BOTTOM_W, 1, bottomDepth / BASE_BOTTOM_D)

    const topY = bottomYOffset + gap + topHeight / 2
    this.topGroup.position.set(0, topY, 0)
    this.topGroup.scale.set(topWidth / BASE_TOP_W, topHeight / BASE_TOP_H, topDepth / BASE_TOP_D)
  }

  private applyEdgeVisibility(): void {
    const v = this.cfg.showEdges
    this.bottomEdges.visible = v
    this.topEdges.visible = v
  }

  private applyBloomLayers(): void {
    const layer = this.cfg.bloomEdges ? LayerDef.bloom : LayerDef.default
    this.bottomEdges.layers.set(layer)
    this.topEdges.layers.set(layer)
    this.bottomMesh.layers.set(LayerDef.default)
    this.topMesh.layers.set(LayerDef.default)
  }

  private applyAll(): void {
    this.applyMaterials()
    this.applyLayout()
    this.applyEdgeVisibility()
    this.applyBloomLayers()
  }

  override setScene(scene: Scene) {
    super.setScene(scene)

    const b = scene.getObjectByName(BOTTOM_MESH_NAME)
    const t = scene.getObjectByName(TOP_MESH_NAME)
    const be = scene.getObjectByName(BOTTOM_EDGES_NAME)
    const te = scene.getObjectByName(TOP_EDGES_NAME)

    if (b instanceof Mesh && b.material instanceof MeshPhysicalMaterial) {
      this.bottomMesh = b
      this.bottomMat = b.material
    }
    if (t instanceof Mesh && t.material instanceof MeshPhysicalMaterial) {
      this.topMesh = t
      this.topMat = t.material
    }
    if (be instanceof LineSegments && be.material instanceof LineBasicMaterial) {
      this.bottomEdges = be
      this.edgeLineMat = be.material
    }
    if (te instanceof LineSegments && te.material instanceof LineBasicMaterial) {
      this.topEdges = te
    }

    const bg = this.bottomMesh.parent
    const tg = this.topMesh.parent
    if (bg instanceof Group) this.bottomGroup = bg
    if (tg instanceof Group) this.topGroup = tg

    this.applyAll()
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'color' && typeof value === 'string') {
      this.cfg.color = normalizeHexColorInput(value)
      this.applyMaterials()
      return
    }
    if (key === 'topWidth') {
      this.cfg.topWidth = Math.max(0.01, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'topDepth') {
      this.cfg.topDepth = Math.max(0.01, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'topHeight') {
      this.cfg.topHeight = Math.max(0.01, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'bottomWidth') {
      this.cfg.bottomWidth = Math.max(0.01, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'bottomDepth') {
      this.cfg.bottomDepth = Math.max(0.01, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'topOpacity') {
      this.cfg.topOpacity = Math.min(1, Math.max(0, Number(value)))
      this.applyMaterials()
      return
    }
    if (key === 'bottomOpacity') {
      this.cfg.bottomOpacity = Math.min(1, Math.max(0, Number(value)))
      this.applyMaterials()
      return
    }
    if (key === 'edgeBrightness') {
      this.cfg.edgeBrightness = Math.min(1, Math.max(0, Number(value)))
      this.applyMaterials()
      return
    }
    if (key === 'gap') {
      this.cfg.gap = Math.max(0, Number(value))
      this.applyLayout()
      return
    }
    if (key === 'bottomYOffset') {
      this.cfg.bottomYOffset = Number(value)
      this.applyLayout()
      return
    }
    if (key === 'showEdges') {
      this.cfg.showEdges = value === true || value === 'true' || value === 1 || value === '1'
      this.applyEdgeVisibility()
      return
    }
    if (key === 'bloomEdges') {
      this.cfg.bloomEdges = value === true || value === 'true' || value === 1 || value === '1'
      this.applyBloomLayers()
      return
    }

    super.propUpdate(key, value)
  }
}
