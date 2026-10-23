# 苏州园林地图入口 · 实现与检查

2026-10-04，用户要求将入口替换为苏州旅游地图，并让点击入园、退回地图衔接自然。入口已改为苏州古城街巷与水系的自制游览示意图，五园是直接入园的真实链接；园内均有固定“返回地图”。同标签往返保留点位 ID、突出刚游过的园子并恢复对应真实园景预览。没有额外确认、动画计时器、重定向参数或加载锁。

地图与园内沿用暖纸色、灰绿水系和朱色印记；手机点位保持44px以上，邻近园林标签通过引线错开。鼠标悬停或键盘聚焦显示现有真实渲染预览，不下载第三方地图瓦片、字体或照片。入口 HTML/CSS/JS 仍是本目录独立手写静态源码，五园的返回导航由各园自己的源码负责，没有共享应用或合并三维场景。

## 地图资料边界

本图是为了选园制作的概括示意，保留留园在古城西侧、拙政园与狮子林相邻、网师园与沧浪亭位于南侧等相对关系。道路、水系、街区和园界均为原创示意线形；没有导入测绘资料、经纬度数据或第三方底图，也未在本轮在线核对地图来源。页面明确显示“游览示意图 · 点位与街巷经过概括，不用于实地导航”。不声明米制比例、GPS 精度、准确步行距离、真实游线、门票或开放时间。

## 实际检查

- 五园各自 `npm run typecheck`、`npm run test`、`npm run build` 退出码0；共86项单元检查通过，其中25项为固定目的地、子路径与不可信返回参数检查。各园记录包含确切构建输入与输出SHA256。
- `node scripts/check-map.mjs /workspace/sand-table/suzhou-gardens/liuyuan/node_modules/playwright/index.mjs`：13组地图浏览器检查全部通过。Chromium 151.0.7922.173 + SwiftShader，DPR=1、减弱动画。覆盖桌面1440×1000、手机390×844、320窄屏、844×390短横屏与200%文字放大。
- 五园最终打包产物的实际入园、末观景点切换、复位、子路径刷新HTTP200、真实渲染、画布像素检测与显式返回全部通过；浏览器后退/前进、直接 `index.html` 入园、存储被禁、任意返回参数及无JavaScript地图链接通过。
- 脚本异常、请求失败及外部运行时请求均0。键盘可按地图DOM顺序Tab至五园并Enter入园；真实预览图都成功加载。
- Sites根路径的固定返回目的地由每园单元检查与最终源码核对；没有以生产网页抓取替代本地真实构建验收。

本地执行时先在4610端口提供入口 `dist`，再在4192端口提供 `.cloudbase-runtime/upload`。完整命令：

```bash
# 在每座园林目录分别执行
npm ci
npm run typecheck
npm run test
npm run build
# 在 sand-table 仓库根目录
python3 suzhou-gardens/portal/scripts/package-cloudbase.py
# 两个终端分别启动；然后第三个终端运行检查
python3 -m http.server 4610 --bind 127.0.0.1 --directory suzhou-gardens/portal/dist
python3 -m http.server 4192 --bind 127.0.0.1 --directory suzhou-gardens/portal/.cloudbase-runtime/upload
node suzhou-gardens/portal/scripts/check-map.mjs /绝对路径/suzhou-gardens/liuyuan/node_modules/playwright/index.mjs
```

## 发现与修正

初次手机检查发现网师园和沧浪亭点选框重叠，调整标签与引线后消除。试用浏览器原生跨文档动画时，本环境的地图入园会出现 `Transition was skipped` 且阻塞三维初始化；移除该可选效果后，以浏览器普通链接完成往返，真实WebGL初始化及所有回归检查通过。没有屏蔽错误、改用mock或放宽就绪判定。

## 真实截图与交付

- [桌面地图](map-desktop.jpg)
- [手机地图](map-mobile.jpg)
- [返回地图后保留点位](map-mobile-return.jpg)
- 五园各自 `docs/reviews/map-1/mobile-return.jpg`：最终实际园景与返回按钮。

[浏览器检查及包内文件指纹](check-results.json) 保留于本目录；发布结果另存 `deployment-results.json`。沿用六个既有 Site 和所有者私有访问。CloudBase 包为23个文件，解压后入口、`map.js` 和五园目录一起上传原托管根目录。没有自动修改腾讯云在线文件。

## 限制

这是示意选园地图，不是实地导航。未验证 iOS/Safari、Android 真机、国内手机网络、实际 GPU 帧率或发热。保留五园 Vite 大包提示；本轮没有重跑原40项完整场景套件，已针对地图往返验证最终真实构建，历史完整验收和截图保持不变。腾讯云线上上传与域名提示页需要在用户账户与实际网络环境中核对。
