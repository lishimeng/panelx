<template>
  <div class="panelx-table" :class="className">
    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align || 'left' }"
          >
            {{ col.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in data" :key="i">
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
          >
            {{ row[col.key] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="loading" class="panelx-table-loading">加载中...</div>
  </div>
</template>

<script setup lang="ts">
import type { TableProps } from '../types/components'

defineProps<TableProps>()
</script>

<style scoped>
.panelx-table {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.panelx-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-medium, 14px);
}
.panelx-table th,
.panelx-table td {
  padding: 8px 12px;
  border: 1px solid var(--color-border, #e8e8e8);
}
.panelx-table th {
  background: var(--color-background, #f5f5f5);
  font-weight: 600;
}
.panelx-table-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
}
</style>
