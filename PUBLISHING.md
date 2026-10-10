# 上架与变现操作手册

面向维护者。目标：**插件免费上架拿曝光，收入放在服务侧。**

---

## 一、发布前必须完成的事（勾选）

- [x] **LICENSE 已补**（MIT）——此前 `package.json` 写 MIT 却没有 LICENSE 文件，属自相矛盾
- [x] **去掉 `private: true`**、版本改为 `0.1.0`（`1.0.0` 对未上架产品是虚标）
- [x] **`files` 白名单**：只发 `lib/ client/ src/ skills/ cordis.patch.yml README*.md LICENSE`，不带测试与非必要文件
- [x] **英文 README**（`README.en.md`）——社区目录与国外用户需要
- [x] **`npm test` 入口**：`node test/run-all.mjs`，8 个套件
- [x] **一条命令装成已实测**（见下）
- [x] **仓库地址已填**：`package.json` 的 homepage / repository / bugs 均指向 `https://github.com/ljxdsg12/dsh-liuyao`
- [ ] **截图**：至少 4 张（见第三节清单）
- [ ] **打出 tarball 并上传 GitHub Releases**
- [ ] **提 PR 到 community 目录**

## 二、打包与发布

```powershell
# 1) 打包（已验证可用；会按 files 白名单产出）
node "<pnpm 路径>" pack --pack-destination .

# 2) 建仓库并推送
git init; git add .; git commit -m "dsh-liuyao 0.1.0"
git remote add origin https://github.com/ljxdsg12/dsh-liuyao.git
git push -u origin main

# 3) 打 tag、建 Release，把 dsh-liuyao-0.1.0.tgz 作为附件上传
git tag v0.1.0; git push origin v0.1.0
```

Release 附件上传后，用户这条命令即可安装：

```bash
dsh plugin --profile web add "https://github.com/ljxdsg12/dsh-liuyao/releases/download/v0.1.0/dsh-liuyao-0.1.0.tgz"
```

### 安装链路实测记录（本机，已跑通）

**发布前（本地 tarball）**

| 步骤 | 结果 |
|---|---|
| `node pnpm.cjs pack` | 产出 `dsh-liuyao-0.1.0.tgz`（80 KB），白名单生效（无 test/ 与 node_modules） |
| `dsh plugin --profile liuyaotest add <本地 tgz>` | **exit 0**，301ms；profile 自动创建、依赖写入、bundles 自动追加 `dsh-liuyao` |
| 从安装目录 import 已装包 | `name=liuyao`、工具 3 个、路由 7 条；`山火贲` 排盘正常、文本含通俗总结 |

**发布后（公网 Release URL，模拟终端用户）**

| 步骤 | 结果 |
|---|---|
| `dsh plugin --profile verifyinstall add "https://github.com/…/v0.1.0/dsh-liuyao-0.1.0.tgz"` | **exit 0，2.5 秒**；profile 依赖写入该 URL，bundles 追加 `dsh-liuyao` |
| 从安装目录 import 已装包 | 工具 3 个、端点 7 条；`山火贲 → 地雷复` 排盘、8 个分析章节、含通俗总结与断卦依据 |
| 附件完整性 | 三方 SHA256 一致：本地 = 公网下载 = GitHub API 报告的 `311f9904…5161`，81,884 字节 |

### ⚠️ 两个必须知道的安装前提（都会导致"看起来是插件坏了"）

1. **必须走代理，且要给 Node/pnpm 显式设代理环境变量。**
   本机系统代理为 `127.0.0.1:7897`，但 **Node 的 fetch（undici）不读 Windows 系统代理**——
   `curl` 与 `git` 会读，所以会出现"curl 能下载、pnpm 却超时/证书错"的假象。实测：

   ```powershell
   $env:HTTP_PROXY='http://127.0.0.1:7897'; $env:HTTPS_PROXY='http://127.0.0.1:7897'
   $env:NODE_USE_ENV_PROXY='1'
   dsh plugin --profile web add "<Release URL>"
   ```

   不带这三个变量时表现为 `TypeError: fetch failed`（`UND_ERR_CONNECT_TIMEOUT`）；
   若代理做了 TLS 拦截则表现为 `DEPTH_ZERO_SELF_SIGNED_CERT`。**都要把"先设代理"写进用户须知。**

2. **优先发布 tarball，不要引导用户 `add github:<owner>/<repo>`。**
   从 git 源安装会让 pnpm 对着 registry 解析整份 lockfile，在受限网络下必然失败。
   tarball 路径不查 registry，2.5 秒装完。

## 三、截图清单（我无法代做，需你在浏览器里截）

建议 1280×800 以上，浅色与深色各半：

1. **整帧背景 + 卦盘主面板**：体现先天八卦底纹与整体气质（首图，决定点击率）
2. **六爻排盘表**：六神／伏神／六亲纳甲／本卦／变卦 六行齐全
3. **解读区**：条文带典籍出处 + 末尾的通俗总结块
4. **一卦一断对话框**：最好带上一条真实问答与「已问 N / 上限」
5. （可选）**手工输入**：六爻下拉里带三枚铜钱标记的选项

存放建议：`assets/screenshot-1.png` … 与目录 schema 的 `screenshots` 字段对应（用 raw.githubusercontent 链接）。

## 四、上架社区目录

清单地址：<https://awesome-dsh-plugin.com/plugins.json>（`dshmarket` 拉的就是它），
源仓库：`awesome-dsh-plugin/awesome-dsh-plugin`。提 PR 按以下字段填：

```json
{
  "name": "dsh-liuyao",
  "owner": "<your-github-id>",
  "url": "https://github.com/ljxdsg12/dsh-liuyao",
  "description": {
    "en": "Six-yao (I Ching) divination for DeepSeek Harness: xiantian bagua backdrop, Zhouyi opening verse, manual or coin-toss casting, najia charting with six relatives / six gods / void / hidden spirits, strictly sourced interpretation, plain-language recap, and a one-hexagram-one-question follow-up dialog.",
    "zh": "六爻算卦插件：先天八卦盘背景、周易开场辞、手工或电脑摇卦、六亲/六神/旬空/伏神纳甲排盘、逐条注明典籍出处的解读、通俗总结，以及「一卦一断」追问对话框。"
  },
  "category": "fun",
  "npm": null,
  "install": "dsh plugin --profile web add \"https://github.com/ljxdsg12/dsh-liuyao/releases/download/v0.1.0/dsh-liuyao-0.1.0.tgz\"",
  "screenshots": ["https://raw.githubusercontent.com/ljxdsg12/dsh-liuyao/HEAD/assets/screenshot-1.png"]
}
```

分类建议 `fun`（娱乐）或 `tools`（工具）。**不要**在描述里承诺"准确"——目录审核与用户都会盯着这一点。
`capabilities` 一栏会由目录方的审计生成：本插件应为空列表（无 fs-write / network / env / credentials），
这是可以写进宣传的加分项。

## 五、变现：钱在服务侧

插件本体在这个生态**没有付费通路**（全库 4471 条，schema 里没有价格／订阅／授权字段）。
所以：

| 收钱的地方 | 怎么收 | 备注 |
|---|---|---|
| **一对一断卦咨询** | 按次／按小时 | 插件是你的漏斗：免费装上的人里，少数会来问 |
| **定制开发** | 按项目 | 加门派规则、加纳音断法、改盘面风格、批量排盘、多人合盘、导出 PDF 报告 |
| **教学** | 课程／陪跑 | 「六爻 + 大模型」是个现成的选题 |
| **赞助** | README 放赞助入口 | 国内可放爱发电，海外可放 GitHub Sponsors |

**别做的**：给插件加激活码收费。纯 JS 必被绕过，且会招致反感、断掉传播。

## 六、维护承诺（写进 README 会更可信）

本插件依赖 DSH 的运行期契约，会随上游变化：`webServer.register` 路由形状、`ctx.tools.register`
的原始 JSON Schema 子集、槽位键（`main` / `sidebar.panellist`）与客户端 bundle 格式。
上游大版本升级后需要重新验证——**在 README 里写明你验证过的 DSH 版本与复验承诺**，
这是付费用户最在意的部分，也是免费插件作者最容易忽略的部分。

已知同源风险点（升级时优先复验）：

- `client/client.js` 里 `[class*="_sidebarCol"]` / `[class*="_centerCol"]` 的按列底纹选择器
  （应用本体是 hash 化 CSS module，类名可能随构建变化）
- Host 端点走 `kind: 'exact'`，依赖"exact 优先于静态兜底"的匹配顺序
- 工具 schema 必须留在受支持子集内（见 `src/schema-check.mjs`，它会替你抓违规）
