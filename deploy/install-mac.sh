#!/bin/bash
# Fusion Dashboard 一键安装（macOS / launchd）
# 幂等：可反复运行；只写 ~/Library/LaunchAgents，全程不需要 sudo。
# 用法：cd 到仓库根，bash deploy/install-mac.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$HOME/Library/LaunchAgents"
DEPLOY="$REPO/deploy"

say() { printf '\n==> %s\n' "$*"; }

# ---- 1. 依赖检查 ----
PY3="$(command -v python3 || true)"
NODE="$(command -v node || true)"

if [ -z "$PY3" ]; then
  echo "缺少 python3。请先安装：brew install python（或从 python.org 下载）" >&2
  exit 1
fi
if [ -z "$NODE" ]; then
  echo "缺少 node（蜘蛛模块需要 Node 20+）。请先安装：brew install node（或从 nodejs.org 下载 LTS）" >&2
  echo "如只用 FinSight/门户/赛跑/安全页，可暂时跳过蜘蛛（门户里蜘蛛卡会显示离线）" >&2
  exit 1
fi

PYV="$("$PY3" -c 'import sys;print(f"{sys.version_info[0]}.{sys.version_info[1]}")')"
NODEV="$("$NODE" -v)"
echo "python3: $PY3 ($PYV)"; echo "node:    $NODE ($NODEV)"

# ---- 2. 渲染 plist 模板 ----
mkdir -p "$AGENTS_DIR"

render() {
  "$PY3" - "$1" "$2" "$REPO" "$PY3" "$NODE" <<PYEOF
import sys
_, src, dst, repo, py3, node = sys.argv
t = open(src).read()
for k, v in [('__REPO__', repo), ('__PYTHON3__', py3), ('__NODE__', node)]:
    t = t.replace(k, v)
assert '__REPO__' not in t and '__PYTHON3__' not in t and '__NODE__' not in t, '占位符未替换完全'
open(dst, 'w').write(t)
PYEOF
}

say "渲染 launchd 配置"
render "$DEPLOY/launchd/com.fusion.serve.plist" "$AGENTS_DIR/com.fusion.serve.plist"
render "$DEPLOY/launchd/com.fusion.spider.plist" "$AGENTS_DIR/com.fusion.spider.plist"
echo "已写入 $AGENTS_DIR/com.fusion.{serve,spider}.plist"

# ---- 3. 重载（幂等：先卸再装） ----
say "加载服务（开机自启 + 崩溃自动重启）"
for name in com.fusion.serve com.fusion.spider; do
  launchctl unload "$AGENTS_DIR/$name.plist" 2>/dev/null || true
  launchctl load "$AGENTS_DIR/$name.plist"
done

# ---- 4. 健康检查 ----
say "等待服务就绪并做健康检查"
for i in $(seq 1 15); do
  if curl -sf --max-time 3 "http://127.0.0.1:8770/api/finance/indices" >/dev/null 2>&1 \
     && curl -sf --max-time 3 "http://127.0.0.1:4317/status" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

OK8770=0; OK4317=0
curl -sf --max-time 5 "http://127.0.0.1:8770/api/finance/indices" >/dev/null 2>&1 && OK8770=1
curl -sf --max-time 5 "http://127.0.0.1:4317/status" >/dev/null 2>&1 && OK4317=1

LANIP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

say "结果"
[ "$OK8770" = 1 ] && echo "主干 :8770   OK —— http://localhost:8770（局域网：http://$LANIP:8770）" \
                   || echo "主干 :8770   未响应 —— 看日志 /tmp/fusion-serve.err"
[ "$OK4317" = 1 ] && echo "蜘蛛 :4317   OK —— http://localhost:4317（局域网：http://$LANIP:4317）" \
                   || echo "蜘蛛 :4317   未响应 —— 看日志 /tmp/fusion-spider.err"

echo ""
echo "打开 http://localhost:8770 进入门户，按仓库 README 的验收表逐个点模块。"
echo "防睡眠建议：sudo pmset -c sleep 0 disablesleep 1（接电不睡），详见 docs/TUTORIAL.md 第 7 节。"
