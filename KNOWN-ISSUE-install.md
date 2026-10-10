# ⚠️ 发布后发现的安装问题（需优先处理）

日期：2026-10-10　发现人：本次交付过程实测

## 现象

从 GitHub Release 的**公网 URL** 安装，**现在稳定失败**：

```
dsh plugin --profile web add "https://github.com/ljxdsg12/dsh-liuyao/releases/download/v0.1.0/dsh-liuyao-0.1.0.tgz"

[ERR_PNPM_MISSING_TARBALL_INTEGRITY] Cannot install package "dsh-liuyao@https://…":
its lockfile entry has no "integrity" field, so pnpm cannot verify the downloaded tarball.
```

而**同一个产物从本地路径安装稳定成功**（330ms）：

```powershell
dsh plugin --profile web add C:\path\to\dsh-liuyao-0.1.0.tgz
```

## 已排除的原因（都做了对照实验）

| 假设 | 实验 | 结果 |
|---|---|---|
| 产物损坏 | 三方 SHA256 比对（本地／公网／GitHub API） | 完全一致，排除 |
| 替换附件留下残留 lockfile | 删净 profile 后全新安装 | 仍失败，排除 |
| `minimumReleaseAge` 供应链策略 | 手工写入 `minimumReleaseAge: 0` 后重装 | 仍失败，排除 |
| `minimumReleaseAgeExclude` 缺规则 | 手工追加 `dsh-liuyao` 规则后重装 | 仍失败，排除 |
| 包体积变大（80 KB → 384 KB，新增 assets） | 同一新产物走**本地路径**安装 | **成功**，故与体积/内容无关 |
| pnpm 本身不能装该 URL | 隔离目录直接 `pnpm add <URL>` | **成功**，只在 DSH 安装器流程中失败 |

**结论**：失败只发生在「DSH 安装器的两步流程 + 公网 tarball URL」这一组合上。
安装器先 `pnpm add`（生成的 lockfile 对远程 tarball 不写 `integrity`），
随后再跑一次校验型安装时即报错。本地路径会直接落 `integrity`，所以不受影响。

## 值得注意的时间线

同一 URL 在**替换附件之前**曾两次安装成功（`verifyinstall`、`liuyaorelease` 两次验证），
替换附件之后开始稳定失败。差异不止体积：附件被删除并重新上传，`created_at` 变了。
**怀疑与 pnpm 对远程 tarball 的元数据缓存/校验路径有关，尚未确证。**

## 现在的可用安装方式（已验证）

1. **下载后本地安装（推荐，已验证）**
   ```powershell
   # 从 Release 页面下载 dsh-liuyao-0.1.0.tgz，然后：
   dsh plugin --profile web add .\dsh-liuyao-0.1.0.tgz
   ```
2. **从 git 源安装**：未验证，且会触发 registry 校验（受限网络下会报证书错），不推荐。
3. ~~公网 tarball URL~~：**当前不可用**，不要写进用户文档。

## 待办

- [ ] 排查 pnpm 11.7.0 在 DSH 安装器流程下对远程 tarball 的 `integrity` 行为
      （可尝试：改由 npm 发布后按包名安装；或把 tarball 同时挂到 npm registry）
- [ ] 在查清之前，README / Release 说明里的安装命令**改为"下载后本地安装"**
- [ ] `catalog-entry.json` 的 `install` 字段同样要改，否则用户按目录说明装会失败
- [ ] 确认后重新验证一次公网 URL 安装，再把在线安装方式写回文档

## 对收录 PR 的影响

收录目录的 `install` 字段若指向这个 URL，用户会装不上。**建议先解决本问题再提收录 PR**，
或把 `install` 暂改为本地安装说明。
