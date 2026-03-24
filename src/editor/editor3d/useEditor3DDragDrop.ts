import { reactive, ref, type Ref } from 'vue'
import type { WidgetConfig3D } from '../../types/dashboard'
import { toPositiveNumber } from '../../utils/number'

type ModelTypeLike = { id: string; label: string }
type PresetLike = { id: string; label: string; typeId: string; source?: string; name?: string }

type DragPayloadType = {
  kind: 'type'
  id: string
  label: string
}

type DragPayloadPreset = {
  kind: 'preset'
  id: string
  label: string
  typeId: string
  source?: string
  name?: string
}

type UseEditor3DDragDropOptions = {
  widgets3DRef: Ref<WidgetConfig3D[] | undefined>
  customPropsKey: string
  defaultLayer: number
  spriteLayer: number
  addWidgetModelToScene: (w: WidgetConfig3D) => void
}

const DRAG_TYPE = 'application/panelx-3d-model'

export function useEditor3DDragDrop(options: UseEditor3DDragDropOptions) {
  const pendingDrop = ref<DragPayloadType | DragPayloadPreset | null>(null)
  const dropDialogVisible = ref(false)
  const dropForm = reactive({ posX: 0, posY: 0, posZ: 0, scale: 1 })

  function onDragStartType(e: DragEvent, item: ModelTypeLike): void {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'type', id: item.id, label: item.label }))
  }

  function onDragStartPreset(e: DragEvent, p: PresetLike): void {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData(
      DRAG_TYPE,
      JSON.stringify({ kind: 'preset', id: p.id, label: p.label, typeId: p.typeId, source: p.source, name: p.name })
    )
  }

  function onDrop(e: DragEvent): void {
    const raw = e.dataTransfer?.getData(DRAG_TYPE)
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as DragPayloadType | DragPayloadPreset
      if (payload.kind !== 'type' && payload.kind !== 'preset') return
      pendingDrop.value = payload
      dropForm.posX = 0
      dropForm.posY = 0
      dropForm.posZ = 0
      dropForm.scale = 1
      dropDialogVisible.value = true
    } catch {
      // ignore
    }
  }

  function closeDropDialog(): void {
    dropDialogVisible.value = false
    pendingDrop.value = null
  }

  function confirmDropDialog(): void {
    const payload = pendingDrop.value
    if (!payload) {
      closeDropDialog()
      return
    }
    const id = `model-${payload.id}-${Date.now()}`
    const position: [number, number, number] = [Number(dropForm.posX) || 0, Number(dropForm.posY) || 0, Number(dropForm.posZ) || 0]
    const scaleVal = toPositiveNumber(dropForm.scale, 1)
    const w: WidgetConfig3D = {
      id,
      type: 'model3d',
      layer: options.defaultLayer,
      visible: true,
      props: { position, scale: scaleVal }
    }

    if (payload.kind === 'preset') {
      w.props!.source = payload.source
      w.props!.typeId = payload.typeId
      w.props!.name = payload.name ?? payload.id
    } else {
      w.props!.typeId = payload.id
    }

    if (w.props!.typeId === 'info-box' || w.props!.typeId === 'sprite-info-box') {
      if (w.props!.typeId === 'sprite-info-box') w.layer = options.spriteLayer
      ;(w.props as Record<string, unknown>)[options.customPropsKey] = {
        title: 'Robot / Telemetry',
        subtitle: 'ROBOT STATUS PANEL',
        metaLeft: 'ID: RB-001',
        metaRight: 'ONLINE',
        colorPreset: 'info',
        fx: 'scanlines',
        content: 'General purpose information content.',
        note: 'Link stable · 0.8ms'
      }
      w.props!.scale = w.props!.scale ?? 1
    }

    const list = options.widgets3DRef.value ?? []
    if (!options.widgets3DRef.value) options.widgets3DRef.value = list
    list.push(w)
    options.addWidgetModelToScene(w)
    closeDropDialog()
  }

  return {
    pendingDrop,
    dropDialogVisible,
    dropForm,
    onDragStartType,
    onDragStartPreset,
    onDrop,
    closeDropDialog,
    confirmDropDialog
  }
}

