# 拙政园 · 地图往返检查

2026-10-04。用户新增授权为“旅游地图入口、点击入园、自然返回”。本园保留原有微缩场景与相机，仅在页头增加44px以上的“返回地图”，并适配手机页头与放大文字。

独立 Site 根路径回到既有 `suzhou-gardens` Site 并带固定 `#garden=zhuozhengyuan`；同站点打包的 `/zhuozhengyuan/` 和 `/zhuozhengyuan/index.html` 回到同源根地图。目的地不依赖 referrer，不采纳任意返回地址参数，不导入兄弟园运行时代码。

实际执行：

- 在本园源码执行 `npm run typecheck`、`npm run test`、`npm run build`，退出码均0；单元检查15项通过，包含5项固定目的地与不可信返回地址检查。
- 入口中执行 `node scripts/check-map.mjs /workspace/sand-table/suzhou-gardens/liuyuan/node_modules/playwright/index.mjs`，对最终同站点打包产物实际入园、切末观景点、复位、刷新和返回；对应本园全部通过。
- Chromium 151.0.7922.173、SwiftShader、DPR=1、390×844、减弱动画：真实渲染78次绘制调用、101621个三角面；画布像素方差2475，有真实非空几何。返回按钮与版面在200%文字放大下没有水平溢出。

[真实手机视口截图](mobile-return.jpg) 与 [检查记录及构建指纹](check-results.json) 保存于本目录。截图来自最终生产构建，未使用生成图、mock 场景或空画布。

保留 Vite 的大包提示。本轮执行地图往返相关浏览器检查，未重跑原里程碑完整八项浏览器套件；历史完整验收仍保留在 `polish-1`。模拟手机视口不代表 iOS、Android 真机、Safari、国内网络或 GPU 帧率/发热验收。
