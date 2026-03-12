<template>
  <div class="panelx-screen-title">
    <span class="panelx-screen-title-line line-l" />
    <div class="panelx-screen-title-wrap">
      <div class="panelx-screen-title-bg" />
      <h1 class="panelx-screen-title-text">{{ text }}</h1>
    </div>
    <span class="panelx-screen-title-line line-r" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<style scoped>
.panelx-screen-title {
  position: relative;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 0.875rem 0;
  width: 100%;
}
.panelx-screen-title-line {
  flex: 1;
  max-width: 15rem;
  height: 0.125rem;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.5),
    rgba(0, 212, 255, 0.8),
    transparent
  );
}
.panelx-screen-title-line.line-r {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.8),
    rgba(0, 212, 255, 0.5),
    transparent
  );
}
.panelx-screen-title-wrap {
  position: relative;
  padding: 0 1.25rem;
}
.panelx-screen-title-bg {
  position: absolute;
  inset: -0.375rem -0.75rem;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, transparent 50%, rgba(0, 212, 255, 0.05) 100%);
  border: 0.0625rem solid rgba(0, 212, 255, 0.35);
  clip-path: polygon(0 0, calc(100% - 0.75rem) 0, 100% 0.75rem, 100% 100%, 0.75rem 100%, 0 calc(100% - 0.75rem));
}
.panelx-screen-title-text {
  position: relative;
  margin: 0;
  font-size: clamp(1.35rem, 2.4vw, 2.1rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  text-shadow: 0 0 1.5rem rgba(0, 212, 255, 0.6), 0 0 3rem rgba(0, 212, 255, 0.35);
  letter-spacing: 0.12em;
  white-space: nowrap;
}
</style>
