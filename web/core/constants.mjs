// 六爻纳甲排盘 —— 基础常数（依《火珠林》《卜筮正宗》《增删卜易》纳甲体系）
// 全部数据为纯数据表，便于校对与验证。

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const STEM_ELEMENT = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
export const STEM_YANG = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false }
export const BRANCH_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
export const BRANCH_YANG = {
  子: true, 丑: false, 寅: true, 卯: false, 辰: true, 巳: false,
  午: true, 未: false, 申: true, 酉: false, 戌: true, 亥: false,
}
// 地支生肖（用于农历纪年说明）
export const BRANCH_ZODIAC = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
  午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
}

// 八卦：二进制自下而上（初爻在最低位），1 = 阳爻
export const TRIGRAMS = {
  乾: { bits: [1, 1, 1], symbol: '☰', element: '金', nature: '天', stem: '甲' },
  兑: { bits: [1, 1, 0], symbol: '☱', element: '金', nature: '泽', stem: '丁' },
  离: { bits: [1, 0, 1], symbol: '☲', element: '火', nature: '火', stem: '己' },
  震: { bits: [1, 0, 0], symbol: '☳', element: '木', nature: '雷', stem: '庚' },
  巽: { bits: [0, 1, 1], symbol: '☴', element: '木', nature: '风', stem: '辛' },
  坎: { bits: [0, 1, 0], symbol: '☵', element: '水', nature: '水', stem: '戊' },
  艮: { bits: [0, 0, 1], symbol: '☶', element: '土', nature: '山', stem: '丙' },
  坤: { bits: [0, 0, 0], symbol: '☷', element: '土', nature: '地', stem: '乙' },
}
export const TRIGRAM_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']

// 先天八卦方位（伏羲方位：乾南、坤北、离东、坎西、震东北、兑东南、巽西南、艮西北）
export const XIANTIAN_POSITION = {
  乾: { direction: '南', angle: 0 },
  兑: { direction: '东南', angle: 45 },
  离: { direction: '东', angle: 90 },
  震: { direction: '东北', angle: 135 },
  巽: { direction: '西南', angle: 225 },
  坎: { direction: '西', angle: 270 },
  艮: { direction: '西北', angle: 315 },
  坤: { direction: '北', angle: 180 },
}

// 八卦纳甲：内卦(初二三) / 外卦(四五六) 的干支，依《火珠林》纳甲法
// 乾纳甲壬、坤纳乙癸，其余六卦内外同干；地支按各卦所纳。
const NAYIN_BRANCH = {
  乾: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'], innerStem: '甲', outerStem: '壬' },
  坤: { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'], innerStem: '乙', outerStem: '癸' },
  震: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'], innerStem: '庚', outerStem: '庚' },
  巽: { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'], innerStem: '辛', outerStem: '辛' },
  坎: { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'], innerStem: '戊', outerStem: '戊' },
  离: { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'], innerStem: '己', outerStem: '己' },
  艮: { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'], innerStem: '丙', outerStem: '丙' },
  兑: { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'], innerStem: '丁', outerStem: '丁' },
}

// 返回某卦（下卦 lower、上卦 upper 均为卦名）六爻的干支，索引 0 = 初爻
export function najia(trigram, position) {
  const t = NAYIN_BRANCH[trigram]
  if (!t) throw new Error(`未知卦名：${trigram}`)
  return position === 'inner'
    ? { stems: [t.innerStem, t.innerStem, t.innerStem], branches: [...t.inner] }
    : { stems: [t.outerStem, t.outerStem, t.outerStem], branches: [...t.outer] }
}

// 六十甲子纳音五行（依《三命通会》纳音歌）
export const NAYIN_WUXING_LIST = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雷火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]
export function nayinOf(stem, branch) {
  const si = STEMS.indexOf(stem)
  const bi = BRANCHES.indexOf(branch)
  if (si < 0 || bi < 0) return null
  // 由干支求六十甲子序（0 起）
  let idx = -1
  for (let k = 0; k < 60; k += 1) {
    if (k % 10 === si && k % 12 === bi) { idx = k; break }
  }
  if (idx < 0) return null
  return { index: idx, name: NAYIN_WUXING_LIST[Math.floor(idx / 2)], element: NAYIN_WUXING_LIST[Math.floor(idx / 2)].slice(-1) }
}

// 五行生克
export const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
export const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
export const GENERATED_BY = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
export const CONTROLLED_BY = { 土: '木', 水: '土', 火: '水', 金: '火', 木: '金' }

// 六亲：以本宫五行为"我"
export function sixRelative(palaceElement, otherElement) {
  if (palaceElement === otherElement) return '兄弟'
  if (GENERATES[palaceElement] === otherElement) return '子孙'
  if (GENERATES[otherElement] === palaceElement) return '父母'
  if (CONTROLS[palaceElement] === otherElement) return '妻财'
  if (CONTROLS[otherElement] === palaceElement) return '官鬼'
  return '—'
}

export const SIX_RELATIVES = ['父母', '兄弟', '子孙', '妻财', '官鬼']
export const RELATIVE_SHORT = { 父母: '父', 兄弟: '兄', 子孙: '孙', 妻财: '财', 官鬼: '官' }
export const RELATIVE_GOD = { 父母: '印', 兄弟: '比', 子孙: '福', 妻财: '财', 官鬼: '鬼' }

// 六神（六兽）起例：甲乙起青龙、丙丁起朱雀、戊起勾陈、己起螣蛇、庚辛起白虎、壬癸起玄武
export const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
export function sixGodsOf(dayStem) {
  const table = {
    甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈',
    己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
  }
  const start = table[dayStem]
  const i = SIX_GODS.indexOf(start)
  const out = []
  for (let k = 0; k < 6; k += 1) out.push(SIX_GODS[(i + k) % 6])
  return out // index 0 = 初爻
}

// 六神所主（《卜筮正宗》《增删卜易》六神篇）
export const GOD_MEANING = {
  青龙: { element: '木', main: '喜庆、财喜、酒色、生育、尊贵', omen: '吉' },
  朱雀: { element: '火', main: '口舌、文书、信息、是非、官讼', omen: '凶' },
  勾陈: { element: '土', main: '田土、房产、迟滞、牵连、牢狱', omen: '凶' },
  螣蛇: { element: '土', main: '虚惊、怪异、梦魇、纠缠、忧愁', omen: '凶' },
  白虎: { element: '金', main: '疾病、丧亡、血光、道路、凶伤', omen: '凶' },
  玄武: { element: '水', main: '盗贼、暗昧、欺瞒、阴私、酒色', omen: '凶' },
}

// 八宫卦序：本宫八卦（六世、一世、二世、三世、四世、五世、游魂四世、归魂三世）
export const PALACES = {
  乾: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  坎: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  艮: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  震: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  巽: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  离: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  坤: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
}
export const PALACE_ORDER = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']
// 各卦在本宫的位次 -> 世爻位置（1 起，自初爻数）
export const SHI_POSITION = [6, 1, 2, 3, 4, 5, 4, 3]
export const PALACE_STAGE = ['六世（本宫）', '一世', '二世', '三世', '四世', '五世', '游魂（四世）', '归魂（三世）']

// 十二长生（依《三命通会》五行寄生十二宫，阳顺阴逆：甲丙戊庚壬同，乙丁己辛癸同）
export const TWELVE_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
export const CHANGSHENG_START = {
  木: { 阳: '亥', 阴: '午' },
  火: { 阳: '寅', 阴: '酉' },
  土: { 阳: '寅', 阴: '酉' },
  金: { 阳: '巳', 阴: '子' },
  水: { 阳: '申', 阴: '卯' },
}
// 十二地支对应月份（月建）：寅=正月
export const MONTH_OF_BRANCH = { 寅: 1, 卯: 2, 辰: 3, 巳: 4, 午: 5, 未: 6, 申: 7, 酉: 8, 戌: 9, 亥: 10, 子: 11, 丑: 12 }

// 旺相休囚死（以月建五行定，当令者旺、令生者相、生令者休、克令者囚、令克者死）
export function seasonState(monthElement, target) {
  if (monthElement === target) return '旺'
  if (GENERATES[monthElement] === target) return '相'
  if (GENERATES[target] === monthElement) return '休'
  if (CONTROLS[target] === monthElement) return '囚'
  if (CONTROLS[monthElement] === target) return '死'
  return '—'
}

export const STATE_SCORE = { 旺: 3, 相: 2, 休: 0, 囚: -2, 死: -3 }

// 三合局
export const TRINE_GROUPS = [
  { branches: ['申', '子', '辰'], element: '水', name: '申子辰水局' },
  { branches: ['亥', '卯', '未'], element: '木', name: '亥卯未木局' },
  { branches: ['寅', '午', '戌'], element: '火', name: '寅午戌火局' },
  { branches: ['巳', '酉', '丑'], element: '金', name: '巳酉丑金局' },
]
// 三会方
export const DIRECTION_GROUPS = [
  { branches: ['寅', '卯', '辰'], element: '木', name: '寅卯辰会东方木' },
  { branches: ['巳', '午', '未'], element: '火', name: '巳午未会南方火' },
  { branches: ['申', '酉', '戌'], element: '金', name: '申酉戌会西方金' },
  { branches: ['亥', '子', '丑'], element: '水', name: '亥子丑会北方水' },
]
// 地支六合
export const SIX_HARMONY = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }
// 地支六冲
export const SIX_CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
// 地支六害
export const SIX_HARM = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' }
// 地支相刑（依《阴符经》三刑）
export const PUNISHMENT = {
  子: ['卯'], 卯: ['子'],
  寅: ['巳', '申'], 巳: ['申', '寅'], 申: ['寅', '巳'],
  丑: ['戌', '未'], 戌: ['未', '丑'], 未: ['丑', '戌'],
  辰: ['辰'], 午: ['午'], 酉: ['酉'], 亥: ['亥'],
}
// 四库（辰戌丑未）
export const FOUR_STORES = ['辰', '戌', '丑', '未']
// 四马（驿马）与四桃花（咸池）
export const HORSE_GROUPS = [
  { group: ['申', '子', '辰'], horse: '寅' },
  { group: ['寅', '午', '戌'], horse: '申' },
  { group: ['巳', '酉', '丑'], horse: '亥' },
  { group: ['亥', '卯', '未'], horse: '巳' },
]
export const FLOWER_GROUPS = [
  { group: ['申', '子', '辰'], flower: '酉' },
  { group: ['寅', '午', '戌'], flower: '卯' },
  { group: ['巳', '酉', '丑'], flower: '午' },
  { group: ['亥', '卯', '未'], flower: '子' },
]
// 天乙贵人（依《渊海子平》口诀：甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、壬癸兔蛇藏、六辛逢马虎）
export const NOBLE = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
}
// 十干禄（临官之地）
export const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }
// 十干羊刃（阳干帝旺、阴干临官后一位，依《三命通会》）
export const YANGREN = { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' }

// 八卦诸象（用于取象，依《说卦传》《易冒》）
export const TRIGRAM_IMAGE = {
  乾: '天、君、父、首、马、金玉、圆物、大都、高亢、寒、刚健、老男、官府',
  兑: '泽、少女、口舌、毁折、巫、妾、金刃、乐器、喜悦、缺器、饮食',
  离: '火、中女、日、电、文书、甲胄、干戈、雉、目、文明、空虚、网罟',
  震: '雷、长男、足、动、大涂、决躁、苍筤竹、苇、惊、车、旗鼓',
  巽: '风、长女、股、木、绳直、进退、不果、臭、鸡、床、市利三倍',
  坎: '水、中男、耳、沟渎、盗、隐伏、弓轮、忧、心病、月、豕、险陷',
  艮: '山、少男、手、止、门阙、径路、石、瓜果、狗、阍寺、阻滞',
  坤: '地、母、腹、牛、众、方、布帛、釜、吝啬、臣、大舆、文、顺',
}
// 六亲取用（依《增删卜易·用神章》）
export const YONGSHEN_RULE = [
  { topic: '父母', use: '父母爻', detail: '父母用神：占父母、祖辈、师长、文书、契据、学历、考试、房屋、车船、衣帽、雨具、庇护之力。' },
  { topic: '兄弟', use: '兄弟爻', detail: '兄弟用神：占兄弟、姐妹、同辈、朋友、同事、竞争者、合伙人；亦为劫财之神。' },
  { topic: '子孙', use: '子孙爻', detail: '子孙用神：占子女、晚辈、学生、僧道、医嘱、医药、六畜；为福德之神、解忧之神、制鬼之神。' },
  { topic: '妻财', use: '妻财爻', detail: '妻财用神：占妻妾、女友、财物、钱财、货物、器皿、薪资、经营之利。' },
  { topic: '官鬼', use: '官鬼爻', detail: '官鬼用神：占官职、功名、丈夫、官府、诉讼、疾病、盗贼、忧患、鬼祟。' },
]
// 用神两现取用之例（《增删卜易》）
export const YONGSHEN_PICK = '用神两现：舍静取动、舍衰取旺、舍空取实、舍破取完；世应之内者先取。'
