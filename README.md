# Sand Table

可在浏览器里把玩的交互式微缩景观作品。

## 项目

| 子目录 | 项目 | 当前状态 |
| --- | --- | --- |
| [`suzhou-gardens/`](./suzhou-gardens/) | 苏州园林系列，每座园林使用独立子目录 | 首作留园；其他园林仅有目录占位 |
| [`suzhou-gardens/liuyuan/`](./suzhou-gardens/liuyuan/) | 《掌上留园》 | 设计与 Codex 实施任务书，尚未实现应用 |

首作不做等比例数字重建，而是提炼留园的山水、廊院和奇石关系，制作有实体模型感的 Web 交互作品。

## 开始工作

先阅读 [`suzhou-gardens/AGENTS.md`](./suzhou-gardens/AGENTS.md)，再进入 [`suzhou-gardens/liuyuan/`](./suzhou-gardens/liuyuan/)，阅读该目录的 `AGENTS.md` 和 `CODEX_TASK.md`。

每座园林的应用代码、依赖、构建配置、资产、测试和任务文档均放在自己的目录内。当前留园工作目录为 `suzhou-gardens/liuyuan/`；仓库根目录及 `suzhou-gardens/` 只保留索引和共同约束，暂不建立跨项目框架。

当前提交仅包含文档，不包含可运行应用、已制作的三维资产、测试结果或部署产物。运行方法由第一轮实现补充。
