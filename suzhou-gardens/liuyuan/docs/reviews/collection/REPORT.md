# 留园 · 五园交付复验

日期：2026-10-04。本轮保留已授权的 M2 文人画意场景与相机，补齐 GitHub 源码交付，并把原 M1 任务文件标为历史验收依据。未扩展 M3/M4。

Node 24.19.0 / npm 11.9.0 / Chromium 151.0.7922.173；ANGLE Vulkan SwiftShader 软件 WebGL。

| 实际命令 | 结果 |
|---|---|
| `npm run typecheck` | 退出0 |
| `npm test` | 15/15，无skip |
| `npm run build` | 退出0 |
| `npm run test:e2e` | 完整7/7，无skip，约3.3分钟 |

本轮完整浏览器检查覆盖真实非空画面、四观景机位与复位、连续请求、手动中断、缩放限制、横竖屏、减少动态效果与键盘、触摸模拟及 WebGL 失败反馈。最终重新输出并逐张检查 [M2 五张真实截图](../m2/REPORT.md)，桌面1440×1000、手机390×844、DPR1、JPEG质量84；正常渲染阶段脚本异常0，远程运行时请求0。原M1截图保留。

源码、文档和截图均在本园目录内，独立依赖与配置；默认私有的 [ChatGPT Site](https://liuyuan-miniature-m1.jggagi.chatgpt.site) 沿用原身份。Sites源码与部署静态产物使用同一推送commit，回执和凭据不提交。

运行：在本园执行 `npm ci`、`npm run dev`；生产预览执行 `npm run build` 后 `npm run preview`。详细说明见 [README](../../../README.md)。

保留艺术化准确性边界、Vite大包警告，以及未验证Safari/iOS/Android真机和真实GPU性能的限制；原M2美术过程与历史检查见 [M2报告](../m2/REPORT.md)。
