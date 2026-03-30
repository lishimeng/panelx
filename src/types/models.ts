/** 3D 模型预设：供 3D 编辑器「可用模型」列表展示与预加载使用。 */
export interface ModelPresetItem {
  id: string
  label: string
  /** 对应 ModelRegistry 的 typeId，如 gltf、fbx */
  typeId: string
  /** 模型资源地址（可加载类型必填） */
  source: string
  /** 实例名称，不填则用 id */
  name?: string
}

