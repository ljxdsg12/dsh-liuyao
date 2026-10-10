# 交付验证记录（dsh-liuyao）

日期：2026-10-10　　profile：desktop　　已装包：`~/.dsh/profiles/desktop/node_modules/dsh-liuyao` → junction 指向工作区仓库

## 〇之七、本轮新增：解读之后的「一卦一断」追问对话框

**需求**：解读之后给一个对话框继续提问，但问题必须与本卦严格相关，守一卦一断，并在对话框上标注。

**实现**：新增 `POST /dsh-liuyao/ask`（NDJSON 流式）＋ 客户端 `AskDialog` 组件，两道关卡。

第一道在 Host 侧、**确定性、不消耗模型**（`src/followup.mjs` 的 `checkScope()`）：

| 情形 | 判定 | 举例 |
|---|---|---|
| 命中卦内术语 | 放行 | 「三爻妻财动而化回头克，钱是不是留不住？」「世爻逢空是什么意思？」「用神两现取哪个？」 |
| 明确回指本卦 | 放行 | 「那它什么时候能出空？」「此卦变卦入他宫怎么讲？」 |
| 要另起一卦 | 拒答 → 引导另起一卦 | 「再起一卦问问别的」「换一个卦」 |
| 与卦无关 | 拒答（kind=unrelated） | 「帮我写一段 Python 代码」「今天天气怎么样」 |
| 太短 | 拒答（kind=too-short） | 「嗯」 |

判定放宽的坑也踩过并修掉：早期用"短句＋指代词即算追问"，会把「我明天该不该跟老板吵架」放进模型；
现改为**必须回指本卦**（含"卦/爻"的指代，或指代＋疑问句式），并加了回归用例。

第二道在模型侧：系统提示词内嵌整份卦象（四柱／旬空／六爻纳甲·六亲·六神·旺衰·动变·伏神／合局／
用神／已下结论），并硬性规定——只答本次所问之事、不得引入其他卦、不得凭空编造、
每条结论落到具体爻位并注明典籍出处、禁用套话、卦中无据就明说"不能断"、长度 300 字内。

**标注**：对话框头部显著标注 `一卦一断`，并写明「只答与本次所问『X』直接相关的问题……要问别的事，请另起一卦」，
右侧显示「已问 N / 上限」。

**模型来源**：`ctx.get('llm')` → `prepareCall()` → `stream()`；模型取 `ctx.agentDefaultModel.currentSelection()`
（本机为 deepseek-official／deepseek-flash），可用 `followUpProvider`／`followUpModel` 单独指定；
未挂载 llm 时返回可读提示而非报错。

**测试**（新增 `test/followup.test.mjs`，共 8 个套件）：9 条应放行、7 条应拦下（含归类与理由）、
拒绝文本、卦象上下文完整性（含四柱／旬空／用神／已下结论，且无 undefined 泄漏）、
提示词约束逐条检查、计数与上限。
`test/host.test.mjs` 另以桩 llm 实测端点：越界拒答且**零模型调用**、另起一卦拒答、
达上限拒答、合法提问按增量推送且 `done` 为全文拼接、提示词含一卦一断与具体爻象、
只送本次提问／带历史时连历史一并送、非法爻值 400、跨站 403、缺 llm 时的可读提示。
`test/client.test.mjs` 另覆盖 AskDialog 的存在性、位置（在 `AnalysisView` 之后）、
流式端点调用、一卦一断标注、配置开关、Ctrl/⌘+Enter、计数显示与拒答/失败样式。

> 本轮同样需要**重启 DSH** 才能生效（新增的是 Host 端点与配置项）。
> 重启前实测 `/dsh-liuyao/config` 仍返回旧字段集，即 Host 半未重载。

## 〇之六、上一轮新增：解读里的「通俗总结」

**需求**：分析解读时补一段用通俗语言的总结。

**实现**（`src/analysis.mjs` 的 `buildSummary()`）：在原有条文之外，另给一层白话结论，输出
`summary{ title, oneLine, paragraphs[], advice[], note }`，由卦象逐步推出：

1. 先报卦名与所问之事；
2. **世爻＝你自己**：位置、六亲、旺衰分数，逢空／月破另加说明；
3. **用神＝你问的那个人或那件事**：在/不在卦中、旺或弱、是否值空逢破；不上卦时说明伏神藏在哪一爻、
   白话含义是「这个人／这件事眼下还没露面」；
4. **动爻＝事情变动的地方**：回头生（越动越有帮手）、回头克（一动就伤自己）、化进神（势头在涨）、
   化退神（开头热后头冷）、泄气耗力，逐条翻成日常说法；
5. **世与用神的关系**：它来生你（省力）、你去生它（费劲）、它来克你（反受其累）、你能克它（主动权在你）；
6. **结论分支**：主体不现／用神无力／事本可为而动则自伤／有阻但不在主体／先热后冷／越动越顺／
   成算较大／可成但需着力；用神未注明时只报盘面、不下吉凶结论；
7. **怎么办**：给出可执行建议（何时别动、何时该推、应期看哪一支）。

**呈现**：界面与文本都把通俗总结放在**最末尾**。界面在结果区最末渲染高亮块
（`.ly-summary`，主色描边＋浅底）：标题 → 一句话结论 → 分段说明 → 「怎么办」→ 依据声明。

> 位置几经调整，最终定为**末尾**。整段解读次序为「排盘 → 断卦条文 → 结论清单 → 通俗总结」；
> 为此把文本组装拆成三个块：`formatText()`（排盘）／`formatEvidence()`（条文＋结论清单）／
> `formatSummary()`（通俗总结），再由 `formatFull()` 按上述次序拼成完整解读。
> 工具的 `text` 字段与 CLI 均改用 `formatFull()`，因此不再出现"总结夹在中间"的情况。

**测试**（新增 `test/summary.test.mjs`，共 7 个套件）：结构完整性；口语化（含解释性说法、
把术语翻成白话）；**不含套话**（逐个断言"心诚则灵／顺其自然／注意沟通"等不出现）；
未注明所问之事时明确不下结论；用神不上卦分支；六爻安静分支；四组不同卦例得到不同结论（非模板化）；
**位置校验**（条文在排盘之后、结论清单在条文之后、总结在结论清单之后且其后不再有其他区块）；
无分析时不渲染空块；结论与卦象不矛盾。
`test/client.test.mjs` 另覆盖 SummaryView 的渲染（标签／标题／一句话／分段／建议／依据声明／
空值不渲染）与样式存在性。

## 〇之五、上一轮修复：排盘结果看不全、滚轮拉不下去

**根因**：应用的主面板落在一个 `overflow:hidden` 的网格项里——
`.BynINW_centerCol{display:flex;flex-direction:column;min-width:0;overflow:hidden}`，
而 `.ly-panel` 只设了 `padding` 与 `min-height:100%`，**自身不是滚动容器**。
内容高于可视区时被外层直接裁掉：下半部分看不到，也没有任何滚动条可用。

**修复**：

- `.ly-panel` 改为滚动容器：`height:100%; min-height:0; overflow-y:auto; overflow-x:hidden;
  overscroll-behavior:contain; box-sizing:border-box`（`min-height:0` 是 flex 子项能收缩的关键，
  否则 `min-height:auto` 会撑破容器）。
- 新增 `.ly-panel-body{position:relative; min-height:100%; padding:18px 18px 32px}` 作为定位块：
  水印与内容都放进它——水印随内容一起滚动而不是浮在面板上，内容少时也至少一屏高。

自动测试覆盖（`test/client.test.mjs`）：面板 `height:100%`／`min-height:0`／`overflow-y:auto`／
`overflow-x:hidden`／`overscroll-behavior:contain`；定位块 `position:relative`＋`min-height:100%`；
结构上面板首层为 `.ly-panel-body`，水印与 `.ly-wrap` 同在定位块内。

## 〇之四、上一轮修复：界面报 `transport failure for /dsh-liuyao/cast: HTTP 405`

**定位过程**：
1. 在 DSH 源码里检索 `writeHead(405)`，只有两处命中：`dsh-client-hmr` 的事件端点，与
   **`dsh-host-frontend-static` 的 `registerFallback`**（对非 GET/HEAD 一律 405）。
2. 实测 `POST http://127.0.0.1:19387/dsh-liuyao/config` → **405 且响应体为空**。
   我的处理器在任何分支都会回 JSON 405/403，空体说明请求**根本没到我的处理器**，
   而是落到了静态兜底。
3. 结论：`/dsh-liuyao` 前缀路由**从未注册**。根因在 Host 半用
   `ctx.inject(['connection'], cb)` 注册 RPC 通道——该回调在运行时没有触发
   （工具走的是 `ctx.tools`，注册成功，所以问题被掩盖到浏览器发起请求才暴露）。

**修复**：端点改为直接注册在 webServer 上，不依赖任何可选服务。

| 之前 | 现在 |
|---|---|
| `ctx.inject(['connection'])` → `connection.rpc.handle('/dsh-liuyao', …)` 前缀通道 | `ctx.inject(['webServer'])` → 六个 `kind:'exact'` 路由：`POST /dsh-liuyao/{config,opening,selftest,toss,cast,analyze}` |
| 客户端 `connection.rpc.call(channel, endpoint, payload)` | 客户端 `fetch(endpointUrl(name), { method:'POST', JSON })`，解析 `{ok,value}`／`{ok,error}` |
| 安全依赖 Connection 自带栅栏 | 自带同源门禁（`Sec-Fetch-Site`，退化到 `Origin`/`Host` 比对）＋ 请求体上限 256KB ＋ JSON 校验 |

`kind:'exact'` 优先于静态兜底的 `registerFallback`，因此不会再被兜底截走。

自动测试覆盖（`test/host.test.mjs`）：六个 exact 路由注册齐备；以桩 req/res 实测
`config/opening/toss/cast/analyze/selftest` 均返回 200 + `{ok:true}`；
非 POST → 405、跨站 `Sec-Fetch-Site: cross-site` → 403、异源 `Origin` → 403、
非法 JSON → 400、非法爻值 → 400、`OPTIONS` → 204。
`test/client.test.mjs` 另断言：两端路径前缀一致、客户端不再引用 `connection.rpc`、
Host 不再 `ctx.inject(['connection'])`、Host 带同源门禁。

> **需重启 DSH 生效**：Host 半在启动时加载。重启前实测仍为 405（空体＝静态兜底）。

## 〇之三、上一轮修改：修掉手工输入后的文字遮挡

**现象**：手动选完六爻后，下拉框里的长文案（`●●●　老阳 三背（动）`）把下拉撑宽，
溢出到相邻爻位的卡片上，文字互相压住。

**根因三条**：① 原来的爻卡是「爻位 ＋ 铜钱片 ＋ 下拉」**横排**，宽度被三者平分；
② 下拉宽度由**最长选项**决定，而 flex/grid 子项默认 `min-width:auto` **不肯收缩**；
③ 网格列用 `minmax(215px,1fr)` 定死下限，窄容器里直接溢出。

**改法**：

- 爻卡改**纵向两行**：`.ly-slot{flex-direction:column}`，上行 `.ly-slot-head`（爻位 ＋ 已选钱文），
  下行下拉独占整行（`.ly-slot .ly-select{width:100%}`）。
- 全面加 `min-width:0` / `max-width:100%` / `box-sizing:border-box`，并给下拉加
  `text-overflow:ellipsis`——过长的文案只在自己格子里收尾，不会压到邻居。
- 网格列改 `repeat(auto-fit, minmax(min(100%,230px), 1fr))`，窄容器自动减列而非溢出；
  爻卡加 `overflow:hidden` 兜底。
- 电脑摇卦那一侧的爻卡同结构（爻位 ＋ 钱文在上，爻名动静在下）。
- 顺带修正：摇卦进度条原借用 `.ly-slot` 类，因爻卡改纵向会被拉成两行，已独立为 `.ly-status`。

自动测试覆盖（`test/client.test.mjs`）：网格 `min()` 下限、槽位纵向排列、`min-width:0`／
`max-width:100%`、下拉 `width:100%`＋`min-width:0`＋省略号、标签行可换行；
结构上断言 6 个爻槽位均有 `.ly-slot-head` 且下拉与其同级独占一行。

## 〇之二、上一轮修改：手工输入卦象的选项标注三枚铜钱正反

**需求**：手工输入时，少阳／少阴／老阳／老阴选项旁要给出对应的三枚铜钱正反，方便不熟悉术语的使用者。

**改法**（`client/client.js`）：

- 新增 `YAO_INFO`：每爻的爻名、卦象符号、钱文组合与动静；`●`＝背（阳面，实心）、`○`＝字（阴面，空心）。
- 下拉项文案统一由 `yaoOptionText()` 生成，顺序为少阳 → 少阴 → 老阳 → 老阴：

  | 选项文案 | 钱文 | 动/静 |
  |---|---|---|
  | `●○○　少阳 一背二字（静）` | 一背二字 | 静 |
  | `●●○　少阴 二背一字（静）` | 二背一字 | 静 |
  | `●●●　老阳 三背（动）` | 三背 | 动 |
  | `○○○　老阴 三字（动）` | 三字 | 动 |

- 新增 `ly-legend` 对照图例（六行：钱文 chip ＋ 爻名 ＋ 钱文文字 ＋ 卦象符号 ＋ 动静说明），
  并注明「背为阳面、字为阴面」，写明「不必记术语」。 —— **本轮已按用户要求删除**：
  图例块、其上方引导语、以及 `.ly-legend*` 样式一并移除，手工输入区只保留「起卦时间 → 六爻下拉」。
  钱文信息全部保留在选项内（下拉项文案未改）。
- 已选中的爻，其槽位也显示同一组钱文 chip；电脑摇卦结果同样改用 chip 显示，
  两种方式看到的标记完全一致，避免混淆。
- chip 样式 `.ly-chips` / `.ly-chip`：背为实心描金、字为空心。

自动测试覆盖（`test/client.test.mjs`）：四种组合的符号／爻名／钱文说明齐全；
选项文案格式精确匹配；**选项内钱文符号不重复出现**；选项顺序；chip 与图例均已渲染。

## 〇、上一轮修改：先天八卦背景不再遮盖文字与对话框

**问题**：原先把卦图注册进 `shell.overlay` 浮层。查证应用本体 CSS 后确认两处结构性原因：

- `shell.overlay` 所在层为 `z-index:20; position:absolute; inset:0`，且规则
  `.ly-overlayLayer > * { pointer-events:auto }` 会把**直属子元素**的指针事件强制打开——
  所以背景既压住正文/对话框，又能拦截点击。
- `.BynINW_frame` 自带不透明背景 `var(--dsw-alias-bg-base)`：放在它后面则完全看不见，
  放在它前面则必然压字——「上层浮层」这条路本身就走不通。

**改法**：不再叠浮层，改为**铺背景**。

| 模式 | 铺在哪里 | 依据 |
|---|---|---|
| `global` | `document.body` 的 `background-image` | body 即应用基础色 `--dsw-alias-bg-base`；只写 `background-*`，不碰 `pointer-events`/`z-index` |
| `columns`（auto 默认） | 应用两列 `[class*="_sidebarCol"]`／`[class*="_centerCol"]` 的 `background-image` | 这两列的背景层永远在列内所有内容（正文、对话框）之下，故必然可见且永不压字 |
| `off` | — | — |

自动测试覆盖（`test/client.test.mjs`）：不再注册 `shell.overlay`；底纹样式表不含
`pointer-events`/`z-index`；两列均打标记；`background-attachment:fixed`；尺寸上限 92vmin；
SVG 标签开闭配平、含八经卦与六十四卦环；停用后底纹、标记、规则表全部清除（幂等）。
`test/host.test.mjs` 覆盖 `backgroundMode` 枚举校验与 RPC 回传。

## 一、已实测通过（有证据）

| 项目 | 证据 |
|---|---|
| 六个自检套件全绿 | `calendar / hexagrams / engine / analysis / host / client` 全部 exit=0 |
| 干支历与权威黄历逐字一致 | 1949-10-01 己丑年癸酉月甲子日八月初十；2008-12-23 戊子年甲子月丁酉日甲辰时（空辰巳）冬月廿六；2026-10-10 丙午年戊戌月丁巳日丙午时（空子丑）九月初一 |
| 纳甲／八宫／世应 | 乾为天 甲子甲寅甲辰壬午壬申壬戌；坤为地 乙未乙巳乙卯癸丑癸亥癸酉；山火贲（艮宫一世，世初应四）己卯己丑己亥丙戌丙子丙寅 |
| 伏神 | 山火贲伏艮为山：初兄弟丙辰、二父母丙午、三子孙丙申 |
| 插件已装入 profile 并加载 | `package.json` bundles 含 dsh-liuyao；`cordis.patch.yml` 有 `- id: liuyao` 层 |
| 工具在本会话内实际执行 | `liuyao_opening` 返回《系辞下》原文；`liuyao_toss` 返回「背 背 字 → 8 少阴」 |
| 安装内容与仓库一致 | package.json / lib/index.js / client/client.js / cordis.patch.yml 四文件哈希一致 |
| 零 npm 依赖 | Host 半仅 import `node:crypto`；测试断言无裸模块导入 |

## 二、已验证但需界面刷新/重启才可见

| 项目 | 状态 | 原因 |
|---|---|---|
| `liuyao_cast` 工具 | 代码正确、测试通过，但本会话工具表中尚无 | Host 半在本次会话开始前加载，之后才修掉 `type:"json"` 非法导致的静默注册失败；需重启 DSH 重新加载 Host 半 |
| 卦盘 UI（main 面板 key=liuyao） | bundle 结构、槽位注册、SVG 内容均有测试覆盖 | 客户端 bundle 在页面 boot 后新增，需刷新页面才会被加载 |
| 先天八卦背景（shell.overlay） | 同上 | 同上 |

## 三、已知风险与回滚

- **回滚**：`~/.dsh/profiles/desktop/` 下 `package.json.bak-liuyao`、`cordis.patch.yml.bak-liuyao`、`pnpm-lock.yaml.bak-liuyao`。
- **`dsh plugin add` 未跑完**：pnpm 因 registry 证书错误（DEPTH_ZERO_SELF_SIGNED_CERT）在供应链策略校验处失败；junction 与 lockfile 条目已生成，bundles 与 patch 层为手工补齐（等价于该命令的两步）。
- **运行时未实测项**：GUI 内的实际渲染效果、Connection RPC 通道在真实浏览器里的往返（Host 侧通道注册代码有单元测试，但未在真实页面上往返验证）。

## 四、与参考图的两处差异（已按典籍标准实现）

1. 日柱：图为「丙午日」，标准为 **丁酉日**（图中六神呈「丙丁起朱雀」排法，反证程序内部用的是丁日）。
2. 变卦：图作「雷山小过」，按动爻（三爻、上爻）应为 **地雷复**（世初应四，与图中世应标注一致）。
