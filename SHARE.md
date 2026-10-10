# dsh-liuyao —— 安装与使用（给朋友的说明）

一个 DeepSeek Harness 的六爻算卦插件：先天八卦为盘、火珠林纳甲为法、增删卜易为断。

仓库：<https://github.com/ljxdsg12/dsh-liuyao>

---

## 一、安装（一条命令）

在 PowerShell 里执行：

```powershell
dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v0.1.0"
```

看到 `Done in …s` 就成功了。然后：

1. **完全退出 DeepSeek Harness 再重新打开**（Host 半只在启动时加载，必须重启才生效）
2. 刷新界面（`Ctrl+R`）

界面里会出现「**六爻**」主面板与侧边栏图标。

> 把 `web` 换成你自己的 profile 名也可以。不确定就用 `web`，安装器会自动创建。

## 二、装不上怎么办

### 情况 1：提示 `'git' 不是内部或外部命令`

这个安装方式需要机器上有 **git**。装一个即可：<https://git-scm.com/download/win>（一路默认下一步）。

### 情况 2：连不上 GitHub / 超时 / 证书错误

国内网络访问 GitHub 通常需要代理。如果报 `fetch failed`、`ETIMEDOUT`、`DEPTH_ZERO_SELF_SIGNED_CERT`，
**先开代理**，并给命令行显式指定（Node 不会自动读系统代理）：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'    # 端口换成你自己代理的端口
$env:HTTPS_PROXY='http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY='1'
dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v0.1.0"
```

### 情况 3：实在不行，用离线包

从 <https://github.com/ljxdsg12/dsh-liuyao/releases/tag/v0.1.0> 下载 `dsh-liuyao-0.1.0.tgz`，
然后本地安装（**不需要联网，也不受代理影响**）：

```powershell
dsh plugin --profile web add .\dsh-liuyao-0.1.0.tgz
```

> ⚠️ 不要用那个附件的**直链**安装（`add "https://github.com/…tgz"`）。DSH 安装器目前对远程 tarball
> 写出的 lockfile 条目缺 `integrity` 字段，pnpm 会报 `ERR_PNPM_MISSING_TARBALL_INTEGRITY`。
> 这是安装器与 pnpm 的问题，不是包的问题——**下载到本地再装就没问题**。

## 三、怎么用

1. **所问之事必须填**（如「问今年财运」「问这次面试能否通过」）。不填就只排盘、不下吉凶结论——
   这是刻意的纪律：六爻断卦第一步就是「取用神」，不知道问什么就取不了用神。
2. 选**起卦方式**：
   - **手工输入卦象**：你自己摇了三枚硬币／铜钱，照结果在六个下拉里选。每个选项都标了对应的
     钱文（`●●●　老阳 三背（动）`），不懂术语也能填。
   - **电脑摇卦**：没有硬币时用。系统用加密随机数模拟抛三枚铜钱，逐爻抛，默认**每抛一次前先问你确认**。
3. 点「**起卦 / 排盘**」，出卦盘与解读。
4. 解读末尾有「**通俗总结**」——把术语翻成白话的结论与建议；前面是逐条注明典籍出处的断语。
5. 解读之后有「**一卦一断**」对话框，可以就**这一卦**继续追问（如「应期大概什么时候」）。
   与本次所问无关的问题会被直接拒答，请你另起一卦——这是一卦一断的规矩，不是故障。

## 四、你需要知道的边界

- **不承诺预测准确率**。断语只输出典籍有明文依据的部分，典籍无明文者不作推断。
- 「一卦一断」的追问答案由**你自己配置的模型**生成，其内容取决于该模型。
- 属中国传统文化研究工具，**仅供文化参考与娱乐**，不构成医疗、法律、投资等任何专业建议。
- 插件**零 npm 依赖、无网络访问、不写文件、不读凭据**。面板右上角「关于」里有完整说明，
  还能看到历法自检锚点（干支历与通胜万年历的核对结果）。

## 五、遇到问题

- 面板里点「**关于**」→ 能看到版本、已验证环境与自检锚点，报问题时把这些一并发来
- 或直接在 <https://github.com/ljxdsg12/dsh-liuyao/issues> 提 issue

用着有什么不顺手的地方，直接告诉我，我改。
