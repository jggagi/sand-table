# 掌上狮子林 · 石境回转

独立的艺术化三维微缩园林：连续洞壑与岩上桥构成主体，池景与折廊位于两侧；观石机位显示真实孔洞。 所有尺寸、位置和细节为构图压缩与程序化造型，非测绘复原。

本园源码、依赖、任务书、资产、检查和截图全部位于本目录，独立安装与构建。请先阅读系列 [共同约束](../AGENTS.md)、[本园约束](AGENTS.md)、[任务书](CODEX_TASK.md)、[规格](docs/GARDEN_SPEC.md) 和 [参考核对状态](docs/REFERENCES.md)。

## 运行

要求 Node.js **22.12+**、npm **10+**，浏览器支持 WebGL 2。依赖使用本园锁文件，没有外部模型、图片、字体或 API 请求。

```bash
cd suzhou-gardens/shizilin
npm ci
npm run dev -- --port 5177 --strictPort
```

访问 `http://localhost:5177`。鼠标拖动旋转、滚轮缩放；手机单指旋转、双指缩放。四个观景按钮可用 Tab/Enter 操作，点击“回到全园”复位。手动操作中断转场，快速切换以最后一次请求为准；支持系统减少动态效果。

```bash
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173 --strictPort
npm run test:e2e
```

没有 Chromium 时先运行 `npx playwright install chromium`，或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`。E2E 独占端口 5177，会写出四桌面与一手机真实截图。软件 GPU 环境应逐园运行浏览器检查。

## 交付

[ChatGPT Site · 掌上狮子林](https://shizilin-miniature.jggagi.chatgpt.site) · [实际检查与五张截图](docs/reviews/m1/REPORT.md)。Sites 身份保存在 `.openai/hosting.json`，静态产物为本园 `dist/`；采用默认所有者私有访问，凭据和发布缓存不提交。

本轮类型检查、生产构建、**9 项单元检查和 7 项完整浏览器验收**通过。软件 WebGL 与触摸模拟不代表 iOS/Android 真机性能。保留 Vite 大包提示；准确形制与史料尚待进一步核对。
