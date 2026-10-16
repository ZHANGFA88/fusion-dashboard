# 部署手册（deploy/）

把 Fusion Dashboard 装到一台常开机器上：两个服务——主干 `python3 scripts/serve.py`（8770，工作目录=仓库根）、蜘蛛 `node server.mjs`（4317，工作目录=`modules/spider`）。本目录的内容与仓库 `docs/TUTORIAL.md` 第 7 节一致，只是把手动步骤做成了一键脚本。

## 选哪条路（一句话）

- **Mac mini / Mac 常开机** → `install-mac.sh`（launchd，开机自启、崩溃自动重启，全程不需要 sudo）
- **Linux 服务器 / VPS** → `install-linux.sh`（systemd，同上，只有写 `/etc/systemd/system` 那一步需要 sudo，脚本会先明示再动手）

## 用法（各一行）

```bash
# 在仓库根目录执行
bash deploy/install-mac.sh      # macOS
bash deploy/install-linux.sh    # Linux
```

脚本会：①检查 python3 与 node 是否存在（缺了给出安装命令并退出，不继续）；②渲染配置模板（把你的仓库路径、`which` 到的解释器路径填进去）；③加载服务；④等 15 秒并做健康检查——`curl` 8770 的 `/api/finance/indices` 与 4317 的 `/status`，打印本机与局域网访问地址。

## 装完怎么验证

按仓库 `docs/TUTORIAL.md` **第 5 节的验收表**逐项点：FinSight 大盘、Degen Lab、机械蜘蛛（独立端口）、赛跑页、安全阅读页。门户页自带状态探针，绿点即正常。

## 更新（代码有新版时）

```bash
cd /你的/仓库路径
git pull

# macOS：卸载再加载即可（幂等，配置也会按新路径重写）
bash deploy/install-mac.sh

# Linux：同理
bash deploy/install-linux.sh
# 或只重启服务：sudo systemctl restart fusion-serve fusion-spider
```

## 卸载

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.fusion.serve.plist
launchctl unload ~/Library/LaunchAgents/com.fusion.spider.plist
# （可选）删掉这两个 plist 文件与 /tmp/fusion-*.log

# Linux
sudo systemctl disable --now fusion-serve fusion-spider
sudo rm /etc/systemd/system/fusion-serve.service /etc/systemd/system/fusion-spider.service
sudo systemctl daemon-reload
```

## 日志在哪看

| 平台 | 主干 | 蜘蛛 |
|---|---|---|
| macOS | `/tmp/fusion-serve.log`、`/tmp/fusion-serve.err` | `/tmp/fusion-spider.log`、`/tmp/fusion-spider.err` |
| Linux | `sudo journalctl -u fusion-serve -e`（另有 `/var/log/fusion-serve.log`） | `sudo journalctl -u fusion-spider -e`（另有 `/var/log/fusion-spider.log`） |

## 公网访问（必读）

两个端口**都没有登录鉴权**。要从外网访问：按 `nginx-fusion.conf` 模板套 nginx 反代——主域名→8770，**`spider.` 子域名→4317**（蜘蛛前端用绝对路径资源，子路径方案行不通，必须给它独立根路径）。模板里带了 Basic Auth 的注释示例与 `htpasswd` 生成命令，强烈建议开启；再用 certbot 上 HTTPS。不想折腾域名，也可以用 Tailscale/内网穿透只给自己看。

## 常见坑

1. **Mac 睡眠**：机器一睡服务就停。接电时 `sudo pmset -c sleep 0 disablesleep 1`，或保持 `caffeinate`。这是 Mac 方案最常见的"装完第二天打不开"原因。
2. **端口占用**：8770/4317 已被别的程序占了，服务起不来。`lsof -i :8770`（Mac）/ `ss -ltnp | grep 8770`（Linux）查到占用者，关掉或换端口（换端口要同步改门户探针与本目录模板）。
3. **Node 版本**：蜘蛛要求 Node 20+。Linux 发行版仓库里的 node 常低于 20，用 NodeSource 或 nvm 装；`node -v` 小于 v20 时脚本会照样装但蜘蛛可能跑不起来，先升级。
4. **Homebrew 路径**：Mac 上 brew 装的 python3/node 在 `/opt/homebrew/bin/`，脚本用 `which` 自动找对路径，不用手动填；但换过终端/用户后重装一次脚本即可。
5. **局域网 IP 变了**：路由器 DHCP 重新分配后，手机收藏夹里的旧 IP 会失效。给常开机器在路由器上绑固定 IP，一劳永逸。
6. **蜘蛛离线但主干正常**：多半是 node 没装或版本不对——门户蜘蛛卡显示离线不影响其他四个模块，先看 `/tmp/fusion-spider.err`。
