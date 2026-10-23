# 入口 · 狮子林时辰联动

2026-10-23 UTC。dist/assets/shizilin.jpg替换为当前最终狮子林默认晨光的实际全园画布，52,446字节；来源、viewport和SHA256见preview-results.json。仅此一张产品资产更新，原手绘地图、点位、链接及另外四张预览保持不变。狮子林入园后在上方选择晨、午、暮、夜。

最终本地分享包上4组实际浏览器检查通过：五链接/键盘/真实图片、桌面地图、390px/44px目标、320px/200%字号无溢出重叠。正常脚本错误、失败请求、外部请求均0，见[browser-results.json](browser-results.json)。[桌面实图](desktop.jpg) · [手机实图](mobile.jpg)。狮子林实际地图往返和时辰画面见本园time-1报告；本轮没有重新实施其他四园。

完整ZIP共32个文件、约7.76MB。包内指纹与最终验收产物一致，见[package-results.json](package-results.json)，Git提交后重生成并再次比对全部文件。没有代为上传腾讯云。

运行仍在本目录执行 `python3 -m http.server 4180 --bind 127.0.0.1 --directory dist`。完整分享包生成、预览与上传见[CloudBase说明](../../CLOUDBASE.md)。本轮检查命令（先将完整包作为4206站点根目录）：

```bash
CRAFT_ORIGIN=http://127.0.0.1:4206 node scripts/check-time.mjs /绝对路径/已安装的/playwright/index.mjs
```

入口无npm应用、新依赖或外部请求；脚本借用现有园林安装的Playwright。仅本地Chromium151证据，无真机/Safari/国内网络或实际腾讯云上传验证。Sites回执在deployment-results.json，沿用既有身份与访问范围。
