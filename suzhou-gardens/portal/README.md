# 掌上园林 · 苏州五园

[打开统一入口](https://suzhou-gardens.jggagi.chatgpt.site)

面向国内朋友的CloudBase分享包及控制台上传步骤见[CloudBase说明](docs/CLOUDBASE.md)。原Sites入口继续保持现有链接及私有访问。

五张真实园景缩略图，分别通往留园、网师园、拙政园、狮子林与沧浪亭的独立 ChatGPT Site。整张卡片均可点击；键盘 Tab 选择、Enter 入园，浏览器返回即可回到入口。

本目录是用户于2026-10-04明确要求的独立入口。手写静态HTML/CSS及本地图片全部位于 `dist/` 并纳入Git；无构建步骤、包安装、共享三维引擎、后端或外部字体。五园仍按各自目录独立运行。入口及各园沿用所有者私有访问。

## 本地运行

在仓库根执行：

```bash
cd suzhou-gardens/portal
python3 -m http.server 4180 --bind 127.0.0.1 --directory dist
```

打开 `http://127.0.0.1:4180/`。卡片会进入现有线上园林，需要对应Sites访问权限。本地入口无需WebGL；各园运行要求见其README。

## 检查与截图

2026-10-04，Chromium151检查五个链接、图片加载、桌面布局、390/320宽手机布局、键盘与200%放大：全部通过。记录、真实截图与检查边界见[检查报告](docs/reviews/REPORT.md)。

园景图片来自五园当前生产构建的全园视角真实WebGL画布，未使用生成图。入口修改后需要重新检查；园景改变后应重新截图、更新此入口资产并发布。

## 发布

`.openai/hosting.json` 保存本入口独立Site身份及 `static.directory: dist`。从该确切源码提交推送到Sites源仓库，打包 `.openai/hosting.json` 与 `dist/`，再保存版本并私有发布。源凭据与缓存不得提交；不要为同一目录再次创建Site。
