#!/usr/bin/env node
// 六爻排盘命令行（host 侧自检与离线使用）
// 用法示例：
//   node cli.mjs --time "2008-12-23 08:37" --yao 7,8,9,8,8,9 --topic "问财运"
//   node cli.mjs --now --toss --topic "问事业"
//   node cli.mjs --time "2026-10-10 12:00" --yao 7,7,7,7,7,7
import { buildChart, tossThreeCoins, lineFromValue } from './engine.mjs'
import { analyze } from './analysis.mjs'
import { formatFull } from './format.mjs'
import { OPENING_LINES } from './opening.mjs'

const args = process.argv.slice(2)
const get = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback
}
const has = (name) => args.includes(`--${name}`)

function parseTime(text) {
  const m = String(text).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2}))?/)
  if (!m) throw new Error(`时间格式无法解析：${text}`)
  return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] ? +m[4] : 0, minute: m[5] ? +m[5] : 0 }
}

if (has('help') || args.length === 0) {
  console.log(`六爻排盘 CLI
  --time "YYYY-MM-DD HH:mm"   指定起卦时间
  --now                       取当前时间
  --yao 7,8,9,8,8,9           自初爻至上爻的摇卦值（6 老阴动 / 7 少阳 / 8 少阴 / 9 老阳动）
  --toss                      由电脑随机摇卦（替代 --yao）
  --topic "问..."             所问之事（用于取用神）
  --opening                   输出一段《易经》开场辞`)
  process.exit(0)
}

if (has('opening')) {
  const i = Math.floor(Math.random() * OPENING_LINES.length)
  console.log(OPENING_LINES[i])
}

const now = new Date()
const time = has('now') ? {
  year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes(),
} : parseTime(get('time', '2026-10-10 12:00'))

let lineValues
if (has('toss')) {
  console.log('【电脑摇卦】每次三枚铜钱，背为阳面：')
  lineValues = []
  for (let i = 0; i < 6; i += 1) {
    const t = tossThreeCoins()
    lineValues.push(t.value)
    console.log(`  第${i + 1}次（${['初', '二', '三', '四', '五', '上'][i]}爻）：${t.coins.map(c => (c === 'back' ? '背' : '字')).join(' ')} -> ${t.value} ${t.name}（${t.desc}）`)
  }
} else {
  lineValues = String(get('yao', '7,7,7,7,7,7')).split(/[,\s]+/).filter(Boolean).map(Number)
}

const chart = buildChart({ time, lineValues })
console.log('')
const a = analyze(chart, get('topic', ''))
// 整段次序：排盘 → 断卦条文 → 结论清单 → 通俗总结（末尾）
console.log(formatFull(chart, a))
