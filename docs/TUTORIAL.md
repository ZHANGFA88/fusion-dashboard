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
- **定投赛跑**（`/race`）与**安全热点阅读页**尚在 P1 阶段：当前门户里赛跑卡标注「重建中」，安全热点卡直链其官网 aisafetyhot.com。

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
| 定投赛跑 | 「重建中」占位说明（P1 交付前正常现象） | —— |
| AI 安全热点 | 新标签打开 aisafetyhot.com 官网 | 打不开属外网问题，与本仓库无关 |

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

> Python/Node 若是用 Homebrew 装的，路径是 `/opt/homebrew/bin/python3`、`/opt/homebrew/bin/node`，plist 里
...[truncated 6168 chars]