# 上架：剩下只有你能做的四件事

到这里为止，**与代码和文件有关的部分已经全部完成并验证**。剩下四步都需要你的 GitHub 账号，
我无法代做（也不该代做——涉及你的凭据）。每一步我都把命令和要点准备好了。

---

## 第 0 步：已为你准备好的东西（复核用）

| 项目 | 状态 |
|---|---|
| 许可 | `LICENSE`（MIT + 四条免责附加说明）✅ |
| 元数据 | `package.json`：版本 `0.1.0`、无 `private`、三处地址指向 `LJXDSG12/dsh-liuyao` ✅ |
| 文档 | `README.md`（中文）、`README.en.md`（英文）、`PUBLISHING.md`、`VERIFICATION.md` ✅ |
| 本地仓库 | 已 `git init`，**16 个提交**，已打标签 `v0.1.0`，工作区干净 ✅ |
| 发布产物 | `dsh-liuyao-0.1.0.tgz`（80 KB，19 个条目）✅ |
| 产物实测 | 装进干净 profile → 加载成功（3 工具 / 7 端点）→ 排盘 `天雷无妄`、8 章节、含通俗总结 ✅ |
| 收录条目 | `catalog-entry.json`（按目录 schema 填好，含中英双语描述）✅ |
| Release 文案 | `RELEASE-NOTES-v0.1.0.md` ✅ |

本地仓库的提交历史（真实的项目切片，不是空提交充数）：

```
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
```

---

## 第 1 步：建公开仓库（你在做的那一页）

GitHub「创建新的仓库」表单里：

| 字段 | 填 |
|---|---|
| 所有者 | `LJXDSG12` |
| 存储库名称 | **`dsh-liuyao`** ← 把 `123456` 改掉 |
| 描述 | 可复制 `catalog-entry.json` 里 `description.zh` 那段 |
| 可见度 | 公共 |
| 添加 README | 开（推送时会覆盖，不冲突） |
| 添加 .gitignore | **选「没有」**（本地已有 `.gitignore`，GitHub 生成会冲突） |
| 添加许可 | **选「无执照」**（保住本地那份带附加说明的 LICENSE） |

> ⚠️ **建仓时间就是 gate 的计时起点**。gate 要求仓库年龄 ≥ 1 天（按 `created_at` 精确到分钟），
> 所以越早建越好，后面 24 小时正好用来打磨截图。

## 第 2 步：推送代码

仓库建好后，在 PowerShell 里执行（`git` 我已通过 winget 装好）：

```powershell
cd C:\Users\24568\Documents\deepseek-harness\default-workspace\liuyao-dsh-plugin
git remote add origin https://github.com/LJXDSG12/dsh-liuyao.git
git push -u origin main
git push origin v0.1.0
```

**推送时会要求登录凭据。用 Personal Access Token，不要用账号密码**（GitHub 早已停用密码推送）：

1. 打开 <https://github.com/settings/tokens> → Generate new token (classic)
2. 勾选 **`repo`**（含 `public_repo`）
3. 生成后复制那串 `ghp_...`，**当密码粘贴**，用户名填 `LJXDSG12`

> 我把命令写好但没替你执行——因为执行需要你的 token，而 token 不应该给我。

## 第 3 步：建 Release 并上传 tarball

1. 打开 `https://github.com/LJXDSG12/dsh-liuyao/releases/new`
2. **Choose a tag** 选已推送的 `v0.1.0`
3. 标题：`dsh-liuyao v0.1.0`
4. 说明：把 [RELEASE-NOTES-v0.1.0.md](RELEASE-NOTES-v0.1.0.md) 全文粘进去
5. **Attach binaries**：上传 `dsh-liuyao-0.1.0.tgz`（就在项目根目录）
6. 发布

发布后这条命令就能装（我已在干净 profile 里实测过同样的产物）：

```bash
dsh plugin --profile web add "https://github.com/LJXDSG12/dsh-liuyao/releases/download/v0.1.0/dsh-liuyao-0.1.0.tgz"
```

## 第 4 步：截图 + 提收录 PR

**截图**（只能你来，我全程无法读屏）。存到仓库 `assets/` 目录，命名 `screenshot-1.png` … `screenshot-4.png`，
与 `catalog-entry.json` 里的链接对应：

1. 整帧八卦底纹 + 卦盘主面板（首图，决定点击率）
2. 六爻排盘表（六神／伏神／六亲纳甲／本卦／变卦 六行齐全）
3. 解读区（条文带出处 + 末尾的通俗总结块）
4. 一卦一断对话框（带一条真实问答）

**提 PR**：把 `catalog-entry.json` 的内容作为一条新条目，加进
[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
的 `plugins.json`，然后提 Pull Request。

### 收录 gate 的三条硬门槛（我查证过，写下来免得你踩坑）

| 门槛 | 你的状态 |
|---|---|
| 声明 `dsh.bundle` | ✅ 已有 |
| **仓库年龄 ≥ 1 天** | ⏳ 建仓后等 24 小时 |
| **commit 数 ≥ 10** | ✅ 已有 16 个 |

年龄不足时 PR 会红：`repository is X.X days old (needs 1) — resubmit in about 15h`。
这是**有意设计**（防刷收录），不是你提交有问题。到点后官方 `regate.yml` 每 6 小时自动重跑并转绿；
想提前可以往 PR 分支推一个空提交戳一下（官方指南明确说这是有效路径）。

---

## 之后：变现放在服务侧

插件本体在这个生态没有付费通路（目录 4471 条，schema 里没有价格字段）。所以收入走：

**一对一断卦咨询 · 定制开发（加门派规则／批量排盘／导出报告） · 教学 · 赞助**

`PUBLISHING.md` 第五、六节写了具体做法，以及**维护承诺与升级复验点**——付费用户最在意这个。
