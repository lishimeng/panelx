# 测试用 SSE 服务

与 `src/editor/editor_config.json` 中 `datasources[].key === "sse_realtime"` 对应。

- **启动**：`pnpm run sse`（默认端口 3001，可通过环境变量 `SSE_PORT` 修改）
- **前端**：先启动本服务，再 `pnpm dev`；Vite 会将 `/api` 代理到本服务，前端连接 `url: '/api/sse'` 即可收到事件
- **数据目录**：`server/data`，服务启动时自动读取全部 `*.json`
- **消息结构**：`header`（含路由与策略） + `payload`（数组）
- **数据链日志**：服务端默认输出 `[DataChain] SSE.send`；关闭可设环境变量 `DATA_CHAIN_LOG=0`

## 数据文件格式

`server/data/*.json` 每个文件代表一个独立数据流：

```json
{
  "header": {
    "route": {
      "domain": "2d",
      "action": "chart"
    },
    "strategy": {
      "intervalMs": 3000,
      "emitMode": "rotate",
      "startDelayMs": 0
    }
  },
  "payload": [
    { "widgetId": "chart_1", "payload": { "series": [{ "data": [1, 2, 3] }] } },
    { "widgetId": "chart_1", "payload": { "series": [{ "data": [2, 3, 4] }] } }
  ]
}
```

说明：

- `header.route`：只需 `domain + action`；SSE `event` 由服务端自动拼接为 `domain_action`
- `header.strategy.intervalMs`：推送间隔（毫秒）
- `header.strategy.emitMode`：
  - `rotate`：每次推送 `payload` 中一条（循环）
  - `all`：每次推送完整 `payload` 数组
- `header.strategy.startDelayMs`：首次推送延迟（毫秒）
- `payload`：必须是数组；服务端输出时保持数组结构，数组元素可各自带不同 `widgetId/id`（支持单文件多实例）
