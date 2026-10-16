#!/bin/bash
# Fusion Dashboard 一键安装（Linux / systemd）
# 幂等：可反复运行。只有“写入 /etc/systemd/system + systemctl”这一步需要 sudo，
# 脚本会在那一步之前明确提示并停下来等你确认（Ctrl+C 可随时退出）。
# 用法：bash deploy/install-linux.sh   （在仓库根目录执行）
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$REPO/deploy"
USER_NAME="$(id -un)"

say() { printf '\n==> %s\n' "$*"; }

# ---- 1. 依赖检查 ----
PY3="$(command -v python3 || true)"
NODE="$(command -v node || true)"

if [ -z "$PY3" ]; then
  echo "缺少 python3。请先安装，例如：sudo apt update && sudo apt install -y python3 git" >&2
  exit 1
fi
if [ -z "$NODE" ]; then
  echo "缺少 node（蜘蛛模块需要 Node 20+）。" >&2
  echo "Debian/Ubuntu 仓库自带的 node 常低于 20，建议用 NodeSource 或 nvm 装 20+。" >&2
  echo "如只用 FinSight/门户/赛跑/安全页，可暂时跳过蜘蛛（门户里蜘蛛卡会显示离线）" >&2
  exit 1
fi

PYV="$("$PY3" -c 'import sys;print(f"{sys.version_info[0]}.{sys.version_info[1]}")')"
NODEV="$("$NODE" -v)"
echo "python3: $PY3 ($PYV)"; echo "node:    $NODE ($NODEV)"; echo "用户:    $USER_NAME"

# ---- 2. 渲染 unit 模板到临时目录 ----
say "渲染 systemd unit 模板"
TMPD="$(mktemp -d)"
"$PY3" - "$DEPLOY/systemd/fusion-serve.service" "$TMPD/fusion-serve.service" "$REPO" "$USER_NAME" "$PY3" "$NODE" <<PYEOF
import sys
_, src, dst, repo, user, py3, node = sys.argv
t = open(src).read()
for k, v in [('__REPO__', repo), ('__USER__', user), ('__PYTHON3__', py3), ('__NODE__', node)]:
    t = t.replace(k, v)
assert '__REPO__' not in t and '__USER__' not in t and '__PYTHON3__' not in t and '__NODE__' not in t, '占位符未替换完全'
open(dst, 'w').write(t)
PYEOF
"$PY3" - "$DEPLOY/systemd/fusion-spider.service" "$TMPD/fusion-spider.service" "$REPO" "$USER_NAME" "$PY3" "$NODE" <<PYEOF
import sys
_, src, dst, repo, user, py3, node = sys.argv
t = open(src).read()
for k, v in [('__REPO__', repo), ('__USER__', user), ('__PYTHON3__', py3), ('__NODE__', node)]:
    t = t.replace(k, v)
assert '__REPO__' not in t and '__USER__' not in t and '__PYTHON3__' not in t and '__NODE__' not in t, '占位符未替换完全'
open(dst, 'w').write(t)
PYEOF
echo "已生成："; ls "$TMPD"

# ---- 3. 需要 sudo 的部分（明确提示） ----
say "下一步需要 sudo：把两个 unit 写入 /etc/systemd/system 并启用服务"
echo "将执行："
echo "  sudo cp $TMPD/fusion-serve.service  /etc/systemd/system/"
echo "  sudo cp $TMPD/fusion-spider.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now fusion-serve fusion-spider"
printf '按回车继续，Ctrl+C 退出：'; read -r _

sudo cp "$TMPD/fusion-serve.service"  /etc/systemd/system/fusion-serve.service
sudo cp "$TMPD/fusion-spider.service" /etc/systemd/system/fusion-spider.service
sudo systemctl daemon-reload
sudo systemctl enable --now fusion-serve fusion-spider
rm -rf "$TMPD"

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

LANIP="$(hostname -I 2>/dev/null | awk '{print $1}')"

say "结果"
[ "$OK8770" = 1 ] && echo "主干 :8770   OK —— http://localhost:8770（局域网：http://$LANIP:8770）" \
                   || echo "主干 :8770   未响应 —— sudo journalctl -u fusion-serve -e"
[ "$OK4317" = 1 ] && echo "蜘蛛 :4317   OK —— http://localhost:4317（局域网：http://$LANIP:4317）" \
                   || echo "蜘蛛 :4317   未响应 —— sudo journalctl -u fusion-spider -e"

echo ""
echo "打开 http://localhost:8770 进入门户，按仓库 README 的验收表逐个点模块。"
echo "要公网访问：两个端口都没有登录鉴权，务必按 deploy/nginx-fusion.conf 套一层反代+鉴权，不要裸奔端口。"
