import { buildChart } from '../src/engine.mjs'
import { analyze } from '../src/analysis.mjs'
import { formatText } from '../src/format.mjs'

const chart = buildChart({
  time: { year: 2008, month: 12, day: 23, hour: 8, minute: 37 },
  lineValues: [7, 8, 9, 8, 8, 9],
})
const a = analyze(chart, '问今年财运如何')
console.log('用神 =', JSON.stringify(a.yongshen, null, 1))
for (const s of a.sections) {
  console.log(`\n【${s.title}】`)
  for (const p of s.points) console.log(` · ${p.text}\n   〔${p.source}〕`)
}
console.log('\n【结论清单】')
for (const i of a.verdict.items) console.log(` [${i.level}] ${i.text}  〔${i.source}〕`)
console.log(a.verdict.note)
