// 客户端 bundle 静态自检：加载包装、导出形状、SVG/槽位注册、与 Host API 路径一致性
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const source = readFileSync(join(root, 'client', 'client.js'), 'utf8')

let fail = 0
const check = (ok, label, extra = '') => {
  if (ok) console.log(`✓ ${label}`)
  else { fail += 1; console.log(`✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}

// —— 用假模块加载器执行 bundle ——
let registration = null
const requireCalls = []
const fakeRequire = (id) => {
  requireCalls.push(id)
  if (id === 'react') return fakeReact
  throw new Error('意外的模块请求: ' + id)
}
const sandbox = {
  window: {
    __ModuleLoader__: {
      load: (row) => { registration = row },
    },
  },
  document: { baseURI: 'http://127.0.0.1:19387/' },
  URL,
  Date,
  JSON,
  Math,
  String,
  Number,
  Object,
  Array,
  console,
  setTimeout,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(source, sandbox, { filename: 'client.js' })

check(registration !== null, 'bundle 通过 window.__ModuleLoader__.load 注册')
check(registration && registration.id === 'dsh-liuyao', '注册 id 与包名一致', registration && registration.id)
check(typeof registration.factory === 'function', 'factory 为函数')

// 极简 React 桩：createElement 只做数据记录
function el(type, props, ...children) {
  return { type, props: props || {}, children: children.flat() }
}
const fakeReact = {
  createElement: el,
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
  Fragment: 'Fragment',
}

const exportsObj = registration.factory(fakeRequire)
check(requireCalls.length === 1 && requireCalls[0] === 'react', '仅请求 react（平台种子模块）', requireCalls.join(','))
check(typeof exportsObj.apply === 'function', '导出 apply')
check(typeof exportsObj.name === 'string' && exportsObj.name === 'dsh-liuyao', '导出 name', exportsObj.name)
check(Array.isArray(exportsObj.inject), '导出 inject')

// —— 执行 apply，检查槽位注册与背景实现 ——
const registered = []
const injected = []
const styleTags = []
const columns = [
  { tagName: 'div', className: 'X_sidebarCol', attrs: new Map(), style: {}, setAttribute(n, v) { this.attrs.set(n, v) }, removeAttribute(n) { this.attrs.delete(n) }, hasAttribute(n) { return this.attrs.has(n) } },
  { tagName: 'div', className: 'X_centerCol', attrs: new Map(), style: {}, setAttribute(n, v) { this.attrs.set(n, v) }, removeAttribute(n) { this.attrs.delete(n) }, hasAttribute(n) { return this.attrs.has(n) } },
]
const allStyleTags = () => styleTags
const doc = {
  head: { appendChild: (tag) => { styleTags.push(tag); return tag } },
  createElement: (tag) => ({
    tagName: tag,
    dataset: {},
    textContent: '',
    style: {},
    attrs: new Map(),
    setAttribute(n, v) { this.attrs.set(n, v) },
    removeAttribute(n) { this.attrs.delete(n) },
    remove() { const i = styleTags.indexOf(this); if (i >= 0) styleTags.splice(i, 1) },
  }),
  querySelector: (sel) => {
    const m = /style\[data-plugin-css="(.+?)"\]/.exec(sel)
    if (m) return styleTags.find(t => t.dataset.pluginCss === m[1]) ?? null
    if (sel.includes('_sidebarCol')) return columns[0]
    if (sel.includes('_centerCol')) return columns[1]
    return null
  },
  querySelectorAll: (sel) => {
    // 按列选择器：返回两列（真实 DOM 里由 class 子串匹配）
    if (sel.includes('_sidebarCol') || sel.includes('_centerCol')) return columns
    // 标记选择器：只返回已打标记的元素
    if (sel.includes('data-liuyao-bagua-backdrop')) return columns.filter(c => c.attrs.has('data-liuyao-bagua-backdrop'))
    return []
  },
}
sandbox.document = doc
// body 桩：global 模式必须写在 body 的 background 系列属性上
const bodyAttrs = new Map()
const body = {
  style: {},
  setAttribute: (n, v) => bodyAttrs.set(n, v),
  removeAttribute: (n) => bodyAttrs.delete(n),
  hasAttribute: (n) => bodyAttrs.has(n),
}
doc.body = body
sandbox.MutationObserver = class { observe() {} disconnect() {} }
sandbox.window = Object.assign(sandbox.window ?? {}, {
  matchMedia: () => ({ matches: false }),
  __ModuleLoader__: sandbox.window.__ModuleLoader__,
})

const rpcCalls = []
const fetchCalls = []
sandbox.fetch = (url, init) => {
  fetchCalls.push({ url, init })
  const body = { ok: true, value: { echoed: init?.body ? JSON.parse(init.body) : null } }
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}
const effects = []
const effectErrors = []
const ctx = {
  effect: (fn, label) => {
    try {
      const d = fn()
      effects.push({ label, dispose: d })
      return d
    } catch (error) {
      effectErrors.push({ label, message: String(error?.message ?? error) })
      return () => {}
    }
  },
  get: (key) => {
    if (key === 'slots') {
      return {
        inject: (slot, cb) => { injected.push(slot); return cb() },
        register: (def, component) => { registered.push({ def, component }); return () => {} },
      }
    }
    if (key === 'connection') return undefined
    return undefined
  },
  on: () => () => {},
}
exportsObj.apply(ctx, { boardBackground: true, backgroundMode: 'auto' })
check(styleTags.length === 2 && styleTags[0].dataset.plugin === 'dsh-liuyao', '以 <style data-plugin> 注入样式（含底纹规则表）', JSON.stringify(styleTags.map(t => t.dataset.pluginCss)))
check(styleTags[0].dataset.pluginCss === 'dsh-liuyao/client.css', '样式标签带 data-plugin-css 标识')

console.log('--- 背景实现（不得遮盖内容 / 不得拦截点击） ---')
check(!injected.includes('shell.overlay'), '不再占用 shell.overlay 浮层', injected.join(','))
check(registered.length === 2, '注册 2 个槽位组件（main + 侧栏图标）', registered.map(r => r.def.name).join(','))
const backdropTag = styleTags.find(t => t.dataset.pluginCss === 'dsh-liuyao/client.css/backdrop')
check(backdropTag !== undefined, '底纹以独立样式表铺陈')
const backdropCss = backdropTag.textContent
check(/\[class\*="_sidebarCol"\]/.test(backdropCss) && /\[class\*="_centerCol"\]/.test(backdropCss), 'auto 模式铺在应用两列（列背景在列内所有内容之下）', backdropCss.slice(0, 60))
check(/background-attachment:fixed/.test(backdropCss), '底纹固定不随滚动')
check(/background-size:min\(92vmin/.test(backdropCss), '底纹尺寸受限（不超过 92vmin）')
check(!/pointer-events|z-index/.test(backdropCss), '底纹规则不含 pointer-events/z-index（不可能拦截点击）')
check(columns.every(c => c.attrs.has('data-liuyao-bagua-backdrop')), '两列均打上底纹标记', JSON.stringify({ keys: columns.map(c => [...c.attrs.keys()]), effectErrors }))
// 从 url("data:...") 中取出 SVG：以最后的 ')' 收尾，避免 base64/百分号编码里的括号截断
const uriStart = backdropCss.indexOf('data:image/svg+xml;charset=utf-8,') + 'data:image/svg+xml;charset=utf-8,'.length
const uriEnd = backdropCss.indexOf('")', uriStart)
const backdropUri = decodeURIComponent(backdropCss.slice(uriStart, uriEnd))
check(backdropUri.includes('乾') && backdropUri.includes('坤') && backdropUri.includes('乾为天'), '底纹 SVG 含八经卦与六十四卦环')
check(backdropUri.startsWith('<svg') && backdropUri.endsWith('</svg>'), '底纹 SVG 结构闭合')
const openTags = (backdropUri.match(/<(?:svg|g|circle|path|rect|text)(?=[\s/>])/g) ?? []).length
const closeTags = (backdropUri.match(/<\/(?:svg|g|circle|path|rect|text)>/g) ?? []).length + (backdropUri.match(/\/>/g) ?? []).length
check(openTags === closeTags, '底纹 SVG 标签开闭配平', `open=${openTags} close=${closeTags}`)
check((backdropUri.match(/<text/g) ?? []).length >= 73, '底纹含八经卦名 + 六十四卦名 + 标题', String((backdropUri.match(/<text/g) ?? []).length))

console.log('--- 面板水印层级 ---')
const panelCss = styleTags[0].textContent
check(/\.ly-watermark\{[^}]*z-index:-1/.test(panelCss), '面板水印 z-index:-1（在面板内容之下）')
check(/\.ly-watermark\{[^}]*pointer-events:none/.test(panelCss), '面板水印不接收指针事件')
check(/\.ly-panel\{[^}]*isolation:isolate/.test(panelCss), '面板建立独立层叠上下文，水印不会外溢')
check(!/\.ly-bg\{/.test(panelCss), '旧的全局浮层样式已移除')

const firstPass = registered.slice()
registered.length = 0
injected.length = 0
exportsObj.apply(ctx, { boardBackground: true, backgroundMode: 'auto' })
check(styleTags.length === 2, '重复 apply 不重复注入样式（幂等）', String(styleTags.length))
check(registered.length === firstPass.length, '重复 apply 槽位注册数不变', String(registered.length))
// 停用时应清理底纹
const bgEffect = effects.filter(e => String(e.label).includes('底纹')).pop()
check(bgEffect !== undefined && typeof bgEffect.dispose === 'function', '背景底纹注册为可清理的 effect')
bgEffect.dispose()
check(columns.every(c => !c.attrs.has('data-liuyao-bagua-backdrop')), '停用后两列标记被清理', columns.map(c => c.attrs.size).join(','))
check(styleTags.every(t => t.dataset.pluginCss !== 'dsh-liuyao/client.css/backdrop'), '停用后底纹样式表被移除')

console.log('--- global 模式 ---')
const effects2 = []
const ctx2 = Object.assign({}, ctx, { effect: (fn, label) => { const d = fn(); effects2.push({ label, dispose: d }); return d } })
exportsObj.apply(ctx2, { boardBackground: true, backgroundMode: 'global' })
check(typeof body.style.backgroundImage === 'string' && body.style.backgroundImage.startsWith('url("data:image/svg+xml'), 'global 模式铺在 body 背景层', String(body.style.backgroundImage).slice(0, 36))
check(body.style.backgroundAttachment === 'fixed', 'global 模式同样固定不随滚动')
const bgKeys = Object.keys(body.style)
check(bgKeys.every(k => k.startsWith('background')), 'global 模式只写 background 系列属性', bgKeys.join(','))
check(bodyAttrs.has('data-liuyao-bagua-backdrop'), 'global 模式在 body 上留标记')
effects2.filter(e => String(e.label).includes('底纹')).pop().dispose()
check(body.style.backgroundImage === '' && !bodyAttrs.has('data-liuyao-bagua-backdrop'), 'global 模式停用后被清理')

registered.length = 0
registered.push(...firstPass)
check(registered.length === 2, '注册 2 个槽位组件', registered.map(r => r.def.name).join(','))
const byName = Object.fromEntries(registered.map(r => [r.def.name, r]))
check(byName.main && byName.main.def.key === 'liuyao', 'main 面板 key = liuyao')
check(byName['sidebar.panellist'] && typeof byName['sidebar.panellist'].def.label === 'function', 'sidebar.panellist 有 label 函数')
check(byName['shell.overlay'] === undefined, '不注册 shell.overlay（不再有压住正文/对话框的浮层）')
check(injected.includes('main') && injected.includes('sidebar.panellist'), '槽位 inject 前缀正确', injected.join(','))

// —— 渲染组件（React 桩）检查 SVG 结构 ——
const diagram = exportsObj.BaguaDiagram({ color: 'currentColor' })
check(diagram.type === 'svg', 'BaguaDiagram 返回 svg')
const svgText = JSON.stringify(diagram)
check(svgText.includes('先天八卦'), 'SVG 含标题文字')
for (const t of ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']) {
  check(svgText.includes(`"${t}"`), `SVG 含卦名 ${t}`)
}
check(svgText.includes('乾为天') && svgText.includes('坤为地'), 'SVG 含六十四卦环')
check(svgText.includes('南') && svgText.includes('北'), 'SVG 含方位标注')

const board = byName.main.component({ api: { config: () => Promise.resolve({}), opening: () => Promise.resolve({ opening: 'x' }) } })
check(board.type === 'div' && board.props.className === 'ly-panel', 'Board 渲染为面板容器')
check(typeof byName.main.def.inject === 'function' && byName.main.def.inject().api !== undefined, 'main 槽位通过 inject 传入 api 面')

// —— 手工输入：每个爻选项须标出对应的三枚铜钱正反，并附对照图例 ——
const flat = (node) => {
  if (node === null || node === undefined) return []
  if (Array.isArray(node)) return node.flatMap(flat)
  if (typeof node === 'object') return [node.type, ...(node.children ?? []).flatMap(flat)]
  return [String(node)]
}
const texts = flat(board).filter(x => typeof x === 'string')
const rawText = texts.join('')
const joined = texts.join('|')
for (const [glyph, name, coinWord] of [['●●●', '老阳', '三背'], ['○○○', '老阴', '三字'], ['●●○', '少阴', '二背一字'], ['●○○', '少阳', '一背二字']]) {
  check(joined.includes(glyph), `选项含三枚铜钱符号 ${glyph}`)
  check(joined.includes(name), `选项含爻名 ${name}`)
  check(joined.includes(coinWord), `选项含钱文说明 ${coinWord}`)
}
check(/●○○　少阳 一背二字（静）/.test(rawText), '少阳项形如「●○○　少阳 一背二字（静）」')
check(/●●○　少阴 二背一字（静）/.test(rawText), '少阴项形如「●●○　少阴 二背一字（静）」')
check(/●●●　老阳 三背（动）/.test(rawText), '老阳项标出动爻')
check(/○○○　老阴 三字（动）/.test(rawText), '老阴项标出动爻')
check(!/三背 ●●●|一背二字 ●○○/.test(rawText), '选项内钱文符号不重复出现')
const optionOrder = texts.filter(t => /^[●○]{3}　/.test(t)).slice(0, 4).map(t => t.slice(4).replace('　', ' ').split(' ')[0])
check(JSON.stringify(optionOrder) === JSON.stringify(['少阳', '少阴', '老阳', '老阴']), '选项顺序为少阳→少阴→老阳→老阴', optionOrder.join(','))
check(styleTags[0].textContent.includes('.ly-chip.back'), '样式表保留钱文 chip 样式（供电脑摇卦结果使用）')

console.log('--- 虚线图例已移除 ---')
check(!JSON.stringify(board).includes('ly-legend'), '不渲染 ly-legend 图例块')
check(!styleTags[0].textContent.includes('.ly-legend'), '样式表不再包含 .ly-legend 规则')
check(!rawText.includes('不必记术语'), '移除图例说明文字')
check(!rawText.includes('照下表对照'), '移除对照表引导语')

console.log('--- 手工输入不得发生文字遮挡 ---')
const slotCss = styleTags[0].textContent
check(/\.ly-grid\{[^}]*minmax\(min\(100%,/.test(slotCss), '网格列宽带 min() 下限，窄容器不溢出')
check(/\.ly-slot\{[^}]*flex-direction:column/.test(slotCss), '爻槽位改为纵向排列（标签在上、下拉在下）')
check(/\.ly-slot\{[^}]*min-width:0/.test(slotCss), '槽位 min-width:0，可随容器收缩')
check(/\.ly-slot\{[^}]*max-width:100%/.test(slotCss), '槽位 max-width:100%，不越出格子')
check(/\.ly-slot .ly-select\{[^}]*width:100%/.test(slotCss), '下拉占满槽位宽度')
check(/\.ly-slot .ly-select\{[^}]*min-width:0/.test(slotCss), '下拉 min-width:0（不被最长选项撑破）')
check(/\.ly-slot .ly-select\{[^}]*text-overflow:ellipsis/.test(slotCss), '过长文案以省略号收尾')
check(/\.ly-slot-head\{[^}]*min-width:0/.test(slotCss), '标签行 min-width:0')
check(/\.ly-slot-head \.ly-chips\{[^}]*flex-wrap:wrap/.test(slotCss), '标签行钱文可换行，不挤出格子')
// 结构检查：每个爻槽位内，标签与下拉分属两层（不再同行竞争宽度）
const slots = []
const walk = (node) => {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) { node.forEach(walk); return }
  if (typeof node !== 'object') return
  if (typeof node.props?.className === 'string' && /(^|\s)ly-slot(\s|$)/.test(node.props.className)) slots.push(node)
  ;(node.children ?? []).forEach(walk)
}
walk(board)
check(slots.length === 6, '手工输入模式渲染 6 个爻槽位（两种起卦方式互斥渲染）', String(slots.length))
const isEl = (c) => c !== null && typeof c === 'object'
check(slots.every(s => (s.children ?? []).some(c => isEl(c) && c.props?.className === 'ly-slot-head')), '每个爻槽位都有标签行（标签在上、内容在下）')
const slotSelects = slots.filter(s => (s.children ?? []).some(c => isEl(c) && c.type === 'select'))
check(slotSelects.length === 6, '6 个爻槽位的下拉与标签行同级、各自独占一行', String(slotSelects.length))

console.log('--- 面板必须自带滚动（否则内容被 overflow:hidden 裁剪、滚轮无效） ---')
check(/\.ly-panel\{[^}]*height:100%/.test(slotCss), '面板撑满主面板高度')
check(/\.ly-panel\{[^}]*min-height:0/.test(slotCss), '面板 min-height:0（flex 子项可收缩）')
check(/\.ly-panel\{[^}]*overflow-y:auto/.test(slotCss), '面板纵向自动滚动')
check(/\.ly-panel\{[^}]*overflow-x:hidden/.test(slotCss), '面板横向不溢出')
check(/\.ly-panel\{[^}]*overscroll-behavior:contain/.test(slotCss), '滚动不穿透到外层')
check(/\.ly-panel-body\{[^}]*position:relative/.test(slotCss), '定位块为水印提供定位基准')
check(/\.ly-panel-body\{[^}]*min-height:100%/.test(slotCss), '定位块至少一屏高（水印铺满可视区）')
const panelBody = (board.children ?? []).find(c => isEl(c) && c.props?.className === 'ly-panel-body')
check(panelBody !== undefined, '面板首层即为滚动定位块', JSON.stringify((board.children ?? []).map(c => c?.props?.className)))
check((panelBody?.children ?? []).some(c => isEl(c) && c.props?.className === 'ly-watermark'), '水印位于定位块内')
check((panelBody?.children ?? []).some(c => isEl(c) && c.props?.className === 'ly-wrap'), '内容与水印同属定位块（一起滚动）')

console.log('--- 通俗总结的界面渲染 ---')
const analysisFixture = {
  summary: {
    title: '事本可为，动则自伤',
    oneLine: '底子是好的，但一动就伤自己。',
    paragraphs: ['你看的这一卦，主卦是「山火贲」。', '世爻就是你。'],
    advice: ['坐得住比出手强。'],
    note: '每层判断都对应卦里的具体爻。',
  },
  sections: [{ title: '用神取用', points: [{ text: '以妻财为用神。', source: '《增删卜易·用神章》' }] }],
  verdict: { items: [{ level: '凶', text: '三爻化回头克。', source: '《增删卜易·回头克》' }], note: '以上每条皆出典籍明文。' },
}
const summaryEl = exportsObj.SummaryView({ summary: analysisFixture.summary })
const summaryFlat = flat(summaryEl).filter(x => typeof x === 'string')
const summaryJoined = summaryFlat.join('')
check(summaryEl.props?.className === 'ly-summary', 'SummaryView 输出总结块')
check(summaryJoined.includes('通俗总结'), '渲染「通俗总结」标签')
check(summaryJoined.includes('事本可为，动则自伤'), '渲染总结标题')
check(summaryJoined.includes('底子是好的，但一动就伤自己。'), '渲染一句话结论')
check(analysisFixture.summary.paragraphs.every(p => summaryJoined.includes(p)), '渲染全部分段说明')
check(summaryJoined.includes('怎么办') && summaryJoined.includes('坐得住比出手强。'), '渲染「怎么办」建议')
check(summaryJoined.includes('每层判断都对应卦里的具体爻'), '渲染依据声明')
check(exportsObj.SummaryView({ summary: undefined }) === null, '无总结时不渲染空块')
check(analysisFixture.sections.length === 1, '（夹具）条文区仍由 AnalysisView 渲染')
const styleSheet = styleTags[0].textContent
check(styleSheet.includes('.ly-summary{'), '样式表含总结块样式')
check(styleSheet.includes('.ly-summary-tag') && styleSheet.includes('.ly-summary-title'), '样式含标签与标题')
check(styleSheet.includes('.ly-summary-advice'), '样式含「怎么办」区')
check(/\.ly-summary\{[^}]*state-business-primary/.test(styleSheet), '总结块用主色与条文区区分')
check(source.includes('function SummaryView'), '客户端实现 SummaryView 组件')
check(/h\(SummaryView, \{ summary: analysis\.summary \}\)/.test(source), 'AnalysisView 渲染总结块')
// 位置：结论清单之后（不再是首屏第一个）
const analysisViewSource = source.slice(source.indexOf('function AnalysisView'), source.indexOf('function nowString'))
const idxSummary = analysisViewSource.indexOf('h(SummaryView')
const idxVerdict = analysisViewSource.indexOf('结论清单')
check(idxVerdict >= 0 && idxSummary > idxVerdict, '总结块置于结论清单之后（末尾）', `summary@${idxSummary} verdict@${idxVerdict}`)
check(/s\.oneLine/.test(source) && /s\.advice/.test(source) && /s\.paragraphs/.test(source), '总结块渲染一句话、分段与建议')

console.log('--- 一卦一断：追问对话框 ---')
check(styleSheet.includes('.ly-ask{') && styleSheet.includes('.ly-ask-rule'), '样式含对话框与「一卦一断」标记样式')
check(source.includes('function AskDialog'), '客户端实现 AskDialog 组件')
check(/postStream\("ask"/.test(source), '追问走流式端点 ask')
check(/h\(AskDialog, \{/.test(source), '结果区渲染追问对话框')
const askIdx = source.indexOf('h(AskDialog, {')
const analysisIdx = source.indexOf('h(AnalysisView, {')
check(analysisIdx >= 0 && askIdx > analysisIdx, '对话框位于解读（AnalysisView）之后', `ask@${askIdx} analysis@${analysisIdx}`)
check(/props\.followUpEnabled === false[\s\S]{0,80}null/.test(source), '可用配置关闭对话框')
check(source.includes('一卦一断'), '界面标注「一卦一断」')
check(source.includes('要问别的事，请另起一卦'), '界面注明只能问本卦相关的事')
check(/onKeyDown[\s\S]{0,120}ctrlKey/.test(source), '支持 Ctrl/⌘+Enter 发送')
check(source.includes('maxFollowUps') && /已问 ".{0,20}asked/.test(source), '显示已问次数与上限')
check(/refused: true/.test(source) && /failed: true/.test(source), '区分拒答与失败两种样式')
const hostSrc = readFileSync(join(root, 'lib', 'index.js'), 'utf8')
check(hostSrc.includes("API_PREFIX}ask"), 'Host 注册 ask 端点')
check(/ctx\.get\('llm'\)/.test(hostSrc), 'Host 经 ctx.get(\'llm\') 取模型服务')
check(/agentDefaultModel/.test(hostSrc), '缺省时用当前默认模型')
check(/followUpProvider/.test(hostSrc) && /followUpModel/.test(hostSrc), '支持单独指定追问模型')

// —— 与 Host 端点一致性 ——
const hostSource = readFileSync(join(root, 'lib', 'index.js'), 'utf8')
const clientEndpoints = [...source.matchAll(/post\("([a-z]+)"/g)].map(m => m[1])
const hostEndpoints = [...hostSource.matchAll(/^\s{6}([a-z]+): \(/gm)].map(m => m[1])
  // 单独注册、不走 endpoints 表的端点（流式追问 ask、关于 about）
  .concat([...hostSource.matchAll(/path: `\$\{API_PREFIX\}([a-z]+)`/g)].map(m => m[1]))
const uniqueClient = [...new Set(clientEndpoints)].sort()
const uniqueHost = [...new Set(hostEndpoints)].sort()
check(uniqueClient.length >= 5, '客户端调用了 Host 端点', uniqueClient.join(','))
check(uniqueClient.every(p => uniqueHost.includes(p)), '客户端端点 Host 均已实现',
  `client=${uniqueClient.join(',')} host=${uniqueHost.join(',')}`)
check(source.includes('"/dsh-liuyao/"') && hostSource.includes("'/dsh-liuyao/'"), '两端路径前缀一致（/dsh-liuyao/）')
check(/name: 'exact'|kind: 'exact'/.test(hostSource), 'Host 以 exact 路由注册，优先于静态兜底')
check(source.includes('fetch('), '客户端用 fetch 直连自有端点（不再走 RPC 前缀通道）')
check(!/connection\.rpc/.test(source), '客户端不再依赖 connection 服务')
// 只检查真正的调用（行首非注释），避免命中解释性注释里的同名字符串
const hostCodeLines = hostSource.split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
const hostCode = hostCodeLines.join('\n')
check(!/ctx\.inject\(\s*\[\s*'connection'\s*\]/.test(hostCode), 'Host 不再依赖 connection 服务（曾导致路由未注册 → 405）')
check(/ctx\.inject\(\s*\[\s*'webServer'\s*\]/.test(hostCode), 'Host 改为依赖 webServer 注册端点')
check(hostSource.includes("'sec-fetch-site'") && hostSource.includes('cross-origin request refused'), 'Host 端点自带同源门禁')

check(!/\brequire\(\s*["']\.\//.test(source), '不使用相对 require（bundle 自包含）')
check(!source.includes('sourceMappingURL'), '手写 bundle 无源码映射残留')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
