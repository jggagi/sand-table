# 苏州园林微缩景观

五座可在浏览器里旋转、缩放与观景的艺术化微缩园林。每园一个独立应用、独立依赖和独立 ChatGPT Site；尺寸、朝向与细节均为艺术化压缩，非测绘复原。

[打开五园统一入口](https://suzhou-gardens.jggagi.chatgpt.site) · [入口源码与运行说明](portal/) · [入口真图与检查](portal/docs/reviews/polish-1/REPORT.md)

入口为独立静态导航，仅链接五园Site；桌面五园同屏，手机纵向选园，支持键盘。2026-10-04入口图片、导航、响应式与放大八组检查通过。

用户于2026-10-04明确启动全部五园。留园保留已获授权的M2，其余四园按自己的规格完成M1。

| 园林与源码 | 独立构图 | 状态 | 单元/E2E | ChatGPT Site | 真图与检查 |
|---|---|---|---|---|---|
| [留园](liuyuan/) | 文人画意 · 冠云庭院 | M2已实现 | 17/17 · 8/8 | [打开](https://liuyuan-miniature-m1.jggagi.chatgpt.site) | [报告](liuyuan/docs/reviews/polish-1/REPORT.md) |
| [网师园](wangshiyuan/) | 小园大境 · 池亭叠院 | M1已实现 | 10/10 · 8/8 | [打开](https://wangshiyuan-miniature.jggagi.chatgpt.site) | [报告](wangshiyuan/docs/reviews/polish-1/REPORT.md) |
| [拙政园](zhuozhengyuan/) | 疏朗水乡 · 广池树岛 | M1已实现 | 10/10 · 8/8 | [打开](https://zhuozhengyuan-miniature.jggagi.chatgpt.site) | [报告](zhuozhengyuan/docs/reviews/polish-1/REPORT.md) |
| [狮子林](shizilin/) | 石境回转 · 连续洞壑 | M1已实现 | 11/11 · 8/8 | [打开](https://shizilin-miniature.jggagi.chatgpt.site) | [报告](shizilin/docs/reviews/polish-1/REPORT.md) |
| [沧浪亭](canglangting/) | 水外山林 · 外河复廊 | M1已实现 | 13/13 · 8/8 | [打开](https://canglangting-miniature.jggagi.chatgpt.site) | [报告](canglangting/docs/reviews/polish-1/REPORT.md) |

首次交付完成五园类型检查、生产构建、**51项单元检查与35项完整浏览器验收**。截图来自Chromium151＋SwiftShader，桌面1440×1000与手机390×844、DPR1；首次交付25张真图逐张检查，留园原M1对照图另保留。每园报告记录运行环境、检查范围与已知限制。最终构建产物另逐园运行生产预览：五园均返回HTTP200，观景切换与复位成功，页面脚本异常0；标签页图标与描述匹配本园身份。软件WebGL与触摸模拟不能替代真机性能验证。

## 五园画面与手机打磨

本轮完成更清晰的光色层次、朱印与墨色界面、手机近景构图和可读触控操作；预设转场中 resize 会恢复新尺寸的适配缩放，自由观察保留手动方向。五园最终类型检查与构建通过，**61 项单元检查、40 项完整浏览器验收全部通过，无 skip**。网师园全景另以真实几何包络的八角投影确认完整模型仍可见。

粗指针设备绘图 DPR 上限为 1.5，桌面为 2；仍按需渲染。短横屏可滚动，320px 窄屏及根字体 200% 保持操作可用。最终构建的真实截图与检查数据独立保存在各园 `docs/reviews/polish-1/`，历史报告与截图保留。本轮共保存五园 45 张直接浏览器截图，入口再保存桌面/手机两张真图；最终产物的 20 个手机观景点、窄屏、短横屏与文字放大均通过，页面脚本异常和外部运行时请求均为 0。统一入口八组检查与新版 CloudBase 包的五园同站点遍历通过。Chromium/SwiftShader 和触摸模拟不代表 iOS/Safari、Android 真机、国内网络速度、实际 GPU 帧率或发热结果。

## 运行

要求Node22.12+、npm10+及WebGL2。进入任意园林自己的目录，例如：

```bash
cd suzhou-gardens/wangshiyuan
npm ci
npm run dev -- --port 5175 --strictPort
```

鼠标拖动旋转、滚轮缩放；手机单指旋转、双指缩放；四个观景点与“回到全园”可键盘操作。类型、单元、构建、预览和浏览器命令见各园README。软件GPU环境逐园运行E2E，各园独占自己测试端口。

## 目录与来源

先读 [共同约束](AGENTS.md)，再读当前园的AGENTS、CODEX_TASK和docs规格。五园源码、依赖、资产、截图、任务和测试均归本园；用户授权的统一入口及其真图、检查与配置独立归 `portal/`；仓库根与本层只有索引和共同约束，没有上层应用、npm workspace、统一注册表或跨园运行时依赖。

五园几何由本项目程序化制作，未导入远程照片、模型、纹理或字体；史料和建筑形制的核对状态按各园REFERENCES记录。没有后端、导航、第一人称或屋顶抬升。保留Vite大包提示与真机性能限制。Sites沿用用户选择的所有者私有访问；project_id记录在各园.openai/hosting.json，凭据与发布缓存不提交。
