<template>
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
            <input
              v-model="autoRotateCmd.enabled"
              type="checkbox"
              @change="onExecuteCommand({ key: COMMAND_KEYS.applyAutoRotate, id: selectedWidgetId!, params: { enabled: autoRotateCmd.enabled, axis: autoRotateCmd.axis, speedDeg: autoRotateCmd.speedDeg } })"
            />
            启用
          </label>
          <label>
            轴
            <select
              v-model="autoRotateCmd.axis"
              class="panelx-editor3d-props-value panelx-editor3d-props-select"
              @change="onExecuteCommand({ key: COMMAND_KEYS.applyAutoRotate, id: selectedWidgetId!, params: { enabled: autoRotateCmd.enabled, axis: autoRotateCmd.axis, speedDeg: autoRotateCmd.speedDeg } })"
            >
              <option value="x">X</option>
              <option value="y">Y</option>
              <option value="z">Z</option>
            </select>
          </label>
          <label>
            速度(度/秒)
            <input
              v-model.number="autoRotateCmd.speedDeg"
              type="number"
              step="any"
              @change="onExecuteCommand({ key: COMMAND_KEYS.applyAutoRotate, id: selectedWidgetId!, params: { enabled: autoRotateCmd.enabled, axis: autoRotateCmd.axis, speedDeg: autoRotateCmd.speedDeg } })"
            />
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
          <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="onExecuteCommand({ key: COMMAND_KEYS.rotateTo, id: selectedWidgetId!, params: { x: rotateCmd.x, y: rotateCmd.y, z: rotateCmd.z, speed: rotateCmd.speed } })">
            执行
          </button>
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
          <button
            type="button"
            class="panelx-editor3d-btn panelx-editor3d-btn-inline"
            @click="
              persistForwardSettings(),
              onExecuteCommand({
                key: COMMAND_KEYS.moveTo,
                id: selectedWidgetId!,
                params: {
                  x: moveCmd.x,
                  y: moveCmd.y,
                  z: moveCmd.z,
                  speed: moveCmd.speed,
                  forwardEnable: moveCmd.forwardEnable,
                  forwardX: moveCmd.forwardX,
                  forwardY: moveCmd.forwardY,
                  forwardZ: moveCmd.forwardZ
                }
              })
            "
          >
            执行
          </button>
        </div>
      </div>

      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">前向设置</span>
        <div class="panelx-editor3d-size-inputs">
          <label class="panelx-editor3d-checkbox">
            <input
              v-model="moveCmd.forwardEnable"
              type="checkbox"
              @change="persistForwardSettings()"
            />
            启用前向
          </label>
          <label>FX <input v-model.number="moveCmd.forwardX" type="number" step="any" @input="persistForwardSettings()" /></label>
          <label>FY <input v-model.number="moveCmd.forwardY" type="number" step="any" @input="persistForwardSettings()" /></label>
          <label>FZ <input v-model.number="moveCmd.forwardZ" type="number" step="any" @input="persistForwardSettings()" /></label>
        </div>
      </div>

      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">移动到锚点</span>
        <div class="panelx-editor3d-size-inputs">
          <label>
            目标
            <select v-model="anchorWidgetId" class="panelx-editor3d-props-value panelx-editor3d-props-select">
              <option :value="null">—</option>
              <option v-for="w in widgets3D" :key="w.id" :value="w.id">
                {{ (w.props as any)?.name ? (w.props as any).name : w.id }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="panelx-editor3d-btn panelx-editor3d-btn-inline"
            @click="
              persistForwardSettings(),
              onExecuteCommand({
                key: COMMAND_KEYS.moveToAnchor,
                id: selectedWidgetId!,
                params: {
                  anchorWidgetId,
                  x: moveCmd.x,
                  y: moveCmd.y,
                  z: moveCmd.z,
                  speed: moveCmd.speed,
                  forwardEnable: moveCmd.forwardEnable,
                  forwardX: moveCmd.forwardX,
                  forwardY: moveCmd.forwardY,
                  forwardZ: moveCmd.forwardZ
                }
              })
            "
          >
            移动
          </button>
        </div>
      </div>

      <div class="panelx-editor3d-pos-row">
        <span class="panelx-editor3d-size-label">属性 JSON</span>
        <div class="panelx-editor3d-size-inputs">
          <textarea
            v-model="propertyRequestJson"
            class="panelx-editor3d-props-value"
            rows="4"
            placeholder='{"key":"model.propUpdate","id":"model-xxx","params":{"propKey":"color","value":"#00d8ff"}}'
          />
          <span v-if="propertyRequestError" class="panelx-editor3d-size-value panelx-editor3d-error-text">
            {{ propertyRequestError }}
          </span>
          <button type="button" class="panelx-editor3d-btn panelx-editor3d-btn-inline" @click="onExecuteProperty({ json: propertyRequestJson })">
            设置属性
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { CommandRequest, PropertyJsonExecuteRequest } from '../../../../types'
import { COMMAND_KEYS } from '../../../../utils/manager3DRegistry'

type RightGroups = { commandsOpen: boolean }
type CommandVec3 = { x: number; y: number; z: number }
type RotateCmd = CommandVec3 & { speed: number }
type MoveCmd = CommandVec3 & { speed: number; forwardEnable: boolean; forwardX: number; forwardY: number; forwardZ: number }
type AutoRotateCmd = { enabled: boolean; axis: 'x' | 'y' | 'z'; speedDeg: number }
type WidgetLike = { id: string; props?: Record<string, unknown> }

let rightGroups = defineModel<RightGroups>('rightGroups', { required: true })
let selectedWidgetId = defineModel<string | null>('selectedWidgetId', { required: true })
let rotateCmd = defineModel<RotateCmd>('rotateCmd', { required: true })
let moveCmd = defineModel<MoveCmd>('moveCmd', { required: true })
let anchorWidgetId = defineModel<string | null>('anchorWidgetId', { required: true })
let autoRotateCmd = defineModel<AutoRotateCmd>('autoRotateCmd', { required: true })
let propertyRequestJson = defineModel<string>('propertyRequestJson', { required: true })
let propertyRequestError = defineModel<string>('propertyRequestError', { required: true })

function persistForwardSettings(): void {
  const id = selectedWidgetId.value
  if (!id) return
  props.onSetForwardSettings(id, {
    enabled: moveCmd.value.forwardEnable,
    x: moveCmd.value.forwardX,
    y: moveCmd.value.forwardY,
    z: moveCmd.value.forwardZ
  })
}

const props = defineProps({
  widgets3D: { type: Array as PropType<WidgetLike[]>, required: true },
  onExecuteCommand: { type: Function as PropType<(req: CommandRequest) => void>, required: true },
  onExecuteProperty: { type: Function as PropType<(req: PropertyJsonExecuteRequest) => void>, required: true },
  onSetForwardSettings: {
    type: Function as PropType<(id: string, next: { enabled?: boolean; x?: number; y?: number; z?: number }) => void>,
    required: true
  }
})
</script>

