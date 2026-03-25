/**
 * 将 datasource 配置解析为 EventSource / fetch 可用的 URL。
 * 开发时常配 host=`http://localhost`（无端口），若直接拼接会得到 :80，导致无法走 Vite 代理；
 * 在浏览器中与当前页同主机且 URL 未写端口时，改用 `location.origin` + path，使 `/api` 走当前 dev server。
 */
export type DatasourceUrlInput = {
  type: string
  url?: string
  host?: string
  path?: string
}

export function normalizeDatasourcePath(path: string): string {
  const p = path.trim()
  if (!p) return ''
  if (/^https?:\/\//i.test(p)) return p
  return p.startsWith('/') ? p : `/${p}`
}

export function resolveDatasourceUrl(dsConfig: DatasourceUrlInput): string {
  const rawUrl = String(dsConfig.url ?? '').trim()
  if (rawUrl) return rawUrl

  const fallbackPath = dsConfig.type === 'sse' ? '/api/sse' : '/api/stats'
  const path = normalizeDatasourcePath(String(dsConfig.path ?? fallbackPath))
  const host = String(dsConfig.host ?? '').trim()
  if (!host) return path

  const h = host.endsWith('/') ? host.slice(0, -1) : host
  const full = `${h}${path}`

  if (typeof window === 'undefined' || !window.location) return full

  try {
    const base = new URL(/^https?:\/\//i.test(h) ? h : `http://${h}`)
    const loc = window.location
    const p = base.port
    const isDefaultPort =
      p === '' || (base.protocol === 'http:' && p === '80') || (base.protocol === 'https:' && p === '443')
    const sameHost = base.hostname === loc.hostname
    if (isDefaultPort && sameHost && loc.port !== '') {
      return `${loc.origin}${path}`
    }
  } catch {
    /* ignore invalid host */
  }

  return full
}
