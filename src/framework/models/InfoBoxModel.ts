import { CSS3DObject } from 'three/examples/jsm/Addons.js'
import { Model } from '../model/Model'
import type { PropDefinition } from '../model/ModelRegistry'
import type { Scene3DInfoBoxColorPreset, Scene3DInfoBoxConfig, Scene3DInfoBoxStatusType } from '../../types/dashboard'
import { createScene3DInfoBox, resolveScene3DInfoBoxTheme } from '../Scene3DInfoBox'

const STATUS_ENUM: Scene3DInfoBoxStatusType[] = ['normal', 'warning', 'fault']
const PRESET_ENUM: Scene3DInfoBoxColorPreset[] = ['info', 'success', 'warning', 'error']
const FX_ENUM = ['none', 'scanlines', 'noise', 'glitch', 'all'] as const
type InfoBoxFx = (typeof FX_ENUM)[number]

/**
 * 3D 场景信息框（CSS3DObject）：
 * - 作为 Model 注册到 Editor3D，可拖入、可编辑 props
 * - 通过更新 DOM 内容实现“编辑后实时生效”，避免替换 Object3D 导致 css3dManager uuid 失效
 */
export class InfoBoxModel extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'title', label: '标题' },
    { key: 'equipmentId', label: '设备编号' },
    { key: 'status', label: '状态文本' },
    { key: 'statusType', label: '状态类型', enum: STATUS_ENUM },
    { key: 'colorPreset', label: '主题色', enum: PRESET_ENUM },
    { key: 'fx', label: '屏幕特效', enum: [...FX_ENUM] },
    { key: 'runningTime', label: '运行时长' },
    { key: 'message', label: '提示信息' }
  ]

  private cfg: Scene3DInfoBoxConfig
  private css3d: CSS3DObject

  constructor(name = 'InfoBox') {
    super(name)
    this.isCss3d = true
    this.updateEnable = false
    this.cfg = {
      id: name,
      title: 'InfoBox',
      equipmentId: 'DEV-001',
      status: 'OK',
      statusType: 'normal',
      colorPreset: 'info',
      fx: 'scanlines',
      runningTime: '',
      message: ''
    }
    this.css3d = createScene3DInfoBox(this.cfg)
    // CSS3DObject 不是 Scene，这里沿用框架现有“scene 作为 Object3D”用法
    this.setScene(this.css3d as unknown as import('three').Scene)
  }

  private syncDom(): void {
    const oldEl = (this.css3d as unknown as { element?: HTMLElement }).element
    if (oldEl) {
      // 只更新内容与主题相关样式，绝不覆盖 cssText（否则会把 CSS3DRenderer 写入的 transform 清掉，导致“变大”）
      const next = createScene3DInfoBox(this.cfg)
      const newEl = (next as unknown as { element?: HTMLElement }).element
      if (newEl) oldEl.innerHTML = newEl.innerHTML
      const theme = resolveScene3DInfoBoxTheme(this.cfg)
      oldEl.style.background = theme.bg
      oldEl.style.borderColor = theme.border
      oldEl.style.boxShadow = theme.glow
      oldEl.dataset.fx = (this.cfg.fx ?? 'scanlines') as string
    }
    // 保留原对象与 uuid，不替换 this.css3d
  }

  override propUpdate(key: string, value: unknown): void {
    const v = value == null ? '' : String(value)
    if (key === 'title') this.cfg.title = v
    else if (key === 'equipmentId') this.cfg.equipmentId = v
    else if (key === 'status') this.cfg.status = v
    else if (key === 'runningTime') this.cfg.runningTime = v
    else if (key === 'message') this.cfg.message = v
    else if (key === 'statusType') {
      const s = v as Scene3DInfoBoxStatusType
      if (STATUS_ENUM.includes(s)) this.cfg.statusType = s
    } else if (key === 'colorPreset') {
      const p = v as Scene3DInfoBoxColorPreset
      if (PRESET_ENUM.includes(p)) this.cfg.colorPreset = p
    } else if (key === 'fx') {
      const fx = v as InfoBoxFx
      if (FX_ENUM.includes(fx)) this.cfg.fx = fx
    } else {
      super.propUpdate(key, value)
      return
    }
    this.syncDom()
  }
}

