/**
 * 测试用 SSE 服务：读取 server/data/*.json 后按策略推送。
 * 启动：pnpm run sse
 * 前端 /api/sse 通过 Vite proxy 转发到本服务
 */

import { createServer } from 'http'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const PORT = Number(process.env.SSE_PORT) || 3001
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

function normalizeDataset(fileName, raw) {
  const rec = raw && typeof raw === 'object' ? raw : {}
  const header = rec.header && typeof rec.header === 'object' ? rec.header : {}
  const strategy = header.strategy && typeof header.strategy === 'object' ? header.strategy : {}
  const route = header.route && typeof header.route === 'object' ? header.route : {}
  const payload = Array.isArray(rec.payload) ? rec.payload : []
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
  const files = readdirSync(DATA_DIR).filter((name) => extname(name).toLowerCase() === '.json')
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

const datasets = loadDatasets()

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
  const sendByStrategy = () => {
    const sourcePayload = dataset.payload
    const nextPayload =
      strategy.emitMode === 'all'
        ? sourcePayload
        : sourcePayload.length > 0
          ? [sourcePayload[cursor % sourcePayload.length]]
          : []

    sendSSE(res, dataset.event, {
      header: {
        route: dataset.header.route,
        strategy: {
          ...strategy,
          source: basename(dataset.fileName),
          cursor,
          total: sourcePayload.length
        }
      },
      payload: nextPayload
    })
    cursor += 1
  }

  const timeoutId = setTimeout(() => {
    sendByStrategy()
  }, strategy.startDelayMs)
  const intervalId = setInterval(sendByStrategy, strategy.intervalMs)
  return () => {
    clearTimeout(timeoutId)
    clearInterval(intervalId)
  }
}

const server = createServer((req, res) => {
  if (req.url === '/api/sse' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })
    if (process.env.DATA_CHAIN_LOG !== '0') {
      console.log(`${LOG_PREFIX} SSE.client connected`)
    }

    sendSSE(res, 'open', {
      header: {
        route: { domain: 'meta', action: 'connected' },
        strategy: { datasetCount: datasets.length }
      },
      payload: [{ message: 'SSE connected', ts: Date.now() }]
    })

    const stoppers = datasets.map((dataset) => startDatasetStream(res, dataset))
    req.on('close', () => {
      if (process.env.DATA_CHAIN_LOG !== '0') {
        console.log(`${LOG_PREFIX} SSE.client closed`)
      }
      stoppers.forEach((stop) => stop())
    })
    return
  }

  if (req.url === '/api/sse' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        sse: 'GET /api/sse for SSE stream',
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
  console.log(`[SSE] Stream: GET http://localhost:${PORT}/api/sse`)
  console.log(`[SSE] Data directory: ${DATA_DIR}`)
  console.log(`[SSE] Loaded datasets: ${datasets.length}`)
})
