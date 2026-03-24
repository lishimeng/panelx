/**
 * 通用命令请求：用于 CommandManager 与各层 executeCommand API。
 */
export type CommandRequest = {
  key: string
  id: string
  params?: unknown
}

/**
 * 通用属性请求：用于 PropertyManager 与各层 executeProperty API。
 */
export type PropertyRequest = {
  key: string
  id: string
  params?: unknown
}

/**
 * 编辑器属性 JSON 调试入口请求。
 * 用于 executeProperty({ json }) 这类调用。
 */
export type PropertyJsonExecuteRequest = {
  json?: string
}

