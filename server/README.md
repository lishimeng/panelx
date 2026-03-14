# 测试用 SSE 服务

与 `src/editor/editor_config.json` 中 `datasources[].key === "sse_realtime"` 对应。

- **启动**：`pnpm run sse`（默认端口 3001，可通过环境变量 `SSE_PORT` 修改）
- **前端**：先启动本服务，再 `pnpm dev`；Vite 会将 `/api` 代理到本服务，前端连接 `url: '/api/sse'` 即可收到事件
- **事件**：`chart_data`（约 3s 一次）、`table_data`（约 4s 一次），与 `eventByLogicCode` 中配置一致
- **数据链日志**：服务端默认输出 `[DataChain] SSE.send`；关闭可设环境变量 `DATA_CHAIN_LOG=0`
