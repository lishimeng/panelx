/**
 * 将 3D 编辑器导出的 widgets3D 转为 Scene3DFramework 所需的 Scene3DConfig，
 * 用于在 Configurable / Dashboard 中加载仅含 3D 的配置。
 */

import type { WidgetConfig3D } from '../types/dashboard'
import type {
  Scene3DConfig,
  Model3DItemConfig,
  Scene3DInfoBoxConfig,
  Scene3DLightConfig,
  Scene3DCameraLayerItem,
  Scene3DBloomConfig,
  DashboardScene3DConfig
} from '../types/dashboard'

import { LayerDef } from '../framework/LayerDef'
import { orthographicHalfFromWorldSize, worldSizeHasPositiveExtent } from '../framework/orthographicView'
import { degToRad } from './angle'
import { toPositiveNumberOrUndefined } from './number'

const CUSTOM_PROPS_KEY = 'custom'
const BUILTIN_SOURCE_PREFIX = 'builtin:'

/** 已知 typeId 的默认 source（配置未带 source 时兜底，如旧导出） */
const TYPE_ID_SOURCE_FALLBACK: Record<string, string> = {
  'drying-machine': '/models/product-line.glb'
}

function scaleToUniform(raw: unknown): number | undefined {
  if (typeof raw === 'number') return toPositiveNumberOrUndefined(raw)
  if (Array.isArray(raw) && raw.length > 0) {
    return toPositiveNumberOrUndefined(raw[0])
  }
  return undefined
}

function rotationToRadians(raw: unknown): [number, number, number] | undefined {
  if (!Array.isArray(raw) || raw.length < 3) return undefined
  return [
    degToRad(Number(raw[0]) || 0),
    degToRad(Number(raw[1]) || 0),
    degToRad(Number(raw[2]) || 0)
  ]
}

export function widgets3DToScene3DConfig(
  widgets3D: WidgetConfig3D[],
  options?: { background?: string | null; scene?: DashboardScene3DConfig }
): Scene3DConfig {
  const scene = options?.scene
  const models: Model3DItemConfig[] = []
  const infoBoxes: Scene3DInfoBoxConfig[] = []
  let lights: Scene3DLightConfig | undefined = scene?.lights
  let orthographicSize: number | undefined
  let cameraLayers: Scene3DCameraLayerItem[] | undefined =
    scene?.camera?.layers?.map((item) => ({
      layer: LayerDef.normalize(item.layer),
      enable: Boolean(item.enable)
    })) ?? undefined
  let bloom: Scene3DBloomConfig | undefined = scene?.bloom
  const visible = widgets3D.filter((w) => w.visible !== false)

  for (const w of visible) {
    const props = (w.props ?? {}) as Record<string, unknown>
    const typeId = String(props.typeId ?? '')
    if (typeId === 'info-box' || typeId === 'sprite-info-box') {
      const custom = (props[CUSTOM_PROPS_KEY] ?? props) as Record<string, unknown>
      const position = props.position as [number, number, number] | undefined
      if (!position) continue
      const infoLayer = (Array.isArray(w.layer) ? w.layer[0] : w.layer) ?? LayerDef.default
      infoBoxes.push({
        id: w.id,
        position: [position[0], position[1], position[2]],
        title: String(custom?.title ?? ''),
        subtitle: custom?.subtitle != null ? String(custom.subtitle) : undefined,
        metaLeft: custom?.metaLeft != null ? String(custom.metaLeft) : undefined,
        metaRight: custom?.metaRight != null ? String(custom.metaRight) : undefined,
        content: custom?.content != null ? String(custom.content) : undefined,
        note: custom?.note != null ? String(custom.note) : undefined,
        colorPreset: (custom?.colorPreset as Scene3DInfoBoxConfig['colorPreset']) ?? 'info',
        fx: (custom?.fx as Scene3DInfoBoxConfig['fx']) ?? 'none',
        renderType: typeId === 'sprite-info-box' ? 'sprite' : 'css3d',
        layer: infoLayer,
        visible: true
      })
      continue
    }

    let source = props.source != null ? String(props.source) : TYPE_ID_SOURCE_FALLBACK[typeId]
    // 对于内置 simple 模型（如 expanding-ring），没有 source 也应该能渲染；
    // 在非 widgets3D runtime 路径里用这个前缀交给 Scene3DFramework 创建。
    if (!source) source = `${BUILTIN_SOURCE_PREFIX}${typeId}`
    if (!source.startsWith(BUILTIN_SOURCE_PREFIX) && !source.startsWith('http') && !source.startsWith('/')) source = '/' + source

    const position = props.position as [number, number, number] | undefined
    const rotation = rotationToRadians(props.rotation)
    const scale = scaleToUniform(props.scale)

    models.push({
      id: w.id,
      source,
      format: typeId === 'fbx' ? 'fbx' : 'gltf',
      visible: true,
      layer: w.layer,
      position: position ?? [0, 0, 0],
      rotation: rotation ?? [0, 0, 0],
      scale
    })

    if (!lights && props.sceneLights && typeof props.sceneLights === 'object') {
      const sl = props.sceneLights as Record<string, unknown>
      lights = {
        ambient: Number(sl.ambient),
        hemisphere: Number(sl.hemisphere),
        point: Number(sl.point)
      }
    }
    if (orthographicSize == null && w.worldSize && typeof w.worldSize === 'object') {
      const ws = w.worldSize as { x?: number; y?: number; z?: number }
      if (worldSizeHasPositiveExtent(ws)) orthographicSize = orthographicHalfFromWorldSize(ws)
    }
    if (!bloom && props.sceneBloom && typeof props.sceneBloom === 'object') {
      const sb = props.sceneBloom as Record<string, unknown>
      bloom = {
        strength: Number(sb.strength),
        radius: Number(sb.radius),
        threshold: Number(sb.threshold)
      }
    }
    if (!cameraLayers && props.cameraLayers && Array.isArray(props.cameraLayers)) {
      cameraLayers = (props.cameraLayers as Scene3DCameraLayerItem[]).map((item) => ({
        layer: LayerDef.normalize(item.layer),
        enable: Boolean(item.enable)
      }))
    }
  }

  const cameraType = scene?.camera?.type ?? (orthographicSize != null ? 'orthographic' : undefined)
  const cameraOrthographicSize = scene?.camera?.orthographicSize ?? orthographicSize
  const cameraPosition = Array.isArray(scene?.camera?.position) ? scene?.camera?.position : undefined
  const cameraLookAt = Array.isArray(scene?.camera?.lookAt) ? scene?.camera?.lookAt : undefined
  const cameraZoom = scene?.camera?.zoom

  const config: Scene3DConfig = {
    widgets3D: widgets3D.map((w) => ({ ...w, props: w.props ? { ...w.props } : undefined })),
    models,
    infoBoxes,
    background: options?.background ?? undefined,
    lights,
    bloom,
    ...(scene?.starField != null ? { starField: Boolean(scene.starField) } : {}),
    camera:
      cameraType != null || cameraLayers != null
        ? {
            ...(cameraType ? { type: cameraType } : {}),
            ...(cameraType === 'orthographic' && cameraOrthographicSize != null
              ? { orthographicSize: cameraOrthographicSize }
              : {}),
            ...(cameraPosition ? { position: [Number(cameraPosition[0]) || 0, Number(cameraPosition[1]) || 0, Number(cameraPosition[2]) || 0] } : {}),
            ...(cameraLookAt ? { lookAt: [Number(cameraLookAt[0]) || 0, Number(cameraLookAt[1]) || 0, Number(cameraLookAt[2]) || 0] } : {}),
            ...(cameraZoom != null ? { zoom: cameraZoom } : {}),
            ...(cameraLayers ? { layers: cameraLayers } : {})
          }
        : undefined
  }
  return config
}
