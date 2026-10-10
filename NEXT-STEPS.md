# 上架进度与剩余事项

**状态：插件已发布并端到端验证，安装问题已定位并给出可用替代方案。**
只剩「看界面 + 提收录 PR」两件事需要你做。

---

## 一、已完成并验证（截至 2026-10-10 19:50）

| 项目 | 证据 |
|---|---|
| 公开仓库 | <https://github.com/ljxdsg12/dsh-liuyao>（公开、默认分支 main） |
| 代码 | `main`，**29 个提交**，标签 `v0.1.0`，工作区干净 |
| Release | <https://github.com/ljxdsg12/dsh-liuyao/releases/tag/v0.1.0>，`prerelease: false`（Latest） |
| Release 附件 | `dsh-liuyao-0.1.0.tgz`，393,640 字节，SHA256 `1a465595…d6ffc5` |
| 发布包（最新） | `dsh-liuyao-0.1.0.tgz` / `.tar.gz`，387.3 KB，SHA256 `0df1fe2e…96c0e7`（含「关于」功能） |
| 本地安装实测 | `dsh plugin add <tarball>` → **323ms**，免 git、免联网、免代理 |
| 联网安装实测 | `dsh plugin add "github:ljxdsg12/dsh-liuyao#v0.1.0"` → **4s**（需 git + 代理） |
| 装后可用性 | 工具 3 个、端点 **8** 条；`山火贲 → 地雷复`、8 个分析章节、含通俗总结与断卦依据 |
| 功能 | 起卦（手工／电脑摇卦）、排盘、断卦（逐条注明出处）、通俗总结、一卦一断、**关于（含咨询微信号）** |
| 自检 | `npm test` → **8/8 套件通过**；`scripts/preflight.mjs` → 全部通过 |
| 许可 | `LICENSE`（MIT + 四条免责附加说明），GitHub 识别为 `Other`（自定义许可） |
| 截图 | `assets/screenshot-1..4.png`，已进 README 与目录条目 |

### 可用的安装方式（实测结论）

```powershell
# ✅ 推荐：本地 tarball（免 git、免联网、免代理）
dsh plugin --profile web add "$env:USERPROFILE\Desktop\dsh-liuyao-0.1.0.tar.gz"

# ✅ 联网方式（需要机器上有 git，且需代理）
dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v0.1.0"
```

| 方式 | 需 git | 需联网 | 实测 |
|---|---|---|---|
| 本地 `.tgz` / `.tar.gz` | ❌ | ❌ | ✅ 323ms |
| `github:…#v0.1.0` | ✅ | ✅ | ✅ 4s |
| Release 附件**直链** | ❌ | ✅ | ❌ `ERR_PNPM_MISSING_TARBALL_INTEGRITY` |

### 两个易踩的坑

1. **`dsh` 命令默认不在 PATH 里**（DSH 桌面版如此）。真实入口是
   `<安装目录>\resources\runtime\cli\bin\dsh.cmd`。给用户发东西时必须写清这一点。
2. **扩展名有讲究**：`.tgz` 与 `.tar.gz` 都能装；`.tgz` 在 Windows 里常被当成未知类型而隐藏，
   所以对外发送建议用 `.tar.gz`。**不要改成 `.zip`**（pnpm 按扩展名判断，会报
   `ERR_PNPM_NOT_PACKAGE_DIRECTORY`）。

> 直链失败的根因、已排除项与对照实验见 [KNOWN-ISSUE-install.md](KNOWN-ISSUE-install.md)。

## 二、⚠️ 受限网络下的代理前提

**Node 的 fetch（undici）不读 Windows 系统代理**，而 `curl` 与 `git` 会读——于是出现
"curl 能下载、pnpm 却失败"的假象。本地 tarball 方式不需要联网，不受影响；用联网方式时：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'    # 端口换成你自己代理的
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY='1'
```

| 症状 | 原因 |
|---|---|
| `TypeError: fetch failed` / `UND_ERR_CONNECT_TIMEOUT` | 没给 Node 设代理 |
| `DEPTH_ZERO_SELF_SIGNED_CERT` | 走了代理但代理做了 TLS 拦截 |

## 三、剩余事项

### 1. 看界面（只能你做，我无法读屏）

**完全退出 DSH 再重开**，刷新界面。重点确认：

- 先天八卦底纹是否遮字／挡点击
- 面板能否滚动到底
- 排盘表格是否溢出、六行是否齐全
- 「关于」面板在窄窗口下的排版、微信号复制按钮
- 深色模式对比度
- 「一卦一断」对话框的排版与拒答样式

### 2. 给朋友试用

发 `dsh-liuyao-0.1.0.tar.gz`（约 387 KB），并附 [SHARE.md](SHARE.md)。

### 3. 提收录 PR

**时机：2026-10-11 14:32（北京时间）之后。** 仓库创建于 2026-10-10 14:32，
gate 要求**仓库年龄 ≥ 1 天**；commit 门槛（≥ 10）已有 29 个。

把 [catalog-entry.json](catalog-entry.json) 作为一条新条目加进
[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
的 `plugins.json`，提 Pull Request。

| gate 门槛 | 状态 |
|---|---|
| 声明 `dsh.bundle` | ✅ |
| 仓库年龄 ≥ 1 天 | ⏳ 2026-10-11 14:32 之后 |
| commit 数 ≥ 10 | ✅ 29 个 |

年龄不足时 PR 会显示 `repository is X.X days old (needs 1) — resubmit in about 15h`——
这是**有意设计**（防刷收录），到点后官方 `regate.yml` 每 6 小时自动重跑转绿。

## 四、发布包与仓库的已知不一致

- **Release 附件**是 15:15 上传的（393,640 字节），**不含「关于」功能**
- **仓库代码**已含「关于」功能，最新打包为 387.3 KB（`0df1fe2e…`）

要一致，需要把 Release 附件换成最新包。**改由 npm 发布是更彻底的解法**：之后用户
`dsh plugin add dsh-liuyao` 即可，免 git、免 tarball、免扩展名问题。

## 五、之后：变现放在服务侧

插件本体在这个生态没有付费通路。收入走：**一对一断卦咨询 · 定制开发 · 教学 · 赞助**，
联系方式已内置在面板「关于」里（微信号 `Ljx_0609300`）。详见 [PUBLISHING.md](PUBLISHING.md)。
