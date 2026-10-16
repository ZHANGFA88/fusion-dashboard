#!/usr/bin/env bash
# A5 推送收尾：一键安装异动哨兵定时任务（macOS launchd，每 5 分钟执行一次）
# 用法：bash scripts/setup_push.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.finsight.alerts-sentinel"
PLIST_SRC="$REPO_DIR/scripts/com.finsight.alerts-sentinel.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"
API_BASE="${API_BASE:-http://127.0.0.1:8770}"
OPENCLAW_BIN="${OPENCLAW_BIN:-/opt/homebrew/bin/openclaw}"

echo "== 前置检查 =="
command -v python3 >/dev/null || { echo "❌ 找不到 python3"; exit 1; }
if [ -x "$OPENCLAW_BIN" ]; then echo "✅ openclaw：$OPENCLAW_BIN"; else echo "⚠️ 未找到 openclaw（$OPENCLAW_BIN），推送将失败，请确认安装路径"; fi
if curl -sf -m 5 "$API_BASE/api/finance/alerts?limit=1" >/dev/null; then
  echo "✅ 本地服务连通：$API_BASE"
else
  echo "⚠️ 本地服务未运行：请先 python3 scripts/serve.py"
fi

echo "== 安装定时任务 =="
mkdir -p "$REPO_DIR/data/logs" "$HOME/Library/LaunchAgents"
sed "s#__REPO_DIR__#$REPO_DIR#g" "$PLIST_SRC" > "$PLIST_DST"
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"
echo "✅ 已安装并启动：$LABEL（每 5 分钟执行哨兵）"
echo "   状态文件：$REPO_DIR/data/alert_push_state.json"
echo "   日志：$REPO_DIR/data/logs/sentinel.out.log"
echo ""
echo "验收：等自选股触发异动（或手动往 alerts 表插一条测试数据），手机微信应收到推送。"
echo "卸载：launchctl unload $PLIST_DST && rm $PLIST_DST"
