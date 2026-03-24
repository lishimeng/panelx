import { computed, ref, type Ref } from 'vue'
import { BaseStoryBoard } from '../../framework/storyboard/BaseStoryBoard'
import type { DashboardConfig } from '../../types/dashboard'
import type { StoryBoard } from '../../framework'
import type { PropDefinition } from '../../framework'

type UseEditor3DCustomPropsOptions = {
  config: DashboardConfig
  selectedWidgetId: Ref<string | null>
  storyboardRef: Ref<StoryBoard | null>
  customPropsKey: string
  selectedWidgetSupportedProps: Ref<PropDefinition[]>
}

export function useEditor3DCustomProps(options: UseEditor3DCustomPropsOptions) {
  const selectedWidgetCustomProps = computed(() => {
    const id = options.selectedWidgetId.value
    if (!id) return {}
    const w = options.config.widgets3D?.find((item) => item.id === id)
    if (!w) return {}
    if (!w.props) w.props = {}
    if (
      typeof (w.props as Record<string, unknown>)[options.customPropsKey] !== 'object' ||
      (w.props as Record<string, unknown>)[options.customPropsKey] === null
    ) {
      ;(w.props as Record<string, unknown>)[options.customPropsKey] = {}
    }
    return (w.props as Record<string, unknown>)[options.customPropsKey] as Record<string, string | number>
  })

  const customOnlyPropEntries = computed(() => {
    const supportedKeys = new Set(options.selectedWidgetSupportedProps.value.map((p) => p.key))
    return Object.entries(selectedWidgetCustomProps.value).filter(([k]) => !supportedKeys.has(k))
  })

  const newPropKey = ref('')
  const newPropValue = ref('')

  function notifyModelPropUpdate(key: string, value: unknown): void {
    const id = options.selectedWidgetId.value
    if (!id) return
    const sb = options.storyboardRef.value as BaseStoryBoard | null
    const model = sb?.getModelByName(id)
    if (model) model.propUpdate(key, value)
  }

  function addCustomProp(): void {
    const key = String(newPropKey.value ?? '').trim()
    if (!key) return
    const obj = selectedWidgetCustomProps.value
    const val = newPropValue.value
    const num = Number(val)
    const value = Number.isFinite(num) ? num : String(val ?? '')
    obj[key] = value
    newPropKey.value = ''
    newPropValue.value = ''
    notifyModelPropUpdate(key, value)
  }

  function setCustomPropValue(key: string, value: string): void {
    const obj = selectedWidgetCustomProps.value
    const num = Number(value)
    const parsed = Number.isFinite(num) ? num : value
    obj[key] = parsed
    notifyModelPropUpdate(key, parsed)
  }

  function removeCustomProp(key: string): void {
    const obj = selectedWidgetCustomProps.value
    delete obj[key]
    notifyModelPropUpdate(key, undefined)
  }

  return {
    selectedWidgetCustomProps,
    customOnlyPropEntries,
    newPropKey,
    newPropValue,
    addCustomProp,
    setCustomPropValue,
    removeCustomProp
  }
}

