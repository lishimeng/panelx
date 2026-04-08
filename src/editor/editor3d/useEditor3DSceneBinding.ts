import { nextTick, type Ref } from 'vue'
import { Object3D, OrthographicCamera, Vector3 } from 'three'
import {
  ORTHOGRAPHIC_FRUSTUM_SCALE,
  ORTHOGRAPHIC_F_CLIP,
  ORTHOGRAPHIC_N_CLIP,
  initialOrthographicZoomFromWorldSize,
  modelRegistry,
  minOrthographicOrbitDistanceFromWorldSize,
  orthographicHalfFromWorldSize
} from '../../framework'
import type { Model } from '../../framework'
import { BaseStoryBoard } from '../../framework/storyboard/BaseStoryBoard'
import { ControlsStoryBoard } from '../../framework/storyboard/ControlsStoryBoard'
import { ModelLoadable } from '../../framework/model/ModelLoadable'
import { SimpleModel } from '../../framework/model/SimpleModel'
import type { WidgetConfig3D } from '../../types/dashboard'
import { toPositiveNumber } from '../../utils/number'

type PendingTransform = { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }

type UseEditor3DSceneBindingOptions = {
  loaderRef: Ref<any>
  worldRef: Ref<any>
  storyboardRef: Ref<any>
  addedModelNames: Set<string>
  pendingTransforms: Map<string, PendingTransform>
  addedModelNodes: Map<string, Object3D>
  sceneWorldSize: Ref<{ x: number; y: number; z: number }>
  sceneLights: { ambient: number; hemisphere: number; point: number }
  designSize3D: { width: number; height: number }
  bloomStrength: Ref<number>
  bloomRadius: Ref<number>
  bloomThreshold: Ref<number>
  customPropsKey: string
  maskColorKey: string
  maskOpacityKey: string
  maskRadiusKey: string
  autoRotateEnabledKey: string
  autoRotateAxisKey: string
  autoRotateSpeedDegKey: string
  forwardEnabledKey: string
  forwardXKey: string
  forwardYKey: string
  forwardZKey: string
  getAutoRotateSettings: (id: string) => { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }
  getForwardSettings: (id: string) => { enabled: boolean; x: number; y: number; z: number }
  normalizeLayerValues: (layer: unknown) => number[]
  applyLayersToObject: (obj: Object3D, values: number[]) => void
  degToRad: (deg: number) => number
  applyCameraLayers: () => void
  /** 与正交相机实际 zoom 同步，避免导出 scene3D.camera.zoom 仍为默认 1 而运行时覆盖掉 initialOrthographicZoom */
  cameraZoomRef?: Ref<number>
  cameraPositionRef?: Ref<{ x: number; y: number; z: number }>
  cameraLookAtRef?: Ref<{ x: number; y: number; z: number }>
}

export function useEditor3DSceneBinding(options: UseEditor3DSceneBindingOptions) {
  const ORBIT_MIN_DISTANCE = 0.1
  const RESERVED_WIDGET_PROP_KEYS = new Set(['typeId', 'source', 'position', 'scale', 'rotation'])

  function resolveModelUrl(source: string | undefined): string | undefined {
    if (source == null || source === '') return undefined
    if (source.startsWith('http://') || source.startsWith('https://')) return source
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
    const path = source.startsWith('/') ? source.slice(1) : source
    const fullPath = base.endsWith('/') ? base + path : base + '/' + path
    try {
      return new URL(fullPath, window.location.origin).href
    } catch {
      return undefined
    }
  }

  function createModelByTypeId(typeId: string, name: string, source?: string): Model | null {
    if (typeId === 'gltf') return new ModelLoadable(name, 'gltf', source ?? '') as unknown as Model
    if (typeId === 'fbx') return new ModelLoadable(name, 'fbx', source ?? '') as unknown as Model
    if (typeId === 'simple') return new SimpleModel(name) as unknown as Model
    return modelRegistry.createModel(typeId, { name, source })
  }

  function addWidgetModelToScene(w: WidgetConfig3D): void {
    const loader = options.loaderRef.value
    const sb = options.storyboardRef.value
    if (!loader || !sb) return

    const props = (w.props ?? {}) as Record<string, unknown>
    const typeId = String(props.typeId ?? '')
    if (!typeId) return

    const rawSource = props.source != null ? String(props.source) : undefined
    const source = resolveModelUrl(rawSource)
    if ((typeId === 'gltf' || typeId === 'fbx') && !source) return
    const modelName = w.id
    const model = createModelByTypeId(typeId, modelName, source)
    if (!model) return
    model.layer = options.normalizeLayerValues(w.layer)
    // Keep runtime/editor consistent: apply direct widget props as model props.
    for (const [k, v] of Object.entries(props)) {
      if (RESERVED_WIDGET_PROP_KEYS.has(k) || k === options.customPropsKey) continue
      try {
        model.propUpdate(k, v)
      } catch {
        // ignore unsupported props
      }
    }

    const custom = props[options.customPropsKey]
    if (custom && typeof custom === 'object') {
      for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
        if (k === options.maskColorKey || k === options.maskOpacityKey || k === options.maskRadiusKey) continue
        if (k === options.autoRotateEnabledKey || k === options.autoRotateAxisKey || k === options.autoRotateSpeedDegKey) continue
        if (k === options.forwardEnabledKey || k === options.forwardXKey || k === options.forwardYKey || k === options.forwardZKey) continue
        try {
          model.propUpdate(k, v)
        } catch {
          // ignore
        }
      }
    }

    const ar = options.getAutoRotateSettings(w.id)
    const axisVec = ar.axis === 'x' ? new Vector3(1, 0, 0) : ar.axis === 'y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1)
    model.setAutoRotateAxis(axisVec)
    model.setAutoRotateSpeed(options.degToRad(ar.speedDeg || 0))
    model.setAutoRotateEnabled(Boolean(ar.enabled))
    const fw = options.getForwardSettings(w.id)
    model.setForwardEnabled(Boolean(fw.enabled))
    model.setForwardAxis(new Vector3(fw.x, fw.y, fw.z))

    const pos = (props.position as [number, number, number] | undefined) ?? [0, 0, 0]
    const rawScale = props.scale
    const rawRotation = (props.rotation as [number, number, number] | undefined) ?? [0, 0, 0]
    let sx = 1
    let sy = 1
    let sz = 1
    if (Array.isArray(rawScale)) {
      sx = toPositiveNumber(rawScale[0], 1)
      sy = toPositiveNumber(rawScale[1], 1)
      sz = toPositiveNumber(rawScale[2], 1)
    } else if (typeof rawScale === 'number') {
      const v = toPositiveNumber(rawScale, 1)
      sx = sy = sz = v
    }
    options.pendingTransforms.set(modelName, {
      position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
      scale: [sx, sy, sz],
      rotation: [Number(rawRotation[0]) || 0, Number(rawRotation[1]) || 0, Number(rawRotation[2]) || 0]
    })

    loader.getTemplateStore().addModel(modelName, model as unknown as Model)
    if (model instanceof ModelLoadable) {
      loader.load(model as unknown as Model)
      return
    }

    const tf = options.pendingTransforms.get(modelName)
    const inst = model as unknown as Model
    const isCss3d = Boolean((inst as unknown as { isCss3d?: boolean }).isCss3d)
    const cssScaleMul = isCss3d ? 1 : 1
    if (inst.scene && tf) {
      inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
      inst.scene.scale.multiply(new Vector3(tf.scale[0] * cssScaleMul, tf.scale[1] * cssScaleMul, tf.scale[2] * cssScaleMul))
      inst.scene.rotation.set(options.degToRad(tf.rotation[0]), options.degToRad(tf.rotation[1]), options.degToRad(tf.rotation[2]))
      options.applyLayersToObject(inst.scene, model.layer)
    }
    ;(sb as BaseStoryBoard).addModel(inst)
    options.addedModelNames.add(modelName)
    if (inst.scene) options.addedModelNodes.set(modelName, inst.scene as unknown as Object3D)
  }

  function onFrameworkLoaded(loader: any, world: any): void {
    options.loaderRef.value = loader
    options.worldRef.value = world
    world.setBloom(true, {
      strength: options.bloomStrength.value,
      radius: options.bloomRadius.value,
      threshold: options.bloomThreshold.value
    })

    if (!options.storyboardRef.value) {
      const wp = options.worldRef.value?.getSize() ?? { x: 0, y: 0 }
      const aspect = wp.y > 0 ? wp.x / wp.y : options.designSize3D.height > 0 ? options.designSize3D.width / options.designSize3D.height : 1
      const halfH = orthographicHalfFromWorldSize(options.sceneWorldSize.value) * ORTHOGRAPHIC_FRUSTUM_SCALE
      const cam = new OrthographicCamera(-halfH * aspect, halfH * aspect, halfH, -halfH, ORTHOGRAPHIC_N_CLIP, ORTHOGRAPHIC_F_CLIP)
      const orbitDist = minOrthographicOrbitDistanceFromWorldSize(options.sceneWorldSize.value)
      const ORBIT_MAX_DISTANCE = Math.max(orbitDist * 20, 50000)
      const pose = options.cameraPositionRef?.value
      const hasPose =
        pose &&
        Number.isFinite(Number(pose.x)) &&
        Number.isFinite(Number(pose.y)) &&
        Number.isFinite(Number(pose.z))
      if (hasPose) cam.position.set(Number(pose!.x), Number(pose!.y), Number(pose!.z))
      else cam.position.copy(new Vector3(1, 1, 1).normalize().multiplyScalar(orbitDist))
      cam.zoom = initialOrthographicZoomFromWorldSize(options.sceneWorldSize.value)
      cam.updateProjectionMatrix()
      if (options.cameraZoomRef) {
        options.cameraZoomRef.value = cam.zoom
      }
      const sb = new ControlsStoryBoard('Editor3D', cam, {
        background: null,
        orthographicSize: halfH,
        lights: { ambient: options.sceneLights.ambient, hemisphere: options.sceneLights.hemisphere, point: options.sceneLights.point }
      })
      sb.enableControls(world.getRendererDom())
      if (sb.controls) {
        const lookAt = options.cameraLookAtRef?.value
        const hasLookAt =
          lookAt &&
          Number.isFinite(Number(lookAt.x)) &&
          Number.isFinite(Number(lookAt.y)) &&
          Number.isFinite(Number(lookAt.z))
        if (hasLookAt) sb.controls.target.set(Number(lookAt!.x), Number(lookAt!.y), Number(lookAt!.z))
        else sb.controls.target.set(0, 0, 0)
        sb.controls.enableDamping = true
        sb.controls.dampingFactor = 0.05
        sb.controls.minDistance = Math.max(ORBIT_MIN_DISTANCE, orbitDist * 0.98)
        sb.controls.maxDistance = ORBIT_MAX_DISTANCE
        sb.controls.update()
      }
      options.storyboardRef.value = sb
      options.applyCameraLayers()
      world.sceneTo(sb)
      nextTick(() => world.notifyResize())
    }

    const sb = options.storyboardRef.value
    if (!sb) return
    for (const [name] of loader.getTemplateStore().getTemplateMap().entries()) {
      if (options.addedModelNames.has(name)) continue
      const inst = loader.getTemplateStore().createModelInstance(name)
      if (!inst || !inst.scene) continue
      const tf = options.pendingTransforms.get(name)
      if (tf) {
        inst.scene.position.set(tf.position[0], tf.position[1], tf.position[2])
        inst.scene.scale.set(tf.scale[0], tf.scale[1], tf.scale[2])
        inst.scene.rotation.set(options.degToRad(tf.rotation[0]), options.degToRad(tf.rotation[1]), options.degToRad(tf.rotation[2]))
      }
      ;(sb as BaseStoryBoard).addModel(inst as unknown as Model)
      options.addedModelNames.add(name)
      options.addedModelNodes.set(name, inst.scene!)
    }
  }

  return {
    addWidgetModelToScene,
    onFrameworkLoaded
  }
}

