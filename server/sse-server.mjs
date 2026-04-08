/**
 * 测试用 SSE 服务：读取 server/data/*_enable.json（磁盘格式可为 header+payload 批量）后按策略推送。
 * 推送到客户端时仅标准 SSE：每条消息 event:{domain}_{action}，data 为 { key, id, params }，不批量原样转发信封。
 * 启动：pnpm run sse
 * 前端 /api/sse（或 /api/v1/sse）通过 Vite proxy 转发到本服务
 */

import { createServer } from 'http'
import { readdirSync, readFileSync, existsSync, watch } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const PORT = Number(process.env.SSE_PORT) || 3001
/** 与 `resolveDatasourceUrl` 默认 /api/sse 及常见版本化路径对齐 */
const SSE_HTTP_PATHS = new Set(['/api/sse', '/api/v1/sse'])

function requestPathname(url) {
  if (!url) return ''
  const q = url.indexOf('?')
  return q === -1 ? url : url.slice(0, q)
}
const LOG_PREFIX = '[DataChain]'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = join(__dirname, 'data')

function toFinite(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function resolveEventName(route) {
  const domain = String(route?.domain ?? '').trim().toLowerCase()
  const action = String(route?.action ?? '').trim().toLowerCase()
  if (domain && action) return `${domain}_${action}`
  return 'message'
}

function normalizePayloadItem(item) {
  if (!item || typeof item !== 'object') return item
  const rec = item
  return {
    ...rec,
    noWait: rec.noWait === true
  }
}

/**
 * 数据文件里一行（可含 id + 内层 payload，或已是 ControlRequest）→ 线上标准体 { key, id, params }。
 * 仅服务端在写 SSE 帧时使用；客户端只应收到本结构。
 */
function rowToControlRequest(row) {
  if (!row || typeof row !== 'object') return { key: '', id: '', params: {} }
  const outerId = String(row.id ?? '').trim()
  const inner = row.payload
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const ik = inner.key
    const ip = inner.params
    if (ik !== undefined || ip !== undefined) {
      return {
        key: String(inner.key ?? ''),
        id: String(inner.id ?? outerId).trim(),
        params: ip !== undefined && typeof ip === 'object' && ip !== null ? ip : {}
      }
    }
    return {
      key: String(row.key ?? ''),
      id: outerId,
      params: inner
    }
  }
  const p = row.params
  return {
    key: String(row.key ?? ''),
    id: String(row.id ?? '').trim(),
    params: p !== undefined && typeof p === 'object' && p !== null ? p : {}
  }
}

/** 线上 data：省略空字符串的 key/id，缩短 JSON（与 Dashboard / pickControlRequestFields 语义一致）。 */
function compactWireControlRequest(cr) {
  const o = {}
  const key = String(cr.key ?? '').trim()
  const id = String(cr.id ?? '').trim()
  if (key) o.key = key
  if (id) o.id = id
  const par = cr.params
  if (par != null && typeof par === 'object') o.params = par
  return o
}

function normalizeDataset(fileName, raw) {
  const rec = raw && typeof raw === 'object' ? raw : {}
  const header = rec.header && typeof rec.header === 'object' ? rec.header : {}
  const strategy = header.strategy && typeof header.strategy === 'object' ? header.strategy : {}
  const route = header.route && typeof header.route === 'object' ? header.route : {}
  const payload = Array.isArray(rec.payload) ? rec.payload.map((item) => normalizePayloadItem(item)) : []
  return {
    fileName,
    event: resolveEventName(route),
    header: {
      route: {
        domain: String(route.domain ?? '').trim() || '2d',
        action: String(route.action ?? '').trim() || 'other'
      },
      strategy: {
        intervalMs: Math.max(100, toFinite(strategy.intervalMs, 3000)),
        emitMode: strategy.emitMode === 'all' ? 'all' : 'rotate',
        startDelayMs: Math.max(0, toFinite(strategy.startDelayMs, 0))
      }
    },
    payload
  }
}

function loadDatasets() {
  if (!existsSync(DATA_DIR)) return []
  const files = readdirSync(DATA_DIR).filter((name) => {
    const lower = name.toLowerCase()
    return lower.endsWith('_enable.json')
  })
  const list = []
  for (const file of files) {
    const fullPath = join(DATA_DIR, file)
    try {
      const text = readFileSync(fullPath, 'utf8')
      const parsed = JSON.parse(text)
      list.push(normalizeDataset(file, parsed))
    } catch (err) {
      console.warn(`[SSE] Skip invalid json: ${file} (${String(err)})`)
    }
  }
  return list
}

/** 当前内存中的数据集；文件变更后会 reload */
let datasets = loadDatasets()

/** 已建立的 SSE 长连接：重载时停旧定时器并重新 startDatasetStream */
const activeSseConnections = new Set()

let reloadDebounceTimer = null
const RELOAD_DEBOUNCE_MS = 250

function isDataEnableFile(name) {
  return String(name ?? '')
    .toLowerCase()
    .endsWith('_enable.json')
}

function reloadDatasetsAndRestartStreams() {
  datasets = loadDatasets()
  console.log(`[SSE] Datasets reloaded: ${datasets.length} file(s)`)

  for (const conn of [...activeSseConnections]) {
    if (conn.res.writableEnded) {
      activeSseConnections.delete(conn)
      continue
    }
    for (const stop of conn.stoppers) {
      try {
        stop()
      } catch (_) {
        /* ignore */
      }
    }
    conn.stoppers = []
    try {
      sendSSE(
        conn.res,
        'open',
        compactWireControlRequest({
          key: '',
          id: '',
          params: { message: 'SSE datasets reloaded', datasetCount: datasets.length, reloaded: true, ts: Date.now() }
        })
      )
    } catch (err) {
      console.warn(`[SSE] Reload notify failed, dropping connection: ${String(err)}`)
      try {
        conn.res.end()
      } catch (_) {
        /* ignore */
      }
      activeSseConnections.delete(conn)
      continue
    }
    conn.stoppers = datasets.map((dataset) => startDatasetStream(conn.res, dataset))
  }
}

function scheduleReloadFromWatch(eventType, filename) {
  if (filename != null && filename !== '' && !isDataEnableFile(filename)) {
    return
  }
  if (process.env.DATA_CHAIN_LOG !== '0') {
    console.log(`${LOG_PREFIX} data/watch ${eventType} ${filename ?? '(dir)'}`)
  }
  if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer)
  reloadDebounceTimer = setTimeout(() => {
    reloadDebounceTimer = null
    reloadDatasetsAndRestartStreams()
  }, RELOAD_DEBOUNCE_MS)
}

if (existsSync(DATA_DIR)) {
  try {
    const watcher = watch(DATA_DIR, { persistent: true }, (eventType, filename) => {
      scheduleReloadFromWatch(eventType, filename)
    })
    watcher.on('error', (err) => {
      console.error('[SSE] fs.watch error:', err)
    })
  } catch (err) {
    console.warn('[SSE] fs.watch not available:', err)
  }
}

function sendSSE(res, event, data) {
  const encoded = JSON.stringify(data)
  if (process.env.DATA_CHAIN_LOG !== '0') {
    console.log(`${LOG_PREFIX} SSE.send event=${event} dataLength=${encoded.length}`)
  }
  res.write(`event: ${event}\n`)
  res.write(`data: ${encoded}\n\n`)
}

function startDatasetStream(res, dataset) {
  const { strategy } = dataset.header
  let cursor = 0
  let timerId = null
  let stopped = false

  const shouldSendNextImmediately = (rows) => {
    if (strategy.emitMode !== 'rotate') return false
    const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    return Boolean(first && typeof first === 'object' && first.noWait === true)
  }

  const scheduleNext = (delayMs) => {
    if (stopped) return
    timerId = setTimeout(() => {
      sendByStrategy()
    }, Math.max(100, delayMs))
  }

  const sendByStrategy = () => {
    if (stopped || res.writableEnded) return
    const sourcePayload = dataset.payload
    const nextPayload =
      strategy.emitMode === 'all'
        ? sourcePayload
        : sourcePayload.length > 0
          ? [sourcePayload[cursor % sourcePayload.length]]
          : []

    try {
      for (const row of nextPayload) {
        const body = compactWireControlRequest(rowToControlRequest(row))
        sendSSE(res, dataset.event, body)
      }
    } catch (err) {
      stopped = true
      if (process.env.DATA_CHAIN_LOG !== '0') {
        console.warn(`${LOG_PREFIX} SSE.send failed: ${String(err)}`)
      }
      return
    }
    cursor += 1
    scheduleNext(shouldSendNextImmediately(nextPayload) ? 0 : strategy.intervalMs)
  }

  scheduleNext(strategy.startDelayMs)
  return () => {
    stopped = true
    if (timerId) clearTimeout(timerId)
  }
}

const server = createServer((req, res) => {
  const pathname = requestPathname(req.url)
  if (req.method === 'GET' && SSE_HTTP_PATHS.has(pathname)) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })
    if (process.env.DATA_CHAIN_LOG !== '0') {
      console.log(`${LOG_PREFIX} SSE.client connected`)
    }

    sendSSE(
      res,
      'open',
      compactWireControlRequest({
        key: '',
        id: '',
        params: { message: 'SSE connected', datasetCount: datasets.length, ts: Date.now() }
      })
    )

    const conn = { res, stoppers: datasets.map((dataset) => startDatasetStream(res, dataset)) }
    activeSseConnections.add(conn)
    req.on('close', () => {
      if (process.env.DATA_CHAIN_LOG !== '0') {
        console.log(`${LOG_PREFIX} SSE.client closed`)
      }
      activeSseConnections.delete(conn)
      conn.stoppers.forEach((stop) => stop())
    })
    return
  }

  if (SSE_HTTP_PATHS.has(pathname) || pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        sse: 'GET /api/sse or /api/v1/sse for SSE stream',
        dataDir: DATA_DIR,
        datasetCount: datasets.length,
        datasets: datasets.map((d) => ({
          file: d.fileName,
          event: d.event,
          intervalMs: d.header.strategy.intervalMs,
          emitMode: d.header.strategy.emitMode,
          payloadSize: d.payload.length
        }))
      })
    )
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`[SSE] Test server: http://localhost:${PORT}`)
  console.log(`[SSE] Stream: GET http://localhost:${PORT}/api/sse (alias /api/v1/sse)`)
  console.log(`[SSE] Data directory: ${DATA_DIR}`)
  console.log(`[SSE] Loaded datasets: ${datasets.length}`)
})
