// 六十四卦索引与八宫世应
// 下卦(初二三) 与 上卦(四五六) 的三位二进制自下而上，1 = 阳爻。
import { TRIGRAMS, PALACE_ORDER, PALACES, SHI_POSITION, PALACE_STAGE, najia, sixRelative, nayinOf } from './constants.mjs'

const KEY = (lower, upper) => `${lower}|${upper}`

// 六十四卦索引：下卦|上卦 -> 卦名（依《周易》通行本）
const TABLE = [
  ['乾为天', '乾', '乾'], ['坤为地', '坤', '坤'], ['水雷屯', '震', '坎'], ['山水蒙', '坎', '艮'],
  ['水天需', '乾', '坎'], ['天水讼', '坎', '乾'], ['地水师', '坎', '坤'], ['水地比', '坤', '坎'],
  ['风天小畜', '乾', '巽'], ['天泽履', '兑', '乾'], ['地天泰', '乾', '坤'], ['天地否', '坤', '乾'],
  ['天火同人', '离', '乾'], ['火天大有', '乾', '离'], ['地山谦', '艮', '坤'], ['雷地豫', '坤', '震'],
  ['泽雷随', '震', '兑'], ['山风蛊', '巽', '艮'], ['地泽临', '兑', '坤'], ['风地观', '坤', '巽'],
  ['火雷噬嗑', '震', '离'], ['山火贲', '离', '艮'], ['山地剥', '坤', '艮'], ['地雷复', '震', '坤'],
  ['天雷无妄', '震', '乾'], ['山天大畜', '乾', '艮'], ['山雷颐', '震', '艮'], ['泽风大过', '巽', '兑'],
  ['坎为水', '坎', '坎'], ['离为火', '离', '离'], ['泽山咸', '艮', '兑'], ['雷风恒', '巽', '震'],
  ['天山遁', '艮', '乾'], ['雷天大壮', '乾', '震'], ['火地晋', '坤', '离'], ['地火明夷', '离', '坤'],
  ['风火家人', '离', '巽'], ['火泽睽', '兑', '离'], ['水山蹇', '艮', '坎'], ['雷水解', '坎', '震'],
  ['山泽损', '兑', '艮'], ['风雷益', '震', '巽'], ['泽天夬', '乾', '兑'], ['天风姤', '巽', '乾'],
  ['泽地萃', '坤', '兑'], ['地风升', '巽', '坤'], ['泽水困', '坎', '兑'], ['水风井', '巽', '坎'],
  ['泽火革', '离', '兑'], ['火风鼎', '巽', '离'], ['震为雷', '震', '震'], ['艮为山', '艮', '艮'],
  ['风山渐', '艮', '巽'], ['雷泽归妹', '兑', '震'], ['雷火丰', '离', '震'], ['火山旅', '震', '离'],
  ['巽为风', '巽', '巽'], ['兑为泽', '兑', '兑'], ['风水涣', '坎', '巽'], ['水泽节', '兑', '坎'],
  ['风泽中孚', '兑', '巽'], ['雷山小过', '艮', '震'], ['水火既济', '离', '坎'], ['火水未济', '坎', '离'],
]

export const HEXAGRAMS = TABLE.map(([name, lower, upper]) => ({ name, lower, upper }))

export const TRIGRAM_OF_NAME = new Map(HEXAGRAMS.map(h => [h.name, h]))
export const HEXAGRAM_BY_TRIGRAMS = new Map(HEXAGRAMS.map(h => [KEY(h.lower, h.upper), h.name]))

// 八宫归属、本宫位次、世爻位置（1 起）
const PALACE_INDEX = new Map()
for (const palace of PALACE_ORDER) {
  PALACES[palace].forEach((name, stage) => {
    PALACE_INDEX.set(name, {
      palace,
      element: TRIGRAMS[palace].element,
      stage,
      stageName: PALACE_STAGE[stage],
      shi: SHI_POSITION[stage],
      ying: SHI_POSITION[stage] <= 3 ? SHI_POSITION[stage] + 3 : SHI_POSITION[stage] - 3,
    })
  })
}

export function palaceOf(name) {
  const info = PALACE_INDEX.get(name)
  if (info) return info
  // 兑宫/其他表外兜底：从八卦表反查
  for (const palace of PALACE_ORDER) {
    const idx = PALACES[palace].indexOf(name)
    if (idx >= 0) {
      return {
        palace,
        element: TRIGRAMS[palace].element,
        stage: idx,
        stageName: PALACE_STAGE[idx],
        shi: SHI_POSITION[idx],
        ying: SHI_POSITION[idx] <= 3 ? SHI_POSITION[idx] + 3 : SHI_POSITION[idx] - 3,
      }
    }
  }
  throw new Error(`六十四卦表中无此卦：${name}`)
}

// 由六爻（自初爻起，1=阳 0=阴）求上下卦
export function trigramsOfLines(lines) {
  const bit3 = (a, b, c) => `${a}${b}${c}`
  const lowerBits = bit3(lines[0], lines[1], lines[2])
  const upperBits = bit3(lines[3], lines[4], lines[5])
  const findByBits = (bits) => Object.keys(TRIGRAMS).find(k => TRIGRAMS[k].bits.join('') === bits)
  const lower = findByBits(lowerBits)
  const upper = findByBits(upperBits)
  if (!lower || !upper) throw new Error(`无法解析卦象：${lines.join('')}`)
  return { lower, upper }
}

export function hexagramOfLines(lines) {
  const { lower, upper } = trigramsOfLines(lines)
  const hit = HEXAGRAMS.find(h => h.lower === lower && h.upper === upper)
  if (!hit) throw new Error(`六十四卦表中未收录：下${lower}上${upper}`)
  return hit
}

// 六爻纳甲装配：返回自初爻起的六爻（干支、五行、六亲、纳音）
export function assembleLines(hexName) {
  const { lower, upper } = TRIGRAM_OF_NAME.get(hexName) ?? (() => { throw new Error(`未知卦：${hexName}`) })()
  const { palace, element: palaceElement } = palaceOf(hexName)
  const inner = najia(lower, 'inner')
  const outer = najia(upper, 'outer')
  const stems = [...inner.stems, ...outer.stems]
  const branches = [...inner.branches, ...outer.branches]
  return branches.map((branch, i) => {
    const stem = stems[i]
    const el = BRANCH_ELEMENT_OF(branch)
    const ny = nayinOf(stem, branch)
    return {
      index: i,
      position: i + 1,
      stem,
      branch,
      element: el,
      relative: sixRelative(palaceElement, el),
      nayin: ny,
    }
  })
}

function BRANCH_ELEMENT_OF(branch) {
  const map = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }
  return map[branch]
}

// 伏神：依八宫卦变之法，本宫首卦（八纯卦）六亲为主卦该爻所变去者，即伏于该爻之下。
// 该伏神同时在主卦中"不现"时，才是《增删卜易》所谓"用神不上卦，借本宫首卦为伏"，
// 此时既可补缺失之用神，又为同类六亲两现之一（provider 标记）。
export function hiddenSpirits(hexName, mainLines) {
  const { palace } = palaceOf(hexName)
  const pureName = PALACES[palace][0]
  const pureLines = assembleLines(pureName)
  const present = new Set(mainLines.map(l => l.relative))
  const hidden = []
  pureLines.forEach((pl, i) => {
    if (mainLines[i].relative === pl.relative) return // 本爻未变，无伏神
    hidden.push({ ...pl, hideAt: i, provider: !present.has(pl.relative) })
  })
  return { pureName, lines: pureLines, hidden }
}

// 变卦：动爻取反
export function flipLines(lines, moving) {
  return lines.map((v, i) => (moving.includes(i) ? (v ? 0 : 1) : v))
}
