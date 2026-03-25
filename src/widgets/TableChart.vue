<template>
  <div class="panelx-tableChart">
    <GlassPanel
      :title="title"
      :sub-title="subTitle"
      :tab-color="tabColor"
      :show-tab="showTab"
      :panel-opacity="panelOpacity"
      :panel-border-visible="panelBorderVisible"
      :panel-border-opacity="panelBorderOpacity"
    >
      <div class="panelx-tableChart__wrap">
        <div class="panelx-tableChart__table">
          <div class="panelx-tableChart__thead" :style="{ gridTemplateColumns: gridTemplate }">
            <div
              v-for="col in columns"
              :key="col.key"
              class="panelx-tableChart__th"
              :style="{
                width: col.width ?? 'auto',
                textAlign: col.align ?? 'left'
              }"
            >
              {{ col.title }}
            </div>
          </div>

          <div class="panelx-tableChart__tbody">
            <div
              v-for="(row, i) in filteredRows"
              :key="i"
              class="panelx-tableChart__tr"
              :style="{ gridTemplateColumns: gridTemplate }"
            >
              <div
                v-for="col in columns"
                :key="col.key"
                class="panelx-tableChart__td"
                :style="{
                  width: col.width ?? 'auto',
                  textAlign: col.align ?? 'left'
                }"
              >
                <span v-if="col.key === badgeKey" class="panelx-tableChart__badge" :style="{ '--badge': String(row[badgeColorKey] ?? '#2584ff') }">
                  {{ row[col.key] }}
                </span>
                <span v-else class="panelx-tableChart__cell">
                  {{ row[col.key] }}
                </span>
              </div>
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

export type TableChartColumn = {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

type Row = Record<string, any>

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

    /** 表头 */
    columns?: TableChartColumn[]
    /** 数据 */
    rows?: Row[]

    /** 哪个字段渲染成彩色 badge（如 “等级/类别”） */
    badgeKey?: string
    /** 每行 badge 颜色字段名（可选） */
    badgeColorKey?: string
  }>(),
  {
    title: '数据列表',
    subTitle: 'TABLE CHART',
    tabColor: 'cyan',
    showTab: true,
    panelOpacity: undefined,
    panelBorderVisible: true,
    panelBorderOpacity: undefined,
    columns: () => [
      { key: 'levelName', title: '报警等级', width: '72px', align: 'left' },
      { key: 'part', title: '检修部位', width: 'auto', align: 'left' },
      { key: 'result', title: '处理结果', width: '84px', align: 'left' },
      { key: 'time', title: '检修时间', width: '92px', align: 'right' }
    ],
    rows: () => [
      { levelName: '一级', badgeColor: '#2584ff', part: 'XXXXXXX', result: '已处理', time: '2025.02.05' },
      { levelName: '二级', badgeColor: '#ff9535', part: 'XXXXXXX', result: '已处理', time: '2025.02.06' },
      { levelName: '三级', badgeColor: '#36cc85', part: 'XXXXXXX', result: '未处理', time: '2025.02.12' }
    ],
    badgeKey: 'levelName',
    badgeColorKey: 'badgeColor'
  }
)

const columns = computed(() => props.columns ?? [])
const badgeKey = computed(() => props.badgeKey ?? '')
const badgeColorKey = computed(() => props.badgeColorKey ?? 'badgeColor')

const gridTemplate = computed(() => {
  const cols = columns.value
  if (!cols.length) return '1fr'
  return cols
    .map((c) => {
      const w = (c.width ?? '').trim()
      // 尽量避免内容撑破布局
      if (!w || w === 'auto') return 'minmax(0, 1fr)'
      return w
    })
    .join(' ')
})

const filteredRows = computed(() => props.rows ?? [])
</script>

<style scoped>
.panelx-tableChart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.panelx-tableChart__wrap {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panelx-tableChart__table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.12);
}

.panelx-tableChart__thead,
.panelx-tableChart__tr {
  display: grid;
}

.panelx-tableChart__thead {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.panelx-tableChart__th {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panelx-tableChart__tbody {
  overflow: auto;
}

.panelx-tableChart__tr {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panelx-tableChart__tr:last-child {
  border-bottom: none;
}

.panelx-tableChart__td {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panelx-tableChart__cell {
  display: inline-block;
  min-width: 0;
}

.panelx-tableChart__badge {
  --badge: #2584ff;
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid color-mix(in srgb, var(--badge) 55%, transparent);
  background: color-mix(in srgb, var(--badge) 16%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--badge) 20%, transparent);
}
</style>

