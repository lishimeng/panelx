# panelx

本仓库使用 **pnpm** 管理依赖，请勿使用 npm / yarn。

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev

# 构建
pnpm build
```

## 前置规则（后续所有代码编写须遵守）

- **设计稿尺寸（px）**：以下尺寸**必须使用 px**，用于与屏幕尺寸一起计算真实的控件尺寸与位置：
  - Dashboard 的设计尺寸（`config.design.width / height`）
  - 3D 场景的设计/世界尺寸
  - Editor 中设计稿的尺寸（画布宽高）
- **其余单位禁止 px**：除上述“设计尺寸”外，**所有**样式与布局单位**不得使用 px**，统一使用相对单位（**rem**、**vh**、**vw** 等），以达到比例尺效果（随视口缩放）。

## 规范

- **包管理**：仅使用 **pnpm**，不要使用 npm / yarn。
- **样式单位**：除前述“设计稿尺寸”外，禁止使用 `px`，统一使用相对单位（如 **rem**、**vh**、**vw** 等）。

## 编辑器布局（Editor）

编辑器主界面为左、中、右三栏布局，通过 **CSS Grid** 控制占用比例：

- **左侧**：组件列表、尺寸设置、操作按钮（默认 **25%**）
- **中间**：标尺 + 画布主区域（默认 **50%**）
- **右侧**：属性配置栏（默认 **25%**）

修改比例时，在 `src/editor/Editor.vue` 的样式中调整 `.panelx-editor` 的 `grid-template-columns`，例如：

```css
/* 默认：25% 50% 25% */
grid-template-columns: 25% 50% 25%;

/* 示例：左侧更窄、主区域更宽 */
grid-template-columns: 20% 60% 20%;
```

## 编辑器 Widget 默认配置

每个 widget 拖入画布时需要默认 props 与尺寸；右侧属性栏的字段定义也来自同一套配置。

### Widget 默认配置所在文件

| 位置 | 作用 | 优先级（拖入时） |
|------|------|------------------|
| **`src/editor/editor_config.json`** → `widgetPropData.defaultParams` | 按 **类型** 配置默认参数（如 `stat`、`chart`、`glassChart`），拖入时作为该类型 widget 的初始 props | **最高** |
| **`src/editor/editor_config.json`** → `registeredWidgets[].defaultProps` | 每个侧栏项可选的 `defaultProps`，仅当 `defaultParams` 未配置该类型或为空时使用 | 次之 |
| **`src/widgets/widgetPropConfig.ts`** → `widgetTypeReg[type].defaultProps` | 代码侧为每种 `WidgetType2D` 写的默认 props，未在 JSON 中配置时兜底 | 兜底 |

编辑器解析顺序：先取 **`widgetPropData.defaultParams[type]`**，若无再取 **`registeredWidgets` 中该 type 的 `defaultProps`**，再无则用 **`getWidgetDefaultProps(type)`**（来自 `widgetPropConfig.ts`）。  
右侧「组件属性」的字段列表来自 **`src/widgets/widgetPropConfig.ts`** 的 **`propConfig`**（`getWidgetPropConfig(type)`），与默认值同文件定义。

### 配置文件示例（editor_config.json）

- **`registeredWidgets`**：侧栏可拖拽列表；每项需 **`type`**、**`label`**、**`defaultSize`**（拖入时的宽高，设计稿 px），可选 **`defaultProps`**、**`sampleImage`**。
- **`widgetPropData.defaultParams`**：按类型集中写默认参数，拖入时优先使用，无需在每条 `registeredWidgets` 里重复。  
  编辑器启动时从 **`src/editor/editor_config.json`** 加载（见 `Editor.vue` 的 `onMounted`）；大屏/配置加载视图从同一文件取 `datasources`（`App.vue`、`DashboardWithLoader.vue`）。

```json
{
  "widgetPropData": {
    "defaultParams": {
      "stat": { "value": 0, "label": "指标" },
      "chart": { "seriesType": "bar", "options": { ... }, "height": "100%", "width": "100%" }
    }
  }
}
```

### 代码兜底（Widget Registry）

**`src/widgets/widgetPropConfig.ts`** 中为每种 `WidgetType2D` 配置 **`defaultProps`** 与 **`propConfig`**；**`src/widgets/widgetRegistry.ts`** 对外提供 **`getWidgetDefaultProps(type)`**、**`getWidgetPropConfig(type)`**。  
新增 widget 类型时在此维护默认值与属性定义，保证未配置 JSON 时仍有可用默认值及右侧栏字段。

## Widget 数据集成

Dashboard 与编辑器通过**统一 prop 配置**和**按 widget id 的数据存储**打通配置与运行时数据，便于展示、编辑与后期数据更新。

### 1. 统一 Prop 配置（Registry）

- **类型**（`src/types/widgets.ts`）  
  - **`WidgetPropDef`**：单个属性的定义（`key`、`label`、`type`、`default`），供编辑器展示与解析 config。  
  - **`WidgetTypeRegItem`**：某类 widget 的 `defaultProps` + `propConfig` 数组。

- **实现**（`src/widgets/widgetPropConfig.ts`）  
  为每种 `WidgetType2D` 配置 `defaultProps` 与 `propConfig`。  
  - **`getWidgetDefaultProps(type)`**：拖入画布或解析 config 时使用的默认 props。  
  - **`getWidgetPropConfig(type)`**：该类型所有可编辑属性的定义，供 Editor 右侧属性栏按 key/label/type 渲染（可后续接入）。

- **入口**（`src/widgets/widgetRegistry.ts`）  
  对外提供 `getWidgetTypeReg(type)`、`getWidgetDefaultProps`、`getWidgetPropConfig`。

### 2. Dashboard 按 widget id 的数据

- **`widgetData`**（`src/components/Dashboard.vue`）  
  - 类型：`Ref<WidgetDataMap>`，即 `Record<widgetId, Record<string, unknown>>`。  
  - 配置加载后，由 **`syncWidgetDataFromConfig()`** 根据当前 `config.widgets2D` 填充：每个 widget 的 `widgetData[id] = { ...w.props }`。  
  - 渲染时通过 **`getWidgetProps(w)`** 取数：优先 `widgetData[w.id]`，无则回退到 `w.props`，模板使用 `v-bind="getWidgetProps(w)"`。

- **provide / inject**（类型见 `src/types/injections.ts`）  
  - **`WidgetDataKey`**：注入后得到 `Ref<WidgetDataMap>`，只读当前所有 widget 数据。  
  - **`SetWidgetDataKey`**：注入后得到 **`SetWidgetDataFn`**，即 `(id, patch) => void`，按 widget id 局部更新数据（合并 patch 到该 id 的 props），便于后期「配置数据更新」而不改 config。

子组件或外部使用示例：

```ts
import { inject } from 'vue'
import { WidgetDataKey, SetWidgetDataKey } from '@/types/injections'

const widgetData = inject(WidgetDataKey)       // Ref<WidgetDataMap> | undefined
const setWidgetData = inject(SetWidgetDataKey) // SetWidgetDataFn | undefined

// 按 id 更新某 widget 数据
setWidgetData?.('stat-1', { value: 123, label: '产量' })
```

- **类型导出**（`src/types/widgets.ts`）  
  **`WidgetDataMap`**、**`SetWidgetDataFn`** 已导出，与 **`WidgetDataKey`**、**`SetWidgetDataKey`** 一起供全项目做类型约束。

## 3D Model Props 规则（Editor3D）

3D 场景里可拖入/可配置的模型由 `Model` 的实例承载，Editor3D 会根据模型类型暴露的 `supportedProps` 来渲染右侧「属性（Props）」面板。

### 1. PropDefinition 与 supportedProps

在 `src/framework/model/ModelRegistry.ts` 中：

- `supportedProps?: PropDefinition[]`：模型类型声明自己支持哪些 prop（由模型类 `static supportedProps` 提供）
- `PropDefinition` 字段：
  - `key: string`：prop 名称（与 `props.custom[key]`/`model.propUpdate(key, value)` 的 key 对应）
  - `label?: string`：右侧展示标签（没有则回退为 key）
  - `enum?: (string | number)[]`：存在则在 Editor 中渲染为下拉 `<select>`
  - `default?: unknown`：当实例的 `props.custom[key]` 为空时，用于 **UI 展示回填**（不自动写入 custom，不自动触发运行时 propUpdate）

模型类需要在 `src/framework/models/*.ts` 中声明：

```ts
export class SomeModel extends Model {
  static supportedProps: PropDefinition[] = [
    { key: 'status', label: '状态', enum: ['normal', 'fault'] },
    { key: 'width', label: '宽度', default: 1 },
  ]
}
```

然后在 `src/framework/model/registerBuiltins.ts` 注册时把 `supportedProps` 传进去（编辑器用于生成右侧字段列表）。

### 2. Editor3D 如何渲染 Props UI

右侧面板在 `src/editor/editor3d/ui/RightSidebar.vue` 渲染规则：

- 若 `prop.enum?.length` 存在：渲染为 `<select>`，选项来自 `prop.enum`
- 否则：渲染为 `<input type="text">`
- 右侧展示值的优先级：
  1. `props.custom[prop.key]`
  2. `prop.default`（当 custom 为空时用于显示回填）

重要：**只有当用户在 UI 中真正修改了值（触发 change）时**，Editor 才会写入 `w.props.custom[key]` 并调用 `model.propUpdate(key, value)`。

### 3. 运行时生效与导出

- `model.propUpdate(key, value)`：由 Editor3D 在 `custom` 发生变更时触发，用于更新模型内部状态/材质/纹理等。
- Editor3D 导出时（`Editor3D.vue#exportConfig`）会把当前 `w.props` 原样写进导出配置，并额外把遮罩/自旋转相关字段落到 `props.custom`（mask/autoRotate）。
- 因此：
  - 如果你希望某个模型 prop 被持久化到可配置文件里，请确保在 Editor 中实际把该 prop 修改并写入了 `props.custom`。
  - `prop.default` 主要解决「UI 展示为空」的问题，用于提升编辑体验；不会自动写入/不会持久化到导出文件中。

### 4. Layer（图层）责任边界（Editor3D）

本系统的 `LayerDef`、模型与相机遵循固定的责任边界，避免外部配置错误导致渲染异常。

1. `LayerDef`：系统层定义（固定）
  - `LayerDef` 负责声明并管理本系统使用的层编号与含义（例如默认渲染层、sprite 层、bloom 层等）。
  - 三.js `Object3D.layers` 仅支持 `0..31`，因此如存在历史遗留编号，会通过 `LayerDef.normalize()` 做兼容映射。
  - `LayerDef` 的 layer 定义属于“系统保留资源”，不应由业务/集成方随意改动。

2. 模型（Model / Widget 实例）：自己管理自己所在 layer（硬编码）
  - 每个 3D 模型在构建时会把自己的网格/子物体分配到对应层（并在导出配置中携带其 layer 信息）。
  - 集成侧/外部配置**不应该**在运行时随意更改模型实例的层归属；模型的 layer 由模型实现决定。

3. 相机（Camera）：可由 Editor 开关（开放）
  - 相机的 `camera.layers` 由 Editor 暴露可切换的开关控制（即“相机图层”UI）。
  - Editor 仅负责启用/禁用相机的某个 layer；相机开或关某层，即可决定是否渲染那些处于该 layer 的模型实例。

4. Editor：只配置“相机可见性”，不配置“模型层归属”
  - Editor 中的 layer 开关只用于控制相机渲染哪些层，从而控制哪些模型实例在画面中可见。
  - Editor 不应提供“让用户直接修改模型 layer 归属”的能力；模型 layer 的规则应当始终保持与 `LayerDef`/模型实现一致。

## 调试开关（dashboard_config.debug）

- **配置**：在 **dashboard_config**（或导出的 Dashboard JSON）中增加 **`debug: true | false`**。加载该配置后会自动同步到 **localStorage** 的 `PanelX_DEBUG`（`1`/`0`），从而控制全局调试日志。
- **加载时机**：在 **配置加载大屏**（DashboardWithLoader 的 `applyConfig`）、**大屏预览/车间**（App 的 `loadWorkshopConfig`）、**编辑器**「加载车间大屏配置」时，都会根据当前 config 的 `debug` 刷新 localStorage。
- **使用方式**：数据链等日志已统一受该开关控制。需要判断日志开关的组件使用 **`logManager.isDebugEnabled()`**（`src/utils/logManager.ts`）判断后再输出，这样即可被 config.debug 与 localStorage 控制。