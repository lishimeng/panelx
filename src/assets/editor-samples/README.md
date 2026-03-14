# Widget 样例图资源（assets）

本目录用于存放**编辑器**中 widget 的样例图，以 **assets 模式**参与构建（不动态变动，打包时一并输出）。

## 用途

- 侧栏组件列表中的缩略图
- 主区域画布上占位块内的预览图

## 使用方式

1. 将图片放入本目录，如：`stat.png`、`chart.png`。
2. 在 `src/editor/editor_config.json` 的 `registeredWidgets` 中，为对应组件设置 `sampleImage` 为**文件名**（含扩展名），例如：

   ```json
   { "type": "stat", "label": "指标", "defaultSize": { "width": 280, "height": 100 }, "sampleImage": "stat.png" }
   ```

3. 构建时会从本目录解析并输出为带 hash 的 URL，运行时通过文件名即可取到正确地址。

## 建议

- 格式：PNG、JPG、SVG、GIF、WebP 均可。
- 侧栏约 64×48，画布占位为矩形铺满，建议图片比例与组件默认宽高比接近。
