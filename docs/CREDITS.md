# 来源与许可（Credits & Licenses）

本仓库是多个独立项目的**原样合体**。每个模块的版权归其原作者所有，融合不改变任何模块的许可状态。使用、复制或再分发某个模块时，请遵守该模块自己的许可条款。

| 模块 | 原作者 / 来源 | 许可 | 本仓库中的位置 |
|---|---|---|---|
| FinSight 金融大屏 | ZHANGFA88 · [finance-dashboard](https://github.com/ZHANGFA88/finance-dashboard) | 本仓库作者自有 | `public/`、`scripts/` |
| 门户 Portal | 本仓库新建 | 随本仓库 | `portal/` |
| Degen Lab | Vazolini · [grokbot-jev-dashboard](https://github.com/Vazolini/grokbot-jev-dashboard) | **原仓库未附许可证（All Rights Reserved）**，本仓库仅作个人学习用途的只读镜像；其运行时数据亦来自原仓库 | `modules/degen/` |
| Prompt Spider UI | Kirito14IT · [prompt-spider-ui](https://github.com/Kirito14IT/prompt-spider-ui) | **MIT License**（全文见 `modules/spider/LICENSE`，版权声明保留在原目录中） | `modules/spider/` |
| 全球指数定投赛跑 | 本仓库作者（灵感来源：抖音创作者 Titanium 的同主题数据可视化作品；页面与数据引擎为自研重建） | 随本仓库 | P1 迁入（数据引擎目前在仓库外维护） |
| AI 安全热点 | wuyoscar / AISafetyHot · [AISafetyHot-Hub](https://github.com/ZHANGFA88/AISafetyHot-Hub) | 文字内容 **CC BY-NC 4.0**（署名—非商业）；本仓库**不镜像其任何内容**，仅在门户提供官网链接 | 门户外链 |

## 数据来源

- FinSight 行情：腾讯行情、雪球、百度股市通等公开接口，以及 Binance / CoinGecko（加密资产）。数据可能延迟或有误，仅供个人学习整理，**不构成投资建议**。
- Degen Lab 状态：其原仓库 `data` 分支的 `state.json`（由原作者的系统维护）。
- 定投赛跑历史数据：各指数公开历史行情（Yahoo Finance 等），引擎计算口径见 PLAN.md 与模块内文档。

## 关于 Degen Lab 的特别说明

原仓库未提供 LICENSE 文件。按版权惯例，未附许可即作者保留全部权利。本仓库收录其页面文件仅为仓库所有者个人学习与自用部署之目的；如需公开再分发、商用或二次发布该模块，请先取得原作者 Vazolini 的书面授权，或从你的副本中移除 `modules/degen/` 目录。
