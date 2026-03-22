import { Color, DoubleSide, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial, Scene } from 'three'
import { Model } from '../model/Model'
import type { PropDefinition } from '../model/ModelRegistry'

const DEFAULT_COLOR = '#6EE7B7'
const RING_MESH_NAME = '__panelx_expanding_ring_mesh__'

function normalizeHexColorInput(value: string): string {
  const s = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  // 允许其它 three.js 可解析的颜色字符串（如 'red'）
  return s
}

type RingConfig = {
  color: string
  maxRadius: number
  ringThickness: number
  durationSec: number
  waitSec: number
  feather: number
  opacity: number
}

/**
 * ExpandingRingModel
 * - 用细薄圆柱（height=0.1）做“平面圆环”
 * - Shader 在片元级别：只保留 caps（根据法线 y 分量），并用 world 半径 r 控制内外环 alpha
 * - 时间：1s 内从 r=0 扩张到 r=maxRadius，循环往复
 */
export class ExpandingRingModel extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'color', label: '颜色', default: DEFAULT_COLOR, type: 'color' },
    { key: 'maxRadius', label: '最大半径', default: 1 },
    { key: 'ringThickness', label: '环厚度(<=maxRadius)', default: 0.12 },
    { key: 'durationSec', label: '周期(秒)', default: 2 },
    { key: 'waitSec', label: '等待期(秒)', default: 0.2 },
    { key: 'feather', label: '边缘柔和', default: 0.03 },
    { key: 'opacity', label: '整体透明度', default: 0.9 }
  ]

  private cfg: RingConfig
  private mesh: import('three').Mesh
  private uniforms: {
    uColor: { value: Color }
    uInnerRadius: { value: number }
    uOuterRadius: { value: number }
    uFeather: { value: number }
    uOpacity: { value: number }
  }

  private elapsedSec = 0

  constructor(name = 'ExpandingRing') {
    super(name)

    const defMap = Object.fromEntries(
      ExpandingRingModel.supportedProps
        .filter((p) => p.default !== undefined)
        .map((p) => [p.key, p.default])
    ) as Record<string, unknown>

    const getNum = (k: string, fallback: number) => {
      const v = Number(defMap[k])
      return Number.isFinite(v) ? v : fallback
    }

    this.cfg = {
      color: typeof defMap.color === 'string' ? defMap.color : DEFAULT_COLOR,
      maxRadius: Math.max(0, getNum('maxRadius', 1)),
      ringThickness: Math.max(0, getNum('ringThickness', 0.12)),
      durationSec: Math.max(0.001, getNum('durationSec', 1)),
      waitSec: Math.max(0, getNum('waitSec', 0.2)),
      feather: Math.max(0.001, getNum('feather', 0.03)),
      opacity: Math.max(0, Math.min(1, getNum('opacity', 0.9)))
    }

    // 平面几何：shader 根据半径 r 只绘制“环形区域”
    // 让几何体尺寸足够大，避免 maxRadius 增大时被裁剪消失
    const baseGeomRadius = 10
    const geom = new PlaneGeometry(baseGeomRadius * 2, baseGeomRadius * 2, 1, 1)

    const uniforms = {
      uColor: { value: new Color(this.cfg.color) },
      uInnerRadius: { value: 0 },
      uOuterRadius: { value: 0 },
      uFeather: { value: this.cfg.feather },
      uOpacity: { value: this.cfg.opacity }
    }
    this.uniforms = uniforms

    const vertexShader = `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `

    const fragmentShader = `
      varying vec3 vWorldPos;

      uniform vec3 uColor;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      uniform float uFeather;
      uniform float uOpacity;

      void main() {
        float r = length(vWorldPos.xz);

        float inner = max(0.0, uInnerRadius);
        float outer = max(inner, uOuterRadius);
        float edge = max(0.0001, uFeather);

        // r in [inner, outer] with feather edges
        float aInner = smoothstep(inner, inner + edge, r);
        float aOuter = 1.0 - smoothstep(outer - edge, outer, r);
        float a = aInner * aOuter;

        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `

    // 使用常规 alpha 混合 + 深度测试：避免加法混合把颜色叠在后方模型上、也避免“看穿/透视”感
    // 半透明边缘不写深度，减少与同类透明物体的排序毛边
    const mat = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: NormalBlending,
      side: DoubleSide
    })

    this.mesh = new Mesh(geom, mat)
    this.mesh.name = RING_MESH_NAME

    // PlaneGeometry 默认在 XY 平面；旋转到 XZ 平面（法线朝 +Y）
    this.mesh.rotation.set(-Math.PI / 2, 0, 0)
    this.mesh.position.set(0, 0, 0)

    const scene = new Scene()
    scene.add(this.mesh)
    this.setScene(scene)

    this.applyRingUniforms()
  }

  override setScene(scene: Scene) {
    super.setScene(scene)
    const candidate = scene.getObjectByName(RING_MESH_NAME)
    if (!(candidate instanceof Mesh)) return
    const mat = candidate.material
    if (!(mat instanceof ShaderMaterial) || !mat.uniforms) return
    this.mesh = candidate
    this.uniforms = mat.uniforms as typeof this.uniforms
  }

  private clampNumber(v: number, min: number, max: number) {
    const n = Number(v)
    if (!Number.isFinite(n)) return min
    return Math.max(min, Math.min(max, n))
  }

  private applyRingUniforms(): void {
    this.uniforms.uColor.value.set(this.cfg.color)
    this.uniforms.uFeather.value = Math.max(0.001, this.cfg.feather)
    this.uniforms.uOpacity.value = this.clampNumber(this.cfg.opacity, 0, 1)
  }

  override update(delta: number): void {
    super.update(delta)

    const cycle = Math.max(0.001, this.cfg.durationSec)
    const wait = Math.max(0, Math.min(this.cfg.waitSec, cycle))
    const activeDur = Math.max(0.0001, cycle - wait)
    this.elapsedSec += delta
    const localT = ((this.elapsedSec % cycle) / cycle) || 0
    const ringTimeRaw = localT * cycle - wait
    const ringTime = Math.min(Math.max(ringTimeRaw, 0), activeDur)

    const maxR = Math.max(0, this.cfg.maxRadius)
    const tNorm = activeDur <= 0.000001 ? 0 : ringTime / activeDur
    const outer = maxR * Math.min(1, Math.max(0, tNorm))
    const thickness = Math.max(0, Math.min(maxR, this.cfg.ringThickness))
    const inner = Math.max(0, outer - thickness)

    this.uniforms.uOuterRadius.value = outer
    this.uniforms.uInnerRadius.value = inner

    // 渐入/渐出窗口：避免在 ring 出现/消失边界“硬切”
    const fadeDur = Math.max(0.0001, Math.min(activeDur * 0.25, activeDur * 0.5))

    // fadeIn: ringTime=0..fadeDur: 0->1
    // fadeOut: ringTime=activeDur-fadeDur..activeDur: 1->0
    const smoothstep = (e0: number, e1: number, x: number) => {
      const t = (x - e0) / Math.max(0.000001, e1 - e0)
      const k = Math.min(1, Math.max(0, t))
      return k * k * (3 - 2 * k)
    }
    const fadeIn = smoothstep(0, fadeDur, ringTime)
    const fadeOut = 1 - smoothstep(activeDur - fadeDur, activeDur, ringTime)
    const alphaMul = fadeIn * fadeOut

    this.uniforms.uFeather.value = Math.max(0.001, this.cfg.feather)
    this.uniforms.uOpacity.value = this.clampNumber(this.cfg.opacity, 0, 1) * alphaMul
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'color' && typeof value === 'string') {
      const normalized = normalizeHexColorInput(value)
      this.cfg.color = normalized
      this.uniforms.uColor.value.set(normalized)
      return
    }
    if (key === 'maxRadius') {
      this.cfg.maxRadius = Number(value)
      return
    }
    if (key === 'ringThickness') {
      this.cfg.ringThickness = Number(value)
      return
    }
    if (key === 'durationSec') {
      const n = Number(value)
      this.cfg.durationSec = Number.isFinite(n) ? Math.max(0.001, n) : 1
      return
    }
    if (key === 'waitSec') {
      const n = Number(value)
      this.cfg.waitSec = Number.isFinite(n) ? Math.max(0, n) : 0
      return
    }
    if (key === 'feather') {
      this.cfg.feather = Number(value)
      return
    }
    if (key === 'opacity') {
      this.cfg.opacity = Number(value)
      return
    }

    super.propUpdate(key, value)
  }
}

