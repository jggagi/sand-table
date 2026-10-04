# 掌上网师园 · 小园大境

独立的艺术化三维微缩园林：池面留白、开放六角亭与月洞庭院；四机位重点不同，整体与手机全景完整。 所有尺寸、位置和细节为构图压缩与程序化造型，非测绘复原。

本园源码、依赖、任务书、资产、检查和截图全部位于本目录，独立安装与构建。请先阅读系列 [共同约束](../AGENTS.md)、[本园约束](AGENTS.md)、[任务书](CODEX_TASK.md)、[规格](docs/GARDEN_SPEC.md) 和 [参考核对状态](docs/REFERENCES.md)。

## 运行

要求 Node.js **22.12+**、npm **10+**，浏览器支持 WebGL 2。依赖使用本园锁文件，没有外部模型、图片、字体或 API 请求。

```bash
cd suzhou-gardens/wangshiyuan
npm ci
npm run dev -- --port 5175 --strictPort
```

访问 `http://localhost:5175`。鼠标拖动旋转、滚轮缩放；手机单指旋转、双指缩放。四个观景按钮可用 Tab/Enter 操作，点击“回到全园”复位。手动操作中断转场，快速切换以最后一次请求为准；支持系统减少动态效果。

```bash
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173 --strictPort
npm run test:e2e
```

没有 Chromium 时先运行 `npx playwright install chromium`，或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`。E2E 独占端口 5175，会写出四桌面与一手机真实截图。软件 GPU 环境应逐园运行浏览器检查。

## 交付

[ChatGPT Site · 掌上网师园](https://wangshiyuan-miniature.jggagi.chatgpt.site) · [实际检查与五张截图](docs/reviews/m1/REPORT.md)。Sites 身份保存在 `.openai/hosting.json`，静态产物为本园 `dist/`；采用默认所有者私有访问，凭据和发布缓存不提交。

本轮类型检查、生产构建、**8 项单元检查和 7 项完整浏览器验收**通过。软件 WebGL 与触摸模拟不代表 iOS/Android 真机性能。保留 Vite 大包提示；准确形制与史料尚待进一步核对。


## 后续画面与手机打磨

本轮增强光色层次，改善手机近景构图、文字与触控尺寸，并降低粗指针设备的像素预算。真实截图、实际检查、运行说明与真机限制见 [打磨报告](docs/reviews/polish-1/REPORT.md)。历史 M1/M2 报告保留；新截图不覆盖旧版本。

## 苏州地图入口与往返

页头新增“返回地图”。从苏州地图入园后可随时回到地图，地图保留刚游过的园子；浏览器前进后退也可使用。独立 Site 与 CloudBase 子路径自动选择各自地图，未新增三维模式、后端或跨园运行时依赖。

本轮检查与真实手机视口截图见 [地图往返报告](docs/reviews/map-1/REPORT.md)。本园的 `npm ci`、`npm run dev`、`npm run typecheck`、`npm run test` 和 `npm run build` 运行方法不变；完整同站点往返请在仓库入口目录生成 CloudBase 包并预览。
