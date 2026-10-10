// 六爻排盘 —— 网页界面
// 复用插件同一套样式类名与 DOM 结构（.ly-*），所以视觉与 DSH 插件一致。
// 不依赖任何框架、不需要构建步骤：直接 ES module。

import {
  cast, opening, toss, nowText,
  YAO_ORDER, yaoOptionText, ABOUT, CALENDAR_ANCHORS,
} from './liuyao.js'
import { mountBackdrop } from './bagua.js'

// ---------------------------------------------------------------
// DOM 小工具
// ---------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel)

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v)
    else node.setAttribute(k, String(v))
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild) }

// ---------------------------------------------------------------
// 卦象渲染（与插件 client/client.js 的 ChartTable 一致）
// ---------------------------------------------------------------
const POSITION_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

function lineGlyph(yang) {
  return yang ? '\u2585\u2585\u2585\u2585\u2585' : '\u2585\u2585\u3000\u2585\u2585'
}

function shortRel(rel) {
  return ({ 父母: '父', 兄弟: '兄', 子孙: '孙', 妻财: '财', 官鬼: '官' })[rel] || rel
}

function chartTable(chart) {
  const rows = []
  for (let i = 5; i >= 0; i -= 1) {
    const m = chart.main.lines[i]
    const c = chart.changed ? chart.changed.lines[i] : null
    const hidden = (m.hiddenSpirits && m.hiddenSpirits[0]) || null
    const tagged = (txt, cls) => el('span', { class: cls, text: txt })

    rows.push(el('tr', {},
      el('td', { class: 'ly-dim', text: m.god }),
      el('td', { class: 'ly-dim', text: hidden ? shortRel(hidden.relative) + hidden.stem + hidden.branch + hidden.element : '' }),
      el('td', {},
        m.moving ? tagged(m.value === 9 ? '○ ' : '× ', 'ly-mark') : null,
        m.relative + m.stem + m.branch + m.element,
        m.shi ? tagged(' 世', 'ly-mark') : null,
        m.ying ? tagged(' 应', 'ly-mark') : null,
        m.kong ? tagged('空', 'ly-tag') : null,
        m.monthBreak ? tagged('月破', 'ly-tag') : null,
        m.changed && m.changed.backControl ? tagged('回头克', 'ly-tag ly-key') : null,
        m.changed && m.changed.backGenerate ? tagged('回头生', 'ly-tag ly-good') : null,
      ),
      el('td', { class: 'ly-gua', text: lineGlyph(m.yang) }),
      el('td', { class: 'ly-gua', text: c && c.moving ? lineGlyph(c.yang) : '' }),
      el('td', {}, c && c.moving
        ? c.relative + c.stem + c.branch + c.element + (c.shi ? ' 世' : c.ying ? ' 应' : '')
        : ''),
    ))
  }

  return el('div', { class: 'ly-table-wrap' },
    el('table', { class: 'ly-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, '六神'), el('th', {}, '伏神'), el('th', {}, '本卦六亲纳甲'),
        el('th', {}, '本卦'), el('th', {}, '变卦'), el('th', {}, '变卦六亲纳甲'),
      )),
      el('tbody', {}, rows),
    ),
  )
}

function chartMeta(chart) {
  const s = chart.solar ?? {}
  const p = chart.pillars ?? {}
  const kong = chart.kong
  const bits = []
  bits.push(`公历：${s.text ?? `${s.year}年${s.month}月${s.day}日`}`)
  if (p.year) bits.push(`干支：${p.year}年 ${p.month}月 ${p.day}日${p.hour ? ' ' + p.hour + '时' : ''}`)
  if (kong) bits.push(`旬空：${Array.isArray(kong) ? kong.join('、') : kong}`)

  return el('div', {},
    ...bits.map((t) => el('div', { class: 'ly-sub', text: t })),
  )
}

// 旺衰评分行
function stateRow(chart) {
  return el('div', { class: 'ly-states' },
    el('span', { class: 'ly-states-h', text: '旺衰' }),
    ...chart.main.lines.map((l) => el('span', {
      class: 'ly-state',
      text: `${POSITION_NAMES[l.position - 1]}·${l.state}${l.score !== undefined ? `·评${l.score}分` : ''}`,
    })),
  )
}

// ---------------------------------------------------------------
// 通俗总结（与插件 SummaryView 一致）
// ---------------------------------------------------------------
function summaryView(s) {
  if (!s) return null
  return el('div', { class: 'ly-summary' },
    el('div', { class: 'ly-summary-head' },
      el('span', { class: 'ly-summary-tag' }, '通俗总结'),
      el('span', { class: 'ly-summary-title' }, s.title ?? ''),
    ),
    el('div', { class: 'ly-summary-line' }, s.oneLine ?? ''),
    ...(s.paragraphs ?? []).map((p) => el('p', { class: 'ly-summary-p' }, p)),
    (s.advice ?? []).length
      ? el('div', { class: 'ly-summary-advice' },
        el('div', { class: 'ly-summary-advice-h' }, '怎么办'),
        ...s.advice.map((a) => el('div', { class: 'ly-summary-advice-i' }, '· ' + a)),
      )
      : null,
    s.note ? el('div', { class: 'ly-src', style: { marginTop: '8px' } }, '（' + s.note + '）') : null,
  )
}

// ---------------------------------------------------------------
// 断卦展示（与插件 AnalysisView 一致：条文 → 结论清单 → 通俗总结）
// ---------------------------------------------------------------
function analysisView(analysis) {
  const wrap = el('div', {})

  for (const s of analysis.sections ?? []) {
    wrap.append(el('div', { class: 'ly-sec' },
      el('h4', {}, s.title, s.needTopic ? el('span', { class: 'ly-tag' }, '需注明所问之事') : null),
      ...(s.points ?? []).map((p) => el('div', { style: { marginBottom: '4px' } },
        el('div', {}, '· ' + p.text),
        p.source ? el('div', { class: 'ly-src' }, '〔' + p.source + '〕') : null,
      )),
    ))
  }

  const v = analysis.verdict ?? { items: [] }
  wrap.append(el('div', { class: 'ly-sec' },
    el('h4', {}, '结论清单'),
    ...(v.items ?? []).map((it) => {
      const cls = it.level === '凶' ? 'ly-key' : it.level === '吉' ? 'ly-good' : 'ly-mark'
      return el('div', { style: { marginBottom: '3px' } },
        el('span', { class: cls }, '[' + it.level + '] '),
        it.text,
        el('span', { class: 'ly-src' }, ' 〔' + it.source + '〕'),
      )
    }),
    (v.items ?? []).length === 0
      ? el('div', { class: 'ly-dim' }, '本卦无典籍明文可断之象，故不作吉凶断语。')
      : null,
    v.note ? el('div', { class: 'ly-src', style: { marginTop: '6px' } }, v.note) : null,
  ))

  const sum = summaryView(analysis.summary)
  if (sum) wrap.append(sum)
  return wrap
}

// ---------------------------------------------------------------
// 关于面板（与插件「关于」同源内容；纯静态，不发起网络请求）
// ---------------------------------------------------------------
function aboutRow(k, ...value) {
  return el('div', { class: 'ly-about-row' },
    el('span', { class: 'ly-about-k' }, k),
    el('span', { class: 'ly-about-v' }, ...value),
  )
}

function copyText(text, btn) {
  const done = () => {
    const old = btn.textContent
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = old }, 1500)
  }
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, done)
      return
    }
  } catch { /* 剪贴板不可用则退化为手工选择 */ }
  done()
}

function aboutPanel(onClose) {
  const copyBtn = el('button', { class: 'ly-btn ghost' }, '复制')
  copyBtn.addEventListener('click', () => copyText(ABOUT.consultWechat, copyBtn))

  return el('div', { class: 'ly-about' },
    el('div', { class: 'ly-about-head' },
      el('span', { class: 'ly-about-name' }, ABOUT.name),
      el('span', { class: 'ly-about-ver' }, 'v' + ABOUT.version),
      el('span', { class: 'ly-about-lic' }, ABOUT.license),
      el('button', { class: 'ly-btn ghost ly-about-close', onClick: onClose }, '收起'),
    ),

    el('div', { class: 'ly-about-sec' },
      el('h4', {}, '这是什么'),
      el('p', { class: 'ly-summary-p' },
        '在线六爻纳甲排盘与断卦：先天八卦为盘、火珠林纳甲为法、增删卜易为断。排盘与断语逐条注明典籍出处，典籍无明文者不作推断。'),
      aboutRow('项目地址', el('a', { class: 'ly-about-a', href: ABOUT.repository, target: '_blank', rel: 'noreferrer' }, ABOUT.repository)),
      aboutRow('问题反馈', el('a', { class: 'ly-about-a', href: ABOUT.feedbackUrl, target: '_blank', rel: 'noreferrer' }, ABOUT.feedbackUrl)),
    ),

    el('div', { class: 'ly-about-sec' },
      el('h4', {}, '数据透明'),
      el('ul', { class: 'ly-about-ul' }, ...ABOUT.privacy.map((t) => el('li', {}, t))),
    ),

    el('div', { class: 'ly-about-sec' },
      el('h4', {}, '咨询与赞助'),
      el('p', { class: 'ly-summary-p' }, ABOUT.sponsorNote),
      el('div', { class: 'ly-about-wechat' },
        el('span', { class: 'ly-about-k' }, '微信号'),
        el('code', { class: 'ly-about-code' }, ABOUT.consultWechat),
        copyBtn,
      ),
      el('div', { class: 'ly-src' }, '加微信请注明来意（咨询／定制／赞助）。本站免费开源，赞助与咨询都自愿。'),
    ),

    el('div', { class: 'ly-about-sec' },
      el('h4', {}, '免责与边界'),
      el('ul', { class: 'ly-about-ul' }, ...ABOUT.disclaimer.map((t) => el('li', {}, t))),
    ),

    el('div', { class: 'ly-about-sec' },
      el('h4', {}, '历法自检锚点'),
      el('div', { class: 'ly-src' }, '干支历以天文算法推算（定气定朔），下列结果与通胜万年历逐字核对：'),
      el('ul', { class: 'ly-about-ul' },
        ...CALENDAR_ANCHORS.map((a) => el('li', {},
          el('code', { class: 'ly-about-code' }, a.date), ' → ' + a.expected)),
      ),
    ),
  )
}

// ---------------------------------------------------------------
// 主界面
// ---------------------------------------------------------------
const app = $('#app')

// 先天八卦底纹：进页面即铺上（固定层 + pointer-events:none，不挡内容与点击）
if (!document.querySelector('[data-liuyao-backdrop]')) {
  mountBackdrop({ opacity: 0.055 })
}

const state = {
  mode: 'manual',
  manual: ['', '', '', '', '', ''],
  tossed: [null, null, null, null, null, null],
  round: 0,
  lastToss: null,
  topic: '',
  time: nowText(),
  openingText: null,
  result: null,
  error: '',
  aboutOpen: false,
}

const currentYao = () => (state.mode === 'manual'
  ? state.manual.map((s) => (s === '' ? null : Number(s)))
  : state.tossed)

function doCast() {
  state.error = ''
  const yao = currentYao()
  if (yao.some((v) => v === null)) {
    const left = yao.filter((v) => v === null).length
    state.error = state.mode === 'manual' ? '请把六爻都选上（自初爻至上爻）' : `还有 ${left} 爻未摇`
    render()
    return
  }
  try {
    state.result = cast({ timeText: state.time, yao, topic: state.topic.trim() })
  } catch (err) {
    state.error = err.message
    state.result = null
  }
  render()
  if (state.result) {
    $('.ly-analysis-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function render() {
  clear(app)
  if (!state.openingText) state.openingText = opening().opening

  // 页头：标题 + 关于开关
  app.append(el('div', { class: 'ly-head' },
    el('div', { class: 'ly-title' }, '六爻·纳甲'),
    el('div', { class: 'ly-sub' }, '先天八卦为盘　火珠林纳甲为法　增删卜易为断'),
    el('div', { class: 'ly-head-actions' },
      el('button', {
        class: 'ly-btn ghost',
        onClick: () => { state.aboutOpen = !state.aboutOpen; render() },
      }, state.aboutOpen ? '收起关于' : '关于'),
    ),
  ))
  if (state.aboutOpen) app.append(aboutPanel(() => { state.aboutOpen = false; render() }))

  // 开场辞
  app.append(el('div', { class: 'ly-card' }, el('div', { class: 'ly-opening' }, state.openingText)))

  // 起卦卡片
  const card = el('div', { class: 'ly-card' })

  card.append(el('div', { class: 'ly-row' },
    el('div', { class: 'ly-label' }, '起卦方式'),
    el('div', { class: 'ly-modes' },
      ...[['manual', '手工输入卦象'], ['toss', '电脑摇卦（三枚铜钱）']].map(([key, label]) =>
        el('button', {
          class: 'ly-btn' + (state.mode === key ? ' primary' : ''),
          onClick: () => { state.mode = key; state.error = ''; render() },
        }, label)),
    ),
  ))

  card.append(el('div', { class: 'ly-row' },
    el('div', { class: 'ly-label' }, '起卦时间'),
    el('input', {
      class: 'ly-input', type: 'text', value: state.time,
      onInput: (e) => { state.time = e.target.value },
    }),
    el('button', { class: 'ly-btn ghost', onClick: () => { state.time = nowText(); render() } }, '取当前时间'),
  ))

  if (state.mode === 'manual') {
    const grid = el('div', { class: 'ly-grid' })
    POSITION_NAMES.forEach((name, i) => {
      const sel = el('select', {
        class: 'ly-select',
        onChange: (e) => { state.manual[i] = e.target.value; state.error = '' },
      })
      sel.append(el('option', { value: '' }, '— 请选择 —'))
      for (const v of YAO_ORDER) {
        const opt = el('option', { value: String(v) }, yaoOptionText(v))
        if (String(v) === state.manual[i]) opt.selected = true
        sel.append(opt)
      }
      grid.append(el('div', { class: 'ly-slot' }, el('div', { class: 'ly-slot-head' }, name), sel))
    })
    card.append(grid)
  } else {
    const box = el('div', { class: 'ly-tossbox' },
      el('div', { class: 'ly-tosshead' },
        state.round < 6
          ? `第 ${state.round + 1} / 6 爻　${POSITION_NAMES[state.round]}`
          : '六爻已齐，可以排盘'),
    )

    if (state.lastToss) {
      const coins = el('div', { class: 'ly-coins' })
      for (const c of state.lastToss.coinFaces) {
        coins.append(el('span', { class: 'ly-coin' + (c === 'back' ? ' back' : ''), text: c === 'back' ? '背' : '字' }))
      }
      box.append(coins)
      box.append(el('div', { class: 'ly-src' }, `${state.lastToss.name}　${state.lastToss.description}`))
    }

    const btns = el('div', { class: 'ly-modes' })
    if (state.round < 6) {
      btns.append(el('button', {
        class: 'ly-btn primary',
        onClick: () => {
          const t = toss()
          state.tossed[state.round] = t.value
          state.lastToss = t
          state.round += 1
          state.error = ''
          render()
        },
      }, `摇第 ${state.round + 1} 爻`))
    }
    btns.append(el('button', {
      class: 'ly-btn ghost',
      onClick: () => {
        state.tossed = [null, null, null, null, null, null]
        state.round = 0
        state.lastToss = null
        state.error = ''
        render()
      },
    }, '重新摇卦'))
    box.append(btns)

    const list = el('div', { class: 'ly-tosslist' })
    POSITION_NAMES.forEach((name, i) => {
      const v = state.tossed[i]
      list.append(el('div', { class: 'ly-tossrow' },
        el('span', { class: 'ly-tossname' }, name),
        el('span', { class: v === null ? 'ly-dim' : '' }, v === null ? '未抛' : yaoOptionText(v)),
      ))
    })
    box.append(list)
    card.append(box)
  }

  card.append(el('div', { class: 'ly-row' },
    el('div', { class: 'ly-label' }, '所问之事'),
    el('input', {
      class: 'ly-input wide', type: 'text', value: state.topic,
      placeholder: '如：问今年财运 / 问考试能否通过 / 问与某人合作',
      onInput: (e) => { state.topic = e.target.value },
    }),
    el('button', { class: 'ly-btn primary', onClick: doCast }, '起卦 / 排盘'),
  ))

  card.append(el('div', { class: 'ly-src' },
    '所问之事须注明：六爻断卦第一步是「取用神」，不问事则只排盘、不下吉凶结论。'))

  if (state.error) card.append(el('div', { class: 'ly-error' }, state.error))

  app.append(card)

  // 结果
  if (state.result) {
    const { chart, analysis, plainText } = state.result
    const box = el('div', { class: 'ly-card' })

    const p = chart.pillars ?? {}
    box.append(el('div', { class: 'ly-head', style: { marginTop: '0' } },
      el('div', { class: 'ly-title', style: { fontSize: '18px' } }, chart.main.name),
      chart.changed
        ? el('div', { class: 'ly-sub' }, '之 ' + chart.changed.name)
        : el('div', { class: 'ly-sub' }, '六爻安静'),
      el('div', { class: 'ly-sub' }, `${chart.main.palace.palace}宫·${chart.main.palace.stageName}`),
    ))
    box.append(chartMeta(chart))
    box.append(chartTable(chart))
    box.append(stateRow(chart))
    box.append(el('div', { class: 'ly-analysis-anchor' }))
    box.append(analysisView(analysis))
    box.append(el('details', { class: 'ly-raw' },
      el('summary', {}, '查看原始排盘文本'),
      el('pre', { class: 'ly-pre' }, plainText),
    ))
    app.append(box)
  }
}

render()
