import { buildChart, pickYongshen, analyzeShiYing, valueFromCoins, tossThreeCoins } from '../src/engine.mjs'
import { formatText } from '../src/format.mjs'

// 参考图：公历 2008年12月23日8时37分；山火贲（101001）三爻、上爻动 -> 雷山小过
const chart = buildChart({
  time: { year: 2008, month: 12, day: 23, hour: 8, minute: 37 },
  lineValues: [7, 8, 9, 8, 8, 9],
})

console.log(formatText(chart))
console.log('\n--- 结构化校验 ---')
console.log('主卦 =', chart.main.name, '宫 =', chart.main.palace.palace, chart.main.palace.stageName, '世 =', chart.main.palace.shi, '应 =', chart.main.palace.ying)
console.log('变卦 =', chart.changed?.name, '宫 =', chart.changed?.palace.palace)
console.log('旬空 =', chart.kong.empty.join('、'), '旬 =', chart.kong.xun)
console.log('神煞 =', {
  驿马: chart.main.lines.filter(l => l.isHorse).map(l => l.branch),
  桃花: chart.main.lines.filter(l => l.isFlower).map(l => l.branch),
  贵人: chart.main.lines.filter(l => l.isNoble).map(l => l.branch),
  禄: chart.main.lines.filter(l => l.isLu).map(l => l.branch),
})

console.log('\n--- 六冲六合检测（八纯卦） ---')
const qian = buildChart({ time: { year: 2026, month: 10, day: 10, hour: 12, minute: 0 }, lineValues: [7, 7, 7, 7, 7, 7] })
console.log('六爻全静：', qian.main.name, '变卦 =', qian.changed)

console.log('\n--- 摇卦 ---')
console.log('三背 ->', valueFromCoins(['back', 'back', 'back']), '三字 ->', valueFromCoins(['front', 'front', 'front']))
console.log('两背一字 ->', valueFromCoins(['back', 'back', 'front']), '一背二字 ->', valueFromCoins(['back', 'front', 'front']))
let seq = []
for (let i = 0; i < 6; i += 1) seq.push(tossThreeCoins())
console.log('随机六爻 =', seq.map(s => `${s.value}(${s.name})`).join(' '))

console.log('\n--- 用神取用 ---')
const y = pickYongshen(chart, '问今年求财')
console.log('用神 =', y.use, '现', y.present, '处；伏神：', y.hidden.map(h => `${h.relative}${h.stem}${h.branch}`).join('、') || '无')
console.log('世应：', analyzeShiYing(chart).map(s => s.text).join(' / '))
console.log('合局：', chart.trines.map(t => t.detail).join('；') || '无')
console.log('主卦所无之六亲 =', chart.absentRelatives.join('、') || '无')
