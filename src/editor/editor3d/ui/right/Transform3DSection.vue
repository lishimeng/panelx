<template>
  <div class="panelx-editor3d-pos-editor">
    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">实例ID (id)</span>
      <div class="panelx-editor3d-size-inputs">
        <input
          :value="selectedWidgetId"
          type="text"
          class="panelx-editor3d-props-value"
          placeholder="唯一实例ID"
          @change="onRenameWidgetId(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div v-if="selectedWidgetIdError" class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-value" style="color: #fca5a5;">{{ selectedWidgetIdError }}</span>
    </div>
    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">名称 (name)</span>
      <div class="panelx-editor3d-size-inputs">
        <input
          v-model="selectedWidgetName"
          type="text"
          class="panelx-editor3d-props-value"
          placeholder="可空，用于实例列表显示"
        />
      </div>
    </div>
    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">分组 (group)</span>
      <div class="panelx-editor3d-size-inputs">
        <select v-model="selectedWidgetGroupId" class="panelx-editor3d-props-value">
          <option v-for="gid in groupOptions" :key="gid" :value="gid">{{ gid }}</option>
        </select>
      </div>
    </div>
    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">3D属性: 位置 (X/Y/Z)</span>
      <div class="panelx-editor3d-size-inputs">
        <label>
          X
          <input v-model.number="selectedPosition.x" type="number" step="any" :disabled="axisLock.x" @change="onPositionInputChange('x')" />
          <input type="checkbox" v-model="axisLock.x" title="锁定 X" />
        </label>
        <label>
          Y
          <input v-model.number="selectedPosition.y" type="number" step="any" :disabled="axisLock.y" @change="onPositionInputChange('y')" />
          <input type="checkbox" v-model="axisLock.y" title="锁定 Y" />
        </label>
        <label>
          Z
          <input v-model.number="selectedPosition.z" type="number" step="any" :disabled="axisLock.z" @change="onPositionInputChange('z')" />
          <input type="checkbox" v-model="axisLock.z" title="锁定 Z" />
        </label>
      </div>
    </div>

    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">3D属性: 统一缩放</span>
      <div class="panelx-editor3d-size-inputs">
        <label>
          S
          <input v-model.number="selectedScaleUniform" type="number" step="any" min="0.01" @change="onScaleUniformChange" />
        </label>
      </div>
    </div>
    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">3D属性: 缩放 Z/Y/X</span>
      <div class="panelx-editor3d-size-inputs">
        <label>Z <input v-model.number="selectedScale.z" type="number" step="any" min="0.01" @change="onScaleAxisChange('z')" /></label>
        <label>Y <input v-model.number="selectedScale.y" type="number" step="any" min="0.01" @change="onScaleAxisChange('y')" /></label>
        <label>X <input v-model.number="selectedScale.x" type="number" step="any" min="0.01" @change="onScaleAxisChange('x')" /></label>
      </div>
    </div>

    <div class="panelx-editor3d-pos-row">
      <span class="panelx-editor3d-size-label">3D属性: 旋转 (度)</span>
      <div class="panelx-editor3d-size-inputs">
        <label>X <input v-model.number="selectedRotation.x" type="number" step="any" @change="onRotationAxisChange('x')" /></label>
        <label>Y <input v-model.number="selectedRotation.y" type="number" step="any" @change="onRotationAxisChange('y')" /></label>
        <label>Z <input v-model.number="selectedRotation.z" type="number" step="any" @change="onRotationAxisChange('z')" /></label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

type Vec3 = { x: number; y: number; z: number }
type AxisLock = { x: boolean; y: boolean; z: boolean }

let selectedWidgetName = defineModel<string>('selectedWidgetName', { required: true })
let selectedWidgetId = defineModel<string>('selectedWidgetId', { required: true })
let selectedWidgetIdError = defineModel<string>('selectedWidgetIdError', { required: true })
let selectedWidgetGroupId = defineModel<string>('selectedWidgetGroupId', { required: true })
let selectedPosition = defineModel<Vec3>('selectedPosition', { required: true })
let axisLock = defineModel<AxisLock>('axisLock', { required: true })
let selectedScaleUniform = defineModel<number>('selectedScaleUniform', { required: true })
let selectedScale = defineModel<Vec3>('selectedScale', { required: true })
let selectedRotation = defineModel<Vec3>('selectedRotation', { required: true })

defineProps({
  groupOptions: { type: Array as PropType<string[]>, required: true },
  onRenameWidgetId: { type: Function as PropType<(nextId: string) => void>, required: true },
  onPositionInputChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onScaleUniformChange: { type: Function as PropType<() => void>, required: true },
  onScaleAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onRotationAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true }
})
</script>

