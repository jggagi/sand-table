# 园林背景音乐 · 实现与检查

2026-10-04，按用户要求为本园配原创器乐《荷风入水》：笛韵意象 · 水面舒展。以本园专属旋律、速度、音域和合成音色表现气质，长约73.846秒。原始音符和音色全部由 `scripts/render-music.py` 制作，没有使用第三方名曲、采样、录音、在线播放器或音乐服务，不声称真实琴笛演奏或园林历史配乐。音轨记录见 [audio-asset.json](audio-asset.json)，已提交MP3无需制作工具即可运行。

页面增加“园中听音”、曲名、开启/暂停/继续按钮和音量滑杆。初次进入不自动播放，`preload=none` 按需加载本地音轨；音量默认30%，只保存本园音量。Web Audio增益调节与原生媒体后备均可用，避免提前调低音量后重复叠加两层增益。音乐可循环，切换观景与复位不会中断；后台和离开页面暂停，返回后主动继续。播放被拒或资源加载失败时有重试反馈，快速开关以最后一次操作为准。

本园音乐资产、控制、制作脚本、检查和截图均在本园目录内，不导入其他园运行时代码，不创建上层应用、共享引擎或新依赖。场景与相机未修改，沿用已存在的Site及访问范围。

## 已执行验证

- 在已打开的Site源码目录运行 `npm run typecheck`、`npm run test`、`npm run build`，退出码均0；本园15项既有单元检查通过。最终小修后重新构建，输入和最终输出指纹见 [build-results.json](build-results.json)。Vite原有大包提示保留。
- 最终交付构建的10组浏览器检查通过：默认安静/零MP3预请求；键盘开启；真实MP3解码、时间前进和Web Audio分析器非零信号；真实WebGL画布、观景切换和复位；暂停/继续与实际跨曲尾循环；音量到零与恢复；可见性暂停保护；390/320手机、桌面和200%文字；刷新与地图往返；主动诱发的失败后重试、快速开关、存储被禁和无Web Audio后备。
- 脚本错误与外部请求均0。每次故障测试明确拦截一次MP3请求，预期失败单独记录；正常流程没有请求失败。没有用假音频元素、虚拟播放进度或空场景替代真实播放与渲染。
- 无头Chromium的两个标签都保持可见，原生后台标签探测无法验证隐藏；没有将其写成通过。改用明确受控的 `document.hidden` 输入触发可见性事件，实际音频暂停，恢复可见后不会自动播放。该项是保护逻辑验证，不是手机后台实测。

完整记录见 [check-results.json](check-results.json)。Chromium151.0.7922.173、SwiftShader、DPR=1、减弱动画。真实页面截图：[手机音乐](mobile-music.jpg)、[320px/200%文字](mobile-text-200.jpg)、[桌面音乐](desktop-music.jpg)。

## 本地运行与复核

普通开发仍使用本园README中的 `npm ci`、`npm run dev`；先点击“开启音乐”，可使用系统音量和页面音量调节。音乐属于艺术配乐，非原园录音。

完整五园地图往返检查先在五园各自准备最终 `dist`，然后在仓库根生成和提供CloudBase包：

```bash
python3 suzhou-gardens/portal/scripts/package-cloudbase.py
python3 -m http.server 4194 --bind 127.0.0.1 --directory suzhou-gardens/portal/.cloudbase-runtime/upload
# 在本园目录执行，需要已安装的Playwright及系统Chromium
node scripts/check-music.mjs
```

可通过 `MUSIC_TEST_ORIGIN` 更改同站点包测试地址。可选音轨重制命令 `python3 scripts/render-music.py` 需要Python3、NumPy、SciPy和ffmpeg；不影响普通应用安装和运行。此轮没有重跑此前全部场景端到端套件，已针对音乐与地图往返验收最终真实构建。

## 交付与限制

本园发布结果单独记录在 `deployment-results.json`。最新CloudBase包在入口目录生成，共29文件、约5.79MB，五段音轨仅在用户开启时下载；腾讯云在线文件需在原环境覆盖上传。

未验证真实扬声器听感、iOS/Safari、Android真机、锁屏/系统音频打断、国内移动网络与实际手机帧率。Web Audio音量控制及原生媒体后备已在Chromium检查，Safari仍需真机核对。不能将数字音频信号检查写成真实设备试听或后台实测。
