# Fusion Dashboard 详细教程

从零开始，把五方融合大屏在你自己的机器上跑起来，并让它常开可用。
预计耗时：本地跑通约 10 分钟；常开部署再加 15–30 分钟。

目录：

1. [它是什么、怎么组织的](#1-它是什么怎么组织的)
2. [准备环境](#2-准备环境)
3. [获取代码](#3-获取代码)
4. [本地启动（两个服务，缺一不可）](#4-本地启动两个服务缺一不可)
5. [逐个模块验收](#5-逐个模块验收)
6. [在局域网里用手机/电视打开](#6-在局域网里用手机电视打开)
7. [常开部署 A：Mac mini（launchd）](#7-常开部署-amac-minilaunchd)
8. [常开部署 B：Linux / VPS（systemd + 反向代理）](#8-常开部署-blinux--vpssystemd--反向代理)
9. [数据从哪来、如何更新各模块](#9-数据从哪来如何更新各模块)
10. [蜘蛛的 MCP 接入（可选）](#10-蜘蛛的-mcp-接入可选)
11. [故障排查](#11-故障排查)
12. [安全与许可](#12-安全与许可)

---

## 1. 它是什么、怎么组织的

五个独立项目合体，但**互不改动对方的样子**（设计决策叫「方向 B」，全文见仓库根目录 `PLAN.md`）：

- **主干服务**（端口 8770）：FinSight 原有的零依赖 Python 服务 `scripts/serve.py`。它同时负责四件事：托管门户页、托管 FinSight 金融页、提供全部 `/api/finance/*` 实时行情接口、托管 Degen Lab 的静态镜像。融合只改了它的 3 行路由。
- **蜘蛛服务**（端口 4317）：Prompt Spider 自带的 Node 服务 `modules/spider/server.mjs`，独立进程。它的前端资源用的是绝对路径（`/boot.js`、`/lib/...`），所以必须独占一个根路径服务，没法塞进 8770 的子路径里——这是它独立成军的原因。
- **门户**：`portal/index.html`，五张卡片 + 每张卡的在线状态探针。它只负责导航，不往任何模块里注入东西；在模块里想回门户，用浏览器后退即可。
- **Degen Lab** 是只读镜像：页面和脚本是原作者的原文件，它的数据（机器人余额、持仓、战绩）每 20 秒从原作者仓库的 `data` 分支 `state.json` 直接读取，本仓库不保存、不回写它的状态。
- **定投赛跑**（`/modules/race/index.html`）：已按原规格重建为静态页，吃 `modules/race/data/engine.json`，口径与原版一致。
- **安全热点阅读页**（`/modules/safety/index.html`）：本地页面，浏览器打开时实时去 AISafetyHot-Hub 数据仓取当日日报与精选 JSON 渲染，仓库里不存它的内容。

## 2. 准备环境

需要的只有两样（蜘蛛不用可省 Node）：

| 依赖 | 版本 | 用途 | 检查命令 |
|---|---|---|---|
| Python | 3.10 或更高 | 主干服务、FinSight 接口 | `python3 --version` |
| Node.js | 20 或更高 | 蜘蛛服务 | `node --version` |

安装方式：

- **macOS**：装了 Homebrew 后 `brew install python node`；或到 python.org / nodejs.org 下载官方安装包。Mac mini 长期运行建议接有线网络并关闭睡眠（见第 7 节）。
- **Windows**：到 python.org 安装 Python（安装时勾选 *Add python.exe to PATH*）、nodejs.org 安装 Node LTS。命令在 PowerShell 里执行，`python3` 写作 `py` 或 `python` 均可（下文以 `python3` 为例，按你的环境替换）。
- **Linux（Debian/Ubuntu）**：`sudo apt update && sudo apt install -y python3 nodejs git`；注意发行版自带 Node 可能低于 20，建议用 NodeSource 或 nvm 装 20+。

不需要 pip install 任何东西：主干与蜘蛛都是**零第三方依赖**，这是刻意保持的。

## 3. 获取代码

```bash
git clone https://github.com/ZHANGFA88/fusion-dashboard.git
cd fusion-dashboard
```

没有 git 也可以在仓库页面点 **Code → Download ZIP** 解压。解压/克隆后确认目录里有 `portal/`、`public/`、`scripts/`、`modules/` 四个部分，缺任何一个都是下载不完整。

## 4. 本地启动（两个服务，缺一不可）

开两个终端窗口，分别在仓库根目录执行：

**终端 1 —— 主干（8770）**

```bash
python3 scripts/serve.py
```

看到类似 `http://0.0.0.0:8770` 的监听提示即已启动。这个终端不要关，关掉服务就停。

**终端 2 —— 蜘蛛（4317）**

```bash
cd modules/spider
node server.mjs
```

启动后先自检一遍（再开个终端或用浏览器）：

```bash
curl -s http://localhost:8770/api/finance/indices | head -c 200   # 应返回一串指数 JSON
curl -s http://localhost:4317/status                              # 应返回蜘蛛服务状态 JSON
```

两条都有正常 JSON 输出，再打开浏览器访问 **http://localhost:8770** ，门户出现即大功告成。

> 只想看金融大屏：只起终端 1 即可，门户里蜘蛛卡会显示离线，不影响其他模块。

## 5. 逐个模块验收

在门户页从上到下点一遍，对照下表检查（每项 30 秒）：

| 卡片 | 点开后应看到 | 不对劲的表现 |
|---|---|---|
| FinSight | 深色金融大屏：全球指数条、自选股、K 线图能切换、数据在刷新 | 页面空白或指数全是 `--`：多半是主干没起或机器连不上行情源，见故障排查 |
| Degen Lab | 葡语标题的办公室风格页面、机器人卡片有余额和持仓、日志在滚动 | 一直转圈：它在读上游仓库的 state.json，检查机器能否访问 githubusercontent 域名 |
| Prompt Spider | 打开的是 `:4317` 的蜘蛛控制台（独立标签页），机械蜘蛛画布出现 | 404 或白屏：确认是点了门户卡跳过去的（地址必须是 4317 根路径），不要把蜘蛛文件挂到 8770 子路径下 |
| 定投赛跑 | 点「开始回测」后动画播放：地球开场 → 六线赛跑 → 组合终局，终值 ¥2,746,664 / +353.24% | 黑屏或一直加载：多半是 `modules/race/data/engine.json` 缺失或损坏，重新从仓库拉取该文件 |
| AI 安全热点 | 本地阅读页打开：当日日报全文（四栏目）+ 30 篇精选论文卡，可前后翻日 | 显示「近 12 天内未找到数据」：机器连不上 raw.githubusercontent.com，或 Hub 仓近 12 天未更新 |

FinSight 里再多验一步：随便点一只自选股，K 线和右侧分析能加载，说明 15 个接口都在工作。

## 6. 在局域网里用手机/电视打开

主干默认监听 `0.0.0.0`，同一 Wi-Fi/局域网的设备可用 **http://<运行机器的局域网 IP>:8770** 访问：

- 查 IP：macOS 在「系统设置 → Wi-Fi → 详细信息」；Windows 用 `ipconfig`；Linux 用 `ip addr`。常见形如 `192.168.1.23`。
- 打不开先查防火墙：macOS 首次运行 Python 时系统会弹窗问是否允许传入连接，选允许；Windows Defender 防火墙同理放行 Python 与 Node。
- 蜘蛛同理：`http://<局域网 IP>:4317`。
- 电视/平板当大屏：直接把浏览器全屏停在 `/finance` 或门户页即可；FinSight 本身就是为大屏设计的。

注意：两个端口**都没有登录鉴权**，只在你自己可控的局域网里这样用；不要把端口直接映射到公网（见第 12 节）。

## 7. 常开部署 A：Mac mini（launchd）

目标：开机自动拉起两个服务、崩溃自动重启、机器不睡眠。

1. 防睡眠：`sudo pmset -c sleep 0 disablesleep 1`（接电时不睡）；或用 `caffeinate -dimsu` 临时保持唤醒。
2. 给主干建 launchd 配置 `~/Library/LaunchAgents/com.fusion.serve.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.fusion.serve</string>
  <key>ProgramArguments</key>
  <array><string>/usr/bin/python3</string><string>/Users/你的用户名/fusion-dashboard/scripts/serve.py</string></array>
  <key>WorkingDirectory</key><string>/Users/你的用户名/fusion-dashboard</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/fusion-serve.log</string>
  <key>StandardErrorPath</key><string>/tmp/fusion-serve.err</string>
</dict></plist>
```

3. 蜘蛛同理再建一份 `com.fusion.spider.plist`，ProgramArguments 改为 Node 的绝对路径（`which node` 查）和 `modules/spider/server.mjs`，WorkingDirectory 改为 `modules/spider` 目录。
4. 加载：

```bash
launchctl load ~/Library/LaunchAgents/com.fusion.serve.plist
launchctl load ~/Library/LaunchAgents/com.fusion.spider.plist
```

5. 验证：重启一次机器，什么都不点，直接用手机打开 `http://<Mac 的局域网 IP>:8770`，门户能开即部署成功。日志在 `/tmp/fusion-*.log`。
6. 停用：`launchctl unload <对应的 plist 路径>`。

> Python/Node 若是用 Homebrew 装的，路径是 `/opt/homebrew/bin/python3`、`/opt/homebrew/bin/node`，plist 里把这两个绝对路径填对，系统自带路径多半不存在。

懒人版：仓库 `deploy/` 里有现成的 `install-mac.sh`，它会自动生成并加载这两份 plist、做健康检查，效果与手动步骤相同（见 deploy/README.md）。

## 8. 常开部署 B：Linux / VPS（systemd + 反向代理）

1. 把仓库克隆到固定目录（如 `/opt/fusion-dashboard`），跑仓库自带的 `deploy/install-linux.sh`：它会把 `deploy/systemd/` 的两个 unit 模板替换路径后装好、daemon-reload 并 enable --now，最后做健康检查。手动等价步骤：unit 里主干 `ExecStart=/usr/bin/python3 /opt/fusion-dashboard/scripts/serve.py`、蜘蛛 `ExecStart=/usr/bin/node /opt/fusion-dashboard/modules/spider/server.mjs`，都设 `Restart=always` 与正确的 `WorkingDirectory`。
2. 更新：`git pull` 后 `sudo systemctl restart fusion-serve fusion-spider`。
3. 看日志：`journalctl -u fusion-serve -f`、`journalctl -u fusion-spider -f`。
4. 想要域名访问：用 `deploy/nginx-fusion.conf` 模板——主域名反代 8770，蜘蛛用**子域名**反代 4317（它必须占根路径，不能挂子路径）。模板里带 basic auth 示例：**8770/4317 本身没有鉴权，上公网必须套这一层**，不要把端口直接暴露。
5. 只在自己网络里用：可以不开公网，配合 Tailscale 之类的组网工具从外面连回家里，安全性更好。

## 9. 数据从哪来、如何更新各模块

| 模块 | 数据来源 | 更新方式 |
|---|---|---|
| FinSight | 运行时实时抓公开行情源 | 无需更新数据；上游 finance-dashboard 有新版时，把 `public/`、`scripts/` 整目录覆盖（注意保留 serve.py 里融合的那几行路由与 `/api/fusion/*` 聚合段，或重新打上） |
| Degen Lab | 页面运行时读原作者仓 `data` 分支 state.json | 页面文件上游更新时，覆盖 `modules/degen/` 内对应文件即可 |
| Prompt Spider | 本地演示数据 + MCP 会话 | 上游更新时整目录覆盖 `modules/spider/`（其 LICENSE 保留在目录内） |
| 定投赛跑 | `modules/race/data/engine.json` | 跑 `modules/race/tools/` 里的脚本重算引擎并覆盖该 JSON（步骤见 modules/race/README.md），页面刷新即新数据 |
| AI 安全热点 | 阅读页运行时读 ZHANGFA88/AISafetyHot-Hub 的 daily / daily-papers | 数据仓由其上游每日更新，本仓库什么都不用做 |

**后台互喂（P2）**：主干提供两个聚合接口，只聚合、不改任何模块内部——

- `GET /api/fusion/status`：五模块关键数一口出（指数、Degen 余额/胜负/持仓、赛跑终值、安全最新日期与精选 Top5、蜘蛛在线否），30 秒缓存。门户卡片上的实时数字就来自它。
- `GET /api/fusion/digest`：把上述拼成一段可直接推送的文本（微信推送的现成素材，见 docs/PUSH.md）。

自己验一遍：`curl http://localhost:8770/api/fusion/status` 应返回五个小节且 `online` 为 true（蜘蛛没起时它的 online 为 false，属正常）。

## 10. 蜘蛛的 MCP 接入（可选）

仓库根目录的 `.mcp.json` 已备好两个 MCP 服务，支持 MCP 的客户端（Claude Code、Cursor、Codex 等）打开本仓库时可直接发现：

| 名称 | 类型 | 用途 |
|---|---|---|
| `prompt-spider` | 本地 stdio（`node modules/spider/mcp/server.mjs`） | 蜘蛛的 11 个 `spider_*` 工具：创建可视化会话、流式推送逐词事件、控制回放、导入导出会话 |
| `aisafetyhot` | 远程 HTTP（`https://aisafetyhot.com/api/mcp`，免 Key） | 安全热点的论文检索、日报与趋势工具 |

接 `prompt-spider` 前有两件事：

1. **装依赖（只需一次）**：蜘蛛的网页服务是零依赖的，但 MCP 桥不是。在仓库根目录执行 `cd modules/spider/mcp && npm ci`。
2. **路径改绝对**：多数客户端要求 `args` 是绝对路径。把 `.mcp.json` 里的 `modules/spider/mcp/server.mjs` 换成它在你机器上的完整路径（在仓库根目录跑 `echo $PWD/modules/spider/mcp/server.mjs` 即是）。找不到 node 时，把 `command` 也换成 `which node` 的绝对路径。

验证接入是否成功（不依赖任何客户端）：在 `modules/spider/mcp` 目录里向服务发一次 JSON-RPC 握手，能列出 11 个工具即通：

```bash
printf '%s\n%s\n%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"check","version":"1.0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node server.mjs
```

预期在输出里看到 `spider_create_session`、`spider_update_events`、`spider_complete_session` 等共 11 个工具名。工具的完整语义与调用时序见 `modules/spider/docs/mcp.md`。

典型用法：让你的 Agent 在执行真实任务时调用 `spider_create_session` 开一个会话，把任务文本的逐词事件经 `spider_update_events` 推给它，浏览器打开 `:4317` 就能看蜘蛛实时抓词分流；任务结束调 `spider_complete_session` 收尾。

## 11. 故障排查

| 现象 | 常见原因 | 解决 |
|---|---|---|
| 打开 8770 是目录列表或 404 | 没在仓库根目录启动，或起错了脚本 | 停掉进程，`cd` 到仓库根目录重跑 `python3 scripts/serve.py` |
| 门户能开、FinSight 数据全是 `--` | 机器连不上行情源（代理/DNS），或正值源端限流 | 先 `curl http://localhost:8770/api/finance/indices` 看返回；换网络或等几分钟重试 |
| 蜘蛛打开 404 / 白屏 | 用 8770 的子路径访问了蜘蛛，或蜘蛛没起 | 蜘蛛只能在 `http://<主机>:4317/` 根路径打开；确认 `node server.mjs` 在跑，`curl localhost:4317/status` 应返回 JSON |
| Degen 一直转圈 | 读不到上游 state.json | 检查机器能否访问 raw.githubusercontent.com；上游仓更新节奏问题等一会再看 |
| 安全页显示「近 12 天内未找到数据」 | 连不上 Hub 仓，或该仓近期没更新 | 先浏览器直开 raw.githubusercontent.com 验网络；点「回到最新」重试 |
| 端口被占用（Address already in use） | 已有一个实例在跑 | Mac/Linux：`lsof -i :8770` 找到进程；要么用它、要么 kill 后重启。主干换端口：`FINANCE_PORT=8771 python3 scripts/serve.py`（门户里的接口地址随之变化，一般不建议改） |
| 局域网设备打不开 | 防火墙没放行，或机器睡了 | 放行 Python/Node 的入站连接；常开机器关睡眠（见第 7 节） |
| `/api/fusion/status` 里某模块 online 为 false | 对应数据源暂时不可达，或蜘蛛没启动 | 按本表对应行逐个排查；聚合接口本身返回 200 即主干正常 |
| MCP 客户端连不上蜘蛛 | 没装 mcp 依赖，或路径是相对的 | 先 `cd modules/spider/mcp && npm ci`；再把 `.mcp.json` 的 args 改绝对路径；用第 10 节的握手命令自证服务本身是好的 |
| 微信推送没动静 | 主干没起、OpenClaw 未登录、或非交易时段本就无异动 | 见 docs/PUSH.md 的干跑与排查清单 |

## 12. 安全与许可

- **鉴权**：8770 与 4317 都没有登录机制。局域网自用没问题；任何形式的公网暴露都要先套反向代理 + 访问控制（第 8 节模板），更不要把 FinSight 的写接口（自选股增删）暴露给不可信网络。
- **密钥**：本仓库不含任何密钥。微信推送依赖你本机的 OpenClaw 登录态（docs/PUSH.md），配置一律走环境变量，不要把真实目标 ID 之外的凭据写进仓库文件。
- **许可**：FinSight、门户、赛跑页为仓库作者自有；Prompt Spider 是 MIT；Degen Lab 原仓未附许可证（保留全部权利），本仓库仅作个人学习镜像；安全热点内容为 CC BY-NC 4.0。逐项明细见 docs/CREDITS.md。
- **数据**：行情与论文数据来自公开来源，可能延迟或有误；本项目仅供个人学习与信息整理，不构成投资建议。
