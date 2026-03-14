/**
 * 通用表格类数据结构（仅数据，不含展示配置）
 * Chart 与 Table 等均可使用：Chart 的系列数据、Table 的行列数据均可表示为二维表
 */

/** 通用二维表格数据：列名 + 行数据，不包含图表/表格的展示配置（如 echarts option、列宽等） */
export interface TabularData {
  /** 列键名，与每行对象的 key 对应，如 ['date', 'value', 'count'] */
  columns: string[]
  /** 行数据，每行为列键到值的映射 */
  rows: Record<string, unknown>[]
}
