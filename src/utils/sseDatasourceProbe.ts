/**
 * Editor 数据源「探针」：用 fetch 流式解析 SSE，可收到任意 event: 名称。
 * 浏览器原生 EventSource 的 onmessage 仅对应 event:message，服务端自定义 event 不会触发 onmessage。
 */

/** @internal 导出供单测 */
export function parseSseBlock(block: string): { event: string; data: string } {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    const L = line.replace(/\r$/, '')
    if (L.startsWith('event:')) {
      event = L.slice(6).trim() || 'message'
    } else if (L.startsWith('data:')) {
      dataLines.push(L.startsWith('data: ') ? L.slice(6) : L.slice(5))
    }
  }
  return { event, data: dataLines.join('\n') }
}

export type SseProbeMeta = { key: string; sourceTag: string }

/**
 * 启动 SSE 探针；返回停止函数（abort 请求）。
 */
export function startSseDatasourceProbe(
  url: string,
  log: (entry: Record<string, unknown>) => void,
  meta: SseProbeMeta,
  onData?: (packet: { eventName: string; data: string }) => void
): () => void {
  const ac = new AbortController()
  void (async () => {
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { Accept: 'text/event-stream' }
      })
      if (!res.ok) {
        log({
          stage: 'error',
          type: 'sse',
          ...meta,
          httpStatus: res.status,
          url
        })
        return
      }
      log({ stage: 'connected', type: 'sse', ...meta, url })
      const body = res.body
      if (!body) {
        log({ stage: 'error', type: 'sse', ...meta, reason: 'no_body' })
        return
      }
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = buffer.replace(/\r\n/g, '\n')
        let sep: number
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const trimmed = raw.trim()
          if (!trimmed) continue
          const { event, data } = parseSseBlock(trimmed)
          onData?.({ eventName: event, data })
          log({
            stage: 'data',
            type: 'sse',
            ...meta,
            eventName: event,
            rawLength: data.length
          })
        }
      }
    } catch (e) {
      if (ac.signal.aborted) return
      log({
        stage: 'error',
        type: 'sse',
        ...meta,
        message: e instanceof Error ? e.message : String(e)
      })
    }
  })()
  return () => ac.abort()
}
