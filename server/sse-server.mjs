/**
 * 测试用 SSE 服务：与 editor_config 中 datasources 的 sse_realtime 对应
 * 启动：pnpm run sse
 * 前端 /api/sse 通过 Vite proxy 转发到本服务
 */

import { createServer } from 'http'

const PORT = Number(process.env.SSE_PORT) || 3001

/** 与 eventByLogicCode 一致：chart_1 -> chart_data, table_1 -> table_data */
const CHART_EVENT = 'chart_data'
const TABLE_EVENT = 'table_data'

const LOG_PREFIX = '[DataChain]'

function sendSSE(res, event, data) {
  const payload = JSON.stringify(data)
  if (process.env.DATA_CHAIN_LOG !== '0') {
    console.log(`${LOG_PREFIX} SSE.send event=${event} dataLength=${payload.length}`)
  }
  res.write(`event: ${event}\n`)
  res.write(`data: ${payload}\n\n`)
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
    sendSSE(res, 'open', { message: 'SSE connected', ts: Date.now() })

    let chartTick = 0
    let tableTick = 0
    const chartInterval = setInterval(() => {
      chartTick += 1
      sendSSE(res, CHART_EVENT, {
        xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
        yAxis: { type: 'value' },
        series: [
          { name: '销量', data: [120 + chartTick, 132, 101, 134, 90, 230] },
          { name: '产量', data: [80, 100 + chartTick, 121, 104, 105, 90] }
        ]
      })
    }, 3000)

    const tableInterval = setInterval(() => {
      tableTick += 1
      sendSSE(res, TABLE_EVENT, {
        columns: [{ key: 'name', title: '名称' }, { key: 'value', title: '数值' }],
        data: [
          { name: '项目A', value: 100 + tableTick },
          { name: '项目B', value: 200 + tableTick },
          { name: '项目C', value: 150 }
        ]
      })
    }, 4000)

    req.on('close', () => {
      if (process.env.DATA_CHAIN_LOG !== '0') {
        console.log(`${LOG_PREFIX} SSE.client closed`)
      }
      clearInterval(chartInterval)
      clearInterval(tableInterval)
    })
    return
  }

  if (req.url === '/api/sse' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, sse: 'GET /api/sse for SSE stream' }))
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`[SSE] Test server: http://localhost:${PORT}`)
  console.log(`[SSE] Stream: GET http://localhost:${PORT}/api/sse`)
  console.log(`[SSE] Events: ${CHART_EVENT} (every 3s), ${TABLE_EVENT} (every 4s)`)
})
