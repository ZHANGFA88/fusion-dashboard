# 五方融合计划大纲 · 方向 B（2026-10-16 用户确认）

**总原则：只合体、不改风格。** 一个仓库、一台服务、一个门户入口；五个项目各用各的原页面、原样式、原交互挂载，模块内部不做任何视觉改动。不做统一风格、不做拼版总览首屏。此前统一风格方案与效果图 v1/v2（mockup/fusion-mockup*.png）已作废，仅留档。

## 五个来源（已逐一精读核实）

1. **grokbot-jev-dashboard**（Vazolini）：Solana meme 币纸面交易「Degen Lab」单页。纯静态 index.html（约 35KB）+ decisions.js（决策日志）+ assets/office-bg.jpg；无后端、无构建、无 LICENSE。每 20 秒轮询其仓库 `data` 分支的 state.json。葡语界面、办公室场景、霓虹配色均为其原风格组成部分。
2. **prompt-spider-ui**（Kirito14IT，MIT）：原生 JS + Canvas 2D 机械蜘蛛 UI。app/ 前端（ES modules，零依赖，需经 HTTP 打开）+ lib/ 会话与回放 + mcp/（11 个 spider_* 工具）+ server.mjs（Node ≥20 零依赖服务，端口 4317）。黑底粉扫描、三布局、控制抽屉为其原风格。
3. **FinSight finance-dashboard**（ZHANGFA88，用户自己的）：public/finance.html（约 82KB）+ scripts/serve.py（约 2300 行、零依赖 Python、端口 8770、SQLite），15 个 /api/finance/* 接口（行情多源降级、K 线、技术分析、筹码、异动报警、自选）；A5 微信推送脚本未收尾（Mac 端安装与端到端验证）。
4. **定投赛跑页 space-3**（2026-10-14 所写）：Muse fullstack artifact，本体导不出文件；数据与引擎在本地：~/workspace/global_etf_race/（engine.py、data/engine.json 约 874KB、4380 个交易日/202 期、9 张事件卡，口径与验数见 VERIFICATION.md，每日刷新在跑）。其「原风格」即 FRAME_SPEC_V3 的 Titanium 式全屏动画规格。
5. **AISafetyHot-Hub**（ZHANGFA88 的 fork，2026-10-16 fork 自 wuyoscar）：AI 安全内容数据仓（约 29MB、187 文件，无前端代码）：daily/ 日报四栏目、daily-papers/ 每日 30 篇精选 JSON、papers/ 论文库、status.json、skills/ 六个技能；网站本体在 aisafetyhot.com，远程 MCP 免 Key。文字内容 CC BY-NC 4.0。

## 架构：一台主干服务 + 门户 + 五个原样模块

- **主干**：FinSight 的 serve.py 继续当唯一后端（行情抓取/SQLite/限流只有它有），同时扩展为静态文件宿主，把其余模块的原文件按目录挂上。改动只发生在主干的路由层，不进任何模块的文件内部。
- **门户页 `/`**：唯一新做的页面，职责只有导航：五张入口卡（卡面借各项目自己的代表色/截图，不发明新风格），外加各模块的存活状态点（服务在跑、数据更新时间）。门户不汇总数据、不做拼版总览。
- **模块 A 股票大屏 `/finance`**：finance.html 与全部 API 原样，样式、地球组件、主题切换全保留。
- **模块 B 定投赛跑 `/race`**：按 FRAME_SPEC_V3 在仓内重建为独立静态页，视觉与时序照原规格，数据吃现成 engine.json；每日刷新沿用 fetch_daily.py + engine.py，数字逐项对 VERIFICATION.md 验。这是全项目唯一「重建」的一块，原因是 artifact 本体导不出，非改风格。
- **模块 C Degen Lab `/degen`**：index.html + decisions.js + assets 原样拷贝，葡语与办公室背景不动；数据契约保留原样——继续轮询它原仓库 data 分支的 state.json（它本来就是这样工作的，零改动最保真）。
- **模块 D 蜘蛛 `/spider`**：app/ 原样，由主干以静态方式供文件（ES modules 只需 HTTP 托管即可跑演示模式）；它的 Node 实时/MCP 模式（hub）作为同机旁路进程在 P2 接入，页面本体不改。
- **模块 E AI 安全热点（例外项）**：它没有自带页面，「保持原风格」无从谈起。推荐 P0 先在门户卡片**直链其官网** aisafetyhot.com（零新增页面、最保真）；数据镜像与阅读页放到 P1 再议（照其官网观测台样式做、保留 CC BY-NC 署名）。此项最终形态待用户点头。
- **模块间切换**：不往任何模块页里注入导航条（那就是改页面）；切换走门户（浏览器后退/门户快捷方式）。跨模块的数据喂送只走后台，不影响长相。

## 分期

- **P0 骨架**：新仓（建议 ZHANGFA88/fusion-dashboard，自用）+ serve.py 主干扩展静态托管 + 门户页；A/C/D 三个模块原样挂载跑通，逐个打开验收（样式与原版逐项对照）。
- **P1 赛跑与热点**：模块 B 按 V3 重建并验数上线、每日刷新接入；模块 E 按用户选定形态落地（直链或阅读页）。
- **P2 数据互喂（后台，不动长相）**：蜘蛛 hub/MCP 接入，FinSight 异动、Degen 决策、安全热点事件可灌入蜘蛛实时模式；门户状态点接各模块真实更新时间。
- **P3 可选**：A5 微信推送在 Mac 端收尾验证；如需公网访问再议 VPS/穿透部署。

## 硬约束（先说清）

- 融合版必须跑在一台常开机器（Mac mini 或 VPS）：FinSight 需要 Python 后端实时抓行情，纯 GitHub Pages 静态托管撑不起。
- 许可：spider MIT 保留声明；grokbot 无 LICENSE，融合仓只自用、不公开分发其代码；AISafetyHot 文字 CC BY-NC 4.0，保留署名与来源链接。
- grokbot 的 state.json 写入权在原作者机器人一侧，模块 C 永远是只读镜像。

## 执行状态

- **P0 已于 2026-10-16 在本地完成并验收**（用户「开始吧」后）：骨架在 ~/workspace/fusion-dashboard/——门户页、serve.py 主干（仅加 3 行路由改动）、FinSight/grokbot/spider 模块原样拷入；文件哈希与原仓逐一对照一致（serve.py 除外，即主干那 3 行）；本地实测 /, /finance, /api/finance/indices, /modules/degen/*, 蜘蛛 :4317 全部 200、标题与内容正确。整包 zip 已交付用户（Muse 文件链接，2026-10-18 到期）。
- **GitHub 已落地（2026-10-16 13:42）**：仓 ZHANGFA88/fusion-dashboard 已建（App 无建仓权限，改由浏览器在用户登录态上建仓）；P0 全部文件已推送并回读验证：65 个文本文件（9 次提交）+ 6 个二进制（浏览器网页上传，blob 哈希与本地逐一一致，含 office-bg.jpg 与 9.1MB preview.gif）。注意：MCP create_or_update_file 会把 base64 当纯文本存，二进制只能走网页上传或本地 git（4 个品牌图曾误存为 base64 文本，已删除重传）。
- **已按用户决定改为公开仓（2026-10-16 13:46，用户知悉 grokbot 无许可证的再分发风险后确认）**：公开前全仓敏感信息扫描通过（无密钥/令牌/个人信息）；README 已重写，并新增 docs/TUTORIAL.md（详细教程：安装→启动→验收→局域网→Mac launchd 与 VPS systemd 常开部署→数据更新→MCP 接入→故障排查→安全许可）与 docs/CREDITS.md（逐模块来源与许可，含 degen 无许可特别说明）；未登录抓取已验证 Visibility: Public、README 正常渲染。
- 模块 E 形态：P0 按推荐走门户直链官网；阅读页与否 P1 再议。
- **P1 已完成（2026-10-16，用户指令「必须推进」、细节由 Muse 自行确定）**：赛跑页按 FRAME_SPEC_V3 重建为静态页迁入 modules/race/（原生 JS+Canvas、零 CDN、fetch 引擎 JSON，117.5 秒全片；数字一律取引擎，与 VERIFICATION 一致，偏差清单在 modules/race/README.md；刷新工具链在 modules/race/tools/）；安全热点落地为本地阅读页 modules/safety/（官网观测台深色风，浏览器端实时读 ZHANGFA88/AISafetyHot-Hub 的 daily 日报 MD + daily-papers 精选 JSON，可翻日，CC BY-NC 署名）；门户两卡转正并加状态探针。验收为代码级自查 + 本地实测（本环境无法截图，画面逐帧验收待用户真机播放反馈，与 space-3 同一未决项）。
- **P2 已完成（2026-10-16）**：后台互喂——serve.py 新增 /api/fusion/status（五模块关键数聚合，30 秒缓存）与 /api/fusion/digest（可直接推送的聚合文本），实测全真数据；门户五卡改吃聚合接口显示实时数字；蜘蛛 MCP 接入——modules/spider/mcp 依赖装好并通过 JSON-RPC 握手实证（11 个 spider_* 工具），仓库根 .mcp.json 同时含 prompt-spider 本地桥与 aisafetyhot 远程 MCP。
- **P3 已完成（2026-10-16）**：A5 微信推送收尾——三个推送脚本接融合主干干跑通过（早间选股全链路实证：取数→组装→调用发送命令；两哨兵为设计内静默），修复两个脚本里写死旧仓名 finance-dashboard 的状态路径，新增 docs/PUSH.md 与 scripts/push.env.example；真正发第一条微信仍需在装有 OpenClaw 且微信已登录的机器上配 WX_TARGET 并装 plist。部署包 deploy/ 落地（install-mac.sh / install-linux.sh / launchd 与 systemd 模板 / nginx 反代模板 / 部署手册，均自验）；Mac 实机无法由 Muse 远程执行命令，部署靠一键脚本。期间修复 P1 暗伤：docs/TUTORIAL.md 与 modules/safety/index.html 曾被写入截断（教程缺 8–12 章、安全页 JS 断裂），已补全并校验（教程 12 章齐、JS 过 node --check）。
- **全量自审完成（2026-10-16，用户要求）**：① 文件对账——GitHub 92 个 blob 与本地逐一哈希比对，零差异、零缺失；② 运行时——主干 21 路由 + 蜘蛛 4 路由全 200，POST 自选增删闭环通，聚合双接口真数据；③ 静态——全部 py 编译、全部 sh 语法、3 plist 解析、关键 JSON 解析、蜘蛛全部 JS 与 6 个页面内嵌 JS 语法、MCP 握手 11 工具、systemd unit 过 systemd-analyze verify；④ 口径——引擎五项终值与 VERIFICATION 逐项一致，敏感信息复扫干净。发现并定性：板块接口在本沙箱网络被东方财富挡空（原版同代码、非融合缺陷）；cyq 需可选 .cyqenv 环境（setup_cyqenv.sh 一次性搭建）；FINSIGHT-README 内 7 处上游死链（原文件按方向 B 不动）；nginx/launchd 无本机运行环境，仅模板级校验。
