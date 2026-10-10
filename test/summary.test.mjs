// 通俗总结：各分支都要有实质判断，且口语表达必须由卦象支撑
import { buildChart } from '../src/engine.mjs'
import { analyze } from '../src/analysis.mjs'
import { formatText, formatSummary, formatEvidence, formatFull } from '../src/format.mjs'

let fail = 0
const check = (ok, label, extra = '') => {
  if (ok) console.log(`✓ ${label}`)
  else { fail += 1; console.log(`✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}

const T = (year, month, day, hour = 12, minute = 0) => ({ year, month, day, hour, minute })
const build = (time, yao, topic) => {
  const chart = buildChart({ time, lineValues: yao })
  return { chart, analysis: analyze(chart, topic) }
}

console.log('--- 结构 ---')
const base = build(T(2008, 12, 23, 8, 37), [7, 8, 9, 8, 8, 9], '问今年财运')
const s = base.analysis.summary
check(typeof s.title === 'string' && s.title.length >= 4, '有总结标题', s.title)
check(typeof s.oneLine === 'string' && s.oneLine.length >= 20, '有一句话结论', s.oneLine.slice(0, 30))
check(Array.isArray(s.paragraphs) && s.paragraphs.length >= 3, '有分段说明', String(s.paragraphs.length))
check(Array.isArray(s.advice), '有「怎么办」清单', String(s.advice.length))
check(typeof s.note === 'string' && s.note.length > 10, '有依据声明')
check(s.paragraphs.every(p => typeof p === 'string' && p.length > 10), '每段都是完整句子')

console.log('--- 通俗化要求 ---')
const all = [s.title, s.oneLine, ...s.paragraphs, ...s.advice].join('')
check(all.includes('世爻就是你') || all.includes('代表'), '把术语翻译成白话')
check(/你就是|代表|等于|属于|意思是/.test(all), '使用解释性说法而非只堆术语')
check((all.match(/[，。；：]/g) ?? []).length > 20, '语句完整可读', String((all.match(/[，。；：]/g) ?? []).length))
// 不空泛：不得出现无信息量的套话
const banned = ['心诚则灵', '顺其自然', '注意沟通', '保持乐观', '相信自己', '一切都会好']
for (const b of banned) check(!all.includes(b), `不含套话「${b}」`)

console.log('--- 未注明所问之事：只报盘面、不下断语 ---')
const noTopic = build(T(2026, 10, 10, 12, 8), [7, 7, 7, 7, 7, 7], '')
check(noTopic.analysis.summary.oneLine.includes('只报盘面') || noTopic.analysis.summary.oneLine.includes('不下吉凶结论'), '明说不下结论', noTopic.analysis.summary.oneLine.slice(0, 40))
check(noTopic.analysis.summary.paragraphs.some(p => p.includes('取用神')), '解释为何需要所问之事')

console.log('--- 用神不上卦 ---')
// 山火贲六爻无父母、无子孙
const absent = build(T(2008, 12, 23, 8, 37), [7, 8, 9, 8, 8, 9], '问母亲身体')
check(absent.analysis.yongshen.use === '父母', '取父母为用神', String(absent.analysis.yongshen.use))
check(absent.analysis.yongshen.notOnChart === true, '用神不上卦')
check(/没出现|找不到|借/.test(absent.analysis.summary.paragraphs.join('')), '说明用神不上卦的含义', absent.analysis.summary.paragraphs[2]?.slice(0, 40))
check(/还没到位|够不着|没有真正露面|无着落/.test(absent.analysis.summary.paragraphs.join('')), '给出通俗解释')

console.log('--- 六爻安静 ---')
const still = build(T(2026, 10, 10, 12, 8), [7, 7, 7, 7, 7, 7], '问工作调动')
check(still.chart.changed === null, '确实无动爻')
check(still.analysis.summary.paragraphs.some(p => p.includes('六爻安静') || p.includes('一个都没动')), '解释六爻安静', still.analysis.summary.paragraphs.map(p => p.slice(0, 16)).join(' | '))
check(still.analysis.summary.paragraphs.some(p => p.includes('等')), '给出「要等」的通俗含义')

console.log('--- 不同结果分支互斥且非空 ---')
const cases = [
  { name: '回头克型', t: T(2008, 12, 23, 8, 37), y: [7, 8, 9, 8, 8, 9], topic: '问今年财运' },
  { name: '安静型', t: T(2026, 10, 10, 12, 8), y: [7, 7, 7, 7, 7, 7], topic: '问工作调动' },
  { name: '旧例', t: T(1949, 10, 1, 15, 0), y: [7, 8, 8, 7, 6, 7], topic: '问事业' },
  { name: '另例', t: T(2025, 1, 29, 9, 30), y: [8, 8, 8, 8, 8, 8], topic: '问考试' },
]
const titles = new Set()
for (const c of cases) {
  const r = build(c.t, c.y, c.topic)
  const sum = r.analysis.summary
  titles.add(sum.title)
  check(sum.title.length >= 4 && sum.oneLine.length >= 20, `${c.name} 有结论`, `${sum.title} / ${sum.oneLine.slice(0, 24)}`)
  check(sum.paragraphs.some(p => p.includes('世爻')), `${c.name} 说明了世爻状态`)
  check(sum.paragraphs.some(p => p.includes('代表')), `${c.name} 说明了用神状态`)
  check(sum.advice.length >= 1, `${c.name} 给出了可执行建议`, String(sum.advice.length))
}
check(titles.size >= 3, '不同卦得到不同结论（非模板化）', [...titles].join(' / '))

console.log('--- 整合文本：排盘 → 条文 → 结论清单 → 通俗总结（末尾） ---')
const full = formatFull(base.chart, base.analysis)
check(full.includes('【通俗总结】'), '整段文本含通俗总结')
check(full.includes(s.title), '整段文本含总结标题')
const idxSummary = full.indexOf('【通俗总结】')
const idxEvidence = full.indexOf('================ 断卦依据')
const idxVerdict = full.indexOf('【结论清单】')
const idxChart = full.indexOf('主变卦')
check(idxChart >= 0 && idxEvidence > idxChart, '条文在排盘之后')
check(idxVerdict > idxEvidence, '结论清单在条文之后')
check(idxSummary > idxVerdict, '通俗总结在结论清单之后（全篇末尾）', `summary@${idxSummary} verdict@${idxVerdict}`)
check(full.slice(idxSummary).includes('怎么办'), '总结块（含建议）位于文本结尾')
check(!full.slice(idxSummary + 1).includes('【'), '总结之后不再有其他区块')
// 纯排盘文本仍不含总结（避免空标题）
const onlyChart = formatText(base.chart)
check(!onlyChart.includes('【通俗总结】'), '无分析时不渲染总结块')
check(formatSummary(base.analysis).startsWith('【通俗总结】'), 'formatSummary 输出完整块')
check(formatEvidence(base.analysis).startsWith('================ 断卦依据'), 'formatEvidence 输出条文块')

console.log('--- 结论文本不得与卦象矛盾 ---')
// 回头克在结论中必须体现
check(s.oneLine.includes('回头克') || s.oneLine.includes('动'), '结论反映回头克', s.oneLine.slice(0, 40))
check(s.title.includes('动') || s.title.includes('伤'), '标题反映关键矛盾', s.title)

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
