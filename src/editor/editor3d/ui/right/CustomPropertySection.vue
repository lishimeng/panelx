<template>
  <div class="panelx-editor3d-props-editor">
    <button type="button" class="panelx-editor3d-group-header panelx-editor3d-section" @click="rightGroups.propsOpen = !rightGroups.propsOpen">
      <span>自定义属性 (Props)</span>
      <span class="panelx-editor3d-group-toggle">{{ rightGroups.propsOpen ? '−' : '+' }}</span>
    </button>
    <template v-if="rightGroups.propsOpen">
      <div v-if="selectedWidgetSupportedProps.length" class="panelx-editor3d-props-list">
        <div v-for="prop in selectedWidgetSupportedProps" :key="prop.key" class="panelx-editor3d-props-row">
          <span class="panelx-editor3d-props-key">{{ prop.label ?? prop.key }}</span>
          <select
            v-if="prop.enum?.length"
            :value="String(selectedWidgetCustomProps[prop.key] ?? prop.default ?? prop.enum?.[0] ?? '')"
            class="panelx-editor3d-props-value panelx-editor3d-props-select"
            @change="onSetCustomPropValue(prop.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">—</option>
            <option v-for="opt in prop.enum" :key="String(opt)" :value="String(opt)">{{ opt }}</option>
          </select>
          <div v-else-if="prop.type === 'color'" class="panelx-editor3d-size-inputs">
            <input
              type="color"
              class="panelx-editor3d-props-value panelx-editor3d-color-picker"
              :value="toColorInputValue(selectedWidgetCustomProps[prop.key] ?? prop.default)"
              @input="onSetCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              class="panelx-editor3d-props-value panelx-editor3d-color-hex"
              :value="String(selectedWidgetCustomProps[prop.key] ?? prop.default ?? '')"
              placeholder="例如 222630 或 #222630"
              @change="onSetCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
              @keydown.enter="onSetCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <input
            v-else
            :value="String(selectedWidgetCustomProps[prop.key] ?? prop.default ?? '')"
            type="text"
            class="panelx-editor3d-props-value"
            :placeholder="prop.key"
            @change="onSetCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
            @keydown.enter="onSetCustomPropValue(prop.key, ($event.target as HTMLInputElement).value)"
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
              @change="onSetCustomPropValue(key, ($event.target as HTMLInputElement).value)"
              @keydown.enter="onSetCustomPropValue(key, ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="panelx-editor3d-props-remove" title="删除" @click="onRemoveCustomProp(key)">×</button>
          </div>
        </div>
      </template>
      <div class="panelx-editor3d-props-add">
        <input v-model="newPropKey" type="text" class="panelx-editor3d-props-key-in" placeholder="键名" />
        <input v-model="newPropValue" type="text" class="panelx-editor3d-props-value-in" placeholder="值" @keydown.enter="onAddCustomProp" />
        <button type="button" class="panelx-editor3d-btn panelx-editor3d-props-add-btn" @click="onAddCustomProp">添加</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { PropDefinition } from '../../../../framework'
import { normalizeHexColor } from '../../../../utils/color'

type RightGroups = { propsOpen: boolean }

let rightGroups = defineModel<RightGroups>('rightGroups', { required: true })
let newPropKey = defineModel<string>('newPropKey', { required: true })
let newPropValue = defineModel<string>('newPropValue', { required: true })

defineProps({
  selectedWidgetSupportedProps: { type: Array as PropType<PropDefinition[]>, required: true },
  selectedWidgetCustomProps: { type: Object as PropType<Record<string, unknown>>, required: true },
  customOnlyPropEntries: { type: Array as PropType<Array<[string, string | number]>>, required: true },
  onSetCustomPropValue: { type: Function as PropType<(key: string, v: string) => void>, required: true },
  onRemoveCustomProp: { type: Function as PropType<(key: string) => void>, required: true },
  onAddCustomProp: { type: Function as PropType<() => void>, required: true }
})

const toColorInputValue = normalizeHexColor
</script>

