# 掌上留园 · M2 文人画意

留园代表性空间的艺术化 Web 微缩景观：中部池景、转折廊院与东部冠云峰庭院在同一薄底座上连接。非等比例全园复原；建筑、山石与植物均由本项目程序化制作，具体轮廓和位置为艺术化估计。M2 在原构图上打磨留白、曲折石峰、树姿、屋顶与柔光。

本应用、依赖、测试与截图全部位于 `suzhou-gardens/liuyuan/`。先阅读系列 [共同约束](../AGENTS.md)、本园 [AGENTS.md](AGENTS.md)、[任务书](CODEX_TASK.md)、[规格](docs/LIUYUAN_SPEC.md)、[计划](docs/IMPLEMENTATION_PLAN.md) 与 [参考资料](docs/REFERENCES.md)。M1 完成后，用户确认进入 M2 文人画意美术打磨；2026-10-04 的新任务启动另外四座独立园林，留园保持当前已发布作品。

## 运行

需要 Node.js **22.12+**、npm **10+** 和支持 WebGL 2 的浏览器。本次验证使用 Node 24.19.0、npm 11.9.0。依赖版本锁定在 `package-lock.json`；不需要模型下载、远程图片、字体服务或 API。

```bash
cd suzhou-gardens/liuyuan
npm ci
npm run dev
```

打开终端给出的本地地址，默认 `http://localhost:5173`。首次安装和后续洁净安装均使用 `npm ci`；仅在明确更改依赖时使用 `npm install` 更新锁文件。

```bash
npm run typecheck
npm run test
npm run build
npm run preview -- --port 4173
```

`test` 一次运行后退出。`preview` 查看 `dist/` 构建，默认端口 4173；Vite 使用相对资源基路径，静态产物无需后端。

浏览器检查：

```bash
# 系统没有 Chromium 时，先安装 Playwright 所用浏览器
npx playwright install chromium
npm run test:e2e
```

已有 `/usr/bin/chromium` 时直接使用；也可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/绝对路径/chromium` 指定浏览器。测试自动启动端口 5173 的开发服务器，使用确定性的软件 WebGL 渲染；本轮真实截图会写入 `docs/reviews/polish-1/`；M1 原截图保留在 `docs/reviews/m1/`。此环境的触摸模拟不代表真实手机 GPU 或手势体验。

## 操作

鼠标左键拖动旋转、滚轮缩放；触屏单指旋转、双指缩放。四个观景按钮可通过 Tab、Enter 或空格操作；“回到全园”恢复整体机位。手动输入中断正在进行的相机过渡并显示“自由观察”；快速切换以最后一次选择为准。禁止平移和翻到底座下，缩放受限。系统开启“减少动态效果”时直接切换机位。

## 源码与交付

- `src/data/`：稳定场景 ID、布局参数、机位与中文文案。
- `src/scene/`：程序化共享几何、材质、真实开口和单个正交相机控制器。
- `tests/`：配置边界、真实渲染、鼠标/触摸、异常与响应式检查。
- [2026-10-04 五园交付复验：15项单元与完整7项浏览器检查](docs/reviews/collection/REPORT.md)。
- [M2 实现报告、五张真实截图与同机位对照](docs/reviews/m2/REPORT.md)。
- [M1 构图原型与原截图](docs/reviews/m1/REPORT.md)。
- [程序化资产与艺术化边界](docs/ASSET_SOURCES.md)。

冠云峰为自制隐式雕刻网格，有三处真实贯穿孔洞和克制风化起伏；配峰拥有独立较低宽的轮廓。尚未完成冠云峰实物的多角度参考匹配，不声明写实还原。没有屋顶抬升、第一人称、导航、复杂水反射、后台或遥测。美术与真实设备性能仍需要后续反馈和测试。

## ChatGPT Sites

按后续请求使用 ChatGPT Sites 托管此静态应用，默认仅所有者可访问。站点身份及静态输出目录保存在 `.openai/hosting.json`；凭据不写入源码。站点地址为 [掌上留园](https://liuyuan-miniature-m1.jggagi.chatgpt.site)，M2 继续更新同一站点，保留原地址与私有访问范围。Sites 工作目录与发布缓存位于忽略的 `.sites-runtime/`，不会改变上层仓库或其他园林目录。


## 后续画面与手机打磨

本轮增强光色层次，改善手机近景构图、文字与触控尺寸，并降低粗指针设备的像素预算。真实截图、实际检查、运行说明与真机限制见 [打磨报告](docs/reviews/polish-1/REPORT.md)。历史 M1/M2 报告保留；新截图不覆盖旧版本。

## 苏州地图入口与往返

页头新增“返回地图”。从苏州地图入园后可随时回到地图，地图保留刚游过的园子；浏览器前进后退也可使用。独立 Site 与 CloudBase 子路径自动选择各自地图，未新增三维模式、后端或跨园运行时依赖。

本轮检查与真实手机视口截图见 [地图往返报告](docs/reviews/map-1/REPORT.md)。本园的 `npm ci`、`npm run dev`、`npm run typecheck`、`npm run test` 和 `npm run build` 运行方法不变；完整同站点往返请在仓库入口目录生成 CloudBase 包并预览。


## 园中听音

背景音乐《廊间清弦》：琴弦意象 · 从容留白。由本项目原创旋律与合成音色制作，非真实乐器演奏录音。进入页面默认安静，点击“开启音乐”才加载本地MP3；可暂停/继续与调节音量。切到后台或返回地图时暂停，回到园内不自动恢复播放；只在当前浏览器保存本园音量，禁用存储仍可操作。

音乐不需要账号、外部播放器或网络API。应用安装、构建与运行仍使用上方原命令；重新生成音轨仅需可选的Python 3、NumPy、SciPy和ffmpeg，执行 `python3 scripts/render-music.py`。音轨已提交在 `public/audio/`，普通运行无需这些制作工具。来源、检查与真机限制见 [音乐报告](docs/reviews/music-1/REPORT.md)。
