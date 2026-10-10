// 干支历 / 农历换算（儒略日 + 视黄经定节气 + 定朔定月）
// 依据：紫金山天文台《中国天文年历》所用定气、定朔法；干支纪日以 2000-01-01 为戊午日锚点。

const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]

const RAD = Math.PI / 180

// 公历 -> 儒略日（含小数）
export function julianDay(year, month, day, hour = 0, minute = 0, second = 0) {
  const frac = (hour + minute / 60 + second / 3600) / 24
  let y = year
  let m = month
  if (m <= 2) { y -= 1; m += 12 }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + frac
}

// 儒略日 -> 公历（返回含小数日的对象）
export function fromJulianDay(jd) {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)
  const dayFrac = b - d - Math.floor(30.6001 * e) + f
  const day = Math.floor(dayFrac)
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715
  const rest = (dayFrac - day) * 24
  const hour = Math.floor(rest)
  const minute = Math.floor((rest - hour) * 60)
  const second = Math.round((((rest - hour) * 60) - minute) * 60)
  return { year, month, day, hour, minute, second }
}

// 世界时 -> 中国标准时（UTC+8）的儒略日
function jdTTFromLocal(jdLocal) {
  // ΔT 近似（2005-2050，Espenak & Meeus）
  const y = 2000 + (jdLocal - 2451545.0) / 365.25
  const t = y - 2000
  const deltaT = 62.92 + 0.32217 * t + 0.005589 * t * t
  return jdLocal + deltaT / 86400
}

// 太阳视黄经（度），输入为力学时儒略日
function sunApparentLongitude(jdTT) {
  const t = (jdTT - 2451545.0) / 36525
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * RAD)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * m * RAD)
    + 0.000289 * Math.sin(3 * m * RAD)
  const trueLong = l0 + c
  const omega = 125.04 - 1934.136 * t
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD)
  return ((apparent % 360) + 360) % 360
}

// 求某年内第 index 个节气（0=小寒）的北京时儒略日
function solarTermJd(year, index) {
  const targetLongitude = (285 + index * 15) % 360
  const approx = julianDay(year, 1, 1) + index * 15.2
  let lo = approx - 4
  let hi = approx + 4
  const diff = (jd) => {
    let d = sunApparentLongitude(jdTTFromLocal(jd)) - targetLongitude
    while (d > 180) d -= 360
    while (d < -180) d += 360
    return d
  }
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2
    if (diff(mid) < 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function solarTermsOfYear(year) {
  const out = []
  for (let i = 0; i < 24; i += 1) {
    const jd = solarTermJd(year, i)
    out.push({ name: SOLAR_TERM_NAMES[i], index: i, jd, ...fromJulianDay(jd) })
  }
  return out
}

// 定朔：返回第 k 个新月的儒略日（北京时）
function newMoonJd(k) {
  const t = k / 1236.85
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * t * t - 0.000000150 * t * t * t + 0.00000000073 * t * t * t * t
  const e = 1 - 0.002516 * t - 0.0000074 * t * t
  const m = (2.5534 + 29.10535670 * k - 0.0000014 * t * t - 0.00000011 * t * t * t) * RAD
  const mp = (201.5643 + 385.81693528 * k + 0.0107582 * t * t + 0.00001238 * t * t * t - 0.000000058 * t * t * t * t) * RAD
  const f = (160.7108 + 390.67050284 * k - 0.0016118 * t * t - 0.00000227 * t * t * t + 0.000000011 * t * t * t * t) * RAD
  const omega = (124.7746 - 1.56375588 * k + 0.0020672 * t * t + 0.00000215 * t * t * t) * RAD
  let corr = -0.40720 * Math.sin(mp)
    + 0.17241 * e * Math.sin(m)
    + 0.01608 * Math.sin(2 * mp)
    + 0.01039 * Math.sin(2 * f)
    + 0.00739 * e * Math.sin(mp - m)
    - 0.00514 * e * Math.sin(mp + m)
    + 0.00208 * e * e * Math.sin(2 * m)
    - 0.00111 * Math.sin(mp - 2 * f)
    - 0.00057 * Math.sin(mp + 2 * f)
    + 0.00056 * e * Math.sin(2 * mp + m)
    - 0.00042 * Math.sin(3 * mp)
    + 0.00042 * e * Math.sin(m + 2 * f)
    + 0.00038 * e * Math.sin(m - 2 * f)
    - 0.00024 * e * Math.sin(2 * mp - m)
    - 0.00017 * Math.sin(omega)
    - 0.00007 * Math.sin(mp + 2 * m)
  const a1 = (299.77 + 0.107408 * k - 0.009173 * t * t) * RAD
  const a2 = (251.88 + 0.016321 * k) * RAD
  const a3 = (251.83 + 26.651886 * k) * RAD
  const a4 = (349.42 + 36.412478 * k) * RAD
  const a5 = (84.66 + 18.206239 * k) * RAD
  const a6 = (141.74 + 53.303771 * k) * RAD
  const a7 = (207.14 + 2.453732 * k) * RAD
  const a8 = (154.84 + 7.306860 * k) * RAD
  const a9 = (34.52 + 27.261239 * k) * RAD
  const a10 = (207.19 + 0.121824 * k) * RAD
  const a11 = (291.34 + 1.844379 * k) * RAD
  const a12 = (161.72 + 24.198154 * k) * RAD
  const a13 = (239.56 + 25.513099 * k) * RAD
  const a14 = (331.55 + 3.592518 * k) * RAD
  corr += 0.000325 * Math.sin(a1) + 0.000165 * Math.sin(a2) + 0.000164 * Math.sin(a3)
    + 0.000126 * Math.sin(a4) + 0.000110 * Math.sin(a5) + 0.000062 * Math.sin(a6)
    + 0.000060 * Math.sin(a7) + 0.000056 * Math.sin(a8) + 0.000047 * Math.sin(a9)
    + 0.000042 * Math.sin(a10) + 0.000040 * Math.sin(a11) + 0.000037 * Math.sin(a12)
    + 0.000035 * Math.sin(a13) + 0.000023 * Math.sin(a14)
  jde += corr
  // 力学时 -> 北京时
  const y = 2000 + (jde - 2451545.0) / 365.25
  const tt = y - 2000
  const deltaT = 62.92 + 0.32217 * tt + 0.005589 * tt * tt
  return jde - deltaT / 86400
}

// 某日（北京时）所在日期的 0 时儒略日
export function dayStartJd(jd) {
  return Math.floor(jd + 0.5 + 8 / 24) - 0.5 - 8 / 24
}

function newMoonBefore(jd) {
  const kApprox = Math.floor((jd - 2451550.09766) / 29.530588861)
  let k = kApprox
  while (newMoonJd(k) > jd) k -= 1
  while (newMoonJd(k + 1) <= jd) k += 1
  return { k, jd: newMoonJd(k) }
}

// 农历换算：返回 { year, month, day, isLeap, monthName, dayName, yearBranch, zodiac }
export function lunarDate(year, month, day, hour = 12) {
  const jd = julianDay(year, month, day, hour)
  const midnight = dayStartJd(jd)
  // 以所求日之前（含当日）最近的冬至所在之月为十一月
  const wsThisYear = solarTermsOfYear(year).find(t => t.name === '冬至').jd
  const winterSolstice = midnight >= wsThisYear ? wsThisYear : solarTermsOfYear(year - 1).find(t => t.name === '冬至').jd
  const nmBeforeSolstice = newMoonBefore(winterSolstice + 0.5)
  const nmCurrent = newMoonBefore(midnight + 0.5)
  let monthIndex = nmCurrent.k - nmBeforeSolstice.k + 11
  if (monthIndex > 12) monthIndex -= 12
  // 判断闰月：两个朔之间无中气
  const startJd = nmCurrent.jd
  const endJd = newMoonJd(nmCurrent.k + 1)
  const allTerms = [...solarTermsOfYear(year - 1), ...solarTermsOfYear(year), ...solarTermsOfYear(year + 1)]
  const midTerms = allTerms.filter(t => t.index % 2 === 1) // 中气
  const leap = !midTerms.some(t => t.jd > startJd && t.jd < endJd)
  // 农历日：以北京时日期整数日计（朔所在日为初一）
  const civilDayOf = (jd) => Math.floor(jd + 0.5 + 8 / 24)
  const dayNum = civilDayOf(midnight) - civilDayOf(startJd) + 1
  const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
  const idx = ((monthIndex - 1) % 12 + 12) % 12
  return {
    year,
    month: monthIndex,
    monthIndex,
    day: dayNum,
    isLeap: leap,
    monthName: `${leap ? '闰' : ''}${monthNames[idx]}`,
    dayName: chineseDay(dayNum),
  }
}

const DAY_TENS = ['初', '十', '廿', '三']
const DAY_UNITS = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九']
export function chineseDay(n) {
  if (n === 10) return '初十'
  if (n === 20) return '二十'
  if (n === 30) return '三十'
  const ten = Math.floor((n - 1) / 10)
  const unit = n % 10
  return `${DAY_TENS[ten]}${DAY_UNITS[unit]}`
}

// —— 干支 ——
export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export function ganzhi(index) {
  const i = ((index % 60) + 60) % 60
  return GAN[i % 10] + ZHI[i % 12]
}

// 日干支：以 2000-01-01 为戊午日（六十甲子序 54，0 起）
export function dayGanzhi(year, month, day) {
  const jd = julianDay(year, month, day, 12)
  const days = Math.round(jd - julianDay(2000, 1, 1, 12))
  const idx = ((54 + days) % 60 + 60) % 60
  return { index: idx, stem: GAN[idx % 10], branch: ZHI[idx % 12], text: GAN[idx % 10] + ZHI[idx % 12] }
}

// 年干支：以立春为界
export function yearGanzhi(year, month, day, hour = 12) {
  const jd = julianDay(year, month, day, hour)
  const lichun = solarTermsOfYear(year).find(t => t.name === '立春').jd
  let y = year
  if (jd < lichun) y -= 1
  const idx = ((y - 4) % 60 + 60) % 60
  return { index: idx, stem: GAN[idx % 10], branch: ZHI[idx % 12], text: GAN[idx % 10] + ZHI[idx % 12], solarYear: y }
}

// 月干支：以节为界（立春、惊蛰、清明……）
export function monthGanzhi(year, month, day, hour = 12, yearStem) {
  const jd = julianDay(year, month, day, hour)
  const terms = [...solarTermsOfYear(year - 1), ...solarTermsOfYear(year), ...solarTermsOfYear(year + 1)]
  // 十二节（index 为 2 起每 +2：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒）
  const jie = terms.filter(t => [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0].includes(t.index))
    .sort((a, b) => a.jd - b.jd)
  let current = jie[0]
  for (const t of jie) {
    if (t.jd <= jd) current = t
    else break
  }
  // 节气 -> 月支
  const branchOfTerm = { 立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未', 立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子', 小寒: '丑' }
  const branch = branchOfTerm[current.name]
  // 五虎遁：甲己之年丙作首
  const startStemTable = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' }
  const startStem = startStemTable[yearStem]
  const startIdx = GAN.indexOf(startStem)
  const branchIdx = ZHI.indexOf(branch)
  const offset = ((branchIdx - ZHI.indexOf('寅')) % 12 + 12) % 12
  const idx = ((startIdx + offset) % 10)
  return { stem: GAN[idx], branch, text: GAN[idx] + branch, term: current.name, termJd: current.jd }
}

// 时干支（五鼠遁：甲己还加甲）
export function hourGanzhi(dayStem, hour, minute = 0) {
  const total = hour + minute / 60
  // 子时 23:00-00:59；晚子时归次日，此处按民用时辰取支，日界由调用方处理
  const branchIdx = Math.floor(((total + 1) % 24) / 2) % 12
  const branch = ZHI[branchIdx]
  const startStemTable = { 甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬' }
  const startIdx = GAN.indexOf(startStemTable[dayStem])
  const ziIdx = ZHI.indexOf('子')
  const offset = ((branchIdx - ziIdx) % 12 + 12) % 12
  const stem = GAN[(startIdx + offset) % 10]
  return { stem, branch, text: stem + branch }
}

// 完整四柱（含月建、日辰、旬空）
export function fourPillars(year, month, day, hour = 12, minute = 0) {
  const yg = yearGanzhi(year, month, day, hour)
  const mg = monthGanzhi(year, month, day, hour, yg.stem)
  const dg = dayGanzhi(year, month, day)
  const hg = hourGanzhi(dg.stem, hour, minute)
  return { year: yg, month: mg, day: dg, hour: hg }
}

// 旬空（空亡）：甲子旬中戌亥空……
export function xunKong(dayIndex) {
  const xunStart = Math.floor(dayIndex / 10) * 10
  const head = GAN[xunStart % 10] // 旬首天干
  const used = new Set()
  for (let i = 0; i < 10; i += 1) used.add(ZHI[(xunStart + i) % 12])
  const empty = ZHI.filter(z => !used.has(z))
  return { xun: `${head}${ZHI[xunStart % 12]}`, empty }
}

export function isKong(branch, empty) {
  return empty.includes(branch)
}

// 神煞（依《渊海子平》《三命通会》通行取法，各标注取用基准）
export function shensha(pillars) {
  const dayBranch = pillars.day.branch
  const yearStem = pillars.year.stem
  const dayStem = pillars.day.stem
  const horse = HORSE_GROUPS.find(g => g.group.includes(dayBranch))?.horse
  const flower = FLOWER_GROUPS.find(g => g.group.includes(dayBranch))?.flower
  return {
    horse: { value: horse, basis: '日支三合（申子辰马在寅、寅午戌马在申、巳酉丑马在亥、亥卯未马在巳）' },
    flower: { value: flower, basis: '日支三合咸池（申子辰见酉、寅午戌见卯、巳酉丑见午、亥卯未见子）' },
    lu: { value: LU[dayStem], basis: `日干${dayStem}临官之禄` },
    nobel: { value: NOBLE[dayStem], basis: `日干${dayStem}天乙贵人（甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、壬癸兔蛇藏、六辛逢马虎）` },
    yangren: { value: YANGREN[dayStem], basis: `日干${dayStem}羊刃` },
    yearStem,
  }
}

const HORSE_GROUPS = [
  { group: ['申', '子', '辰'], horse: '寅' },
  { group: ['寅', '午', '戌'], horse: '申' },
  { group: ['巳', '酉', '丑'], horse: '亥' },
  { group: ['亥', '卯', '未'], horse: '巳' },
]
const FLOWER_GROUPS = [
  { group: ['申', '子', '辰'], flower: '酉' },
  { group: ['寅', '午', '戌'], flower: '卯' },
  { group: ['巳', '酉', '丑'], flower: '午' },
  { group: ['亥', '卯', '未'], flower: '子' },
]
const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }
const NOBLE = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
}
const YANGREN = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' }

export const SOLAR_TERM_LIST = SOLAR_TERM_NAMES
export { solarTermJd }
