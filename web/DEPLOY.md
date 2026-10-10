# 网站版：本地预览与部署

同一套核心（`src/`）现在有两个外壳：DSH 插件（`lib/` + `client/`）与网站（`web/`）。
**核心逻辑只有一份**，改 `src/` 后运行同步脚本，两边一起生效。

## 目录

```
web/
├── index.html        页面骨架
├── app.js            界面（复用插件的 .ly-* 样式与 DOM 结构）
├── liuyao.js         数据层：排盘/断卦/摇卦/开场辞（纯函数，替代 Host 半）
├── styles.css        插件样式（由 scripts/extract-styles.py 从 client.js 提取，勿手改）
├── web.css           网页专属样式（表单控件、布局等）
└── core/             ← 由 scripts/sync-web-core.mjs 从 src/ 复制，勿手改
```

## 本地预览

```powershell
node scripts/serve-web.mjs           # http://127.0.0.1:8090
node scripts/serve-web.mjs 3000      # 换端口
node scripts/serve-web.mjs 3000 lan  # 允许局域网访问（同一 WiFi 下朋友可直接打开）
```

> `lan` 模式会监听 `0.0.0.0`，需要放行防火墙。适合**临时给身边人试用**，不适合长期对外。

## 改了核心逻辑之后

```powershell
node scripts/sync-web-core.mjs       # 把 src/ 同步到 web/core/
node scripts/web-selftest.mjs        # 31 项自检（含 DOM 桩渲染验证）
```

## 与插件的差异（有意为之）

| 功能 | 插件 | 网站 |
|---|---|---|
| 起卦、排盘、断卦、通俗总结 | ✅ | ✅ 完全一致（同一份核心） |
| 开场辞 | ✅ | ✅ |
| **一卦一断追问** | ✅ 调本机模型 | ❌ **不做**——需要后端代理，否则 API key 会暴露在网页里 |
| 「关于」面板 | ✅ | ⬜ 待加（可放咨询微信与免责声明） |

## 部署：Cloudflare Pages（免费、免备案）

**注册与部署**

1. 注册 <https://dash.cloudflare.com>（邮箱即可，免费）
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. 项目名填 `liuyao`（决定网址：`liuyao.pages.dev`）
4. 把 **`web/` 目录里的全部文件**拖进去上传
   - ⚠️ 要包含 `core/` 子目录
   - ⚠️ 不要上传上层目录（`src/`、`lib/`、`client/`、测试等都不需要）
5. 点 **Deploy**，几十秒后得到 `https://liuyao.pages.dev`

**之后更新**

重新拖一次上传即可（或改一次 `web/` 再部署）。也可以接 GitHub 仓库做自动部署：
推送到 `main` 后自动发布——但要在 Pages 设置里指定**构建输出目录为 `web`**，且无需构建命令。

### 其他托管选择

| 平台 | 国内访问 | 备案 | 说明 |
|---|---|---|---|
| Cloudflare Pages | 一般可用 | 免 | **推荐起步**，免费、额度宽 |
| Vercel | 不稳定 | 免 | 部署最简单，但国内时有打不开 |
| Netlify | 一般 | 免 | 与 Cloudflare 类似 |
| GitHub Pages | 慢 | 免 | 仓库已公开，开启即可；速度是短板 |
| 阿里云 OSS / 腾讯云 COS | **最快** | **需 ICP 备案** | 有付费用户后再考虑 |

> **备案提醒**：用国内服务器 + 国内域名对外提供网站，法律上需要 ICP 备案（个人可备，免费，约 1–3 周，
> 且域名需实名）。**用境外托管（Cloudflare 等）不需要备案**，代价是国内访问速度不稳。
> 这属于合规事项，请以你所在地的现行规定为准。

## 已知限制（诚实说明）

- **追问功能没有搬过来**。纯静态站无法安全地调用模型 API（key 会泄露）。若要做，需要
  自己写一个后端代理并加限流，否则额度会被刷光。
- **界面渲染我未能亲眼验证**：开发过程中无法读屏，只做了 DOM 桩层面的自动化检查
  （31 项通过）。实际观感、响应式换行、深色模式效果需要人看。
- 核心是从插件同步的副本，**改动只在 `src/`**；直接改 `web/core/` 会在下次同步时被覆盖。
