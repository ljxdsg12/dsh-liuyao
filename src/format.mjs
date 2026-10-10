// 排盘输出：文本版（同参考图顺序）与结构化数据
import { RELATIVE_SHORT, SIX_CLASH, HORSE_GROUPS, FLOWER_GROUPS, LU, NOBLE } from './constants.mjs'
import { GAN, ZHI } from './calendar.mjs'
import { lineSymbol } from './engine.mjs'

const POS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const NUM = ['初', '二', '三', '四', '五', '上']

/** 通俗总结的文本块。 */
export function formatSummary(analysis) {
  const s = analysis?.summary
  if (!s) return ''
  const L = []
  L.push(`【通俗总结】${s.title}`)
  L.push(`· ${s.oneLine}`)
  for (const p of s.paragraphs) L.push(`· ${p}`)
  if (s.advice.length) {
    L.push('· 怎么办：')
    for (const a of s.advice) L.push(`　- ${a}`)
  }
  if (s.note) L.push(`（${s.note}）`)
  return L.join('\n')
}

/** 断卦依据的文本块（条文 + 结论清单），不含量化总结。 */
export function formatEvidence(analysis) {
  if (!analysis) return ''
  const L = []
  L.push('================ 断卦依据 ================')
  for (const s of analysis.sections ?? []) {
    L.push('')
    L.push(`【${s.title}】`)
    for (const p of s.points ?? []) {
      L.push(` · ${p.text}`)
      if (p.source) L.push(`   〔${p.source}〕`)
    }
  }
  L.push('')
  L.push('【结论清单】')
  for (const it of analysis.verdict?.items ?? []) {
    L.push(` [${it.level}] ${it.text}  〔${it.source}〕`)
  }
  if ((analysis.verdict?.items ?? []).length === 0) L.push(' 本卦无典籍明文可断之象，故不作吉凶断语。')
  if (analysis.verdict?.note) L.push(analysis.verdict.note)
  return L.join('\n')
}

/**
 * 整段解读文本：排盘 → 断卦条文 → 结论清单 → 通俗总结。
 * 通俗总结固定在全篇末尾。
 */
export function formatFull(chart, analysis) {
  const parts = [formatText(chart)]
  const evidence = formatEvidence(analysis)
  if (evidence) parts.push('', evidence)
  const summary = formatSummary(analysis)
  if (summary) parts.push('', summary)
  return parts.join('\n')
}

export function formatText(chart, analysis) {
  const L = []
  const p = chart.pillars
  L.push(`公历：${chart.solar.text}，${chart.solar.weekday}。`)
  L.push(`农历：${chart.solar.lunarText}。`)
  L.push(`神煞：驿马-${cfgHorse(chart)}　桃花-${cfgFlower(chart)}　天干禄-${cfgLu(chart)}　贵人-${cfgNoble(chart)}`)
  L.push(`干支：${p.year.text}年 ${p.month.text}月 ${p.day.text}日 ${p.hour.text}时（旬空：${chart.kong.empty.join('、')}，${chart.kong.xun}旬）`)
  L.push('')
  const title = chart.changed
    ? `主变卦　　${chart.main.name}(${chart.main.palace.palace}宫) 之 ${chart.changed.name}(${chart.changed.palace.palace}宫)`
    : `主卦　　　${chart.main.name}(${chart.main.palace.palace}宫)〔六爻安静〕`
  L.push(`${title}`)
  L.push(`卦身：${NUM[chart.main.palace.shi - 1]}爻　世应：世${NUM[chart.main.palace.shi - 1]}应${NUM[chart.main.palace.ying - 1]}　${chart.main.palace.stageName}`)
  L.push('')
  L.push('六神｜伏神　　　｜六亲纳甲　　　　　｜本　卦　　｜变　卦')
  for (let i = 5; i >= 0; i -= 1) {
    const m = chart.main.lines[i]
    const c = chart.changed ? chart.changed.lines[i] : null
    const hid = m.hiddenSpirits[0]
    const hidText = hid ? `${RELATIVE_SHORT[hid.relative]}${hid.stem}${hid.branch}${hid.element}` : ''
    const shiMark = m.shi ? '世' : m.ying ? '应' : ''
    const movMark = m.moving ? (m.value === 9 ? '○' : '×') : ''
    const mainText = `${m.relative}${m.stem}${m.branch}${m.element}${shiMark}`
    const cText = c && c.moving
      ? `${RELATIVE_SHORT[c.relative]}${c.stem}${c.branch}${c.element}${c.shi ? '世' : c.ying ? '应' : ''}`
      : ''
    const cCell = c && c.moving ? `${mark(c.yang)} ${cText}` : ''
    L.push([
      pad(m.god, 6),
      pad(hidText, 12),
      movMark + pad(mainText, 14),
      mark(m.yang),
      cCell,
    ].join('').trimEnd())
  }
  L.push('')
  L.push('【爻位明细】')
  for (let i = 5; i >= 0; i -= 1) {
    const m = chart.main.lines[i]
    const tags = []
    if (m.kong) tags.push('旬空')
    if (m.monthBreak) tags.push('月破')
    if (m.dayBreak) tags.push('日破')
    if (m.monthHarmony) tags.push('月合')
    if (m.dayHarmony) tags.push('日合')
    if (m.isHorse) tags.push('驿马')
    if (m.isFlower) tags.push('桃花')
    if (m.isLu) tags.push('禄')
    if (m.isNoble) tags.push('贵人')
    if (m.isStore) tags.push('四库')
    L.push(`${m.positionName}　${m.god}　${m.relative}${m.stem}${m.branch}${m.element}（纳音${m.nayin?.name ?? '—'}）　${m.state}　${m.stage ?? ''}　${m.moving ? (m.value === 9 ? '老阳发动○' : '老阴发动×') : '安静'}${m.changed ? `　化${m.changed.relative}${m.changed.stem}${m.changed.branch}${m.changed.element}（${m.changed.state}${m.changed.advanceRetreat ? '·' + m.changed.advanceRetreat.type : ''}${m.changed.backGenerate ? '·回头生' : ''}${m.changed.backControl ? '·回头克' : ''}）` : ''}${tags.length ? '　[' + tags.join(' ') + ']' : ''}`)
  }
  L.push('')
  L.push(`旺衰评分：${chart.main.lines.map(m => `${m.positionName}${m.scores.total}(${m.scores.verdict})`).join('　')}`)
  if (chart.trines.length) {
    L.push('')
    L.push('【合局】')
    for (const t of chart.trines) L.push(`· ${t.kind}：${t.detail}（${t.source}）`)
  }
  if (chart.hidden.hidden.length) {
    L.push('')
    L.push(`【伏神】伏于${chart.hidden.pureName}（本宫首卦）：`)
    for (const hd of chart.hidden.hidden) {
      L.push(`· ${NUM[hd.hideAt]}爻下伏 ${hd.relative}${hd.stem}${hd.branch}${hd.element}${hd.nayin ? '（纳音' + hd.nayin.name + '）' : ''}${hd.provider ? '　※ 主卦不现此六亲，可借此为用神' : ''}`)
    }
  }
  if (chart.absentRelatives.length) L.push(`\n主卦六爻所无之六亲：${chart.absentRelatives.join('、')}（依《增删卜易》：用神不上卦，须借伏神论之；伏神受制则事难成）`)
  // 通俗总结置于全篇末尾：先看排盘与条文，最后给白话归纳
  if (analysis) {
    const summaryText = formatSummary(analysis)
    if (summaryText) {
      L.push('')
      L.push(summaryText)
    }
  }
  return L.join('\n')
}

function pad(text, width) {
  if (text === undefined || text === null) text = ''
  const len = [...String(text)].reduce((n, ch) => n + (/[\u4e00-\u9fa5]/.test(ch) ? 2 : 1), 0)
  return String(text) + ' '.repeat(Math.max(0, width - len))
}

function mark(yang) {
  return yang ? '▅▅▅▅▅ ' : '▅▅ ▅▅ '
}

// 神煞（依日支取驿马、咸池；依日干取禄、天乙贵人；标于卦中临此神煞之爻）
function cfgHorse(chart) {
  const hit = chart.main.lines.find(l => l.isHorse)
  const branch = hit?.branch ?? HORSE_GROUPS.find(g => g.group.includes(chart.pillars.day.branch))?.horse
  return branch ? `${branch}${hit ? `（${'初二三 四五六'.replace(/\s/g, '').split('')[hit.position - 1]}爻）` : ''}` : '—'
}
function cfgFlower(chart) {
  const hit = chart.main.lines.find(l => l.isFlower)
  const branch = hit?.branch ?? FLOWER_GROUPS.find(g => g.group.includes(chart.pillars.day.branch))?.flower
  return branch ? `${branch}${hit ? `（${'初二三 四五六'.replace(/\s/g, '').split('')[hit.position - 1]}爻）` : ''}` : '—'
}
function cfgLu(chart) {
  const hit = chart.main.lines.find(l => l.isLu)
  const branch = hit?.branch ?? LU[chart.pillars.day.stem]
  return branch ? `${branch}${hit ? `（${'初二三 四五六'.replace(/\s/g, '').split('')[hit.position - 1]}爻）` : ''}` : '—'
}
function cfgNoble(chart) {
  const nobles = NOBLE[chart.pillars.day.stem] ?? []
  const hit = chart.main.lines.filter(l => l.isNoble).map(l => l.branch)
  return `${nobles.join('')}${hit.length ? `（${hit.join('')}在卦）` : '（不在卦）'}`
}

// 结构化 JSON（供 host 工具返回与前端渲染）
export function toJson(chart) {
  return JSON.parse(JSON.stringify(chart))
}
