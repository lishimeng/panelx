<template>
  <div class="panelx-decoration" :class="[variant, className]">
    <template v-if="variant === 'corner'">
      <span class="corner corner-tl" />
      <span class="corner corner-tr" />
      <span class="corner corner-bl" />
      <span class="corner corner-br" />
    </template>
    <template v-else-if="variant === 'border'">
      <span class="border-edge edge-t" />
      <span class="border-edge edge-r" />
      <span class="border-edge edge-b" />
      <span class="border-edge edge-l" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecorationProps } from '../types/components'

withDefaults(defineProps<DecorationProps>(), { variant: 'corner' })
</script>

<style scoped>
.panelx-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.corner {
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  border-color: var(--color-primary, #1890ff);
  border-style: solid;
  border-width: 0;
}
.corner-tl {
  top: 0;
  left: 0;
  border-top-width: 0.125rem;
  border-left-width: 0.125rem;
}
.corner-tr {
  top: 0;
  right: 0;
  border-top-width: 0.125rem;
  border-right-width: 0.125rem;
}
.corner-bl {
  bottom: 0;
  left: 0;
  border-bottom-width: 0.125rem;
  border-left-width: 0.125rem;
}
.corner-br {
  bottom: 0;
  right: 0;
  border-bottom-width: 0.125rem;
  border-right-width: 0.125rem;
}
.border-edge {
  position: absolute;
  background: linear-gradient(90deg, transparent, var(--color-primary, #1890ff), transparent);
  opacity: 0.6;
}
.edge-t {
  top: 0;
  left: 0;
  right: 0;
  height: 0.0625rem;
}
.edge-b {
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.0625rem;
}
.edge-l {
  left: 0;
  top: 0;
  bottom: 0;
  width: 0.0625rem;
  background: linear-gradient(180deg, transparent, var(--color-primary, #1890ff), transparent);
}
.edge-r {
  right: 0;
  top: 0;
  bottom: 0;
  width: 0.0625rem;
  background: linear-gradient(180deg, transparent, var(--color-primary, #1890ff), transparent);
}
</style>
