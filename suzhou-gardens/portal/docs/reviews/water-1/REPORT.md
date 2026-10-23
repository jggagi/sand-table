# 入口 · 狮子林水面样板联动

2026-10-23 UTC。只将 dist/assets/shizilin.jpg 更新为狮子林最终生产构建的真实全园画布（1440×1000、DPR1、减少动态效果），SHA256 `f5b310c66e2a9a89f1379c2ef77bc715ac6b2bf6df54a3cd3a217e99c63f3003`，61,300 字节。其他四张预览、手绘底图、点位、脚本和样式没有本轮产品改动。生成插画与真实预览继续分开记录。

最终本地上传产物上的四组浏览器检查通过：五个原有链接/键盘/图片、桌面地图、390px/44px点位、320px/200%字号无溢出重叠。正常脚本错误、失败请求、外部请求均为0，见 [browser-results.json](browser-results.json)。[桌面实际截图](desktop.jpg) / [手机实际截图](mobile.jpg)。狮子林实际入园与返回恢复选园见该园 water-1/browser-results.json；本轮没有重做或宣称复验另外四园。

完整上传包为 32 文件、7,764,632 字节；包含最终狮子林新GLB/法线/脚本及原有另四园、五首音乐和地图。逐文件哈希见 [package-results.json](package-results.json)。包内文件与已通过专项检查的产物一致；最终 Git 提交后再生成并验证全部32文件指纹。未代为上传腾讯云。

运行入口仍在本目录执行 `python3 -m http.server 4180 --bind 127.0.0.1 --directory dist`。完整同站点预览见 [CloudBase说明](../../CLOUDBASE.md)。本轮检查使用4196端口：

```bash
CRAFT_ORIGIN=http://127.0.0.1:4196 node scripts/check-water.mjs /绝对路径/已安装的/playwright/index.mjs
```

入口没有 npm 应用或新增依赖，脚本只借用已有园林安装的 Playwright。检查限于本地 Chromium151；没有真机、Safari、国内网络或腾讯云实际部署证据。Sites 发布后回执另存 deployment-results.json，保留原身份和访问范围。
