# 安装方式与已知问题

日期：2026-10-10　　DSH `0.2.0-rc.2` / pnpm `11.7.0` 实测

## ✅ 可用的安装方式（两种，都已实测）

### 方式一：git 规格（在线，推荐）

```bash
dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v0.2.0"
```

实测：**2.5 秒，exit 0**，安装后加载正常（3 个工具 / 7 个端点，`山火贲 → 地雷复` 排盘正常）。

- 走 pnpm 的 gitHosted 路径，**不受下面那个 integrity 问题影响**
- 需要机器上有 `git`（pnpm 会调用它解析引用）
- **必须用分支或标签引用**（`#v0.1.0` / `#main`），**不能用 commit 短哈希**——
  pnpm 用 `git ls-remote` 解析，它只返回分支与标签，短哈希会报
  `Could not resolve <sha> to a commit`

### 方式二：本地 tarball（离线，最稳）

```powershell
# 从 Release 页面下载 dsh-liuyao-0.2.0.tgz，然后：
dsh plugin --profile web add .\dsh-liuyao-0.2.0.tgz
```

实测：**330ms，exit 0**，截图等全部文件随包。

## ❌ 不可用：Release 的 tarball 直链

```bash
dsh plugin --profile web add "https://github.com/ljxdsg12/dsh-liuyao/releases/download/v0.2.0/dsh-liuyao-0.2.0.tgz"
```

报错：

```
[ERR_PNPM_MISSING_TARBALL_INTEGRITY] Cannot install package "dsh-liuyao@https://…":
its lockfile entry has no "integrity" field, so pnpm cannot verify the downloaded tarball.
```

### 根因（已定位到 pnpm 源码）

pnpm 的 `pkgSnapshotToResolution()` 在
**`resolution` 既无 `integrity`、又无 `type`、且不是 `file:` 或 git-hosted** 时抛这个错。

对照实验显示：**同一个 pnpm、同一个 URL，直接 `pnpm add` 能成功并在 lockfile 里写入 `integrity`；
经由 DSH 安装器流程却写出不含 `integrity` 的条目**，于是后续那次安装就抛错。
差异在安装器的执行路径，不在 URL、产物或网络。

### 已排除的原因（都做过对照实验，别再重复排查）

| 假设 | 实验 | 结果 |
|---|---|---|
| 产物损坏或上传错文件 | 本地 / 公网 / GitHub API 三方 SHA256 比对 | 完全一致 |
| 残留 lockfile 污染 | 删净 profile 全新安装 | 仍失败 |
| `minimumReleaseAge` 策略 | 写入 `minimumReleaseAge: 0` | 仍失败 |
| `minimumReleaseAgeExclude` 缺规则 | 手工追加 `dsh-liuyao` | 仍失败 |
| 包体积变大（80→384 KB） | 同一产物走本地路径 | **成功**，与体积无关 |
| pnpm 本身装不了该 URL | 隔离目录直接 `pnpm add` | **成功** |
| URL 带校验和 | `?checksum=sha512:…` | 直连成功、安装器仍失败 |
| git 规格绕开 | `github:…#v0.1.0` | **成功**（当前推荐方案） |

### 待办

- [ ] 向 pnpm 或 DSH 反馈：安装器写出的远程 tarball lockfile 条目缺 `integrity`
- [ ] 解掉之后，可把 tarball 直链写回文档与目录 `install` 字段
- [ ] 另一条彻底绕开的路：发布到 npm，用户按包名安装（`dsh plugin add dsh-liuyao`）

## 附带发现：`v0.1.0` 标签过旧

`v0.1.0` 指向 `1c6c502`（打包脚本那次提交），**不含 `assets/` 截图与后加的文档**，
而 Release 附件是后来重打的、含截图。二者不一致。

处理：把 `v0.1.0` 标签前移到最新提交并强推（版本未变、Release 与附件不变），
使 git 安装与 tarball 安装的内容一致。
