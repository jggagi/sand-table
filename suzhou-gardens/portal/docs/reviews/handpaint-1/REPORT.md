# 淡彩手绘地图 · 实现与检查

2026-10-04，按用户“旅游地图用精美手绘风格”的要求，将已有入口的线形示意底图替换为本地淡彩插画：暖纸色、青绿河道、白墙灰瓦、桥与五园意象。五个园名仍为正常同标签链接，朱色点位和引线连接到插画中的园景。桌面和手机完整显示方形画面，不拉伸、不裁切；园景预览沿用此前五园真实WebGL截图。

本轮实现、资产和证据均在 `suzhou-gardens/portal/` 内；五園应用源码、构建、返回导航及Site身份未修改。地图仍保存当前标签的选园状态，返回或浏览器后退后突出刚游过的园子。生成插画与真实页面截图分别记录，详见 [资产记录](ASSET.md)。页面保留概括示意、不用于实地导航的说明。

## 已执行检查

最终静态页面与CloudBase上传产物在Chromium151.0.7922.173＋SwiftShader、DPR=1、减弱动画下检查：13组全部通过。

- 1440×1000桌面、390×844手机完整加载插画与五园真实预览；图像原尺寸1254×1254，渲染保持1:1比例。
- 320px窄屏、200%文字及844×390短横屏：五个链接均不重叠、不超出视口、点击区域至少44×44px，无水平溢出。初检大字号留园与狮子林标签相交，调整留园标签与引线后消除。
- 键盘Tab依次选择五园、Enter实际入园；无JavaScript时五个原生链接仍可使用。
- 包内五园实际入园、最后观景点、复位、子路径刷新HTTP200、真实WebGL就绪与画布像素检测、显式返回地图及对应预览恢复均通过；五园绘制调用分别74、78、41、74、79，三角形分别162487、101621、98588、108630、137996。
- 浏览器后退/前进、直接 `index.html` 入园、存储被禁和不可信返回参数检查通过。脚本异常、失败请求及外部运行时请求均为0。

确切检查数据与24个包内文件的SHA256见 [check-results.json](check-results.json)。此轮未改五园应用，未重复执行其历史86项单元检查和40项完整场景套件；历史结果仍保留。没有把历史检查说成本轮重新执行。

## 真实页面截图

- [桌面地图](map-desktop.jpg)
- [手机地图](map-mobile.jpg)
- [手机返回地图并保留沧浪亭选择](map-mobile-return.jpg)
- [320px和200%字号](map-large-text.jpg)
- [实际留园与返回按钮](garden-mobile.jpg)

以上是本地最终交付页面的浏览器截图；底图插画本身使用生成工具创作。不是线上页面抓取，也不是生成园景冒充真实渲染。

## 运行与复核

入口没有构建步骤，运行方式见 [README](../../../README.md)。完整同站点往返使用最新CloudBase包：在五園自己的目录准备最终 `dist` 后，从仓库根运行：

```bash
python3 suzhou-gardens/portal/scripts/package-cloudbase.py
# 两个终端分别提供入口与完整分享包
python3 -m http.server 4620 --bind 127.0.0.1 --directory suzhou-gardens/portal/dist
python3 -m http.server 4193 --bind 127.0.0.1 --directory suzhou-gardens/portal/.cloudbase-runtime/upload
# Playwright使用已有园林测试依赖，本入口不初始化应用或安装依赖
MAP_SITE_ORIGIN=http://127.0.0.1:4620 MAP_PACKAGE_ORIGIN=http://127.0.0.1:4193 MAP_REVIEW_DIRECTORY=handpaint-1 node suzhou-gardens/portal/scripts/check-map.mjs /绝对路径/suzhou-gardens/liuyuan/node_modules/playwright/index.mjs
```

既有ChatGPT Site及原访问范围沿用，发布记录见 `deployment-results.json`。CloudBase新版ZIP约2.37MB，需按 [上传说明](../../CLOUDBASE.md)在原环境完整覆盖上传；本任务没有修改腾讯云在线文件。GitHub提交后重打包并核对24个文件内容指纹，ZIP时间戳变化不改变验收内容。

## 检查边界

没有验证iOS/Safari、Android真机、国内移动网络、真实GPU帧率和发热，或实际CloudBase线上上传。地图是艺术化概括，街道、水系与建筑没有测绘精度，不用于真实游览导航。
