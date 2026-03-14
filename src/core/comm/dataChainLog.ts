/**
 * 数据链路日志：用于排查「数据未刷新」等环节
 * 过滤控制台关键字：[DataChain]
 * 开关由 logManager.isDebugEnabled() 控制
 */

import { isDebugEnabled } from '../../utils/logManager'

export function dataChainLog(
  step: string,
  detail: Record<string, unknown> & { message?: string }
): void {
  if (!isDebugEnabled()) return
  const msg = detail.message ?? ''
  const rest = { ...detail }
  delete rest.message
  console.log(
    `[DataChain] ${step}`,
    msg ? `${msg} ` : '',
    Object.keys(rest).length ? rest : ''
  )
}
