# 上架进度与剩余事项

**状态（2026-10-13 更新）：收录 PR 已提交，等官方 CI 与评审。**
只剩「看界面」需要你做。

| 里程碑 | 状态 |
|---|---|
| v0.2.0 发布（Release + 资产） | ✅ [Release](https://github.com/LJXDSG12/dsh-liuyao/releases/tag/v0.2.0) |
| 仓库加 `dsh-plugin` topic | ✅ 已加（另加 `deepseek-harness`/`dsh`/`liuyao`） |
| 收录 PR | ✅ **[PR #7252](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7252)** |
| 官方 `PR check` 工作流 | ✅ **success**（2026-10-13 14:00，run 38353713683） |
| 官方 `Submission gate` 工作流 | ✅ **success**（14:01，check run 115153917745）——「Entries look good: All 1 submitted entry passes: `dsh.bundle` declared, repo old enough, enough commits.」 |
| 等维护者合并 | ⏳ **两道官方检查都已通过**，PR `mergeable=true`，剩下就是人工评审 |

---

## 一、已完成并验证（截至 2026-10-13）

| 项目 | 证据 |
|---|---|
| 公开仓库 | <https://github.com/ljxdsg12/dsh-liuyao>（公开、默认分支 main，HEAD 见 `git log origin/main -1`） |
| 代码 | `main`，标签 `v0.2.0` 与 HEAD 一致（已强制前移对齐） |
| Release | <https://github.com/LJXDSG12/dsh-liuyao/releases/tag/v0.2.0>，id `411325729`，`prerelease: false`（Latest） |
| Release 附件 | `dsh-liuyao-0.2.0.tgz`，**438,575 字节**，SHA256 `8bc9c30913e344b7a2893e31b64aec290e65c91421d3d070f2d07bf3293f94be`，41 个条目 |
| 资产一致性 | 公网下载回来的 SHA256 **与本地逐字节一致**（已实测） |
| 本地安装实测 | `dsh plugin add <tarball>` → **323ms**，免 git、免联网、免代理 |
| 联网安装实测 | `dsh plugin add "github:ljxdsg12/dsh-liuyao#v0.2.0"` → **4s**（需 git + 代理） |
| **Release 直链安装实测** | ✅ **`Done in 5.3s`**，连装三次 exit 0，lockfile 条目带完整 `integrity`（**此前的「不可用」结论已推翻，见下**） |
| 装后可用性 | 工具 3 个、端点 8 条；`山火贲 → 地雷复`、含通俗总结与断卦依据 |
| 功能 | 起卦（手工／电脑摇卦）、排盘、**AI 断卦（逐条注明出处，可切规则断卦）**、通俗总结、**一卦一断（全 AI 判定）**、关于（含咨询微信号）、**静态网站版** |
| 自检 | `npm test` → **11/11 套件通过**；`scripts/preflight.mjs` → 全部通过 |
| 许可 | `LICENSE`（MIT + 四条免责附加说明），GitHub 识别为 `Other`（自定义许可） |
| 截图 | `assets/screenshot-1..4.png` + `screenshots.json`（官方新约定），已进 README 与目录条目 |

### 可用的安装方式（实测结论，2026-10-13 复核）

```powershell
# ✅ 推荐：Release 直链（钉住 tag；免 git，需联网/代理）
dsh plugin --profile web add "https://github.com/LJXDSG12/dsh-liuyao/releases/download/v0.2.0/dsh-liuyao-0.2.0.tgz"

# ✅ 本地 tarball（免 git、免联网、免代理）
dsh plugin --profile web add "$env:USERPROFILE\Desktop\dsh-liuyao-0.2.0.tar.gz"

# ✅ git 方式（需要机器上有 git，且需代理）
dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v0.2.0"
```

| 方式 | 需 git | 需联网 | 实测 |
|---|---|---|---|
| 本地 `.tgz` / `.tar.gz` | ❌ | ❌ | ✅ 323ms |
| `github:…#v0.2.0` | ✅ | ✅ | ✅ 4s |
| Release 附件**直链** | ❌ | ✅ | ✅ **5.3s**（见下方更正） |

> ⚠️ **更正一条此前写错的结论。** 这里原先写「Release 直链不可用，报
> `ERR_PNPM_MISSING_TARBALL_INTEGRITY`」——**现在实测可用，连装三次都成功**。
> 当初失败的真正原因很可能是：**同一个 URL 上的资产被删掉重传过**（换了内容、URL 没变），
> pnpm 对远程 tarball 的元数据缓存与实际资产对不上。**钉住 tag 之后这个隐患消失**——
> 发新版就换 URL，不会再撞缓存。`KNOWN-ISSUE-install.md` 保留作过程记录，
> 但结论以本文件为准。
>
> 另：`pnpm-workspace.yaml` 里的 `minimumReleaseAge: 1440` 配了
> `minimumReleaseAgeIgnoreMissingTime: true`，正是它让「没有发布时间元数据的 GitHub tarball」
> 能通过供应链策略。

1. **`dsh` 命令默认不在 PATH 里**（DSH 桌面版如此）。真实入口是
   `<安装目录>\resources\runtime\cli\bin\dsh.cmd`。给用户发东西时必须写清这一点。
2. **扩展名有讲究**：`.tgz` 与 `.tar.gz` 都能装；`.tgz` 在 Windows 里常被当成未知类型而隐藏，
   所以对外发送建议用 `.tar.gz`。**不要改成 `.zip`**（pnpm 按扩展名判断，会报
   `ERR_PNPM_NOT_PACKAGE_DIRECTORY`）。

> 直链失败的根因、已排除项与对照实验见 [KNOWN-ISSUE-install.md](KNOWN-ISSUE-install.md)。

### 两个易踩的坑

1. **`dsh` 命令默认不在 PATH 里**（DSH 桌面版如此）。真实入口是
   `<安装目录>\resources\runtime\cli\bin\dsh.cmd`。给用户发东西时必须写清这一点。
2. **扩展名有讲究**：`.tgz` 与 `.tar.gz` 都能装；`.tgz` 在 Windows 里常被当成未知类型而隐藏，
   所以对外发送建议用 `.tar.gz`。**不要改成 `.zip`**（pnpm 按扩展名判断，会报
   `ERR_PNPM_NOT_PACKAGE_DIRECTORY`）。
3. **插件只装到它被启动的那个 profile 时才生效**。装到别的 profile，界面毫无变化
   ——这条真实坑过一次（安装器曾固定用 `--profile web`，而实际在用的是 `desktop`）。
   安装器现已自动识别 profile。

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
- **AI 断卦**：耗时是否可接受（可调 `analysisReasoning` / `analysisDepth`）
- **同一卦连续两次 AI 断卦，解读应基本一致**（温度已默认 0.2；要完全一致可设 0）

### 2. 给朋友试用

发 `dsh-liuyao-0.2.0.tgz`（约 428 KB），并附 [SHARE.md](SHARE.md)。
或直接把 Release 链接给他：
<https://github.com/LJXDSG12/dsh-liuyao/releases/tag/v0.2.0>

### 3. 收录 PR —— ✅ 已提交

**[PR #7252](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7252)**，
fork `ljxdsg12/awesome-dsh-plugin` 分支 `add-liuyao-plugin`，单提交 `3e6d840`，
相对上游 `ca053d9` 仅「1 个文件 +7 行」，符合官方「一个 PR 只加一个文件」。

| gate 门槛 | 状态 |
|---|---|
| 声明 `dsh.bundle` | ✅ |
| 仓库年龄 ≥ 1 天 | ✅（建库 2026-10-10T06:32:05Z，已 3 天多） |
| 仓库加 `dsh-plugin` topic | ✅ |
| `tarball` 指向 GitHub Release 资产 | ✅ 实测 HTTP 200、SHA256 与本地一致 |

CI 若报错，**在同一分支推修复即可，不用重开 PR**。用 `node scripts/check-pr-status.mjs` 查状态。

## 四、发布包与仓库的一致性 —— ✅ 已解决

原先：Release 附件与仓库代码不是同一份（附件缺「关于」功能，后来又缺网站版）。
现在：附件由当前 HEAD（`d74f9cf`）重新打包，**公网下载回来的 SHA256 与本地逐字节一致**。

还剩一个**已知的文档漂移风险**（不是错误，是提醒）：
`package.json` 的 `files` 白名单必须覆盖所有要进包的目录。这次就漏了 `web/`，
导致「发布说明写了包里带网站版、而包里其实没有」。以后往包里加目录，记得同步改白名单。
**现在有机器兜底了**：`node scripts/preflight.mjs --pack` 会真打一个包再对账，
白名单漏目录、发布说明承诺的文件不在包里，都会报错。

### 发布新版的操作顺序（用脚本，别手打）

```bash
node scripts/bump-version.mjs 0.3.0      # 一处改、全仓库同步引用
node scripts/preflight.mjs --pack        # 必须「全部通过」才继续
node test/run-all.mjs                    # 11/11
git commit -am "chore: 0.3.0" && git push origin main
git push -f origin refs/tags/v0.3.0      # 标签必须与 HEAD 对齐
node scripts/create-release.mjs <tarball>  # 建 Release + 传资产 + 验直链 200/SHA256
node scripts/check-market-requirements.mjs # 官方要求逐条复核
```

收录条目里 `tarball:` 的 tag 要跟着改；`README` 里的安装命令由 `bump-version.mjs` 同步，
但**条目文件是手写的**，改版时记得一起改（`check-market-entry.mjs` 会校验格式，不校验版本号）。

**npm 发布仍是一个可选改进**：之后用户 `dsh plugin add dsh-liuyao` 即可，
免 git、免 tarball、免扩展名问题，市场还能显示下载量。收录与否不受影响。

## 五、之后：变现放在服务侧

插件本体在这个生态没有付费通路。收入走：**一对一断卦咨询 · 定制开发 · 教学 · 赞助**，
联系方式已内置在面板「关于」里（微信号 `Ljx_0609300`）。详见 [PUBLISHING.md](PUBLISHING.md)。
