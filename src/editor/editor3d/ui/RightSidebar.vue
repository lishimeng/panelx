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
      <div v-if="rightGroups.transformOpen" class="panelx-editor3d-pos-editor">
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
          <span class="panelx-editor3d-size-label">位置 (X/Y/Z)</span>
          <div class="panelx-editor3d-size-inputs">
            <label>
              X
              <input
                v-model.number="selectedPosition.x"
                type="number"
                step="any"
                :disabled="axisLock.x"
                @change="onPositionInputChange('x')"
              />
              <input type="checkbox" v-model="axisLock.x" title="锁定 X" />
            </label>
            <label>
              Y
              <input
                v-model.number="selectedPosition.y"
                type="number"
                step="any"
                :disabled="axisLock.y"
                @change="onPositionInputChange('y')"
              />
              <input type="checkbox" v-model="axisLock.y" title="锁定 Y" />
            </label>
            <label>
              Z
              <input
                v-model.number="selectedPosition.z"
                type="number"
                step="any"
                :disabled="axisLock.z"
                @change="onPositionInputChange('z')"
              />
              <input type="checkbox" v-model="axisLock.z" title="锁定 Z" />
            </label>
          </div>
        </div>
      </div>

      <div v-if="rightGroups.transformOpen" class="panelx-editor3d-scale-editor">
        <div class="panelx-editor3d-pos-row">
          <span class="panelx-editor3d-size-label">统一缩放</span>
          <div class="panelx-editor3d-size-inputs">
            <label>
              S
              <input v-model.number="selectedScaleUniform" type="number" step="any" min="0.01" @change="onScaleUniformChange" />
            </label>
          </div>
        </div>
        <div class="panelx-editor3d-pos-row">
          <span class="panelx-editor3d-size-label">缩放 Z/Y/X</span>
          <div class="panelx-editor3d-size-inputs">
            <label>
              Z
              <input v-model.number="selectedScale.z" type="number" step="any" min="0.01" @change="onScaleAxisChange('z')" />
            </label>
            <label>
              Y
              <input v-model.number="selectedScale.y" type="number" step="any" min="0.01" @change="onScaleAxisChange('y')" />
            </label>
            <label>
              X
              <input v-model.number="selectedScale.x" type="number" step="any" min="0.01" @change="onScaleAxisChange('x')" />
            </label>
          </div>
        </div>

        <div class="panelx-editor3d-pos-row">
          <span class="panelx-editor3d-size-label">旋转 (度)</span>
          <div class="panelx-editor3d-size-inputs">
            <label>
              X
              <input v-model.number="selectedRotation.x" type="number" step="any" @change="onRotationAxisChange('x')" />
            </label>
            <label>
              Y
              <input v-model.number="selectedRotation.y" type="number" step="any" @change="onRotationAxisChange('y')" />
            </label>
            <label>
              Z
              <input v-model.number="selectedRotation.z" type="number" step="any" @change="onRotationAxisChange('z')" />
            </label>
          </div>
        </div>
      </div>

      <div class="panelx-editor3d-mask">
        <button type="button" class="panelx-editor3d-group-header panelx-editor3d-section" @click="rightGroups.maskOpen = !rightGroups.maskOpen">
          <span>遮罩</span>
          <span class="panelx-editor3d-group-toggle">{{ rightGroups.maskOpen ? '−' : '+' }}</span>
        </button>
        <div v-if="rightGroups.maskOpen" class="panelx-editor3d-commands-body">
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">颜色</span>
            <div class="panelx-editor3d-size-inputs">
              <input
                :value="getMaskSettings(selectedWidgetId!).color"
                type="color"
                class="panelx-editor3d-color-picker"
                title="选择遮罩颜色"
                @input="onMaskColorInput(($event.target as HTMLInputElement).value)"
              />
              <input
                :value="getMaskSettings(selectedWidgetId!).color"
                type="text"
                class="panelx-editor3d-color-hex"
                placeholder="#38bdf8"
                @input="onMaskColorInput(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">透明度</span>
            <div class="panelx-editor3d-size-inputs">
              <label>
                %
                <input
                  :value="Math.round(getMaskSettings(selectedWidgetId!).opacity * 100)"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  @input="onMaskOpacityInput(Number(($event.target as HTMLInputElement).value))"
                />
              </label>
              <span class="panelx-editor3d-size-value">选中时固定 75%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panelx-editor3d-props-editor">
        <button type="button" class="panelx-editor3d-group-header panelx-editor3d-section" @click="rightGroups.propsOpen = !rightGroups.propsOpen">
          <span>属性 (Props)</span>
          <span class="panelx-editor3d-group-toggle">{{ rightGroups.propsOpen ? '−' : '+' }}</span>
        </button>
        <template v-if="rightGroups.propsOpen">
          <div v-if="selectedWidgetSupportedProps.length" class="panelx-editor3d-props-list">
            <div v-for="prop in selectedWidgetSupportedProps" :key="prop.key" class="panelx-editor3d-props-row">
              <span class="panelx-editor3d-props-key">{{ prop.label ?? prop.key }}</span>
              <select
                v-if="prop.enum?.length"
                :value="String(selectedWidgetCustomProps[prop.key] ?? '')"
                class="panelx-editor3d-props-value panelx-editor3d-props-select"
                @change="setCustomPropValue(prop.key, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">—</option>
                <option v-for="opt in prop.enum" :key="String(opt)" :value="String(opt)">{{ opt }}</option>
              </select>
              <input
                v-else
                :value="selectedWidgetCustomProps[prop.key] ?? ''"
                type="text"
                class="panelx-editor3d-props-value"
                :placeholder="prop.key"
                @change="setCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
                @keydown.enter="setCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <template v-if="customOnlyPropEntries.length">
            <div class="panelx-editor3d-props-other-label">其他属性</div>
            <div class="panelx-editor3d-props-list">
              <div v-for="[key, val] in customOnlyPropEntries" :key="key" class="panelx-editor3d-props-row">
                <span class="panelx-editor3d-props-key">{{ key }}</span>
                <input
                  :value="String(val)"
                  type="text"
                  class="panelx-editor3d-props-value"
                  @change="setCustomPropValue(key, ($event.target as HTMLInputElement).value)"
                  @keydown.enter="setCustomPropValue(key, ($event.target as HTMLInputElement).value)"
                />
                <button type="button" class="panelx-editor3d-props-remove" title="删除" @click="removeCustomProp(key)">×</button>
              </div>
            </div>
          </template>
          <div class="panelx-editor3d-props-add">
            <input v-model="newPropKey" type="text" class="panelx-editor3d-props-key-in" placeholder="键名" />
            <input
              v-model="newPropValue"
              type="text"
              class="panelx-editor3d-props-value-in"
              placeholder="值"
              @keydown.enter="addCustomProp"
            />
            <button type="button" class="panelx-editor3d-btn panelx-editor3d-props-add-btn" @click="addCustomProp">添加</button>
          </div>
        </template>
      </div>

      <div class="panelx-editor3d-commands">
        <button type="button" class="panelx-editor3d-group-header panelx-editor3d-section" @click="rightGroups.commandsOpen = !rightGroups.commandsOpen">
          <span>命令</span>
          <span class="panelx-editor3d-group-toggle">{{ rightGroups.commandsOpen ? '−' : '+' }}</span>
        </button>
        <div v-if="rightGroups.commandsOpen" class="panelx-editor3d-commands-body">
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">自旋转</span>
            <div class="panelx-editor3d-size-inputs">
              <label class="panelx-editor3d-checkbox">
                <input v-model="autoRotateCmd.enabled" type="checkbox" @change="applyAutoRotate()" />
                启用
              </label>
              <label>
                轴
                <select v-model="autoRotateCmd.axis" class="panelx-editor3d-props-value panelx-editor3d-props-select" @change="applyAutoRotate()">
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Z</option>
                </select>
              </label>
              <label>
                速度(度/秒)
                <input v-model.number="autoRotateCmd.speedDeg" type="number" step="any" @change="applyAutoRotate()" />
              </label>
            </div>
          </div>

          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">旋转到 (度)</span>
            <div class="panelx-editor3d-size-inputs">
              <label>X <input v-model.number="rotateCmd.x" type="number" step="any" /></label>
              <label>Y <input v-model.number="rotateCmd.y" type="number" step="any" /></label>
              <label>Z <input v-model.number="rotateCmd.z" type="number" step="any" /></label>
            </div>
          </div>
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">旋转速度 (弧度/秒)</span>
            <div class="panelx-editor3d-size-inputs">
              <label>S <input v-model.number="rotateCmd.speed" type="number" step="any" min="0" /></label>
              <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="runRotateToOnce">执行一次</button>
            </div>
          </div>

          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">移动到</span>
            <div class="panelx-editor3d-size-inputs">
              <label>X <input v-model.number="moveCmd.x" type="number" step="any" /></label>
              <label>Y <input v-model.number="moveCmd.y" type="number" step="any" /></label>
              <label>Z <input v-model.number="moveCmd.z" type="number" step="any" /></label>
            </div>
          </div>
          <div class="panelx-editor3d-pos-row">
            <span class="panelx-editor3d-size-label">移动速度 (单位/秒)</span>
            <div class="panelx-editor3d-size-inputs">
              <label>S <input v-model.number="moveCmd.speed" type="number" step="any" min="0" /></label>
              <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="runMoveToOnce">执行一次</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { PropDefinition } from '../../../framework'

const rightGroups = defineModel<any>('rightGroups', { required: true })
const selectedWidgetId = defineModel<any>('selectedWidgetId', { required: true })
const selectedWidgetName = defineModel<any>('selectedWidgetName', { required: true })
const selectedPosition = defineModel<any>('selectedPosition', { required: true })
const selectedScale = defineModel<any>('selectedScale', { required: true })
const selectedScaleUniform = defineModel<any>('selectedScaleUniform', { required: true })
const selectedRotation = defineModel<any>('selectedRotation', { required: true })
const axisLock = defineModel<any>('axisLock', { required: true })
const rotateCmd = defineModel<any>('rotateCmd', { required: true })
const moveCmd = defineModel<any>('moveCmd', { required: true })
const autoRotateCmd = defineModel<any>('autoRotateCmd', { required: true })
const newPropKey = defineModel<any>('newPropKey', { required: true })
const newPropValue = defineModel<any>('newPropValue', { required: true })

defineProps({
  selectedWidgetSupportedProps: { type: Array as PropType<PropDefinition[]>, required: true },
  selectedWidgetCustomProps: { type: Object as PropType<Record<string, unknown>>, required: true },
  customOnlyPropEntries: { type: Array as PropType<Array<[string, string | number]>>, required: true },
  onPositionInputChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onScaleUniformChange: { type: Function as PropType<() => void>, required: true },
  onScaleAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  onRotationAxisChange: { type: Function as PropType<(axis: 'x' | 'y' | 'z') => void>, required: true },
  getMaskSettings: { type: Function as PropType<(id: string) => { color: string; opacity: number }>, required: true },
  onMaskColorInput: { type: Function as PropType<(v: string) => void>, required: true },
  onMaskOpacityInput: { type: Function as PropType<(v: number) => void>, required: true },
  setCustomPropValue: { type: Function as PropType<(key: string, v: string) => void>, required: true },
  removeCustomProp: { type: Function as PropType<(key: string) => void>, required: true },
  addCustomProp: { type: Function as PropType<() => void>, required: true },
  runRotateToOnce: { type: Function as PropType<() => void>, required: true },
  runMoveToOnce: { type: Function as PropType<() => void>, required: true },
  applyAutoRotate: { type: Function as PropType<() => void>, required: true }
})
</script>

