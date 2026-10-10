# 上架进度与剩余事项

**状态：插件已正式发布，安装链路已端到端验证。** 只剩「截图 + 提收录 PR」两件事需要你做。

---

## 一、已完成并验证（截至 2026-10-10 15:12）

| 项目 | 证据 |
|---|---|
| 公开仓库 | <https://github.com/ljxdsg12/dsh-liuyao>（公开、默认分支 main） |
| 代码已推送 | `main` = `ba1b9c0`，**20 个提交**，标签 `v0.1.0` 已推送，工作区干净 |
| Release 已发布 | <https://github.com/ljxdsg12/dsh-liuyao/releases/tag/v0.1.0>，`prerelease: false`（Latest） |
| Release 附件 | `dsh-liuyao-0.1.0.tgz`，81,884 字节，`state: uploaded` |
| 产物完整性 | **三方 SHA256 一致**：本地 = 公网下载 = GitHub API 报告 `311f9904…5161` |
| 公网安装实测 | `dsh plugin --profile verifyinstall add "<Release URL>"` → **exit 0，2.5 秒** |
| 装后可用性 | 从安装目录加载：工具 3 个、端点 7 条；`山火贲 → 地雷复` 排盘、8 个分析章节、含通俗总结与断卦依据 |
| 自检 | `npm test` → **8/8 套件通过** |
| 许可 | `LICENSE`（MIT + 四条免责附加说明），GitHub 识别为 `Other`（自定义许可） |

用户的安装命令（已验证可用）：

```bash
dsh plugin --profile web add "https://github.com/ljxdsg12/dsh-liuyao/releases/download/v0.1.0/dsh-liuyao-0.1.0.tgz"
```

## 二、⚠️ 安装前提：必须给 Node/pnpm 设代理

本机系统代理是 `127.0.0.1:7897`。**Node 的 fetch（undici）不读 Windows 系统代理**，
而 `curl` 与 `git` 会读——所以会出现"curl 能下载、pnpm 却失败"的假象。实测表现：

| 症状 | 原因 |
|---|---|
| `TypeError: fetch failed` / `UND_ERR_CONNECT_TIMEOUT` | 没给 Node 设代理 |
| `DEPTH_ZERO_SELF_SIGNED_CERT` | 走了代理但代理做了 TLS 拦截 |

正确姿势（三条环境变量一起设）：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY='1'
dsh plugin --profile web add "<Release URL>"
```

**这一条要写进用户须知**——否则用户会以为插件坏了。README 里已有相关说明。

## 三、剩余事项（只需你做）

### 1. 截图（4 张，存到仓库 `assets/`）

我全程无法读屏，这一项只能你来。命名需与 `catalog-entry.json` 里的链接一致：

| 文件名 | 内容 |
|---|---|
| `assets/screenshot-1.png` | 整帧先天八卦底纹 + 卦盘主面板（**首图，决定点击率**） |
| `assets/screenshot-2.png` | 六爻排盘表（六神／伏神／六亲纳甲／本卦／变卦 六行齐全） |
| `assets/screenshot-3.png` | 解读区（条文带典籍出处 + 末尾的通俗总结块） |
| `assets/screenshot-4.png` | 一卦一断对话框（带一条真实问答与「已问 N / 上限」） |

放在仓库根目录的 `assets/` 下，然后提交推送：

```powershell
cd C:\Users\24568\Documents\deepseek-harness\default-workspace\liuyao-dsh-plugin
git add assets; git commit -m "docs: 界面截图"; git push
```

### 2. 提收录 PR

**时机：2026-10-11 14:32（北京时间）之后。** 仓库创建于 2026-10-10 14:32，
gate 要求**仓库年龄 ≥ 1 天**；commit 门槛（≥ 10）你已有 20 个。

把 `catalog-entry.json` 的内容作为一条新条目，加进
[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
的 `plugins.json`，提 Pull Request。

**gate 三条门槛与你的状态**

| 门槛 | 状态 |
|---|---|
| 声明 `dsh.bundle` | ✅ 已有 |
| 仓库年龄 ≥ 1 天 | ⏳ 2026-10-11 14:32 之后 |
| commit 数 ≥ 10 | ✅ 20 个 |

年龄不足时 PR 会显示 `repository is X.X days old (needs 1) — resubmit in about 15h`——
这是**有意设计**（防刷收录），到点后官方 `regate.yml` 每 6 小时自动重跑并转绿。
想提前可以往 PR 分支推一个空提交戳一下（官方指南说这是有效路径）。

## 四、之后：变现放在服务侧

插件本体在这个生态没有付费通路（目录 4471 条，schema 无价格字段）。收入走：
**一对一断卦咨询 · 定制开发（加门派规则／批量排盘／导出报告） · 教学 · 赞助**。
详见 `PUBLISHING.md` 第五、六节。

---

## 附：本地仓库提交历史（20 个）

```
ba1b9c0 docs: 安装链路公网实测记录、代理前提说明，并统一仓库 URL 为规范小写
62676e5 docs: 上架材料（下一步清单、Release 文案、目录条目）与英文安装说明
ec4cc39 merge: 合入 GitHub 建仓时的初始提交（README/.gitignore 以本仓库版本为准）
6be25cc fix(scripts): 用退出码判断暂存区，避免受限环境下管道 stdio 失败
1c6c502 chore: 仓库准备脚本
741ccaa docs: Agent 断卦作业规程与验证记录
2b9d036 docs: 使用说明、英文 README 与上架手册
cbebd74 feat(client): 卦盘 Web 界面
2bbe659 test: asar 读取辅助工具
c5fb39d feat(host): 插件 Host 半
23a9034 feat(followup): 一卦一断
910383c feat(summary): 通俗总结
2516207 feat(format): 与参考图同序的文本排盘
fe2a37b feat(analysis): 断卦依据引擎
c51f39c feat(engine): 排盘引擎
579c8ad feat(hexagrams): 六十四卦索引、纳甲装配、八宫世应与伏神
699c1e2 feat(constants): 纳甲、八宫、六亲、六神、长生、神煞数据表
feee92d feat(calendar): 干支历与农历换算
ba27673 chore: 初始化插件包骨架
a5a7bbb （GitHub 建仓时自动生成的初始提交）
```
