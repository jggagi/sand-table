# 网师园独立资产检查记录

日期：2026-10-04。以下检查在 `/tmp/suzhou-wangshiyuan-assets/` 的隔离资产目录实际运行，未安装新依赖；仅使用已有的 Three.js、TypeScript、esbuild、Playwright 和系统 Chromium。没有编辑仓库或 Site 工作目录。

## 类型和运行几何

`typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler` 检查 `garden.layout.ts`、`garden.views.ts`、`garden.content.ts`、`geometry.ts`，退出码 0。

`qa/check.mjs` 使用 esbuild 生成的 Node ESM 几何入口，实际调用 `createGarden()` 两次并遍历生成物：

| 指标 | 实际值 |
| --- | --- |
| 稳定对象组 | 27 |
| Mesh | 73 |
| 三角形 | 108,628 |
| 共享材质 | 8 |
| 实际包络 min | `[-12, -0.75, -10]` |
| 实际包络 max | `[12, 5.045615196228027, 10]` |
| 非有限顶点值 | 0 |
| 两次构建的顶点数组 SHA256 | 相同 |
| 连续两次 dispose 的释放事件 | 73 geometry、8 material，各一次 |

预算低于 `<150000` 三角和 `<160` Mesh；实际包络落在声明的 `SCENE_BOUNDS` 内。所有材质使用 `THREE.FrontSide`，屋面为有厚度的闭合曲面。

## 开口几何

`qa/check-openings.mjs` 对月洞门中心和漏窗空隙实际发射射线，结果均为 0 次交点；同高的旁边实墙分别为 1 次交点。该检查验证开口由真实几何空缺形成，不能代替完整穿插或可通行性验收。

## 真实渲染预览

`qa/screenshot.mjs` 通过本地 HTTP 预览打开真实 Chromium，使用软件 WebGL（SwiftShader），退出码 0，`pageerror` 为 `[]`。截图为独立 Three.js 资产预览，没有正式应用的 UI 或交互控制器。

| 截图 | 视口 |
| --- | --- |
| `qa/overview.png` | 1440 × 1000 |
| `qa/pool.png` | 1440 × 1000 |
| `qa/pavilion.png` | 1440 × 1000 |
| `qa/courtyard.png` | 1440 × 1000 |
| `qa/mobile-overview.png` | 390 × 620 |

实际查看了上述五份截图：全景底座和树冠完整入画；池景保留连续水面；亭景显示开放柱间、岸石和树姿；院景保留月洞门及廊屋层次。亭景初稿从西南墙外观看，最后改为 `[8,12,12] → [-6.8,1.1,-2.1]`，减少墙与近树对亭柱的遮挡。该最终预设已重新截图。

预览额外包含一张地面接影 Plane，所以该预览单帧日志为 74 calls、108,630 triangles；应用内预算以场景自身的 73 Mesh、108,628 triangles 为准。预览光照由临时检查文件提供，正式应用接入后需要再次查看画面。

## 尚未验证

正式应用的构建、预设切换中断、自由旋转、双指缩放、重置、resize、reduced motion、错误恢复、实际设备帧率与 Site 发布均由后续集成任务完成。没有声称这些项目已通过，也没有核对实地测绘、历史信息或第三方授权。
