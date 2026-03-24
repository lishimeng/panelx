<template>
  <aside class="panelx-editor3d-sidebar panelx-editor3d-sidebar-right">
    <button
      type="button"
      class="panelx-editor3d-group-header"
      @click="rightGroups.transformOpen = !rightGroups.transformOpen"
    >
      <span>选中模型</span>
      <span class="panelx-editor3d-group-toggle">{{ rightGroups.transformOpen ? '−' : '+' }}</span>
    </button>
    <p v-if="!selectedWidgetId" class="panelx-editor3d-right-empty">在左侧列表中点击模型以编辑</p>
    <template v-else>
      <Transform3DSection
        v-if="rightGroups.transformOpen"
        v-model:selectedWidgetName="selectedWidgetName"
        v-model:selectedPosition="selectedPosition"
        v-model:axisLock="axisLock"
        v-model:selectedScaleUniform="selectedScaleUniform"
        v-model:selectedScale="selectedScale"
        v-model:selectedRotation="selectedRotation"
        :on-position-input-change="onPositionInputChange"
        :on-scale-uniform-change="onScaleUniformChange"
        :on-scale-axis-change="onScaleAxisChange"
        :on-rotation-axis-change="onRotationAxisChange"
      />

      <MaskSection
        v-model:rightGroups="rightGroups"
        v-model:selectedWidgetId="selectedWidgetId"
        :get-mask-settings="getMaskSettings"
        :on-mask-color-input="onMaskColorInput"
        :on-mask-opacity-input="onMaskOpacityInput"
        :on-mask-radius-input="onMaskRadiusInput"
      />

      <CustomPropertySection
        v-model:rightGroups="rightGroups"
        v-model:newPropKey="newPropKey"
        v-model:newPropValue="newPropValue"
        :selected-widget-supported-props="selectedWidgetSupportedProps"
        :selected-widget-custom-props="selectedWidgetCustomProps"
        :custom-only-prop-entries="customOnlyPropEntries as any"
        :on-set-custom-prop-value="setCustomPropValue"
        :on-remove-custom-prop="removeCustomProp"
        :on-add-custom-prop="addCustomProp"
      />

      <CommandSection
        v-model:rightGroups="rightGroups"
        v-model:selectedWidgetId="selectedWidgetId"
        v-model:rotateCmd="rotateCmd"
        v-model:moveCmd="moveCmd"
        v-model:anchorWidgetId="anchorWidgetId"
        v-model:autoRotateCmd="autoRotateCmd"
        v-model:propertyRequestJson="propertyRequestJson"
        v-model:propertyRequestError="propertyRequestError"
        :widgets3D="widgets3D"
        :on-execute-command="executeCommand"
        :on-execute-property="executeProperty"
      />
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { PropDefinition } from '../../../framework'
import type { CommandRequest, PropertyJsonExecuteRequest } from '../../../types'
import Transform3DSection from './right/Transform3DSection.vue'
import MaskSection from './right/MaskSection.vue'
import CustomPropertySection from './right/CustomPropertySection.vue'
import CommandSection from './right/CommandSection.vue'

type Vec3 = { x: number; y: number; z: number }
type AxisLock = { x: boolean; y: boolean; z: boolean }
type RotateCmd = Vec3 & { speed: number }
type MoveCmd = Vec3 & { speed: number }
type AutoRotateCmd = { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }
type RightGroups = { transformOpen: boolean; maskOpen: boolean; propsOpen: boolean; commandsOpen: boolean }
type WidgetLike = { id: string; props?: Record<string, unknown> }

const rightGroups = defineModel<RightGroups>('rightGroups', { required: true })
const selectedWidgetId = defineModel<string | null>('selectedWidgetId', { required: true })
const selectedWidgetName = defineModel<string>('selectedWidgetName', { required: true })
const selectedPosition = defineModel<Vec3>('selectedPosition', { required: true })
const selectedScale = defineModel<Vec3>('selectedScale', { required: true })
const selectedScaleUniform = defineModel<number>('selectedScaleUniform', { required: true })
const selectedRotation = defineModel<Vec3>('selectedRotation', { required: true })
const axisLock = defineModel<AxisLock>('axisLock', { required: true })
const rotateCmd = defineModel<RotateCmd>('rotateCmd', { required: true })
const moveCmd = defineModel<MoveCmd>('moveCmd', { required: true })
const anchorWidgetId = defineModel<string | null>('anchorWidgetId', { required: true })
const autoRotateCmd = defineModel<AutoRotateCmd>('autoRotateCmd', { required: true })
const propertyRequestJson = defineModel<string>('propertyRequestJson', { required: true })
const propertyRequestError = defineModel<string>('propertyRequestError', { required: true })
const newPropKey = defineModel<string>('newPropKey', { required: true })
const newPropValue = defineModel<string>('newPropValue', { required: true })

defineProps({
  widgets3D: { type: Array as PropType<WidgetLike[]>, required: true },
  selectedWidgetSupportedProps: { type: Array as PropType<PropDefinition[]>, required: true },
  selectedWidgetCustomProps: { type: Object as PropType<Record<string, unknown>>, required: true },
  customOnlyPropEntries: { type: Array as PropType<Array<[string, string | number]>>, required: true },
  onPositionInputChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onScaleUniformChange: { type: Function as PropType<() => void>, required: true },
  onScaleAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onRotationAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  getMaskSettings: { type: Function as PropType<(id: string) => { color: string; opacity: number; radiusWorld: number }>, required: true },
  onMaskColorInput: { type: Function as PropType<(v: string) => void>, required: true },
  onMaskOpacityInput: { type: Function as PropType<(v: number) => void>, required: true },
  onMaskRadiusInput: { type: Function as PropType<(v: number) => void>, required: true },
  setCustomPropValue: { type: Function as PropType<(key: string, v: string) => void>, required: true },
  removeCustomProp: { type: Function as PropType<(key: string) => void>, required: true },
  addCustomProp: { type: Function as PropType<() => void>, required: true },
  executeCommand: { type: Function as PropType<(req: CommandRequest) => void>, required: true },
  executeProperty: { type: Function as PropType<(req: PropertyJsonExecuteRequest) => void>, required: true }
})

</script>

