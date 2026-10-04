# 留园 M1 实现报告

完成日期：2026-10-03。里程碑：**M1 可交互构图原型**。三片空间、四个机位、鼠标与触摸操作已实现，五张截图来自真实应用渲染。本轮未扩展 M2–M4。

## 范围与规范

仓库：`jggagi/sand-table`。新增文件全部位于 `suzhou-gardens/liuyuan/`；上层文件及其他园林目录未修改。依赖、构建缓存和测试临时文件由本目录 `.gitignore` 排除。

先阅读了 `suzhou-gardens/AGENTS.md`。本次检出的仓库没有 `suzhou-gardens/liuyuan/`，因此用户提到的子层 `AGENTS.md` 和 `CODEX_TASK.md` 不存在；采用实际存在的上层任务书、`LIUYUAN_SPEC.md`、`IMPLEMENTATION_PLAN.md` 和 `REFERENCES.md`，按用户的目录边界建立子应用。没有覆盖、改写或伪造这些说明文件。

## 已实现

- 同一薄石底座上的不规则大池、厚重山石、涵碧山房/明瑟楼简化组合、转折廊院及东部冠云峰庭院。东部小水景独立，布局非镜像对称。
- 自制屋顶曲面、瓦脊节奏、木柱栏杆、漏窗、真实可透视的月洞，以及瘦高不对称的多段石峰和真实负空间。少量分枝树、竹与疏密变化的铺地。
- 正交相机与一个 CameraControls 控制器。四个固定 ID、复位、旋转、缩放边界、禁止平移和翻到底座下。手动输入中断转场；连续请求以最后一次生效。
- 横竖屏按画面可见范围计算 zoom；自由观察保持相对缩放与朝向。减少动态效果时由同一控制器直接应用机位，渲染就绪仍等待实际稳定帧。
- 中文 DOM 控件、键盘焦点、当前机位/自由观察说明、真实初始化状态、WebGL 错误和重新加载入口。常驻艺术化说明，无远程运行时资源。
- 场景 ID、布局参数、相机机位和文案分别配置；重点构件保留 roof/body 分组。资源仅在挂载时构建，复用 8 个材质，卸载清理，固定种子 `20261003`；静止时按需渲染。

## 环境与最终检查

Node **24.19.0**，npm **11.9.0**。项目要求 Node **22.12+** / npm **10+**。稳定依赖已通过实际安装及 peer dependency 树核对：React/React DOM 18.3.1、Three.js 0.170.0、R3F 8.18.0、Drei 9.122.0、CameraControls 2.10.1、Vite 6.4.1；提交内容包含 npm 锁文件。

下表命令均在 `suzhou-gardens/liuyuan/` 执行：

| 命令 | 实际结果 |
| --- | --- |
| `npm install --no-audit --no-fund --fetch-retries=1 --fetch-timeout=45000` | 最终退出 0，安装 188 个包 |
| `npm ci --no-audit --no-fund --offline` | 最终退出 0，按锁文件重新安装 188 个包；验证洁净安装 |
| `npm ls react react-dom three @react-three/fiber @react-three/drei camera-controls` | 退出 0，React 18 / R3F 8 / Drei 9 版本匹配，共享 Three.js 与控制器版本 |
| `npm run dev -- --port 5173 --strictPort` | Vite 开发服务器实际启动，浏览器测试访问成功；服务为持续运行进程 |
| `npm run typecheck` | 最终退出 0 |
| `npm run test` | 退出 0，**12/12** 单元测试通过；非 watch 模式 |
| `npm run build` | 最终退出 0，产出静态 `dist/`；有体积警告，见下文 |
| `npm run test:e2e` | 最终退出 0，**7/7** 浏览器测试通过，用时约 2.3 分钟，没有 skip |
| `npm run preview -- --port 4173 --strictPort` | 构建产物预览服务器实际启动，生产页面检查见下文 |
| `node /tmp/liuyuan-preview-check.mjs` | 退出 0；临时 Playwright 验收脚本实际访问构建产物、切换观石并复位 |

构建产物预览的实际页面返回 **HTTP 200**；观石切换与复位完成，最终相机位置 `[34,42,40]`、目标 `[0,1,0]`，74 draw calls / 113,521 三角形、真实就绪，JavaScript 页面异常为 0。该临时脚本只用于本次生产产物验收，不提交到仓库；可复现的完整浏览器测试保存在 `tests/browser/garden.spec.ts`。

单元测试覆盖唯一场景/区域/观景点 ID、有效引用、变换与尺寸、四个机位完整性、俯仰与缩放限制以及不同视口适配。两项几何回归使用真实 Three.js Raycaster：月洞中心穿透而侧墙命中；大池中心最上方命中水面，防止实体池岸遮住水。

最终浏览器检查覆盖真实初始化、canvas 非空像素及青绿水面、四种不同实际画面、四个机位相机位置/目标、快速连续点击、转场中拖动、自由观察、复位、真实滚轮到两端缩放边界、横竖屏 resize、键盘、reduced motion、CDP 单指旋转与双指缩放，以及 WebGL 不可用的可读错误。主截图检查没有 JavaScript 页面异常，没有远程资源请求；就绪信号来自实际绘制统计及连续稳定相机帧，不代替像素与手势检查。

浏览器为 **Chromium 151.0.7922.173**；渲染器为 **ANGLE / Vulkan 1.3 / SwiftShader** 软件 WebGL。选定截图桌面 **1440×1000**，手机 **390×844**，**DPR=1**、JPEG 质量 **84**。另检查 **844×390** 横屏，控件可见且没有横向溢出。

以下为最终实际 `renderer.info.render` 统计，均有 74 个场景 Mesh（含接地阴影平面）：

| 画面 | draw calls | 三角形 | 稳定 zoom |
| --- | ---: | ---: | ---: |
| 桌面 overview | 74 | 113,521 | 21.16129 |
| 桌面 waterside | 74 | 113,521 | 27.33333 |
| 桌面 corridor | 67 | 107,641 | 59.63636 |
| 桌面 guanyun | 67 | 105,645 | 46.85714 |
| 手机 overview | 74 | 113,521 | 8.31818 |

这些是当前画面的绘制复杂度统计，**不是实际手机帧率结论**。

## 实际截图

五张压缩 JPEG 合计约 512 KiB。截图由最终通过的浏览器测试直接从实际页面截取，使用固定种子、固定视口，等待资源与相机稳定；没有静态概念图、mock、空 canvas 或图片替代场景。已逐张人工查看。

| 机位 | 文件 |
| --- | --- |
| 全园入掌 | [desktop-overview.jpg](desktop-overview.jpg) |
| 临水看楼 | [desktop-waterside.jpg](desktop-waterside.jpg) |
| 廊间一瞥 | [desktop-corridor.jpg](desktop-corridor.jpg) |
| 庭中观石 | [desktop-guanyun.jpg](desktop-guanyun.jpg) |
| 竖屏全园 | [mobile-overview.jpg](mobile-overview.jpg) |

![桌面全园入掌](desktop-overview.jpg)

![桌面临水看楼](desktop-waterside.jpg)

![桌面廊间一瞥](desktop-corridor.jpg)

![桌面庭中观石](desktop-guanyun.jpg)

![手机竖屏全园](mobile-overview.jpg)

## 已解决的缺陷与执行限制

实际审图发现的池岸遮水已改为真正环状边圈；月洞被南廊遮住的问题已通过缩短南廊、留出院门视线修正，并增加上述几何回归。手机端的 grid 最小内容宽度导致横向溢出，已显式限制 grid 列及子项宽度；未使用隐藏 overflow 掩盖问题。按需渲染下的即时机位请求与就绪观测延迟已通过提交阶段控制器更新、读取真实相机变换以及可取消的渲染请求处理。

初始默认执行沙箱中，依赖网络访问曾报 `connect EPERM`（安装还显示不完整的依赖解析错误），`npm ci` 的 esbuild 子进程及浏览器 webServer 启动也曾受 `EPERM` 限制。使用本任务环境支持的附加网络权限后，同一安装、开发和浏览器命令成功；没有绕过代理或降低 TLS 校验。开发期间缺少尚未写入的场景模块及上述移动端/就绪问题导致过检查失败；表内数字均为修复后的最终结果，没有把初次失败写为通过。

## 占位、已知限制与下一轮反馈

所有模型来自自制程序化代码，准确性说明见 [资产台账](../../ASSET_SOURCES.md)。建筑细节、池岸、树姿、距离和配峰形体为艺术化估计；冠云峰虽有瘦高、多段、不对称与留孔轮廓，仍为 **M1 占位**，未进行多角度参考匹配。局部机位有意裁去无关区域；手机整体机位的石峰细节较小，需放大或切换观石机位。

构建包含约 **1,049 kB** 的 minified JavaScript（gzip 约 **291 kB**），Vite 提示 chunk 超过 500 kB。构建成功，本轮未屏蔽警告；可在后续性能打磨中分包。安装时另有 Drei 的传递依赖 `three-mesh-bvh@0.7.8` 弃用提示；本场景未使用 BVH 功能，版本树与当前渲染已实际验证。

**未验证**：Safari/iOS、Android 真机、真实 GPU 的帧率、发热、长时间资源趋势和网络加载性能。软件渲染、触摸模拟及自动测试不等于美术最终验收或真机性能达标。未执行发布；没有屋顶抬升、全园导航、第一人称、复杂反射、后台或其他园林。

下一轮仅需围绕构图反馈：中部水面与南侧屋顶的比例、廊间机位的前中后层次、冠云峰与配峰的轮廓和疏密，以及手机上石峰的可读性。源码保留，等待反馈后再决定 M2。

## 运行说明

```bash
cd suzhou-gardens/liuyuan
npm ci
npm run dev
```

默认访问 `http://localhost:5173`。拖动旋转、滚轮缩放；手机单指旋转、双指缩放。四个观景按钮与“回到全园”可键盘操作。构建预览使用 `npm run build` 后 `npm run preview`，默认端口 4173。浏览器测试安装及完整命令见 [README](../../../README.md)。
