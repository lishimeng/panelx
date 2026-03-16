import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3
} from 'three'
import { Model } from '../model/Model'

/** 工业环境通用路面（自发光、不依赖灯光），深灰底 + 车道线 */
export class IndustrialFloor extends Model {
  constructor(name = 'IndustrialFloor') {
    super(name)
    const scene = new Scene()
    const geom = new PlaneGeometry(20, 10)
    const mat = new MeshBasicMaterial({ color: 0x222630, side: DoubleSide })
    const floor = new Mesh(geom, mat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    const laneGeom = new PlaneGeometry(20, 0.08)
    const laneMat = new MeshBasicMaterial({ color: 0xfff59d, side: DoubleSide })
    const lane = new Mesh(laneGeom, laneMat)
    lane.position.set(0, 0.01, 0)
    lane.rotation.x = -Math.PI / 2
    scene.add(lane)

    this.setScene(scene)
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

/** 可显示中文名称的自发光模块（简单牌子） */
export class LabelBoard extends Model {
  constructor(name = 'LabelBoard') {
    super(name)
    const scene = new Scene()

    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
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
      ctx.fillText('设备 A', size / 2, size / 2)
    }

    const tex = new CanvasTexture(canvas)
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide })
    const geom = new PlaneGeometry(3, 3)
    const board = new Mesh(geom, mat)
    board.position.set(0, 1.6, 0)
    scene.add(board)

    this.setScene(scene)
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

