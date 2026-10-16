# FinSight 微信推送（A5）说明

## 架构一句话

三个 Python 脚本定期从本机 FinSight 主干（`scripts/serve.py`，端口 8770）的 `/api/finance/*` 接口拉数据、组装成中文消息，再经 **OpenClaw CLI**（`openclaw message send --channel wechat`）推送到你的微信。

## 前置条件

1. **OpenClaw 已安装且微信已登录**：`$OPENCLAW_BIN message send --channel wechat` 能正常工作（默认路径 `/opt/homebrew/bin/openclaw`，可被 `OPENCLAW_BIN` 覆盖）。
2. **主干在跑**：`python3 scripts/serve.py`（融合后主干、端口、接口路径都没变，推送脚本开箱可用）。
3. 目标 ID：三个 py 脚本内置了默认 `WX_TARGET`（原作者的值，**不要改**）；如需覆盖，设置环境变量 `WX_TARGET`。真实目标 ID 只放在 `scripts/push.env` 里，**绝不提交进仓库**（参考 `scripts/push.env.example`）。

配置模板：`cp scripts/push.env.example scripts/push.env`，按注释填好后 `source scripts/push.env`（注意本仓 `.gitignore` 尚未覆盖 `scripts/push.env`，请自行确保不提交）。

## 三个推送

| 脚本 | 用途 | 数据来源接口 | 发送条件 | 运行命令 |
|---|---|---|---|---|
| `push_alerts_sentinel.py` | 自选股异动哨兵：把 alerts 表里**新增且涨跌幅达阈值**的异动推微信，去重（状态文件记 last_id） | `GET /api/finance/alerts?limit=50` | 有 id 大于上次推送、且绝对涨跌幅 ≥ `ALERT_MIN_PCT`（默认 0.8%）的新记录；超过 `ALERT_MAX_PER_RUN`（默认 8）只推最新几条 | `python3 scripts/push_alerts_sentinel.py` |
| `push_daily_picks.py` | 每日早间选股榜单 | `GET /api/finance/picks?top=N` | 每次运行都推一条（候选池为空则推"空仓观望"，接口异常则推失败告警） | `python3 scripts/push_daily_picks.py` |
| `push_stale_alarm.py` | 数据陈旧哨兵：交易时段内行情源该更新却没更新时告警 | `GET /api/finance/watchlist`（自动取自选）+ `GET /api/finance/quotes?symbols=…` | 仅在**交易时段内**（按北京时间窗口粗判；加密/外汇 7×24 但陈旧不纳入告警以免噪音），且某标的 `stale` 标记或 age > `STALE_SEC`（默认 600 秒）；同一告警冷却 `STALE_COOLDOWN`（默认 1 小时） | `python3 scripts/push_stale_alarm.py` |

三个脚本都直接调 `OPENCLAW_BIN` 子进程发送；`scripts/push_lib.sh` 是给 bash 定时任务用的公共库（`wx_push` 函数），当前三个 py 脚本各自内联了发送逻辑、不依赖它。

## 定时方式（macOS launchd）

只给异动哨兵配了定时任务（每 5 分钟），另外两个按需手动运行或自行加定时。

```bash
# 一键安装（会做前置检查：python3、openclaw 路径、8770 连通性）
bash scripts/setup_push.sh
```

它做的事情：
1. 把 `scripts/com.finsight.alerts-sentinel.plist` 里的占位符 `__REPO_DIR__` 替换为**当前仓库的绝对路径**（sed），生成到 `~/Library/LaunchAgents/com.finsight.alerts-sentinel.plist`；
2. `launchctl unload/load` 加载，每 300 秒运行一次 `python3 <仓库>/scripts/push_alerts_sentinel.py`；
3. 状态文件与日志都落在 `<仓库>/data/` 下（`alert_push_state.json`、`logs/sentinel.{out,err}.log`）。

```bash
# 查看运行状态
launchctl list | grep finsight

# 卸载
launchctl unload ~/Library/LaunchAgents/com.finsight.alerts-sentinel.plist
rm ~/Library/LaunchAgents/com.finsight.alerts-sentinel.plist
```

**plist 占位符说明**：仓库里的 `com.finsight.alerts-sentinel.plist` 源文件故意用 `__REPO_DIR__` 而不是写死路径，`setup_push.sh` 在安装时替换。手动安装时同样执行 `sed "s#__REPO_DIR__#<仓库绝对路径>#g"` 即可。Label `com.finsight.alerts-sentinel` 与 FinSight 主干同名，保持不动。

## 干跑方法（不真发微信）

```bash
# 1) 起主干
python3 scripts/serve.py &

# 2) 做一个假 openclaw（只记录参数）
cat > /tmp/fake_openclaw.sh <<'EOF'
#!/bin/bash
{ echo "=== $(date '+%F %T') ==="; echo "ARGC=$#"; i=1
  for a in "$@"; do printf 'ARG[%d]=<%s>\n' "$i" "$a"; i=$((i+1)); done; echo; } >> /tmp/openclaw_calls.log
exit 0
EOF
chmod +x /tmp/fake_openclaw.sh

# 3) 用假命令 + 临时状态文件运行三个脚本
export API_BASE=http://127.0.0.1:8770 OPENCLAW_BIN=/tmp/fake_openclaw.sh \
  ALERT_STATE=/tmp/dryrun_alert_state.json STALE_STATE=/tmp/dryrun_stale_state.json \
  WX_TARGET=__DRYRUN_TARGET__
python3 scripts/push_alerts_sentinel.py   # 无新异动时静默退出（正常）
python3 scripts/push_daily_picks.py       # 每次都应产生一条调用
python3 scripts/push_stale_alarm.py       # 休市/数据新鲜时静默退出（正常）

# 4) 看证据
cat /tmp/openclaw_calls.log
# 应看到形如：message send --channel wechat --target __DRYRUN_TARGET__ --message <榜单正文>

# 5) 关主干
kill %1
```

## 故障排查

| 现象 | 原因 / 处理 |
|---|---|
| 脚本退出码 0 但微信没收到 | 先看是不是**本该静默**：哨兵无新异动、陈旧哨兵休市或数据新鲜时本来就不发。用上面干跑法看假命令是否被调用，定位是"没触发"还是"发了但没到"。 |
| `openclaw: command not found` / 退出码非 0 | `OPENCLAW_BIN` 路径不对。macOS 默认 `/opt/homebrew/bin/openclaw`；用 `which openclaw` 查实际路径后设置。 |
| 接口连不上（urllib 报错） | 主干没起：先 `python3 scripts/serve.py`，再 `curl -s http://127.0.0.1:8770/api/finance/indices` 验证。 |
| 重复收到同一条异动 | 状态文件被删或 `ALERT_STATE` 指向了别处；哨兵靠 `<仓库>/data/alert_push_state.json` 的 last_id 去重。 |
| 陈旧哨兵在该报警时没报 | ① 交易时段判断基于**服务器系统时区**（窗口按北京时间写死：A股 9:30–11:30/13:00–15:00、港股 9:30–12:00/13:00–16:00、美股约 21:30–次日 4:00），部署机器若不是北京时间时区会错位；② 冷却期内（默认 1 小时）不重复报；③ 加密/外汇标的故意不纳入告警。 |
| 早间选股推了"空仓观望" | 当天候选池无强势标的，属正常；接口异常时会明确推"推送失败：接口异常"。 |
| launchd 装完没反应 | `launchctl list \| grep finsight` 看是否在列；查 `<仓库>/data/logs/sentinel.err.log`。注意 plist 的 python 是 `/usr/bin/python3`，确保系统 python3 可用。 |

## 已知限制（融合仓现状）

- 定时任务只覆盖了异动哨兵；早间选股与陈旧哨兵如需定时，需自行再写 plist 或 cron（模式照抄 `com.finsight.alerts-sentinel.plist`）。
- `push_lib.sh` 的 bash 版 `wx_push` 目前没有被任何脚本调用，保留作备用。
- 真实 end-to-end（手机微信收到第一条）还差的外部条件见主报告，不在此展开。
