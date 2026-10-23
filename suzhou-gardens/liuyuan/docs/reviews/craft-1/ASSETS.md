# 留园 · 本轮资产来源

本轮无第三方下载模型、图片、字体或纹理；没有使用生成图片替代园景截图。程序化几何/材质沿用本园原创源码，全部留在本目录。既有音乐与授权记录沿用 music-1；本轮没有更换音轨。

Blender 对三座自制石峰进行焊接、平滑、浅褶皱、减面与顶点遮蔽烘焙，保留真实孔洞。补入檐下短椽与轻微圆角木柱，树冠稍收，露出廊院。

`surfaceFinish.ts` 的细纹由确定性世界坐标函数产生；木柱使用现有 Three.js RoundedBoxGeometry，窗格/荷花等由本园几何构建。没有引入跨园运行时或制作依赖。

## Blender 石体

源数据来自本园既有程序化石体，使用 Blender 4.3.2 制作，非网络模型或实物扫描。处理：焊接、两轮平滑、浅定向褶皱、0.78 减面、16 射线顶点环境遮蔽、Y-up GLB 导出。最终二进制 `public/assets/craft-stone.glb`：704852 字节，SHA256 `f01409d426be81f3d4c1571d0546ebc1624cf53825a94a963718d2a945c32b4a`；对象清单与面数见 [制作记录](stone-asset.json)。没有图片、外部 URI 或 Draco 解码依赖。导出器报告可选 Draco 库缺失，实际普通 GLB 导出、Three.js 解析、孔洞射线与浏览器加载均通过。

运行应用不需要 Blender。可选复作（需要系统 Blender 与本园已安装依赖）：

```bash
node scripts/export-stone-input.mjs
blender --background --python scripts/refine-stone-blender.py
```

输入/缓存位于忽略的 `.sites-runtime/`。真实 GLB 单元检查覆盖贯穿孔洞、邻近实体、坐标范围、预算、两次挂载的资源隔离与幂等回收。浏览器故障检查覆盖真实 GLB 请求失败和重试。生成资产未改变地标对象 ID 与相机布局。
