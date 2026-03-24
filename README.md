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

- **设计稿尺寸（px）**：凡用于「设计坐标 ↔ 屏幕/容器实际像素」换算的基准尺寸，在配置里**使用 px**（见下节 **Dashboard 尺寸与坐标系**）。不要把业务样式里的随意数值写成 px（见下一条）。
- **其余单位禁止 px**：除上述“设计尺寸基准”外，**所有**样式与布局单位**不得使用 px**，统一使用相对单位（**rem**、**vh**、**vw** 等），以达到比例尺效果（随视口缩放）。

## Dashboard 尺寸与坐标系（2D / 3D）

本节对应代码中的约定，避免把「大屏设计稿」「3D 世界单位」「Editor 画布」混为一谈。

### 1. 2D 部分（`widgets2D` / Editor2D）

- **设计稿尺寸**：`config.design.width` / `config.design.height`（如 1920×1080），与 **2D 组件** 的 `layout` 处于**同一设计坐标系**（见 `src/types/dashboard.ts` 中 `WidgetConfig2D` 注释）。
- **渲染到屏幕**：根容器按设计宽高比占位；`SizeManager2D`（`src/core/size/SizeManager2D.ts`）用 `scale = actualWidth / designWidth` 把设计稿矩形换算为实际像素；位置/尺寸再经 `pxToVw` / `pxToVh` / `pxToRem`（`src/utils/viewport.ts`、`src/core/size`）落到样式。
- **要点**：2D 的目标是**保持相对位置与比例**，小屏下整体等比缩小，而不是单独拉伸某轴破坏版式。

### 2. 3D 部分（背景层 Scene3D / `widgets3D` / Editor3D）

- **画布像素 vs 大屏 design**：3D 渲染区域（`Scene3DFramework`、Editor3D 主区域 canvas）**只依赖父容器的实际 CSS 像素**：铺满父容器，并用该宽高比设置相机 aspect。**不参与**用 `config.design` 去“规定”Three.js 视口分辨率。  
  `config.design` 服务于 **2D 组件** 的 layout 与整屏比例尺；整屏布局完成后，背景层 3D 所在 div 会分到一块**实际像素区域**——这是**布局结果**，不是 Three.js 读取 `config.design` 作为输入。
- **定位与尺度（重要）**：模型在世界中的位置、比例尺、`worldSize`、`designSize3D`（3D 设计稿尺寸）、**3D设计稿坐标系** 与 `origin` 等，才是 **3D 语义**下的关键数据；**不要**用 Dashboard 的 `config.design` 代替 3D 设计稿尺寸去做定位换算。
- **Editor3D**：侧栏只维护 **3D 设计**尺寸与比例尺等；**不展示、不编辑** Dashboard 的 `design`，也不展示 Viewport/DPR/Canvas 像素（避免与「3D 只跟父容器有关」混淆）。导入 JSON 时若含 `design`，仅写入 `config.design` 供导出/大屏 2D 兼容，**不会**用其覆盖侧栏中的 3D 设计稿尺寸。
- **场景世界单位（Three.js）**：**Y 轴向上**，**水平面为 XZ**。**世界原点** `(0,0,0)`；模型 `position`、相机均在**世界坐标**下理解。
- **设计坐标 → 世界 XZ**：Editor3D 用「以左上角为 (0,0) 的输入坐标」映射到世界 **X、Z**（`src/utils/coord3d.ts`），并按 **worldScale**（`world = 3D设计稿尺寸 × scale`）换算。**不是**把 `config.design` 直接当成 Three 里的米制场景尺寸。
- **场景范围 / 相机**：`WidgetConfig3D.worldSize` 描述 3D 设计空间对应的 **世界范围**（正交相机可视等）。正交可视半高由 **sqrt(x²+y²+z²)/2**（包围盒外接球半径）推导，再乘 `ORTHOGRAPHIC_FRUSTUM_SCALE`；轨道相机初始距离取 `minOrthographicOrbitDistanceFromWorldSize`（须大于外接球半径，避免相机落在球内导致近/远裁切）。与 **`config.design`（2D 大屏）语义不同**。

### 3. 「3D设计稿坐标系」与 Three.js 世界坐标（两套原点）

为避免与 Three.js **世界坐标**（world space，原点在 `(0,0,0)`）混淆，本仓库对「平面/厂区/小区总图上**左上角为 0**」这一套单独命名：**3D设计稿坐标系**（仅指水平面上的布局基准，Y 仍表示高度；水平方向由 XZ 表达）。

- **典型场景**：把一张工厂或住宅小区的**平面图**当作 3D 里摆放设备/标注的参考——图上 **左上角为 (0,0)**，向右、向下为增大；导入 Three.js 后，场景往往以 **世界原点为场景中心**，于是出现 **两套原点**，必须通过 **原点偏移**（Editor3D / `src/utils/coord3d.ts` 中的 `originX`、`originY` 与世界比例尺）做互转。
- **命名约定**：文档与讨论中说到「设计稿上的坐标」「平面左上角为 0」时，优先使用 **3D设计稿坐标系**；说到模型 `position`、相机、物理单位时，指 **Three.js 世界坐标**。
- **换算示例（减少歧义）**：若配置中将 **3D设计稿坐标系的原点**（即平面图左上角 `(0,0)` 落在世界中的位置）设为 **`(-20, 0, -20)`**（世界坐标），则在同一比例尺下，Three.js 世界点 **`(0, 0, 0)`** 对应到 **3D设计稿坐标系**中的 **`(20, 0, 20)`**（即相对「平面图左上角」在水平面上偏移 +20、+20；Y 为高度轴，此处为 0）。  
  直观理解：世界原点相对「左上角锚点」平移了 `(+20, 0, +20)`，故在「以左上角为 0」的读数下记为 `(20, 0, 20)`。

实现上，`designInputToWorldXZ` / `worldXZToDesignInput` 中的 `originX`、`originY` 即参与上述「锚点」换算；具体数值以导出配置与 Editor3D 当前设置为准。

### 4. 与旧版 README 表述的关系

原先「3D 场景的设计/世界尺寸」容易误解成「和 `config.design` 是同一个东西」。实际上：

- **2D**：几乎总是 `config.design` + `SizeManager2D`。
- **3D**：世界坐标 +（可选）Editor3D 的 3D 设计尺寸与 `worldScale` + `widgets3D[].worldSize`。

若新增功能，请先区分改的是 **2D 设计稿坐标**、**3D设计稿坐标系**（平面左上角为 0）还是 **Three.js 世界坐标**，再选对应工具类与字段。

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

### Editor2D 与 Editor3D 分工及合并导出（低代码衔接）

- **分工**：2D 与 3D **各自独立编辑**（`Editor.vue` / `Editor3D.vue`）。运行时大屏上 3D 作为 **Dashboard 背景层**（由 `widgets3D` + `scene3D` 等驱动），与 2D 组件叠放；未来可在 2D 画布中为「某父容器」嵌入 3D 预览，仍复用同一份 `DashboardConfig`。
- **草稿**：在 **Editor3D** 侧栏点击 **「保存草稿」**，将当前 3D 相关配置写入 **`localStorage`**，键名 **`EDITOR_3D_DRAFT`**（见 `src/utils/editor3dDraft.ts`），内容与「导出 JSON」一致（`widgets3D`、`scene3D`、`background` 等）。
- **合并**：在 **Editor2D** 侧栏勾选 **「导出/预览合并 3D 草稿」**（持久化键 `PanelX_EDITOR_ENABLE_3D_MERGE`）。勾选后，**导出配置**与 **预览**会以当前 2D 配置为底，再合并草稿中的 `widgets3D` / `scene3D`（及非空的根 `background`、`debug`）。合并后侧栏会短暂显示**文字提示**（成功/未读到草稿/草稿无实例）。**详细合并日志**（`[Editor2D][merge3D]`）仅在 **`config.debug` 或 `PanelX_DEBUG`** 开启时输出到控制台。
- **与 `backgroundLayer` 的关系**：`Dashboard` 若配置了 **`backgroundLayer`（如图片背景）**，会优先使用该层，**不会**再使用 `widgets3D` 生成的 3D 背景。合并时若草稿里带有 3D 实例（`widgets3D.length > 0`），会**清除**合并结果中的 `backgroundLayer`，以保证 3D 场景能作为背景显示。若你需要「图片叠在 3D 上」等组合，需另行扩展分层策略。
- **典型流程**：Editor3D 调场景 → **保存草稿** → 打开 Editor2D 排 2D → 勾选合并 → **导出** 得到完整 `dashboard-config.json`。

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

内置示例：**`tech-pedestal`（科技底座）** — 上层基色默认 `#0a1a2f`、`topOpacity` 默认 **0.85**，顶面 **科技网格**（`topGridColor` 默认 `#41A9FF`，中心更亮）；下层外轮廓 **`#00D8FF`**；线框/网格/流光 **透明混合**，且默认同时走 **default + Bloom 层**（`bloomEdges`，霓虹泛光需场景 Bloom + 相机勾选 Bloom 层）。其余见 `supportedProps`（实现见 `src/framework/models/TechPedestalModel.ts`）。

**性能（Configurable vs Editor3D）**：大屏 `Scene3DFramework` 曾默认带「星空粒子」装饰，而 Editor3D 无此层，导致可配置运行时 GPU/CPU 反而更高。现已改为仅在 `scene3D.starField === true` 时启用；默认与编辑器一致（不启用）。粒子仅在 **XZ 平面**（固定 `Y`，约 **80** 个 `Points`），带固定方向缓慢漂移与少数闪烁；初始亮度按约 **亮:暗 = 1:6** 随机（多数为暗点）；尺寸按 **大:小数量 ≈ 1:6** 分两套 `Points`（大点与小点不同像素 `size`），不占满 Y 向体积。`statsStyle === 0` 时不再每帧执行 Stats 面板内部计时，降低默认开销。

**为何以前也看不到星空**：导出场景多为**正交相机**，可视范围只有约 `worldSize` 量级；旧版粒子在半径 25～140 的球壳上，**几乎全部落在视锥外**，所以画面上往往只有模型、没有粒子。开启 `starField` 后，正交模式在 **XZ 可视矩形** 内铺粒子；若仍要关闭以省资源，保持默认不写 `starField` 或设为 `false` 即可。`PointsMaterial.size` 在 Three.js 里对应 **屏幕像素**（正交下不会按深度放大），勿用小于 1 的“世界单位”当 size，否则会变成亚像素几乎不可见。星空粒子使用 **径向渐变圆形贴图** 作为 `map`，避免默认的方形点块观感。

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

### 5. Builtin 模型克隆一致性（Editor 与 configurable）

本项目的 configurable 路径会通过 `ModelInstanceStore.getModel()` 克隆模型实例。  
对于像 `ExpandingRingModel` 这类“内部持有 mesh/material/uniform 引用”的模型，必须保证克隆后内部引用与新 `scene` 一致，否则会出现：

- Editor 中可见，但 configurable 中“实例存在却不显示/不更新”
- `model.scene` 存在，transform 正常，但动画参数没有作用到屏幕对象

约定如下：

1. `ModelInstanceStore` 在替换克隆场景时，统一调用 `model.setScene(clonedScene)`，不要直接赋值 `model.scene = ...`。
2. 有内部对象引用的模型需重写 `setScene(scene)`，在新场景中重新绑定关键对象（如 mesh、material、uniforms）。
3. 避免在 `Scene3DFramework` 用 runtime 兜底“偷偷改模型参数”来掩盖此类问题；优先修复模型生命周期与克隆绑定逻辑。
4. 排查这类问题优先检查：`store.getModel()` 克隆路径、`setScene` 是否触发、模型内部引用是否重绑。

## 3D 控制入口总览

这一节回答 3 个常见问题：

1. **3D 部分的属性控制在哪里？**  
   在 `PropertyManager`，主要 key 为：`model.position` / `model.scale` / `model.rotationDeg` / `model.visible`。
2. **模型自定义属性控制在哪里？**  
   同样在 `PropertyManager`，通过 `model.propUpdate`（`params: { propKey, value }`）写入模型自定义属性。
3. **Command 执行在哪里？**  
   在 `CommandManager`，由 `executeCommand(req)` 分发，例如 `editor3d.moveTo` / `editor3d.rotateTo`。

当前接入链路如下：

- **Editor 侧 UI**：`RightSidebar` 的 `Transform3DSection` / `CustomPropertySection` / `CommandSection`
- **Editor 执行层**：`Editor3D`（内部持有 `CommandManager` + `PropertyManager` 实例）
- **Runtime 执行层**：`Scene3DFramework`（内部也持有 `CommandManager` + `PropertyManager` 实例）
- **外部透传层**：`Dashboard` / `DashboardWithLoader` 对外暴露并透传 `executeCommand` / `executeProperty`
- **统一注册清单**：`src/utils/manager3DRegistry.ts`（新增 command 或 property key 时优先在这里维护，`Editor3D` 与 `Scene3DFramework` 共用）
- **统一属性 handler 实现**：`src/utils/manager3DHandlers.ts`（`model.position` / `model.scale` / `model.rotationDeg` / `model.visible` / `model.propUpdate` 共用逻辑）
- **统一命令 handler 实现**：`src/utils/manager3DCommandHandlers.ts`（通过注入 `getModelById`，在 editor/runtime 复用 `rotateTo` / `moveTo` / `moveToAnchor` / `applyAutoRotate`）
- **说明**：旧的 `src/utils/editor3dCommands.ts` 已移除，避免与共享实现并存造成维护分叉

### Editor3D 模块边界（拆分后）

`Editor3D.vue` 现在主要做“编排层”，核心逻辑拆到以下 composable：

- `src/editor/editor3d/useEditor3DManagers.ts`  
  负责 command/property manager 初始化、统一注册入口接线、`executeCommand/executeProperty` 与属性 JSON 校验。
- `src/editor/editor3d/useEditor3DSelectionTransform.ts`  
  负责选中模型的 position/scale/rotation 状态同步与输入回写（含 design/world 坐标换算）。
- `src/editor/editor3d/useEditor3DCustomProps.ts`  
  负责自定义 `prop` 的增删改与 `model.propUpdate` 通知。
- `src/editor/editor3d/useEditor3DDragDrop.ts`  
  负责模型拖拽放置、确认弹窗与新建 widget 数据组装。
- `src/editor/editor3d/useEditor3DDemoScene.ts`  
  负责 demo robot 与 info box 的创建/清理。
- `src/editor/editor3d/useEditor3DSceneBinding.ts`  
  负责模型实例创建、加入 loader/store/storyboard、以及 `onFrameworkLoaded` 挂接流程。

统一原则：

- **主依赖注入点**：`getModelById(id)` 由 editor/runtime 各自提供。
- **共享逻辑优先**：key 清单在 `manager3DRegistry.ts`，command/property handler 在共享模块维护。
- **Editor3D 角色**：以装配与状态编排为主，避免再回到“大而全”单文件实现。

### 通用归一化工具（utils）

为了避免在 `Editor3D`、`Scene3DFramework`、`manager3D*` 中重复写输入兜底函数，统一约定优先复用：

- `src/utils/angle.ts`
  - `degToRad(deg)`：角度转弧度
- `src/utils/color.ts`
  - `normalizeHexColor(v, fallback)`：归一化颜色到 `#RRGGBB`
- `src/utils/number.ts`
  - `toFiniteNumber(v, fallback)`：有限数兜底
  - `clamp01(v)`：限制到 `0~1`
  - `percentToOpacityUnit(v, fallback)`：百分比转透明度 `0~1`
  - `toPositiveNumber(v, fallback, min)`：正值约束（不满足回退）
  - `toPositiveNumberOrUndefined(v, min)`：正值约束（不满足返回 `undefined`）

实践建议：

- 新增 command/property handler 时，先在以上工具中找可复用函数，再写局部逻辑。
- 若发现新的归一化模式被 2 处以上重复使用，优先抽到 `src/utils/*`。
- `Editor3D.vue` 只保留业务编排，尽量不再新增无依赖通用函数。

### 新增能力标准步骤（建议流程）

#### 新增一个 Command

1. 在 `src/utils/manager3DRegistry.ts` 增加 `COMMAND_KEYS.xxx`，并把它接入 `register3DCommandHandlers(...)`。
2. 优先在 `src/utils/manager3DCommandHandlers.ts` 增加/扩展共享逻辑；若仅 editor 端有差异，走注入参数（不要在两端复制粘贴）。
3. 在 `src/editor/editor3d/ui/right/CommandSection.vue`（或其他调用入口）使用 `COMMAND_KEYS.xxx` 发请求。
4. 如有对外调用，确认 `Dashboard -> Scene3DFramework` 透传链路无需额外改动（通常不需要）。
5. 补最小测试（至少 1 条关键路径），并跑 `vue-tsc` + 相关测试。

#### 新增一个 Property

1. 在 `src/utils/manager3DRegistry.ts` 增加 `PROPERTY_KEYS.xxx`，并接入 `register3DPropertyHandlers(...)`。
2. 在 `src/utils/manager3DHandlers.ts` 增加共享属性处理逻辑（输入校验、fallback、边界值）。
3. 在 editor UI 或 JSON 调试入口按 `{ key, id, params }` 发请求。
4. 若涉及导出/导入持久化，确认 `buildDashboardExportPayload()` 与导入流程字段一致。
5. 补最小测试并跑 `vue-tsc`。

通用检查清单：

- key 命名遵循约定（command 不带 `Once`，`prop` 仅指自定义属性）。
- 请求必须带顶层 `id`。
- editor 与 runtime 行为一致（至少手测一次两端）。

命名约束（统一）：

- `prop` 专指“自定义 property”
- `position` / `scale` / `rotation` 专指“3D属性”
- command key 不带 `Once` 后缀，默认语义即“执行一次”

## CommandManager（命令分发）

`CommandManager` 位于 `src/utils/CommandManager.ts`，用于把外部 JSON 命令分发到已注册函数。

- **请求结构**：`CommandRequest = { key: string; id: string; params?: unknown }`
- **关键约束**：`id` 必填，必须显式传入目标模型实例 id
- **职责边界**：只负责分发与日志；具体控制逻辑由 handler 实现
- **日志**：默认输出 `execute` / `missing_handler` / `execute_error`

### 使用方式

```ts
const cm = new CommandManager()
cm.register('editor3d.moveTo', (req) => {
  const p = (req.params ?? {}) as Record<string, unknown>
  // req.id: 目标模型实例 id
})

cm.execute({
  key: 'editor3d.moveTo',
  id: 'model-xxx',
  params: { x: 1, y: 2, z: 3, speed: 1 }
})
```

### 已接入位置

- `Editor3D`：右侧命令区按钮转为 JSON 后交给 `CommandManager`
- `Scene3DFramework`：支持 `executeCommand(req)` 外部调用
- `Dashboard` / `DashboardWithLoader`：透传 `executeCommand(req)`

## PropertyManager（属性设置）

`PropertyManager` 位于 `src/utils/PropertyManager.ts`，用于按 JSON 设置模型实例属性。

- **请求结构**：`PropertyRequest = { key: string; id: string; params?: unknown }`
- **关键约束**：`id` 必填，必须显式传入目标模型实例 id
- **职责边界**：只负责分发与日志；具体属性变更逻辑由 handler 实现
- **日志**：默认输出 `execute` / `missing_handler` / `execute_error`

### 使用方式

```ts
const pm = new PropertyManager()
pm.register('model.propUpdate', (req) => {
  const p = (req.params ?? {}) as Record<string, unknown>
  // req.id: 目标模型
  // p.propKey / p.value: 自定义属性键值
})

pm.execute({
  key: 'model.propUpdate',
  id: 'model-xxx',
  params: { propKey: 'color', value: '#00d8ff' }
})
```

### 内置 key（Editor3D / Scene3DFramework）

- `model.propUpdate`：自定义属性（prop）
- `model.position`：3D属性位置（`x/y/z`）
- `model.rotationDeg`：3D属性旋转（角度，`x/y/z`）
- `model.scale`：3D属性缩放（`scale` 或 `x/y/z`）
- `model.visible`：3D属性可见性

### 编辑器调试入口

`Editor3D` 右侧「命令」区域提供属性 JSON 输入框，可直接粘贴执行：

```json
{"key":"model.visible","id":"model-xxx","params":{"visible":true}}
```

## 请求 Key 对照表（UI -> 执行）

### Command（`executeCommand`）

| UI 操作 | key | params 示例 | 执行位置 |
| --- | --- | --- | --- |
| 命令面板：旋转执行 | `editor3d.rotateTo` | `{ x, y, z, speed }` | `Editor3D` / `Scene3DFramework` |
| 命令面板：移动执行 | `editor3d.moveTo` | `{ x, y, z, speed }` | `Editor3D` / `Scene3DFramework` |
| 命令面板：移动到锚点 | `editor3d.moveToAnchor` | `{ anchorWidgetId, x, y, z, speed }` | `Editor3D` / `Scene3DFramework` |
| 命令面板：自旋转开关/参数 | `editor3d.applyAutoRotateToSelected` | `{ enabled, axis, speedDeg }` | `Editor3D` / `Scene3DFramework` |

### Property（`executeProperty`）

| UI 操作 | key | params 示例 | 执行位置 |
| --- | --- | --- | --- |
| 3D 属性：位置 | `model.position` | `{ x, y, z }` | `Editor3D` / `Scene3DFramework` |
| 3D 属性：旋转（角度） | `model.rotationDeg` | `{ x, y, z }` | `Editor3D` / `Scene3DFramework` |
| 3D 属性：缩放 | `model.scale` | `{ scale }` 或 `{ x, y, z }` | `Editor3D` / `Scene3DFramework` |
| 3D 属性：显示/隐藏 | `model.visible` | `{ visible }` | `Editor3D` / `Scene3DFramework` |
| 自定义属性（prop）编辑 | `model.propUpdate` | `{ propKey, value }` | `Editor3D` / `Scene3DFramework` |

补充说明：

- 上表中的 `执行位置` 指 handler 注册位置；两端都注册了同名 key，便于 editor 与 runtime 行为一致。
- 对外调用通常通过 `DashboardWithLoader -> Dashboard -> Scene3DFramework` 透传到 runtime 执行。
- 所有请求统一要求顶层 `id`：`{ key, id, params }`。

## 调试开关（dashboard_config.debug）

- **配置**：在 **dashboard_config**（或导出的 Dashboard JSON）中增加 **`debug: true | false`**。加载该配置后会自动同步到 **localStorage** 的 `PanelX_DEBUG`（`1`/`0`），从而控制全局调试日志。
- **加载时机**：在 **配置加载大屏**（DashboardWithLoader 的 `applyConfig`）、**大屏预览/车间**（App 的 `loadWorkshopConfig`）、**编辑器**「加载车间大屏配置」时，都会根据当前 config 的 `debug` 刷新 localStorage。
- **使用方式**：数据链等日志已统一受该开关控制。需要判断日志开关的组件使用 **`logManager.isDebugEnabled()`**（`src/utils/logManager.ts`）判断后再输出，这样即可被 config.debug 与 localStorage 控制。