<template>
  <div class="panelx-textPanel2d">
    <GlassPanel
      :title="title"
      :sub-title="subTitle"
      :tab-color="tabColor"
      :show-tab="showTab"
      :panel-opacity="panelOpacity"
      :panel-border-visible="panelBorderVisible"
      :panel-border-opacity="panelBorderOpacity"
    >
      <div class="panelx-textPanel2d__body">
        <div v-for="(sec, idx) in normalizedSections" :key="idx" class="panelx-textPanel2d__section">
          <div class="panelx-textPanel2d__content">
            <div v-for="(line, i) in sec.lines" :key="i" class="panelx-textPanel2d__line">
              <template v-for="(seg, si) in line" :key="si">
                <span v-if="seg.hl" class="panelx-textPanel2d__hl">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GlassPanel from './GlassPanel.vue'

export type TextPanel2DSection = {
  /** 支持用 `|` 分行 */
  content: string
}

type TextSeg = { text: string; hl: boolean }

const props = withDefaults(
  defineProps<{
    title?: string
    subTitle?: string
    tabColor?: 'blue' | 'cyan' | 'yellow' | 'green' | 'orange' | 'purple'
    showTab?: boolean
    /** 面板背景透明度（0~1） */
    panelOpacity?: number
    /** 是否显示面板边框 */
    panelBorderVisible?: boolean
    /** 面板边框透明度（0~1） */
    panelBorderOpacity?: number
    sections?: TextPanel2DSection[]
  }>(),
  {
    title: '信息',
    subTitle: 'INFO',
    tabColor: 'cyan',
    showTab: true,
    panelOpacity: undefined,
    panelBorderVisible: true,
    panelBorderOpacity: undefined,
    sections: () => [
      {
        content:
          '用于展示设备/工艺介绍文字。|支持用 | 分行。|可用 [[高亮内容]] 标记关键字。'
      }
    ]
  }
)

function parseLine(line: string): TextSeg[] {
  // 使用 [[...]] 作为高亮标记，避免与 JSON/编辑器冲突
  const parts = line.split(/(\[\[[\s\S]*?\]\])/g).filter(Boolean)
  return parts.map((p) => {
    const isHl = p.startsWith('[[') && p.endsWith(']]')
    return { text: isHl ? p.slice(2, -2) : p, hl: isHl }
  })
}

const normalizedSections = computed(() => {
  return (props.sections ?? []).map((s) => ({
    lines: String(s.content ?? '')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => parseLine(x))
  }))
})
</script>

<style scoped>
.panelx-textPanel2d {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.panelx-textPanel2d__body {
  height: 100%;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panelx-textPanel2d__section {
  min-width: 0;
}

.panelx-textPanel2d__content {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.6;
}

.panelx-textPanel2d__line {
  word-break: break-word;
}

.panelx-textPanel2d__hl {
  color: rgba(255, 255, 255, 0.94);
  text-shadow: 0 0 14px color-mix(in srgb, var(--px-panel-tab-cyan) 35%, transparent);
  font-weight: 650;
}
</style>

