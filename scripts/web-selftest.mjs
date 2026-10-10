// 网页版自检：用最小 DOM 桩在 Node 里跑 app.js，验证
//   1) 纯函数层（liuyao.js）能算出正确的盘
//   2) 界面层（app.js）在浏览器环境下不会抛错，且确实渲染出内容
// 这样在没有人肉点浏览器的情况下，也能确认代码没坏。
// 用法：node scripts/web-selftest.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const web = join(root, 'web')

let fail = 0
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fail += 1
}

// ---------- 1) 纯函数层 ----------
console.log('--- 纯函数层 liuyao.js ---')
const lib = await import(pathToFileURL(join(web, 'liuyao.js')).href)

const r = lib.cast({ timeText: '2026-10-10 15:20', yao: [7, 8, 9, 8, 8, 9], topic: '问事业' })
check(r.chart.main.name === '山火贲', '排盘主卦', r.chart.main.name)
check(r.chart.changed?.name === '地雷复', '变卦', String(r.chart.changed?.name))
check(r.analysis.sections.length === 8, '分析章节数', String(r.analysis.sections.length))
check(Boolean(r.analysis.summary?.title), '含通俗总结', String(r.analysis.summary?.title))
check(r.text.includes('【通俗总结】'), '完整文本含通俗总结标记')
check(r.chart.main.lines.length === 6, '六爻齐全')
check(r.chart.main.lines.some(l => l.shi), '有世爻')
check(r.chart.main.lines.some(l => l.ying), '有应爻')

const o = lib.opening()
check(typeof o.opening === 'string' && o.opening.length > 0, '开场辞非空')
check(o.opening.includes('《') || o.opening.includes('周易'), '开场辞出自典籍', o.opening.slice(0, 30))

const t = lib.toss()
check([6, 7, 8, 9].includes(t.value), '摇卦取值合法', String(t.value))
check(Array.isArray(t.coins) && t.coins.length === 3, '三枚铜钱', (t.coins ?? []).join(''))
check(typeof t.name === 'string' && t.name.length > 0, '摇卦有爻名', t.name)

// 随机性抽检：1000 次应出现多种取值
const seen = new Set()
for (let i = 0; i < 1000; i += 1) seen.add(lib.toss().value)
check(seen.size === 4, '摇卦能取到全部四种爻值', [...seen].sort().join(','))

check(lib.yaoOptionText(9).includes('老阳'), '选项文案含爻名', lib.yaoOptionText(9))
check(lib.yaoOptionText(9).includes('●●●'), '选项文案含钱文', lib.yaoOptionText(9))
check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(lib.nowText()), '当前时间格式', lib.nowText())

let threw = false
try { lib.cast({ timeText: '2026/10/10', yao: [7, 7, 7, 7, 7, 7] }) } catch { threw = true }
check(threw, '非法时间格式会报错')

// ---------- 2) 界面层：最小 DOM 桩 ----------
console.log('--- 界面层 app.js（DOM 桩）---')

function makeEl(tag) {
  const node = {
    tagName: String(tag).toUpperCase(),
    childNodes: [],
    attributes: {},
    dataset: {},
    style: {},
    _text: '',
    _html: '',
    className: '',
    parentNode: null,
    listeners: {},
    get textContent() { return this._text },
    set textContent(v) { this._text = String(v) },
    get innerHTML() { return this._html },
    set innerHTML(v) { this._html = String(v) },
    get firstChild() { return this.childNodes[0] ?? null },
    append(...kids) {
      for (const k of kids) {
        if (k && typeof k === 'object' && 'tagName' in k) { k.parentNode = this; this.childNodes.push(k) }
        else if (k !== null && k !== undefined) {
          this.childNodes.push({ nodeType: 3, textContent: String(k), tagName: '#text', childNodes: [] })
        }
      }
    },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1) },
    insertBefore(newNode, ref) {
      const i = ref ? this.childNodes.indexOf(ref) : -1
      if (i >= 0) this.childNodes.splice(i, 0, newNode)
      else this.childNodes.unshift(newNode)
      newNode.parentNode = this
      return newNode
    },
    setAttribute(k, v) { this.attributes[k] = v },
    getAttribute(k) { return this.attributes[k] },
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn) },
    scrollIntoView() {},
    querySelector() { return null },
  }
  return node
}

// 支持 createElementNS 与 body 插入（八卦底纹要用）
const bodyEl = makeEl('body')
const rootEl = makeEl('div')
rootEl.id = 'app'

const documentStub = {
  head: makeEl('head'),
  body: bodyEl,
  createElement: makeEl,
  createElementNS: (ns, tag) => { const n = makeEl(tag); n.namespaceURI = ns; return n },
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t), tagName: '#text', childNodes: [] }),
  querySelector: (sel) => {
    if (sel === '#app') return rootEl
    if (sel === '[data-liuyao-backdrop]') {
      return bodyEl.childNodes.find((c) => c.dataset?.liuyaoBackdrop === '1') ?? null
    }
    return null
  },
}

globalThis.document = documentStub
globalThis.Node = class Node {}
// Node 24 已内置 crypto（只读），无需也不可覆盖；浏览器同样内置。
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  throw new Error('当前环境缺少 crypto.getRandomValues，网页随机源不可用')
}
// 让 DOM 桩里的对象被认作 Node 实例
for (const k of ['createElement', 'createTextNode']) {
  const orig = documentStub[k]
  documentStub[k] = (arg) => Object.setPrototypeOf(orig(arg), globalThis.Node.prototype)
}

let appError = null
try {
  await import(pathToFileURL(join(web, 'app.js')).href)
} catch (err) {
  appError = err
}
check(appError === null, 'app.js 加载并首次渲染无异常', appError ? appError.message : '')

// 渲染后应往 #app 里塞了节点
check(rootEl.childNodes.length > 0, '页面渲染出节点', `顶层 ${rootEl.childNodes.length} 个`)

// 递归统计节点与文本，确认关键内容真的进了 DOM
// 注意：文本节点（nodeType 3）用 textContent 存内容，没有 _text 字段，必须一并收集
const texts = []
let nodes = 0
const walk = (n) => {
  nodes += 1
  if (n.nodeType === 3) texts.push(n.textContent)
  else if (n._text) texts.push(n._text)
  for (const c of n.childNodes ?? []) walk(c)
}
for (const c of rootEl.childNodes) walk(c)
const all = texts.join('\n')
check(nodes > 20, '渲染节点数合理', String(nodes))
check(all.includes('手工输入卦象'), '出现「手工输入卦象」')
check(all.includes('电脑摇卦'), '出现「电脑摇卦」')
check(all.includes('所问之事'), '出现「所问之事」')
check(all.includes('起卦 / 排盘'), '出现「起卦 / 排盘」')
check(/第 1 \/ 6 爻|初爻/.test(all) || all.includes('初爻'), '出现爻位文案')
check([...all].some((c) => c >= '\u4e00' && c <= '\u9fff'), '渲染出中文内容')
check(all.includes('请选择'), '手工输入的下拉选项已生成')
check(all.includes('老阳'), '下拉里有带钱文的选项')

// 执行一次摇卦：先切到「电脑摇卦」模式，再点「摇第 N 爻」
// 注意：按钮文字在真实 DOM 里是文本子节点，所以要递归收集而不能只看 _text
const textOf = (n) => {
  if (n.nodeType === 3) return n.textContent
  let s = n._text ?? ''
  for (const c of n.childNodes ?? []) s += textOf(c)
  return s
}

const findBtn = (n, kw) => {
  if (n.tagName === 'BUTTON' && textOf(n).includes(kw)) return n
  for (const c of n.childNodes ?? []) { const hit = findBtn(c, kw); if (hit) return hit }
  return null
}
const collect = () => {
  const out = []
  const w = (n) => {
    if (n.nodeType === 3) out.push(n.textContent)
    else if (n._text) out.push(n._text)
    for (const c of n.childNodes ?? []) w(c)
  }
  for (const c of rootEl.childNodes) w(c)
  return out.join('\n')
}

const castBtn = findBtn(rootEl, '起卦 / 排盘')
check(Boolean(castBtn), '找到「起卦 / 排盘」按钮')

const tossModeBtn = findBtn(rootEl, '电脑摇卦')
check(Boolean(tossModeBtn), '找到「电脑摇卦」模式按钮')
if (tossModeBtn) {
  tossModeBtn.listeners.click?.[0]?.()
  check(collect().includes('摇第 1 爻'), '切到摇卦模式后出现「摇第 1 爻」')
}

const tossBtn = findBtn(rootEl, '摇第')
check(Boolean(tossBtn), '找到「摇第 N 爻」按钮')
if (tossBtn) {
  tossBtn.listeners.click?.[0]?.()
  const after = collect()
  check(after.includes('摇第 2 爻'), '点击后进入第 2 爻', after.includes('摇第 2 爻') ? '' : '未推进')
  check(/少阳|少阴|老阳|老阴/.test(after), '摇出一爻并显示爻名')
}

// 手工输入模式：六爻选满后应能排盘
const manualBtn = findBtn(rootEl, '手工输入卦象')
check(Boolean(manualBtn), '找到「手工输入卦象」模式按钮')
if (manualBtn) {
  manualBtn.listeners.click?.[0]?.()
  const after = collect()
  check(after.includes('请选择'), '回到手工模式，下拉复位')
}

// ---------- 3) 先天八卦底纹 ----------
console.log('--- 先天八卦底纹 ---')
const backdrop = bodyEl.childNodes.find((c) => c.dataset?.liuyaoBackdrop === '1')
check(Boolean(backdrop), '底纹已挂载到 body')
if (backdrop) {
  check(backdrop.className.includes('ly-backdrop'), '底纹类名正确', backdrop.className)
  check(backdrop.attributes['aria-hidden'] === 'true', '底纹对无障碍隐藏')
  const svg = backdrop.childNodes.find((c) => c.tagName === 'SVG')
  check(Boolean(svg), '底纹内含 SVG')
  if (svg) {
    check(svg.attributes.viewBox === '0 0 1000 1000', 'SVG viewBox 正确', String(svg.attributes.viewBox))
    check(String(svg.style.opacity) === '0.055', 'SVG 透明度已设为低值（不遮字）', String(svg.style.opacity))
    // 统计图形：4 个参考圆 + 64 卦名 + 8 卦组 + 太极 4 件 + 题字
    let circles = 0, texts = 0, paths = 0, rects = 0, groups = 0
    const count = (n) => {
      if (n.tagName === 'CIRCLE') circles += 1
      if (n.tagName === 'TEXT') texts += 1
      if (n.tagName === 'PATH') paths += 1
      if (n.tagName === 'RECT') rects += 1
      if (n.tagName === 'G') groups += 1
      for (const c of n.childNodes ?? []) count(c)
    }
    count(svg)
    check(texts >= 64, '含六十四卦名环', `text ${texts} 个`)
    check(groups === 8, '含八卦八组', `g ${groups} 个`)
    check(paths >= 1, '含太极图形')
    check(rects >= 24, '含八卦爻线', `rect ${rects} 个`)
    check(circles >= 4, '含参考圆', `circle ${circles} 个`)
    // 八卦名与方位都应出现
    const svgText = (() => { const o = []; const w = (n) => { if (n.tagName === 'TEXT') o.push(n._text); for (const c of n.childNodes ?? []) w(c) }; w(svg); return o.join(' ') })()
    for (const n of ['乾', '坤', '坎', '离', '震', '巽', '艮', '兑']) {
      check(svgText.includes(n), `八卦含「${n}」`)
    }
    check(svgText.includes('先天八卦'), '含题字「先天八卦」')
  }
}

// ---------- 4) 关于面板 ----------
console.log('--- 关于面板 ---')
const aboutBtn = findBtn(rootEl, '关于')
check(Boolean(aboutBtn), '页头有「关于」按钮')
if (aboutBtn) {
  aboutBtn.listeners.click?.[0]?.()
  const after = collect()
  check(after.includes('咨询与赞助'), '展开后含「咨询与赞助」')
  check(after.includes('Ljx_0609300'), '显示咨询微信号')
  check(after.includes('复制'), '有复制按钮')
  check(after.includes('数据透明'), '含数据透明说明')
  check(after.includes('免责与边界'), '含免责说明')
  check(after.includes('不承诺任何预测准确率'), '免责含不承诺准确率')
  check(after.includes('仅供文化参考与娱乐'), '免责含仅供娱乐')
  check(after.includes('不上传任何数据'), '透明说明含不上传数据')
  check(after.includes('历法自检锚点'), '含历法自检锚点')
  check(after.includes('1949-10-01'), '含锚点日期')
  check(after.includes('甲子日'), '含锚点干支')
  const closeBtn = findBtn(rootEl, '收起')
  check(Boolean(closeBtn), '有收起按钮')
  if (closeBtn) {
    closeBtn.listeners.click?.[0]?.()
    check(!collect().includes('咨询与赞助'), '收起后内容消失')
  }
}

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
