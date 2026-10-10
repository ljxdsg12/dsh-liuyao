// 面板状态保持自检：验证「切到对话再切回」不丢状态。
//
// 原理：DSH 里面板随槽位挂载/卸载，组件重建会丢 React 状态；
// 客户端模块由 ModuleLoader 加载一次并常驻，所以用模块级 boardCache 保留。
// 本测法：桩掉 slots 拿到真实 Board 组件 → 渲染 → 改状态 → 卸载 → 再渲染 → 断言状态还在。
//
// 用法：node test/statekeep.test.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fail = 0
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fail += 1
}

const src = readFileSync(join(root, 'client', 'client.js'), 'utf8')
// 去掉注释再检查，避免注释里的词造成误判
const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

// ---------- 静态：缓存读写成对 ----------
console.log('--- 静态检查：每个状态都有「读缓存 + 写缓存」---')
const FIELDS = ['opening', 'topic', 'time', 'mode', 'manual', 'tossed', 'result', 'aiMode', 'aiText', 'aiError', 'aiNotice']
check(/var boardCache = \{/.test(code), '定义了模块级 boardCache')
for (const f of FIELDS) {
  const init = new RegExp(`React\\.useState\\(boardCache\\.${f}\\)`).test(code)
  const write = new RegExp(`boardCache\\.${f}\\s*[=+]`).test(code)
  check(init && write, `${f}：读缓存${init ? '✓' : '✗'} 写缓存${write ? '✓' : '✗'}`)
}
// 摇卦进度与上一爻结果合在一个 useState 里恢复
check(/useState\(\{ round: boardCache\.tossRound, busy: false, last: boardCache\.lastToss \}\)/.test(code),
  'tossRound/lastToss 一并从缓存恢复')
check(/boardCache\.tossRound = /.test(code) && /boardCache\.lastToss = /.test(code), 'tossRound/lastToss 写缓存')
check(!/localStorage\s*[.\[]/.test(code), '不使用 localStorage（不落盘，刷新即清空）')
check(!/sessionStorage\s*[.\[]/.test(code), '不使用 sessionStorage')
check(!/\baiAbort\b/.test(code), '无遗留的旧 ref 名')
check(/var mounted = React\.useRef\(true\)/.test(code), '跟踪挂载状态（流式回包可能晚于卸载）')
check(/if \(mounted\.current\)/.test(code), '卸载后只写缓存、不 setState')
check(/if \(!boardCache\.opening\)/.test(code), '开场辞已缓存则不重取')

// ---------- 动态：桩 slots 拿到 Board，真实渲染两次 ----------
console.log('--- 动态检查：渲染 → 卸载 → 再渲染 ---')

function makeEl(tag) {
  const node = {
    tagName: String(tag).toUpperCase(), nodeType: 1,
    childNodes: [], attributes: {}, dataset: {}, style: {},
    _text: '', _html: '', className: '', parentNode: null, listeners: {},
    get textContent() { return this._text },
    set textContent(v) { this._text = String(v) },
    get innerHTML() { return this._html },
    set innerHTML(v) { this._html = String(v) },
    append(...kids) {
      for (const k of kids) {
        if (k && typeof k === 'object' && 'tagName' in k) { k.parentNode = this; this.childNodes.push(k) }
        else if (k !== null && k !== undefined) this.childNodes.push({ nodeType: 3, textContent: String(k), tagName: '#text', childNodes: [] })
      }
    },
    appendChild(k) { this.append(k); return k },
    remove() { if (this.parentNode) this.parentNode.removeChild(this) },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1) },
    insertBefore(n, ref) { const i = ref ? this.childNodes.indexOf(ref) : -1; if (i >= 0) this.childNodes.splice(i, 0, n); else this.childNodes.unshift(n); n.parentNode = this; return n },
    setAttribute(k, v) { this.attributes[k] = v },
    getAttribute(k) { return this.attributes[k] },
    hasAttribute(k) { return k in this.attributes },
    removeAttribute(k) { delete this.attributes[k] },
    addEventListener(t, f) { (this.listeners[t] ??= []).push(f) },
    removeEventListener() {}, scrollIntoView() {},
    querySelector() { return null }, querySelectorAll() { return [] },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 } },
    classList: { add() {}, remove() {}, contains() { return false }, toggle() {} },
    matches() { return false },
  }
  return node
}

globalThis.document = {
  head: makeEl('head'), body: makeEl('body'),
  createElement: makeEl,
  createElementNS: (ns, tag) => makeEl(tag),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t), tagName: '#text', childNodes: [] }),
  querySelector: () => null, querySelectorAll: () => [],
}
globalThis.Node = class Node {}

// React 桩：hooks 按调用顺序存在数组里，卸载时清空（模拟状态丢失）
let hookStore = []
let hookIndex = 0
let pendingEffects = []
const ReactStub = {
  useState(init) {
    const i = hookIndex++
    if (!(i in hookStore)) hookStore[i] = typeof init === 'function' ? init() : init
    return [hookStore[i], (v) => { hookStore[i] = typeof v === 'function' ? v(hookStore[i]) : v }]
  },
  useRef(init) { const i = hookIndex++; if (!(i in hookStore)) hookStore[i] = { current: init }; return hookStore[i] },
  useEffect(fn) { pendingEffects.push(fn) },
  useMemo(fn) { return fn() },
  useCallback(fn) { return fn },
  createElement(tag, props, ...children) {
    if (typeof tag === 'function') return tag({ ...(props ?? {}), children })
    const node = makeEl(tag)
    for (const [k, v] of Object.entries(props ?? {})) {
      if (v === null || v === undefined || v === false) continue
      if (k === 'className') node.className = v
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v)
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v)
      else node.setAttribute(k, v)
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue
      node.append(c)
    }
    return node
  },
}

// 捕获 slots 注册的 Board 组件
const registered = []
// 注意：factory 内部自己建了 module 对象，所以外层的 module.exports 是空的；
// 导出物由 ModuleLoader.load() 的返回值给出（真实 DSH 也是这么做 exports.default ?? exports）。
let pluginExports = null
globalThis.window = {
  __ModuleLoader__: {
    load(def) {
      const inner = { exports: {} }
      const require = (n) => {
        if (n === 'react') return ReactStub
        if (n === 'react/jsx-runtime') return { jsx: ReactStub.createElement, jsxs: ReactStub.createElement, Fragment: 'Fragment' }
        return {}
      }
      pluginExports = def.factory(require, inner, inner.exports) ?? inner.exports
      return pluginExports
    },
  },
}
globalThis.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('{"ok":true,"value":{}}'), body: null })

await import(new URL('../client/client.js', import.meta.url).href)
check(Boolean(pluginExports), '客户端模块加载并返回导出物')
check(typeof pluginExports?.apply === 'function', '导出物含 apply')

const slotsStub = {
  inject: (key, cb) => cb(),
  register: (meta, comp) => { registered.push({ meta, comp }); return () => {} },
}
pluginExports.apply({
  slots: slotsStub,
  get: (key) => (key === 'slots' ? slotsStub : undefined),
  effect: (fn) => { const c = fn(); return typeof c === 'function' ? c : () => {} },
  logger: { info: () => {}, warn: () => {} },
})

const mainReg = registered.find((r) => r.meta?.name === 'main')
check(Boolean(mainReg), '客户端注册了 main 槽位组件')
const Board = mainReg?.comp
check(typeof Board === 'function', 'Board 是函数组件')

let openingCalls = 0
const api = {
  config: () => Promise.resolve({ config: { requireConfirmEach: true, analysisMode: 'ai', aboutEnabled: false } }),
  opening: () => { openingCalls += 1; return Promise.resolve({ opening: '「测试爻辞」——《周易·系辞下》' }) },
  toss: () => Promise.resolve({ value: 7, coins: ['back', 'front', 'front'], name: '少阳', description: '一背二字' }),
  cast: () => Promise.resolve({ chart: { main: { name: '测试卦', palace: {}, lines: [], } }, analysis: { sections: [], verdict: { items: [] } }, text: '' }),
  about: () => Promise.resolve({ value: {} }),
  analyzeAi: () => Promise.resolve(),
}

/** 挂载：清空 hooks（模拟新组件），渲染，跑 effect */
function mount() {
  hookStore = []
  hookIndex = 0
  pendingEffects = []
  const tree = ReactStub.createElement(Board, { api, requireConfirmEach: true, followUpEnabled: false })
  for (const fn of pendingEffects) fn()
  pendingEffects = []
  return tree
}

const collect = (n) => {
  const out = []
  const walk = (x) => {
    if (!x) return
    if (x.nodeType === 3) out.push(x.textContent)
    else if (x._text) out.push(x._text)
    for (const c of x.childNodes ?? []) walk(c)
  }
  walk(n)
  return out.join('\n')
}
const findBtn = (n, kw) => {
  const textOf = (x) => x.nodeType === 3 ? x.textContent : ((x._text ?? '') + (x.childNodes ?? []).map(textOf).join(''))
  if (n.tagName === 'BUTTON' && textOf(n).includes(kw)) return n
  for (const c of n.childNodes ?? []) { const hit = findBtn(c, kw); if (hit) return hit }
  return null
}

console.log('--- 第一次挂载 ---')
const first = mount()
const firstText = collect(first)
check(firstText.length > 0, '首次渲染有内容', `${firstText.length} 字符`)
check(firstText.includes('手工输入卦象'), '出现起卦方式')
check(firstText.includes('所问之事'), '出现所问之事')

// 改状态：输入所问之事（模拟用户填写）
const topicInput = (function find(n) {
  if (n.tagName === 'INPUT' && n.attributes.placeholder && String(n.attributes.placeholder).includes('问')) return n
  for (const c of n.childNodes ?? []) { const hit = find(c); if (hit) return hit }
  return null
})(first)
check(Boolean(topicInput), '找到「所问之事」输入框')
if (topicInput) {
  const handler = topicInput.listeners.input?.[0] ?? topicInput.listeners.change?.[0]
  if (handler) handler({ target: { value: '问测试之事' } })
}

// 等待异步 effect 完成
await new Promise((r) => setTimeout(r, 20))

console.log('--- 卸载后再次挂载（模拟切到对话再切回）---')
const second = mount()
await new Promise((r) => setTimeout(r, 20))
const secondText = collect(second)
check(secondText.length > 0, '再次渲染有内容', `${secondText.length} 字符`)
check(openingCalls <= 1, '开场辞只请求一次（缓存生效，切回来爻辞不会变）', `${openingCalls} 次`)

// 关键断言：输入的内容在重挂载后仍在（值从 boardCache 初始化）
const secondTopic = (function find(n) {
  if (n.tagName === 'INPUT' && n.attributes.placeholder && String(n.attributes.placeholder).includes('问')) return n
  for (const c of n.childNodes ?? []) { const hit = find(c); if (hit) return hit }
  return null
})(second)
check(Boolean(secondTopic), '重挂载后仍能找到输入框')
if (secondTopic) {
  const val = secondTopic.attributes.value ?? secondTopic.value ?? ''
  check(val === '问测试之事', '重挂载后「所问之事」内容仍在（未回到初始界面）', `值="${val}"`)
}

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
