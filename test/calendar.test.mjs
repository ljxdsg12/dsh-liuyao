import { julianDay, fromJulianDay, solarTermsOfYear, lunarDate, fourPillars, dayGanzhi, xunKong, ganzhi } from '../src/calendar.mjs'

const show = (y, m, d, h = 12, mi = 0) => {
  const p = fourPillars(y, m, d, h, mi)
  const l = lunarDate(y, m, d, h)
  console.log(`${y}-${m}-${d} ${h}:${String(mi).padStart(2, '0')}`,
    `年=${p.year.text} 月=${p.month.text}(${p.month.term}) 日=${p.day.text} 时=${p.hour.text}`,
    `空=${xunKong(p.day.index).empty.join('')}(${xunKong(p.day.index).xun}旬)`,
    `农历=${l.monthName}${l.dayName}`)
}

console.log('--- 锚点自检 ---')
console.log('2000-01-01 应为 戊午日:', dayGanzhi(2000, 1, 1).text)
show(2008, 12, 23, 8, 37)
show(1949, 10, 1, 15, 0)
show(2026, 10, 10, 12, 8)

console.log('--- 节气自检（应接近真实历书） ---')
for (const y of [2008, 2026, 2024]) {
  const terms = solarTermsOfYear(y)
  const pick = terms.filter(t => ['立春', '春分', '夏至', '秋分', '冬至'].includes(t.name))
  console.log(y, pick.map(t => `${t.name}=${t.month}-${t.day} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`).join('  '))
}

console.log('--- 农历春节自检（应为 正月初一） ---')
const springEstimate = [[2008, 2, 7], [2024, 2, 10], [2025, 1, 29], [2026, 2, 17], [2000, 2, 5], [1997, 2, 7]]
for (const [y, m, d] of springEstimate) {
  const l = lunarDate(y, m, d, 12)
  console.log(`${y}-${m}-${d} => ${l.monthName}${l.dayName}${l.isLeap ? '(闰)' : ''}`)
}

console.log('--- 农历闰月自检 ---')
const leapChecks = [[2023, 3, 22], [2020, 5, 23], [2017, 7, 23], [2025, 7, 25], [2028, 6, 23]]
for (const [y, m, d] of leapChecks) {
  const l = lunarDate(y, m, d, 12)
  console.log(`${y}-${m}-${d} => ${l.monthName}${l.dayName}${l.isLeap ? '(闰月)' : ''}`)
}

console.log('--- 儒略日往返 ---')
const jd = julianDay(2008, 12, 23, 8, 37)
console.log(jd, fromJulianDay(jd))
console.log('ganzhi(54)=', ganzhi(54), 'ganzhi(0)=', ganzhi(0))
