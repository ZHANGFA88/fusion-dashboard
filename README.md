# Fusion Dashboard · 五方融合自用大屏

把五个各自独立的项目**原样合体**到一个仓库、一个门户之下运行的个人大屏：

- 金融行情（FinSight）
- Solana meme 币纸面交易实验室（Degen Lab）
- 机械蜘蛛提示词可视化（Prompt Spider UI）
- 全球指数定投赛跑（已迁入，静态版）
- AI 安全热点（本地阅读页，数据读 Hub 仓）

核心理念是 **方向 B：只合体、不改风格**。不做统一视觉改版，不给任何模块注入全局样式或脚本；每个模块保持它原本的页面、配色与交互，从门户进入、浏览器后退返回。跨模块的数据打通只发生在后台，不动任何模块的脸。

> 部署与使用请看 **[详细教程 docs/TUTORIAL.md](docs/TUTORIAL.md)**（从零安装到常开部署、故障排查全都有）。各模块的来源与许可见 **[docs/CREDITS.md](docs/CREDITS.md)**。融合的完整设计与取舍见 **[PLAN.md](PLAN.md)**。

---

## 模块一览

| 模块 | 入口 | 来源 | 服务方式 | 说明 |
|---|---|---|---|---|
| 门户 Portal | `/` | 本仓库新建 | 主干 serve.py 托管 | 五张模块卡 + 在线状态探针，只做导航 |
| FinSight 金融大屏 | `/finance` | [ZHANGFA88/finance-dashboard](https://github.com/ZHANGFA88/finance-dashboard) | 主干 serve.py（同进程接口） | 全球指数、自选股、K 线、板块、资讯、筹码分布等 15 个实时接口 |
| Degen Lab | `/modules/degen/index.html` | [Vazolini/grokbot-jev-dashboard](https://github.com/Vazolini/grokbot-jev-dashboard) | 静态托管（只读镜像） | 葡语界面、8 个交易机器人纸面交易；数据每 20 秒从其原仓库 `data` 分支的 state.json 拉取，本仓库不写它的任何状态 |
| Prompt Spider | 独立服务 `:4317` | [Kirito14IT/prompt-spider-ui](https://github.com/Kirito14IT/prompt-spider-ui)（MIT） | 自有 `server.mjs`（Node ≥ 20）独立进程 | 机械蜘蛛逐词抓取提示词并按 code / model / you 分流；因其前端使用绝对路径资源，必须以根路径独立服务，不能塞进子路径 |
| 全球指数定投赛跑 | `/modules/race/index.html` | 本人此前作品（按 FRAME_SPEC_V3 重建） | 静态托管，`fetch` 引擎 JSON | 六大指数 2008–2026 定投回测动画（约 117 秒），终值口径与原版一致；刷新工具在 `modules/race/tools/` |
| AI 安全热点 | `/modules/safety/index.html` | [AISafetyHot-Hub](https://github.com/ZHANGFA88/AISafetyHot-Hub) | 静态阅读页，浏览器端实时读 Hub 仓 | AI 安全日报全文 + 每日 30 篇精选论文卡，照官网观测台风格；内容 CC BY-NC 4.0，本仓库不存储其内容（官网：[aisafetyhot.com](https://aisafetyhot.com)） |

## 架构

```
浏览器
  │
  ├─ http://<主机>:8770/                 门户（本仓库 portal/）
  ├─ http://<主机>:8770/finance         FinSight 大屏 ── /api/finance/*（同进程，scripts/serve.py）
  ├─ http://<主机>:8770/modules/degen/  Degen Lab ── 数据读上游仓库 state.json（只读）
  ├─ http://<主机>:8770/modules/race/   定投赛跑 ── 静态页 + 引擎 JSON（modules/race/data/）
  ├─ http://<主机>:8770/modules/safety/ 安全热点阅读页 ── 浏览器端读 Hub 仓日报/精选 JSON
  └─ http://<主机>:4317/                Prompt Spider（独立 Node 服务，modules/spider/server.mjs）
```

主干就是 FinSight 原有的零依赖 Python 服务 `scripts/serve.py`，融合只在其路由层加了 3 行（`/` 指向门户、新增 `/finance` 指向原金融页），业务代码与接口一字未动。

## 快速开始

前置：**Python 3.10+**、**Node.js 20+**（仅蜘蛛模块需要）、一台能联网的机器。详细分步见[教程](docs/TUTORIAL.md)。

```bash
git clone https://github.com/ZHANGFA88/fusion-dashboard.git
cd fusion-dashboard

# 终端 1：主干（门户 + FinSight + Degen）
python3 scripts/serve.py          # http://localhost:8770

# 终端 2：蜘蛛（独立进程）
cd modules/spider
node server.mjs                   # http://localhost:4317
```

打开 http://localhost:8770 看到门户即成功；逐个点卡片验证五个模块。

## 目录结构

```
fusion-dashboard/
├─ portal/index.html        门户页（导航 + 状态探针）
├─ public/                  FinSight 前端原文件（finance.html、cobe.js）
├─ scripts/                 FinSight 后端与推送脚本（serve.py 为主干）
├─ modules/
│  ├─ degen/                Degen Lab 原样镜像（index.html / office.html / decisions.js / assets/）
│  ├─ spider/               Prompt Spider UI 原仓整目录（app/ 前端、lib/、mcp/、server.mjs）
│  └─ FINSIGHT-README.md    FinSight 原 README
├─ docs/
│  ├─ TUTORIAL.md           详细教程
│  ├─ PUSH.md               微信推送（A5）说明
│  └─ CREDITS.md            来源与许可
├─ deploy/                  一键部署包（Mac launchd / Linux systemd / nginx 模板）
├─ .mcp.json                MCP 客户端配置（prompt-spider 本地桥 + aisafetyhot 远程）
├─ PLAN.md                  融合大纲与执行状态（方向 B 的完整决策记录）
└─ README.md                本文件
```

## 后台聚合接口（P2）

主干在原有接口之外提供两个只读聚合接口（模块内部互不改动，数据只在主干层汇合）：

- `GET /api/fusion/status`：五模块关键数（指数、Degen 余额/战绩/持仓、赛跑终值、安全最新日期与精选 Top5、蜘蛛在线状态），30 秒缓存；门户卡片的实时数字来自这里。
- `GET /api/fusion/digest`：把聚合拼成一段可直接推送的文本，微信推送脚本可直接消费。

## 端口

| 端口 | 进程 | 用途 |
|---|---|---|
| 8770 | `scripts/serve.py` | 门户、FinSight 页面与全部 `/api/finance/*` 接口、Degen 静态镜像 |
| 4317 | `modules/spider/server.mjs` | Prompt Spider 前端与会话接口（`/status` 为健康检查） |

## 注意事项

- **必须跑在常开机器上**（家用小主机 / Mac mini / VPS 均可）：FinSight 靠 Python 后端实时抓行情，纯静态托管（如 GitHub Pages）撑不起来。
- **8770 与 4317 都没有登录鉴权**：只建议在局域网或受控网络内使用；如需公网访问，请按教程里的方案套一层反向代理 + 访问控制，不要裸奔端口。
- 行情数据来自公开数据源，存在延迟与误差，本项目仅供个人学习与信息整理，**不构成任何投资建议**。
- 各模块的版权与许可归各自原作者，详见 [docs/CREDITS.md](docs/CREDITS.md)。
