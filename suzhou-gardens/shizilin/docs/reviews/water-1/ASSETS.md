# 本轮资产来源与制作

全部由本项目已有狮子林资产继续制作，无下载模型、纹理、在线素材或外部运行时请求。实际使用 Blender 4.3.2、Three.js；本轮没有使用 Krita 或图像生成工具。软件许可证不被当作整个仓库的许可证。

输入为上一版本园原创 craft-stone.glb，711,660 字节，SHA256 `cc92ba3697c36a730080f77f912e657cd24fbd0ce4ad295ce6194ea6ece31b70`。输出 GLB 1,174,760 字节、29,620 个石体三角面；独立 stone-normal.png 为 1024²、535,476 字节。输出完整哈希与实际制作步骤见 [stone-assets.json](stone-assets.json)。UV 分割增加顶点，不增加石体三角面。

脚本 `scripts/refine-water-stone.py` 加浅定向褶皱、Smart UV 展开、24 射线顶点遮蔽，并实际以 Cycles CPU 烘焙切线法线（1024²，边距 8px，8 samples）。GLB 不隐式引用 PNG；应用按挂载实例克隆本地法线纹理，卸载不销毁加载器缓存。制作可因 Blender 版本产生不同二进制字节。

在本园目录、保留 GitHub 仓库历史的 checkout 中复现：

```bash
mkdir -p .sites-runtime
git show e87563043beb147d989f8bf4e415558683b45f9a:suzhou-gardens/shizilin/public/assets/craft-stone.glb > .sites-runtime/water-input.glb
blender --background --factory-startup --python scripts/refine-water-stone.py
npm run build
```

输入脚本校验原始 SHA256，不能将已经加工的新版 GLB 再作为输入。Sites 独立源仓库对应原始版本为 `68df050576971beb34e91d7196bdfd2cc666520b:public/assets/craft-stone.glb`；它与上方输入字节相同。

池岸距离纹理由本园原有池形计算，波纹和倒影为自己编写的 Three.js 着色与渲染逻辑，不使用在线水材质。柱脚、椽木、瓦垄与驳岸接缝均在既有几何批次内程序化生成。所有 before/after JPG 和入口狮子林预览来自实际 Chromium WebGL 截图，不是制作贴图或生成画面。
