# 地图 ↔ 狮子林 · 无缝游园样板

2026-10-23 UTC。用户批准先完成地图与狮子林的一体化入园样板。实现仅在portal与shizilin目录；其他四园沿用既有链接、源码和构建。沿用用户此前允许当前代理直接实施的授权，未声称使用不可选择的luna_worker，未改变仓库工作流配置。

## 实际行为

普通点击地图上的狮子林，地图向点位轻推，显示入园准备画面；收到实际三维就绪信号后，淡入园景。第一次需要下载和准备资源，不宣称零等待。加载时可随时返回地图，失败时可重试或单独打开。

地图一直保留在页面内。返回地图后恢复滚动、焦点、预览和选园标记；再次入园复用本次已展开的狮子林，保留自由观察方向、缩放、时辰、音量和三维画布。音乐返回时暂停，再入园不自动播放。支持Escape、浏览器后退/前进、直接园景hash、减少动态效果，以及加载中取消和快速重复选择。

状态保留限于本次页面访问。刷新或另开页面重新初始化为默认机位/晨光；音乐加载提示或窗口/字号改变可用画布尺寸时，沿用本园已有的适配缩放规则。其他四园尚未无缝接入，不加载它们的三维资源。

## 架构与范围

入口保持手写静态页面，无入口npm应用、上层workspace或共享三维引擎。狮子林独立构建原样复制到portal/dist/shizilin/，在同源iframe里按需启动一次；父层只控制入退、可访问性和活动状态，不导入园景源码。六个产物及32个生产输入指纹见 [garden-build.json](garden-build.json)，完整入口17文件指纹见 [static-files.json](static-files.json)。

父子消息同时验证origin、source、固定channel和garden，不接受访问者提供的返回URL。握手前不拦截子页面原生返回。隐藏使用visibility/inert保持非零布局；显式停止水计时和暂停媒体，不关闭音频图、不销毁RT。正常再次入园不创建新上下文或重载GLB/PNG。

原生五个锚点保留，修饰键和无脚本情形继续正常导航。独立狮子林Site继续可用。CloudBase复用同一/shizilin/构建；打包器核对副本一致性，过期即拒绝，不再复制第二份。

## 实际检查

| 范围 | 结果 |
| --- | --- |
| 狮子林TypeScript、单元、生产构建 | 通过；27项单元，最终32输入/6输出指纹一致 |
| 无缝实际浏览器集成 | [13组通过](browser-results.json) |
| 独立页面兼容 | [3组通过](../../../../shizilin/docs/reviews/seam-1/standalone-results.json) |
| 完整CloudBase上传产物 | [2组通过](package-browser-results.json)，34文件、7,762,464字节 |

集成检查覆盖实际非空WebGL和原四机位、冷加载/真实就绪、三次往返的自由方向/缩放/夜景/音量保留、GPU对象不增长、原生历史前进后退、延迟后退后快速重入、真实CDP单指、视口滚动/焦点恢复、减少动态效果、320px/200%字号/44px控件、加载中取消、GLB实际失败重试、音乐实际延迟加载时返图防止晚播放、直接园景hash/刷新，以及无JavaScript回退。伪造来源窗口的就绪和活动消息被拒绝。

实际往返探针：GPU buffer保持199、framebuffer保持3，水面/场景/Canvas身份保持相同，文档不重载，音频图关闭次数为0。初始上下文创建计数2包含已释放的WebGL能力探测上下文与一个真实场景上下文；不能把它说成初始化只调用一次getContext。手机隐藏后水计时停止，收敛后的主帧计数63→63、动画tick252→252；不以CSS不可见代替暂停。

正常集成与完整包流程脚本错误、失败请求、外部请求为0。主动阻断GLB产生的3条错误与1条失败请求标记fault；它们验证失败出口，不计入正常成功流程。独立页验证默认水面、夜景、实际音乐和原生返图；其余四园仅核对文件内容、链接和入口文档HTTP200，本轮未重跑四园WebGL。

初次执行有两帧仍在收尾，等待主帧真正稳定后验证持续静止。第二次遇到严格缩放断言：音乐加载行把画布522临时降至494px，zoom37.3002→35.3002，ready=false；恢复后高度/zoom正常、position/target始终相同。见 [实际探针](layout-probe.json) 与 [初次检查记录](initial-checks.json)。测试等待音乐提示消失、实际ready及连续稳定采样后，保留原严格姿态/缩放断言，完整13组通过。未改生产相机、删断言、扩大预算或skip。历史八项E2E未在本轮重跑。

## 真实截图

Chromium151/SwiftShader，DPR1；桌面1440×1000、手机390×844。所有园景截图为实际WebGL页面，无生成图、补绘或后期处理。加载幕里的圆形预览来自既有真实园景JPG，是明确的等待画面，不能当作已经加载成功的三维画面。

| 状态 | 实际截图 |
| --- | --- |
| 入园等待 | [桌面](desktop-entering.jpg) |
| 夜景全园 | [桌面](desktop-overview-night.jpg) |
| 洞壑寻径 | [桌面](desktop-rockery-night.jpg) |
| 池亭相望 | [桌面](desktop-waterside-night.jpg) |
| 廊转见石 | [桌面](desktop-corridor-night.jpg) |
| 返回地图 | [桌面](desktop-returned-map.jpg) / [手机](mobile-returned-map.jpg) |
| 手机月夜 | [手机](mobile-garden-night.jpg) |
| 加载失败出口 | [实际阻断GLB](desktop-load-error.jpg) |
| 完整分享包 | [实际包内园景](package-garden.jpg) |

最终交付园景实图另用capture-journey.mjs等待诊断与HTML ready、画布尺寸和姿态稳定后重拍；机位和状态见capture-results.json。它们覆盖测试中短暂显示“正在布置”的取帧，不修改生产代码或伪造画面。

## 运行、更新与复现

在仓库根：

```bash
cd suzhou-gardens/portal
python3 -m http.server 4216 --bind 127.0.0.1 --directory dist
```

打开http://127.0.0.1:4216/，点狮子林即可完整体验。入口无需npm安装；其他四园在Sites版本仍为线上链接，需要其原访问权限。修改园景时在shizilin目录独立npm ci、npm run build，再回到仓库根：

```bash
python3 suzhou-gardens/portal/scripts/stage-shizilin.py --dist suzhou-gardens/shizilin/dist
python3 suzhou-gardens/portal/scripts/package-cloudbase.py
python3 -m http.server 4226 --bind 127.0.0.1 --directory suzhou-gardens/portal/.cloudbase-runtime/upload
```

在portal目录运行集成检查（借用已安装的Playwright，无入口依赖）：

```bash
node scripts/check-journey.mjs /绝对路径/已安装的/playwright/index.mjs
JOURNEY_ORIGIN=http://127.0.0.1:4226 node scripts/check-package-journey.mjs /绝对路径/已安装的/playwright/index.mjs
```

脚本使用本环境/usr/bin/chromium。独立页检查在shizilin执行 `JOURNEY_ORIGIN=http://127.0.0.1:4216 node scripts/check-standalone.mjs`。Git最终提交后重生成ZIP并核对34个文件与已验收指纹一致。上传说明见 [CLOUDBASE.md](../../CLOUDBASE.md)。

## 边界与发布

实际QA限于本地Chromium/SwiftShader和触摸模拟；无Safari、真机GPU帧率/温度或国内网络证据。对原线上入口进行无凭据HEAD检查时，网络隧道返回403，见 [检查记录](hosting-header-check.json)，因此未验证线上响应头中的平台iframe策略；本地同源嵌入已实测，原生成功回执用于验证部署，握手超时保留独立打开出口。保留Vite大包提示。

沿用原地图与狮子林Site及原访问范围，不新增Site或分享权限。发布回执另存deployment-results.json。腾讯云上传包已生成，本轮没有代为上传或把本地检查当作腾讯云已更新。
