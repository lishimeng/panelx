<template>
  <div
    class="panelx-glass-panel"
    :class="`panelx-glass-panel-theme-${theme}`"
    :style="panelStyle"
  >
    <!-- 顶部色条 -->
    <div
      v-if="showTab"
      class="panelx-glass-panel-tab"
      :class="`panelx-glass-panel-tab-${tabColor}`"
    />

    <!-- 头部 -->
    <div class="panelx-glass-panel-header">
      <div class="panelx-glass-panel-title">
        <div class="panelx-glass-panel-title-cn">{{ title }}</div>
        <div v-if="subTitle" class="panelx-glass-panel-sub-title">
          {{ subTitle }}
        </div>
      </div>

      <!-- 折叠按钮 -->
      <div v-if="showFold" class="panelx-glass-panel-fold">
        <span></span>
        <span></span>
      </div>
    </div>

    <!-- 内容插槽 -->
    <div class="panelx-glass-panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// TS 接口定义
interface Props {
  title?: string
  subTitle?: string
  titleFontSize?: string
  subTitleFontSize?: string
  /** 统一壳主题：同主题下配色/线条一致 */
  theme?: 'hud'
  tabColor?: 'blue' | 'cyan' | 'yellow' | 'green' | 'orange' | 'purple'
  showTab?: boolean
  showFold?: boolean
  /** 面板背景透明度（0~1），不传则使用 theme 默认 */
  panelOpacity?: number
  /** 是否显示面板边框 */
  panelBorderVisible?: boolean
  /** 面板边框透明度（0~1），不传则使用 theme 默认 */
  panelBorderOpacity?: number
  /** 是否显示面板阴影/外发光 */
  panelShadowVisible?: boolean
  /** 面板阴影强度（0~1），不传则使用 theme 默认 */
  panelShadowOpacity?: number
}

// ✅ 使用 withDefaults 设置默认值
const props = withDefaults(defineProps<Props>(), {
  title: '',
  subTitle: '',
  theme: 'hud',
  tabColor: 'blue',       // 默认蓝色
  showTab: false,         // 默认不显示顶部色条
  showFold: true,         // 默认显示折叠按钮
  panelBorderVisible: true,
  panelShadowVisible: true
})

function clamp01(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.min(1, n))
}

const panelStyle = computed(() => {
  const style: Record<string, string> = {}
  const a = clamp01(props.panelOpacity)
  if (a !== undefined) style['--px-panel-bg-alpha'] = String(a)

  const ba = clamp01(props.panelBorderOpacity)
  if (ba !== undefined) style['--px-panel-border-alpha'] = String(ba)

  if (props.panelBorderVisible === false) style['--px-panel-border-alpha'] = '0'

  const sa = clamp01(props.panelShadowOpacity)
  if (sa !== undefined) style['--px-panel-shadow-alpha'] = String(sa)

  if (props.panelShadowVisible === false) style['--px-panel-shadow-alpha'] = '0'
  // 背景完全透明时，默认关闭阴影，避免出现“圆角阴影/发光”
  if (a === 0 && sa === undefined) style['--px-panel-shadow-alpha'] = '0'

  // 标题颜色“反转”：背景越透明越偏黑字，避免白底看不见
  const bgAlpha = a ?? 0.75
  if (bgAlpha <= 0.15) {
    style['--px-panel-title-cn'] = 'rgba(10, 22, 40, 0.95)'
    style['--px-panel-title-en'] = 'rgba(10, 22, 40, 0.65)'
  } else {
    style['--px-panel-title-cn'] = '#ffffff'
    style['--px-panel-title-en'] = '#6586b5'
  }

  if (typeof props.titleFontSize === 'string' && props.titleFontSize.trim() !== '') {
    style['--px-font-size-md'] = props.titleFontSize.trim()
  }
  if (typeof props.subTitleFontSize === 'string' && props.subTitleFontSize.trim() !== '') {
    style['--px-font-size-xs'] = props.subTitleFontSize.trim()
  }

  return Object.keys(style).length ? style : undefined
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 核心卡片 + theme token（CSS 变量） */
.panelx-glass-panel {
  /* theme tokens（默认 hud） */
  --px-panel-bg-rgb: 12, 26, 54;
  --px-panel-bg-alpha: 0.75;
  --px-panel-bg: rgba(var(--px-panel-bg-rgb), var(--px-panel-bg-alpha));
  --px-panel-blur: 4px;
  --px-panel-border-rgb: 30, 59, 106;
  --px-panel-border-alpha: 0.6;
  --px-panel-border: rgba(var(--px-panel-border-rgb), var(--px-panel-border-alpha));
  /* 随容器尺寸自适应圆角：小尺寸不至于太圆，大尺寸圆角更明显 */
  --px-panel-radius: clamp(4px, 0.6cqw, 12px);
  --px-panel-shadow-alpha: 1;
  --px-panel-shadow-1: 0 0 0 1px rgba(82, 152, 255, calc(0.2 * var(--px-panel-shadow-alpha)));
  --px-panel-shadow-2: 0 0 8px rgba(82, 152, 255, calc(0.25 * var(--px-panel-shadow-alpha)));
  --px-panel-shadow-3: 0 0 18px rgba(30, 70, 130, calc(0.15 * var(--px-panel-shadow-alpha)));

  --px-panel-title-cn: #ffffff;
  --px-panel-title-en: #6586b5;
  --px-panel-fold: #6586b5;
  --px-font-size-xs: 0.5rem;
  --px-font-size-sm: 0.6875rem;
  --px-font-size-md: 0.75rem;

  --px-panel-title-underline: #5298ff;
  --px-panel-title-underline-shadow: 0 1px 2px rgba(82, 152, 255, 0.2);

  --px-panel-tab-blue: #2584ff;
  --px-panel-tab-cyan: #00e0f7;
  --px-panel-tab-yellow: #f9d03f;
  --px-panel-tab-green: #36cc85;
  --px-panel-tab-orange: #ff9535;
  --px-panel-tab-purple: #7c7cff;

  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  background: var(--px-panel-bg);
  backdrop-filter: blur(var(--px-panel-blur));
  -webkit-backdrop-filter: blur(var(--px-panel-blur));
  border: 1px solid var(--px-panel-border);
  border-radius: var(--px-panel-radius);
  overflow: hidden;
  box-shadow:
    var(--px-panel-shadow-1),
    var(--px-panel-shadow-2),
    var(--px-panel-shadow-3);
  container-type: size;
  container-name: glass-panel;
}

/* 顶部色条 */
.panelx-glass-panel-tab {
  height: 6px;
  width: 100%;
}
.panelx-glass-panel-tab-blue { background: var(--px-panel-tab-blue); }
.panelx-glass-panel-tab-cyan { background: var(--px-panel-tab-cyan); }
.panelx-glass-panel-tab-yellow { background: var(--px-panel-tab-yellow); }
.panelx-glass-panel-tab-green { background: var(--px-panel-tab-green); }
.panelx-glass-panel-tab-orange { background: var(--px-panel-tab-orange); }
.panelx-glass-panel-tab-purple { background: var(--px-panel-tab-purple); }

/* 头部 */
.panelx-glass-panel-header {
  flex-shrink: 0;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 标题区域 + 高亮下划线 */
.panelx-glass-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 50px);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--px-panel-title-underline);
  box-shadow: var(--px-panel-title-underline-shadow);
}

/* 主标题 */
.panelx-glass-panel-title-cn {
  font-size: var(--px-font-size-md);
  color: var(--px-panel-title-cn);
  font-weight: 400;
  letter-spacing: 0.5px;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 副标题 */
.panelx-glass-panel-sub-title {
  font-size: var(--px-font-size-xs);
  color: var(--px-panel-title-en);
  text-transform: uppercase;
  font-family: "Roboto", "Arial", sans-serif;
  font-weight: 300;
  letter-spacing: 1px;
}

/* 折叠按钮 */
.panelx-glass-panel-fold {
  width: 14px;
  height: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}
.panelx-glass-panel-fold span {
  width: 100%;
  height: 2px;
  background: var(--px-panel-fold);
}

/* 内容区域 */
.panelx-glass-panel-body {
  flex: 1;
  min-height: 0;
  padding: 8px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>