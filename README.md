# Fusion Dashboard（方向 B · 原风格融合）

五个项目合到一个仓库、一台机器上跑，**每个项目保持自己的原页面与原风格**，模块内部不做改动。计划全文见 [PLAN.md](PLAN.md)。

## 模块

| 入口 | 模块 | 来源 | 说明 |
|---|---|---|---|
| `/` | 门户 | 本仓新做 | 只负责导航与状态 |
| `/finance` | 股票大屏 FinSight | ZHANGFA88/finance-dashboard | `public/finance.html` + `/api/finance/*`，原样 |
| (外链) | 定投赛跑 | space-3 现行版 | P1 按 FRAME_SPEC_V3 原规格迁入 `/race` |
| `/modules/degen/` | Degen Lab | Vazolini/grokbot-jev-dashboard | 原样拷贝，数据继续读其原仓 `data` 分支 state.json |
| `:4317` | 机械蜘蛛 | Kirito14IT/prompt-spider-ui（MIT） | 在 `modules/spider/` 用它自己的 server.mjs 独立运行 |
| (外链) | AI 安全热点 | ZHANGFA88/AISafetyHot-Hub | 先直链 aisafetyhot.com，数据镜像 P1 再议 |

## 启动

```bash
# 主干（门户 + FinSight + Degen 静态挂载），默认 127.0.0.1:8770
python3 scripts/serve.py
# 局域网可访问：FINANCE_HOST=0.0.0.0 python3 scripts/serve.py

# 蜘蛛（另一个终端）
cd modules/spider && node server.mjs   # http://127.0.0.1:4317
```

## 约定

- 改动只发生在主干路由层（`scripts/serve.py` 中标有「Fusion 主干改动」的几行）与门户页；任何模块目录内的文件保持原样，升级模块时整目录替换即可。
- 本仓只自用：grokbot 无开源许可，不公开分发；spider 保留其 MIT 声明；AISafetyHot 文字为 CC BY-NC 4.0。
- `data/`（SQLite）与 `mockup/`（已作废的统一风格效果图留档）不入库。
