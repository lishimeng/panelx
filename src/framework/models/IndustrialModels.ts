import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3
} from 'three'
import type { PropDefinition } from '../model/ModelRegistry'
import { Model } from '../model/Model'

const DEFAULT_FLOOR_WIDTH = 1
const DEFAULT_FLOOR_DEPTH = 1

const DEVICE_STATUS = ['normal', 'fault'] as const
type DeviceStatus = (typeof DEVICE_STATUS)[number]

function parseDeviceStatus(v: unknown): DeviceStatus | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (s === 'normal' || s === 'ok' || s === 'running') return 'normal'
  if (s === 'fault' || s === 'error' || s === 'fail' || s === 'alarm') return 'fault'
  return null
}

function parseColorHex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  if (typeof value !== 'string') return null
  const s = value.trim().replace(/^#/, '')
  const n = parseInt(s, 16)
  return Number.isFinite(n) ? n : null
}

/** 工业环境通用路面（自发光、不依赖灯光），深灰底；支持 prop 修改尺寸与颜色 */
export class IndustrialFloor extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'width', label: '宽度', default: DEFAULT_FLOOR_WIDTH },
    { key: 'depth', label: '深度', default: DEFAULT_FLOOR_DEPTH },
    { key: 'color', label: '颜色（十六进制，如 222630 或 #222630）', default: '222630', type: 'color' }
  ]

  private _width = DEFAULT_FLOOR_WIDTH
  private _depth = DEFAULT_FLOOR_DEPTH
  private readonly floorMesh: Mesh

  constructor(name = 'IndustrialFloor') {
    super(name)
    const scene = new Scene()
    const geom = new PlaneGeometry(this._width, this._depth)
    const mat = new MeshBasicMaterial({ color: 0x222630, side: DoubleSide })
    const floor = new Mesh(geom, mat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    this.floorMesh = floor

    this.setScene(scene)
  }

  private refreshFloorGeometry(): void {
    this.floorMesh.geometry.dispose()
    this.floorMesh.geometry = new PlaneGeometry(this._width, this._depth)
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'color') {
      const hex = parseColorHex(value)
      if (hex !== null) {
        const mat = this.floorMesh.material as MeshBasicMaterial
        if (mat.color) mat.color.setHex(hex)
      }
      return
    }
    const num = typeof value === 'number' ? value : Number(value)
    if (key === 'width' && Number.isFinite(num) && num > 0) {
      this._width = num
      this.refreshFloorGeometry()
      return
    }
    if (key === 'depth' && Number.isFinite(num) && num > 0) {
      this._depth = num
      this.refreshFloorGeometry()
      return
    }
    super.propUpdate(key, value)
  }
}

/** 单开门（自发光简单盒子） */
export class SingleDoor extends Model {
  constructor(name = 'SingleDoor') {
    super(name)
    const scene = new Scene()
    const doorGeom = new BoxGeometry(1, 2, 0.1)
    const doorMat = new MeshBasicMaterial({ color: 0x90caf9 })
    const door = new Mesh(doorGeom, doorMat)
    door.position.set(0, 1, 0)
    scene.add(door)
    this.setScene(scene)
  }
}

/** 路面方向指示（三个大于号形箭头，自发光） */
export class LaneChevron extends Model {
  constructor(name = 'LaneChevron') {
    super(name)
    const scene = new Scene()
    // 使用 Canvas 画出类似路侧诱导标志的“>>>”形状：蓝底 + 三个白色折线箭头
    const width = 512
    const height = 256
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
      // 蓝色底
      ctx.fillStyle = '#1565c0'
      ctx.fillRect(0, 0, width, height)

      // 三个白色“>”字型箭头
      const chevronCount = 3
      const chevronWidth = 110
      const chevronHeight = 140
      const gap = 18
      const yCenter = height / 2
      const yTop = yCenter - chevronHeight / 2
      const yBottom = yCenter + chevronHeight / 2

      ctx.fillStyle = '#ffffff'
      ctx.lineJoin = 'round'

      const startX = 130
      for (let i = 0; i < chevronCount; i++) {
        const cx = startX + i * (chevronWidth + gap)
        const leftX = cx - chevronWidth / 2
        const rightX = cx + chevronWidth / 2

        ctx.beginPath()
        ctx.moveTo(leftX, yTop)
        ctx.lineTo(cx, yTop)
        ctx.lineTo(rightX, yCenter)
        ctx.lineTo(cx, yBottom)
        ctx.lineTo(leftX, yBottom)
        ctx.lineTo(cx, yCenter)
        ctx.closePath()
        ctx.fill()
      }
    }

    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, side: DoubleSide })
    const geom = new PlaneGeometry(2.6, 1.3)
    const mesh = new Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, 0.01, 0)
    scene.add(mesh)

    this.setScene(scene)
  }
}

/** 东西南北方向指示器（罗盘式，自发光） */
export class CompassNESW extends Model {
  constructor(name = 'CompassNESW') {
    super(name)
    const scene = new Scene()

    const radius = 1
    const ringGeom = new PlaneGeometry(radius * 2.4, radius * 2.4)
    const ringCanvas = document.createElement('canvas')
    ringCanvas.width = 512
    ringCanvas.height = 512
    const ctx = ringCanvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512)
      ctx.strokeStyle = '#4b5563'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(256, 256, 220, 0, Math.PI * 2)
      ctx.stroke()
    }
    const ringTex = new CanvasTexture(ringCanvas)
    const ringMat = new MeshBasicMaterial({ map: ringTex, transparent: true, side: DoubleSide })
    const ringMesh = new Mesh(ringGeom, ringMat)
    ringMesh.rotation.x = -Math.PI / 2
    scene.add(ringMesh)

    const labels: Array<{ text: string; pos: Vector3 }> = [
      { text: 'N', pos: new Vector3(0, 0.01, -radius * 1.4) },
      { text: 'S', pos: new Vector3(0, 0.01, radius * 1.4) },
      { text: 'E', pos: new Vector3(radius * 1.4, 0.01, 0) },
      { text: 'W', pos: new Vector3(-radius * 1.4, 0.01, 0) }
    ]

    for (const item of labels) {
      scene.add(this.createTextSprite(item.text, new Color(0xffffff), item.pos, 0.6))
    }

    this.setScene(scene)
  }

  private createTextSprite(text: string, color: Color, position: Vector3, scale = 0.5): Sprite {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = 'rgba(0,0,0,0.0)'
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = `#${color.getHexString()}`
      ctx.font = 'bold 140px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, size / 2, size / 2)
    }
    const texture = new CanvasTexture(canvas)
    const material = new SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new Sprite(material)
    sprite.position.copy(position)
    sprite.scale.set(scale, scale, scale)
    return sprite
  }
}

/** 可显示中文名称的自发光模块（简单牌子）；支持 prop 修改文字内容 */
export class LabelBoard extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'text', label: '文字内容', default: '设备 A' }
  ]

  private _text = '设备 A'
  private readonly board: Mesh

  constructor(name = 'LabelBoard') {
    super(name)
    const scene = new Scene()

    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    this.drawLabelCanvas(canvas, this._text)

    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide })
    const geom = new PlaneGeometry(3, 3)
    const board = new Mesh(geom, mat)
    board.position.set(0, 1.6, 0)
    scene.add(board)
    this.board = board

    this.setScene(scene)
  }

  private drawLabelCanvas(canvas: HTMLCanvasElement, text: string): void {
    const size = canvas.width
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(15,23,42,0.9)'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 6
    ctx.strokeRect(20, 20, size - 40, size - 40)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = 'bold 120px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text || ' ', size / 2, size / 2)
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'text') {
      this._text = value != null ? String(value) : ''
      const mat = this.board.material as MeshBasicMaterial
      const tex = mat?.map
      if (tex && tex instanceof CanvasTexture && tex.image) {
        this.drawLabelCanvas(tex.image as HTMLCanvasElement, this._text)
        tex.needsUpdate = true
      }
      return
    }
    super.propUpdate(key, value)
  }
}

/** 简单墙体（默认高度 1，自发光略带灰色） */
export class SimpleWall extends Model {
  constructor(name = 'SimpleWall') {
    super(name)
    const scene = new Scene()
    const length = 4
    const height = 1
    const thickness = 0.2
    const geom = new BoxGeometry(length, height, thickness)
    const mat = new MeshBasicMaterial({ color: 0xcbd5e1 })
    const wall = new Mesh(geom, mat)
    wall.position.set(0, height / 2, 0)
    scene.add(wall)
    this.setScene(scene)
  }
}

/** 配电柜：带指示灯和柜门的立方体柜体，自发光外观 */
export class PowerCabinet extends Model {
  constructor(name = 'PowerCabinet') {
    super(name)
    const scene = new Scene()

    const width = 1.2
    const height = 2
    const depth = 0.6

    // 柜体
    const bodyGeom = new BoxGeometry(width, height, depth)
    const bodyMat = new MeshBasicMaterial({ color: 0x111827 })
    const body = new Mesh(bodyGeom, bodyMat)
    body.position.set(0, height / 2, 0)
    scene.add(body)

    // 柜门前面板（用画布画出指示灯/文字）
    const panelCanvas = document.createElement('canvas')
    panelCanvas.width = 512
    panelCanvas.height = 1024
    const ctx = panelCanvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, panelCanvas.width, panelCanvas.height)
      // 背景
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, panelCanvas.width, panelCanvas.height)

      // 上方标题条
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, panelCanvas.width, 140)
      ctx.fillStyle = '#f9fafb'
      ctx.font = 'bold 80px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('配电柜', panelCanvas.width / 2, 80)

      // 三色指示灯
      const lampY = 240
      const radius = 38
      const gap = 80
      const startX = panelCanvas.width / 2 - gap
      const colors = ['#22c55e', '#eab308', '#ef4444']
      for (let i = 0; i < 3; i++) {
        const cx = startX + i * gap
        ctx.beginPath()
        ctx.arc(cx, lampY, radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStyle = colors[i]
        ctx.fill()
        ctx.strokeStyle = '#020617'
        ctx.lineWidth = 6
        ctx.stroke()
      }

      // 若干小开关/按钮矩形
      ctx.fillStyle = '#1f2937'
      const rowYStart = 360
      const rowGap = 90
      const colXStart = 90
      const colGap = 120
      const btnW = 90
      const btnH = 50
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          const x = colXStart + c * colGap
          const y = rowYStart + r * rowGap
          ctx.fillRect(x, y, btnW, btnH)
          ctx.strokeStyle = '#4b5563'
          ctx.lineWidth = 4
          ctx.strokeRect(x, y, btnW, btnH)
        }
      }
    }

    const panelTex = new CanvasTexture(panelCanvas)
    const panelMat = new MeshBasicMaterial({ map: panelTex, side: DoubleSide })
    const panelGeom = new PlaneGeometry(width * 0.98, height * 0.96)
    const panel = new Mesh(panelGeom, panelMat)
    panel.position.set(0, height / 2, depth / 2 + 0.01)
    scene.add(panel)

    this.setScene(scene)
  }
}

/** 电源模块：横向长条电源盒+端子排，自发光外观 */
export class PowerModule extends Model {
  constructor(name = 'PowerModule') {
    super(name)
    const scene = new Scene()

    const width = 1.6
    const height = 0.4
    const depth = 0.6

    const bodyGeom = new BoxGeometry(width, height, depth)
    const bodyMat = new MeshBasicMaterial({ color: 0x0f172a })
    const body = new Mesh(bodyGeom, bodyMat)
    body.position.set(0, height / 2, 0)
    scene.add(body)

    // 端子面板纹理
    const faceCanvas = document.createElement('canvas')
    faceCanvas.width = 512
    faceCanvas.height = 256
    const ctx = faceCanvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height)
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, faceCanvas.width, faceCanvas.height)

      ctx.fillStyle = '#9ca3af'
      ctx.font = 'bold 52px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('24V DC POWER', 32, 28)

      // 端子小块
      const termY = 140
      const termW = 44
      const termH = 52
      const termGap = 10
      const startX = 32
      for (let i = 0; i < 8; i++) {
        const x = startX + i * (termW + termGap)
        ctx.fillStyle = '#111827'
        ctx.fillRect(x, termY, termW, termH)
        ctx.strokeStyle = '#4b5563'
        ctx.lineWidth = 3
        ctx.strokeRect(x, termY, termW, termH)
      }
    }

    const faceTex = new CanvasTexture(faceCanvas)
    const faceMat = new MeshBasicMaterial({ map: faceTex, side: DoubleSide })
    const faceGeom = new PlaneGeometry(width * 0.96, height * 0.9)
    const face = new Mesh(faceGeom, faceMat)
    face.position.set(0, height / 2, depth / 2 + 0.01)
    scene.add(face)

    this.setScene(scene)
  }
}

/** 监控屏幕：带底座与屏幕内容的显示器，自发光外观 */
export class MonitorScreen extends Model {
  constructor(name = 'MonitorScreen') {
    super(name)
    const scene = new Scene()

    // 尺寸（大致 24-27 寸显示器比例）
    const screenW = 1.6
    const screenH = 0.95
    const thickness = 0.08

    // 外框
    const frameGeom = new BoxGeometry(screenW, screenH, thickness)
    const frameMat = new MeshBasicMaterial({ color: 0x111827 })
    const frame = new Mesh(frameGeom, frameMat)
    frame.position.set(0, 1.35, 0)
    scene.add(frame)

    // 屏幕内容（CanvasTexture）
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // 背景渐变
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      g.addColorStop(0, '#0b1220')
      g.addColorStop(1, '#061427')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 顶部栏
      ctx.fillStyle = 'rgba(56,189,248,0.18)'
      ctx.fillRect(0, 0, canvas.width, 86)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = 'bold 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('MONITOR', 36, 44)

      // 网格/曲线
      ctx.strokeStyle = 'rgba(148,163,184,0.22)'
      ctx.lineWidth = 2
      for (let x = 0; x <= canvas.width; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, 86)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 86; y <= canvas.height; y += 64) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(34,197,94,0.9)'
      ctx.lineWidth = 6
      ctx.beginPath()
      const baseY = 400
      for (let x = 0; x <= canvas.width; x += 20) {
        const t = x / canvas.width
        const y = baseY + Math.sin(t * Math.PI * 2) * 60 + Math.sin(t * Math.PI * 6) * 18
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 右下角状态
      ctx.fillStyle = 'rgba(148,163,184,0.9)'
      ctx.font = '28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText('ONLINE', canvas.width - 26, canvas.height - 18)
    }

    const tex = new CanvasTexture(canvas)
    const screenMat = new MeshBasicMaterial({ map: tex, side: DoubleSide })
    const screenGeom = new PlaneGeometry(screenW * 0.92, screenH * 0.86)
    const screen = new Mesh(screenGeom, screenMat)
    screen.position.set(0, 1.35, thickness / 2 + 0.01)
    scene.add(screen)

    // 支架/底座
    const standGeom = new BoxGeometry(0.18, 0.6, 0.18)
    const standMat = new MeshBasicMaterial({ color: 0x334155 })
    const stand = new Mesh(standGeom, standMat)
    stand.position.set(0, 0.85, 0)
    scene.add(stand)

    const baseGeom = new BoxGeometry(0.9, 0.08, 0.5)
    const baseMat = new MeshBasicMaterial({ color: 0x1f2937 })
    const base = new Mesh(baseGeom, baseMat)
    base.position.set(0, 0.42, 0.05)
    scene.add(base)

    this.setScene(scene)
  }
}

/** 监控屏幕（无底座）：仅外框 + 屏幕内容，可用于挂墙/嵌入式 */
export class MonitorScreenNoStand extends Model {
  constructor(name = 'MonitorScreenNoStand') {
    super(name)
    const scene = new Scene()

    const screenW = 1.6
    const screenH = 0.95
    const thickness = 0.08

    const frameGeom = new BoxGeometry(screenW, screenH, thickness)
    const frameMat = new MeshBasicMaterial({ color: 0x111827 })
    const frame = new Mesh(frameGeom, frameMat)
    frame.position.set(0, 1.35, 0)
    scene.add(frame)

    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      g.addColorStop(0, '#0b1220')
      g.addColorStop(1, '#061427')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'rgba(56,189,248,0.18)'
      ctx.fillRect(0, 0, canvas.width, 86)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = 'bold 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('MONITOR', 36, 44)

      ctx.strokeStyle = 'rgba(148,163,184,0.22)'
      ctx.lineWidth = 2
      for (let x = 0; x <= canvas.width; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, 86)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 86; y <= canvas.height; y += 64) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(34,197,94,0.9)'
      ctx.lineWidth = 6
      ctx.beginPath()
      const baseY = 400
      for (let x = 0; x <= canvas.width; x += 20) {
        const t = x / canvas.width
        const y = baseY + Math.sin(t * Math.PI * 2) * 60 + Math.sin(t * Math.PI * 6) * 18
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      ctx.fillStyle = 'rgba(148,163,184,0.9)'
      ctx.font = '28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText('ONLINE', canvas.width - 26, canvas.height - 18)
    }

    const tex = new CanvasTexture(canvas)
    const screenMat = new MeshBasicMaterial({ map: tex, side: DoubleSide })
    const screenGeom = new PlaneGeometry(screenW * 0.92, screenH * 0.86)
    const screen = new Mesh(screenGeom, screenMat)
    screen.position.set(0, 1.35, thickness / 2 + 0.01)
    scene.add(screen)

    this.setScene(scene)
  }
}

/** 光条（静态辉光效果）：圆柱形细长条，亮心与柔和边缘纹理，自发光 */
export class LightStrip extends Model {
  constructor(name = 'LightStrip') {
    super(name)
    const scene = new Scene()

    const length = 3
    const radius = 0.06

    // 辉光纹理：U 沿周长（亮心在中间）、V 沿轴向
    const w = 128
    const h = 512
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, w, h)
      const g = ctx.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0, 'rgba(56,189,248,0.2)')
      g.addColorStop(0.4, 'rgba(125,211,252,0.85)')
      g.addColorStop(0.5, 'rgba(224,242,254,0.98)')
      g.addColorStop(0.6, 'rgba(125,211,252,0.85)')
      g.addColorStop(1, 'rgba(56,189,248,0.2)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }

    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide })
    const geom = new CylinderGeometry(radius, radius, length, 24, 1)
    const mesh = new Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, radius + 0.02, 0)
    scene.add(mesh)

    this.setScene(scene)
  }
}

/** 二层别墅：主体 + 坡屋顶 + 简单窗格纹理，自发光 */
export class Villa2F extends Model {
  constructor(name = 'Villa2F') {
    super(name)
    const scene = new Scene()

    const w = 4
    const d = 3.5
    const floorH = 1.2
    const totalH = floorH * 2

    const bodyGeom = new BoxGeometry(w, totalH, d)
    const bodyMat = new MeshBasicMaterial({ color: 0xfef3c7 })
    const body = new Mesh(bodyGeom, bodyMat)
    body.position.set(0, totalH / 2, 0)
    scene.add(body)

    const cw = 512
    const ch = 512
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#fef3c7'
      ctx.fillRect(0, 0, cw, ch)
      ctx.strokeStyle = '#78716c'
      ctx.lineWidth = 3
      const cols = 4
      const rows = 4
      const cellW = cw / cols
      const cellH = ch / rows
      const margin = 12
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellW + margin
          const y = row * cellH + margin
          const bw = cellW - margin * 2
          const bh = cellH - margin * 2
          ctx.fillStyle = '#a78bfa'
          ctx.fillRect(x, y, bw, bh)
          ctx.strokeRect(x, y, bw, bh)
        }
      }
    }
    const wallTex = new CanvasTexture(canvas)
    const wallMat = new MeshBasicMaterial({ map: wallTex, side: DoubleSide })
    const wallGeom = new PlaneGeometry(w * 0.98, totalH * 0.98)
    const frontWall = new Mesh(wallGeom, wallMat)
    frontWall.position.set(0, totalH / 2, d / 2 + 0.01)
    scene.add(frontWall)

    const roofW = w * 1.08
    const roofD = d * 1.08
    const roofH = 0.85
    const roofGeom = new BoxGeometry(roofW, roofH, roofD)
    const roofMat = new MeshBasicMaterial({ color: 0x78716c })
    const roof = new Mesh(roofGeom, roofMat)
    roof.position.set(0, totalH + roofH / 2, 0)
    roof.rotation.x = Math.PI / 4
    scene.add(roof)

    this.setScene(scene)
  }
}

/** 十层楼房：竖向长条 + 窗格纹理，自发光 */
export class Building10F extends Model {
  constructor(name = 'Building10F') {
    super(name)
    const scene = new Scene()

    const w = 3
    const d = 2.5
    const floorH = 0.8
    const floors = 10
    const totalH = floorH * floors

    const bodyGeom = new BoxGeometry(w, totalH, d)
    const bodyMat = new MeshBasicMaterial({ color: 0xe2e8f0 })
    const body = new Mesh(bodyGeom, bodyMat)
    body.position.set(0, totalH / 2, 0)
    scene.add(body)

    const cw = 256
    const ch = 1024
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(0, 0, cw, ch)
      const cols = 3
      const rows = floors * 2
      const cellW = cw / cols
      const cellH = ch / rows
      const margin = 6
      ctx.fillStyle = '#38bdf8'
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellW + margin
          const y = row * cellH + margin
          const bw = cellW - margin * 2
          const bh = cellH - margin * 2
          ctx.fillRect(x, y, bw, bh)
          ctx.strokeRect(x, y, bw, bh)
        }
      }
    }
    const wallTex = new CanvasTexture(canvas)
    const wallMat = new MeshBasicMaterial({ map: wallTex, side: DoubleSide })
    const wallGeom = new PlaneGeometry(w * 0.98, totalH * 0.98)
    const frontWall = new Mesh(wallGeom, wallMat)
    frontWall.position.set(0, totalH / 2, d / 2 + 0.01)
    scene.add(frontWall)

    this.setScene(scene)
  }
}

/** AGV（自动导引车）：底盘 + 载货面 + 四轮 + 前侧指示灯，自发光 */
export class AGV extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'status', label: '状态', enum: ['normal', 'fault'] }
  ]

  private status: DeviceStatus = 'normal'
  private readonly statusIndicatorMat: MeshBasicMaterial
  private blinkElapsed = 0
  private blinkOn = true
  private static readonly BLINK_INTERVAL_S = 0.2

  constructor(name = 'AGV') {
    super(name)
    const scene = new Scene()

    const bodyL = 1.2
    const bodyW = 0.8
    const bodyH = 0.2
    const chassisGeom = new BoxGeometry(bodyL, bodyH, bodyW)
    const chassisMat = new MeshBasicMaterial({ color: 0x334155 })
    const chassis = new Mesh(chassisGeom, chassisMat)
    chassis.position.set(0, bodyH / 2, 0)
    scene.add(chassis)

    const deckH = 0.06
    const deckGeom = new BoxGeometry(bodyL * 0.92, deckH, bodyW * 0.92)
    this.statusIndicatorMat = new MeshBasicMaterial({ color: 0x475569 })
    const deck = new Mesh(deckGeom, this.statusIndicatorMat)
    deck.position.set(0, bodyH + deckH / 2, 0)
    scene.add(deck)

    const wheelR = 0.08
    const wheelW = 0.06
    const wheelGeom = new CylinderGeometry(wheelR, wheelR, wheelW, 16)
    const wheelMat = new MeshBasicMaterial({ color: 0x1e293b })
    const halfL = bodyL / 2 - wheelR * 0.6
    const halfW = bodyW / 2 - wheelR * 0.6
    const wheelY = wheelR + 0.01
    ;[
      [halfL, wheelY, halfW],
      [halfL, wheelY, -halfW],
      [-halfL, wheelY, halfW],
      [-halfL, wheelY, -halfW]
    ].forEach(([x, y, z]) => {
      const wheel = new Mesh(wheelGeom, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, y, z)
      scene.add(wheel)
    })

    const panelGeom = new BoxGeometry(bodyW * 0.7, bodyH * 1.2, 0.04)
    const panelMat = new MeshBasicMaterial({ color: 0x1e293b })
    const panel = new Mesh(panelGeom, panelMat)
    panel.position.set(0, bodyH / 2 + 0.02, bodyW / 2 + 0.03)
    scene.add(panel)

    const lampW = 64
    const lampH = 32
    const lampCanvas = document.createElement('canvas')
    lampCanvas.width = lampW
    lampCanvas.height = lampH
    const lctx = lampCanvas.getContext('2d')
    if (lctx) {
      lctx.fillStyle = '#1e293b'
      lctx.fillRect(0, 0, lampW, lampH)
      lctx.fillStyle = '#22c55e'
      lctx.beginPath()
      lctx.arc(lampW * 0.25, lampH / 2, 8, 0, Math.PI * 2)
      lctx.fill()
      lctx.fillStyle = '#eab308'
      lctx.beginPath()
      lctx.arc(lampW * 0.5, lampH / 2, 8, 0, Math.PI * 2)
      lctx.fill()
      lctx.fillStyle = '#ef4444'
      lctx.beginPath()
      lctx.arc(lampW * 0.75, lampH / 2, 8, 0, Math.PI * 2)
      lctx.fill()
    }
    const lampTex = new CanvasTexture(lampCanvas)
    const lampMat = new MeshBasicMaterial({ map: lampTex, transparent: true, side: DoubleSide })
    const lampGeom = new PlaneGeometry(bodyW * 0.5, bodyH * 0.8)
    const lamp = new Mesh(lampGeom, lampMat)
    lamp.position.set(0, bodyH / 2 + 0.02, bodyW / 2 + 0.06)
    scene.add(lamp)

    this.setScene(scene)
  }

  private applyStatusIndicator(): void {
    if (this.status === 'fault') {
      this.statusIndicatorMat.color.setHex(this.blinkOn ? 0xef4444 : 0x475569)
      return
    }
    this.statusIndicatorMat.color.setHex(0x475569)
  }

  override update(delta: number) {
    super.update(delta)
    if (this.status !== 'fault') {
      // 退出故障态后复位闪烁状态，避免再次进入时相位混乱
      if (this.blinkElapsed !== 0 || this.blinkOn !== true) {
        this.blinkElapsed = 0
        this.blinkOn = true
      }
      return
    }
    this.blinkElapsed += delta
    while (this.blinkElapsed >= AGV.BLINK_INTERVAL_S) {
      this.blinkElapsed -= AGV.BLINK_INTERVAL_S
      this.blinkOn = !this.blinkOn
      this.applyStatusIndicator()
    }
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'status') {
      const s = parseDeviceStatus(value)
      if (!s) return
      this.status = s
      if (this.status !== 'fault') {
        this.blinkElapsed = 0
        this.blinkOn = true
      }
      this.applyStatusIndicator()
      return
    }
    super.propUpdate(key, value)
  }
}

/** 叉车：底盘 + 驾驶室 + 门架 + 货叉 + 配重 + 四轮，自发光 */
export class Forklift extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'status', label: '状态', enum: ['normal', 'fault'] }
  ]

  private status: DeviceStatus = 'normal'
  private readonly statusIndicatorMat: MeshBasicMaterial
  private blinkElapsed = 0
  private blinkOn = true
  private static readonly BLINK_INTERVAL_S = 0.2

  constructor(name = 'Forklift') {
    super(name)
    const scene = new Scene()

    const bodyL = 1.0
    const bodyW = 0.6
    const bodyH = 0.22
    const chassisGeom = new BoxGeometry(bodyL, bodyH, bodyW)
    const chassisMat = new MeshBasicMaterial({ color: 0xf59e0b })
    const chassis = new Mesh(chassisGeom, chassisMat)
    chassis.position.set(0, bodyH / 2, 0)
    scene.add(chassis)

    const cabW = 0.5
    const cabD = 0.4
    const cabH = 0.45
    const cabGeom = new BoxGeometry(cabW, cabH, cabD)
    this.statusIndicatorMat = new MeshBasicMaterial({ color: 0xd97706 })
    const cab = new Mesh(cabGeom, this.statusIndicatorMat)
    cab.position.set(-bodyL / 2 + cabW / 2 + 0.08, bodyH + cabH / 2, 0)
    scene.add(cab)

    const mastW = 0.08
    const mastD = 0.12
    const mastH = 0.75
    const mastGeom = new BoxGeometry(mastW, mastH, mastD)
    const mastMat = new MeshBasicMaterial({ color: 0x78716c })
    const mastL = new Mesh(mastGeom, mastMat)
    mastL.position.set(0.18, bodyH + mastH / 2, bodyW / 2 - mastD / 2 - 0.02)
    scene.add(mastL)
    const mastR = new Mesh(mastGeom, mastMat)
    mastR.position.set(0.18, bodyH + mastH / 2, -bodyW / 2 + mastD / 2 + 0.02)
    scene.add(mastR)

    const forkL = 0.55
    const forkW = 0.06
    const forkH = 0.04
    const forkGeom = new BoxGeometry(forkL, forkH, forkW)
    const forkMat = new MeshBasicMaterial({ color: 0x57534e })
    const forkY = bodyH + 0.02
    const forkZ = bodyW / 2 - 0.08
    const fork1 = new Mesh(forkGeom, forkMat)
    fork1.position.set(0.18 + forkL / 2, forkY, forkZ)
    scene.add(fork1)
    const fork2 = new Mesh(forkGeom, forkMat)
    fork2.position.set(0.18 + forkL / 2, forkY, -forkZ)
    scene.add(fork2)

    const counterW = 0.35
    const counterD = 0.5
    const counterH = 0.4
    const counterGeom = new BoxGeometry(counterW, counterH, counterD)
    const counterMat = new MeshBasicMaterial({ color: 0x44403c })
    const counter = new Mesh(counterGeom, counterMat)
    counter.position.set(-bodyL / 2 - 0.02, bodyH / 2 + counterH / 2, 0)
    scene.add(counter)

    const wheelR = 0.07
    const wheelW = 0.05
    const wheelGeom = new CylinderGeometry(wheelR, wheelR, wheelW, 16)
    const wheelMat = new MeshBasicMaterial({ color: 0x1e293b })
    const halfL = bodyL / 2 - wheelR * 0.5
    const halfW = bodyW / 2 - wheelR * 0.5
    const wheelY = wheelR + 0.01
    ;[
      [halfL, wheelY, halfW],
      [halfL, wheelY, -halfW],
      [-halfL, wheelY, halfW],
      [-halfL, wheelY, -halfW]
    ].forEach(([x, y, z]) => {
      const wheel = new Mesh(wheelGeom, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, y, z)
      scene.add(wheel)
    })

    this.setScene(scene)
  }

  private applyStatusIndicator(): void {
    if (this.status === 'fault') {
      this.statusIndicatorMat.color.setHex(this.blinkOn ? 0xef4444 : 0xd97706)
      return
    }
    this.statusIndicatorMat.color.setHex(0xd97706)
  }

  override update(delta: number) {
    super.update(delta)
    if (this.status !== 'fault') {
      if (this.blinkElapsed !== 0 || this.blinkOn !== true) {
        this.blinkElapsed = 0
        this.blinkOn = true
      }
      return
    }
    this.blinkElapsed += delta
    while (this.blinkElapsed >= Forklift.BLINK_INTERVAL_S) {
      this.blinkElapsed -= Forklift.BLINK_INTERVAL_S
      this.blinkOn = !this.blinkOn
      this.applyStatusIndicator()
    }
  }

  override propUpdate(key: string, value: unknown): void {
    if (key === 'status') {
      const s = parseDeviceStatus(value)
      if (!s) return
      this.status = s
      if (this.status !== 'fault') {
        this.blinkElapsed = 0
        this.blinkOn = true
      }
      this.applyStatusIndicator()
      return
    }
    super.propUpdate(key, value)
  }
}

/** 激光束：细长圆柱 + 亮心与轴向渐变纹理，自发光，默认沿 Y 轴向上 */
export class LaserBeam extends Model {
  constructor(name = 'LaserBeam') {
    super(name)
    const scene = new Scene()

    const length = 2.5
    const radius = 0.03

    const w = 64
    const h = 512
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, w, h)
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(239,68,68,0)')
      g.addColorStop(0.12, 'rgba(239,68,68,0.5)')
      g.addColorStop(0.5, 'rgba(248,113,113,0.95)')
      g.addColorStop(0.88, 'rgba(239,68,68,0.5)')
      g.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      const g2 = ctx.createLinearGradient(0, 0, w, 0)
      g2.addColorStop(0, 'rgba(255,255,255,0)')
      g2.addColorStop(0.35, 'rgba(254,226,226,0.6)')
      g2.addColorStop(0.5, 'rgba(255,255,255,0.98)')
      g2.addColorStop(0.65, 'rgba(254,226,226,0.6)')
      g2.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g2
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillRect(0, 0, w, h)
    }

    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide })
    const geom = new CylinderGeometry(radius, radius, length, 24, 1)
    const mesh = new Mesh(geom, mat)
    mesh.position.set(0, length / 2, 0)
    scene.add(mesh)

    this.setScene(scene)
  }
}

/** 树：树干 + 树冠（球体），自发光 */
export class SimpleTree extends Model {
  constructor(name = 'SimpleTree') {
    super(name)
    const scene = new Scene()

    const trunkH = 1.2
    const trunkR = 0.12
    const trunkGeom = new CylinderGeometry(trunkR * 1.1, trunkR * 1.3, trunkH, 12)
    const trunkMat = new MeshBasicMaterial({ color: 0x78350f })
    const trunk = new Mesh(trunkGeom, trunkMat)
    trunk.position.set(0, trunkH / 2, 0)
    scene.add(trunk)

    const crownR = 0.85
    const crownGeom = new SphereGeometry(crownR, 12, 10)
    const crownMat = new MeshBasicMaterial({ color: 0x166534 })
    const crown = new Mesh(crownGeom, crownMat)
    crown.position.set(0, trunkH + crownR * 0.3, 0)
    scene.add(crown)

    this.setScene(scene)
  }
}

/** 草地：平面 + 草纹理（深浅绿斑点），自发光 */
export class GrassPatch extends Model {
  constructor(name = 'GrassPatch') {
    super(name)
    const scene = new Scene()

    const w = 4
    const h = 4
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#15803d'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#166534' : '#22c55e'
        ctx.fillRect(
          Math.floor(Math.random() * size),
          Math.floor(Math.random() * size),
          2 + Math.floor(Math.random() * 4),
          2 + Math.floor(Math.random() * 4)
        )
      }
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = '#14532d'
        ctx.fillRect(
          Math.floor(Math.random() * size),
          Math.floor(Math.random() * size),
          1,
          1
        )
      }
    }
    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, side: DoubleSide })
    const geom = new PlaneGeometry(w, h)
    const mesh = new Mesh(geom, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, 0.01, 0)
    scene.add(mesh)

    this.setScene(scene)
  }
}

