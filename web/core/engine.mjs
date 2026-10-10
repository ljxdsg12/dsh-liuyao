// 排盘与断卦依据分析引擎
// 典籍依据：《增删卜易》《卜筮正宗》《黄金策》《易冒》《易隐》（曹九锡）《火珠林》（题麻衣道者）
//           《周易应用经验学》（秦伦诗）；凡典籍无据者不作断。
import {
  BRANCH_ELEMENT, BRANCH_YANG, STEM_ELEMENT, STEMS, BRANCHES, TRIGRAMS,
  GENERATES, CONTROLS, GENERATED_BY, CONTROLLED_BY, sixGodsOf, seasonState,
  TWELVE_STAGES, CHANGSHENG_START, GOD_MEANING, TRIGRAM_IMAGE, SIX_RELATIVES,
  SIX_CLASH, SIX_HARMONY, SIX_HARM, PUNISHMENT, FOUR_STORES, TRINE_GROUPS,
  DIRECTION_GROUPS, STATE_SCORE, RELATIVE_SHORT, YONGSHEN_RULE, YONGSHEN_PICK,
  HORSE_GROUPS, FLOWER_GROUPS, LU, NOBLE, YANGREN,
} from './constants.mjs'
import { fourPillars, lunarDate, xunKong, solarTermsOfYear, julianDay, ganzhi, GAN, ZHI } from './calendar.mjs'
import { assembleLines, hexagramOfLines, palaceOf, hiddenSpirits, flipLines, TRIGRAM_OF_NAME } from './hexagrams.mjs'

// 摇卦值 -> 爻：6 老阴(动) / 7 少阳 / 8 少阴 / 9 老阳(动)
export function lineFromValue(value) {
  const table = {
    6: { yang: 0, moving: true, name: '老阴', mark: '交', coins: '三字', desc: '交（老阴）——阴动变阳' },
    7: { yang: 1, moving: false, name: '少阳', mark: '单', coins: '一背二字', desc: '单（少阳）——静阳' },
    8: { yang: 0, moving: false, name: '少阴', mark: '拆', coins: '二背一字', desc: '拆（少阴）——静阴' },
    9: { yang: 1, moving: true, name: '老阳', mark: '重', coins: '三背', desc: '重（老阳）——阳动变阴' },
  }
  const hit = table[value]
  if (!hit) throw new Error(`摇卦值非法：${value}（仅可 6/7/8/9）`)
  return hit
}

export function lineSymbol(yang) {
  return yang ? '▅▅▅▅▅' : '▅▅　▅▅'
}

// 三枚硬币 -> 爻值（背为阳面计 3，字为阴面计 2；三背=9 老阳，三字=6 老阴）
export function valueFromCoins(coins) {
  const sum = coins.reduce((acc, c) => acc + (c === 'back' ? 3 : 2), 0)
  return sum // 6 / 7 / 8 / 9
}

export function tossThreeCoins(random = Math.random) {
  const coins = [0, 0, 0].map(() => (random() < 0.5 ? 'back' : 'front'))
  const value = valueFromCoins(coins)
  const parsed = lineFromValue(value)
  return { ...parsed, coins, value, coinFaces: [...coins] }
}

// —— 十二长生 ——
export function twelveStage(element, branch) {
  const conf = CHANGSHENG_START[element]
  if (!conf) return null
  const yang = BRANCH_YANG[branch]
  const start = conf[yang ? '阳' : '阴']
  const si = BRANCHES.indexOf(start)
  const bi = BRANCHES.indexOf(branch)
  const step = yang ? (bi - si + 12) % 12 : (si - bi + 12) % 12
  return { stage: TWELVE_STAGES[step], index: step, direction: yang ? '阳顺' : '阴逆', start }
}

// —— 化进神 / 化退神（五行同气六支次序）——
const SAME_QI_SEQUENCE = {
  木: ['亥', '卯', '未', '巳', '酉', '丑'],
  火: ['寅', '午', '戌', '申', '子', '辰'],
  土: ['寅', '午', '戌', '申', '子', '辰'],
  金: ['巳', '酉', '丑', '亥', '卯', '未'],
  水: ['申', '子', '辰', '寅', '午', '戌'],
}
export function advanceRetreat(fromBranch, toBranch) {
  const el = BRANCH_ELEMENT[fromBranch]
  if (!el || el !== BRANCH_ELEMENT[toBranch]) return null
  const seq = SAME_QI_SEQUENCE[el]
  const a = seq.indexOf(fromBranch)
  const b = seq.indexOf(toBranch)
  if (a < 0 || b < 0) return null
  const d = (b - a + 6) % 6
  if (d === 1) return { type: '进神', from: fromBranch, to: toBranch, element: el, rule: `${fromBranch}→${toBranch}同气顺行，为化进神` }
  if (d === 5) return { type: '退神', from: fromBranch, to: toBranch, element: el, rule: `${fromBranch}→${toBranch}同气逆行，为化退神` }
  return null
}

// —— 完整排盘 ——
export function buildChart(input) {
  const { lines: lineValues, time } = normalizeInput(input)
  const { year, month, day, hour, minute } = time
  const pillars = fourPillars(year, month, day, hour, minute)
  const kong = xunKong(pillars.day.index)
  const monthElement = BRANCH_ELEMENT[pillars.month.branch]
  const dayElement = BRANCH_ELEMENT[pillars.day.branch]

  const parsed = lineValues.map(lineFromValue)
  const yangLines = parsed.map(p => p.yang)
  const moving = parsed.map((p, i) => (p.moving ? i : -1)).filter(i => i >= 0)

  const mainHex = hexagramOfLines(yangLines)
  const mainPalace = palaceOf(mainHex.name)
  const mainLines = assembleLines(mainHex.name).map((l, i) => ({
    ...l,
    yang: yangLines[i],
    moving: parsed[i].moving,
    mark: parsed[i].mark,
    value: lineValues[i],
    god: sixGodsOf(pillars.day.stem)[i],
  }))

  const changedYang = flipLines(yangLines, moving)
  const changedHex = moving.length > 0 ? hexagramOfLines(changedYang) : null
  const changedPalace = changedHex ? palaceOf(changedHex.name) : null
  const changedLines = changedHex
    ? assembleLines(changedHex.name).map((l, i) => ({
      ...l,
      yang: changedYang[i],
      moving: moving.includes(i),
      generator: moving.includes(i) ? mainLines[i] : null,
    }))
    : null

  const hidden = hiddenSpirits(mainHex.name, mainLines)

  // 逐爻分析
  const lineAnalysis = mainLines.map((line, i) => {
    const cl = changedLines ? changedLines[i] : null
    const branch = line.branch
    const state = seasonState(monthElement, line.element)
    const stage = twelveStage(line.element, branch)
    const monthStage = twelveStage(line.element, pillars.month.branch)
    const dayStage = twelveStage(line.element, pillars.day.branch)
    const detail = {
      position: i + 1,
      positionName: ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i],
      god: line.god,
      godMeaning: GOD_MEANING[line.god],
      relative: line.relative,
      stem: line.stem,
      branch: line.branch,
      element: line.element,
      nayin: line.nayin,
      yang: line.yang,
      moving: line.moving,
      mark: line.mark,
      value: line.value,
      shi: mainPalace.shi === i + 1,
      ying: mainPalace.ying === i + 1,
      kong: kong.empty.includes(branch),
      monthBreak: SIX_CLASH[pillars.month.branch] === branch,
      dayClash: SIX_CLASH[pillars.day.branch] === branch,
      dayBreak: false,
      monthHarm: SIX_HARM[pillars.month.branch] === branch,
      dayHarm: SIX_HARM[pillars.day.branch] === branch,
      monthPunish: (PUNISHMENT[pillars.month.branch] ?? []).includes(branch),
      dayPunish: (PUNISHMENT[pillars.day.branch] ?? []).includes(branch),
      monthHarmony: SIX_HARMONY[pillars.month.branch] === branch,
      dayHarmony: SIX_HARMONY[pillars.day.branch] === branch,
      monthGenerate: GENERATES[pillars.month.branch ? BRANCH_ELEMENT[pillars.month.branch] : ''] === line.element,
      dayGenerate: GENERATES[dayElement] === line.element,
      monthControl: CONTROLS[monthElement] === line.element,
      dayControl: CONTROLS[dayElement] === line.element,
      state,
      stage: stage?.stage,
      stageInfo: stage,
      monthStage: monthStage?.stage,
      dayStage: dayStage?.stage,
      isStore: FOUR_STORES.includes(branch),
      isHorse: HORSE_GROUPS.find(g => g.group.includes(pillars.day.branch))?.horse === branch,
      isFlower: FLOWER_GROUPS.find(g => g.group.includes(pillars.day.branch))?.flower === branch,
      isLu: LU[pillars.day.stem] === branch,
      isNoble: (NOBLE[pillars.day.stem] ?? []).includes(branch),
      isYangren: YANGREN[pillars.day.stem] === branch,
      changed: null,
      hiddenSpirits: hidden.hidden.filter(h => h.hideAt === i).map(h => ({
        relative: h.relative, stem: h.stem, branch: h.branch, element: h.element,
        nayin: h.nayin, provider: h.provider,
      })),
      scores: null,
    }

    if (cl) {
      const changedState = seasonState(monthElement, cl.element)
      const adv = advanceRetreat(branch, cl.branch)
      const changes = {
        hexagram: changedHex.name,
        relative: cl.relative,
        stem: cl.stem,
        branch: cl.branch,
        element: cl.element,
        nayin: cl.nayin,
        state: changedState,
        stage: twelveStage(cl.element, cl.branch)?.stage,
        kong: kong.empty.includes(cl.branch),
        monthBreak: SIX_CLASH[pillars.month.branch] === cl.branch,
        dayClash: SIX_CLASH[pillars.day.branch] === cl.branch,
        advanceRetreat: adv,
        backGenerate: GENERATES[cl.element] === line.element, // 变爻生本爻 = 回头生
        backControl: CONTROLS[cl.element] === line.element, // 变爻克本爻 = 回头克
        selfGenerate: GENERATES[line.element] === cl.element, // 本爻生变爻 = 泄气
        selfControl: CONTROLS[line.element] === cl.element, // 本爻克变爻 = 化克（克出）
        harmony: SIX_HARMONY[branch] === cl.branch,
        clash: SIX_CLASH[branch] === cl.branch,
        sameElement: cl.element === line.element,
      }
      detail.changed = changes
    }

    // 日冲：动爻逢冲为"日散"，静爻逢冲不散（旺相静爻反冲起）——依《增删卜易·日辰》
    if (detail.dayClash) {
      detail.dayBreak = detail.moving
      detail.dayChongNote = detail.moving
        ? '动爻逢日辰相冲，为日散'
        : `静爻逢日辰${pillars.day.branch}相冲，静而不散（${detail.state === '旺' || detail.state === '相' ? '旺相者冲之反起' : '衰者冲之愈衰'}）`
    }

    detail.scores = scoreLine(detail, { monthElement, dayElement, monthBranch: pillars.month.branch, dayBranch: pillars.day.branch })
    return detail
  })

  // 三合局检测（动爻、变爻与日月）
  const trines = detectTrines(mainLines, changedLines, moving, pillars)

  // 用神不上卦（伏神可补）
  const absentRelatives = SIX_RELATIVES.filter(rel => !mainLines.some(l => l.relative === rel))

  const lunar = lunarDate(year, month, day, hour)

  return {
    input: { time, lineValues },
    solar: {
      text: `${year}年${month}月${day}日${hour}时${String(minute).padStart(2, '0')}分`,
      weekday: weekdayOf(year, month, day),
      lunarText: `${pillars.year.text}年 ${lunar.monthName}${lunar.dayName}`,
      lunar,
    },
    pillars,
    kong,
    monthElement,
    dayElement,
    main: {
      name: mainHex.name,
      lower: TRIGRAMS[mainHex.lower],
      upper: TRIGRAMS[mainHex.upper],
      lowerName: mainHex.lower,
      upperName: mainHex.upper,
      palace: mainPalace,
      lines: lineAnalysis,
      images: `${TRIGRAM_IMAGE[mainHex.upper]}／${TRIGRAM_IMAGE[mainHex.lower]}`,
    },
    changed: changedHex ? {
      name: changedHex.name,
      lowerName: changedHex.lower,
      upperName: changedHex.upper,
      palace: changedPalace,
      lines: changedLines.map((l, i) => ({
        ...l,
        position: i + 1,
        god: mainLines[i].god,
        shi: changedPalace.shi === i + 1,
        ying: changedPalace.ying === i + 1,
        kong: kong.empty.includes(l.branch),
        moving: moving.includes(i),
      })),
    } : null,
    moving,
    hidden,
    absentRelatives,
    trines,
    yongshenRule: YONGSHEN_RULE,
    yongshenPick: YONGSHEN_PICK,
  }
}

function normalizeInput(input) {
  if (input && Array.isArray(input.lineValues) && input.time) {
    return { lines: input.lineValues.map(Number), time: input.time }
  }
  throw new Error('排盘输入须包含 time 与 lineValues（六爻，自初爻至上爻）')
}

function weekdayOf(y, m, d) {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  const jd = julianDay(y, m, d, 12)
  const w = Math.floor(jd + 1.5) % 7
  return `星期${names[w]}`
}

// —— 旺衰打分（依《增删卜易》旺相休囚、月建日辰轻重之例）——
function scoreLine(detail, ctx) {
  const items = []
  const push = (score, reason, source) => items.push({ score, reason, source })

  const stateScore = STATE_SCORE[detail.state] ?? 0
  push(stateScore, `月建${ctx.monthBranch}(${ctx.monthElement})，本爻${detail.element}处${detail.state}`, '《增删卜易·旺相休囚》')

  if (detail.monthStage === '临官' || detail.monthStage === '帝旺') push(2, `月建为${detail.element}之${detail.monthStage}，得月气之盛`, '《三命通会·五行寄生十二宫》')
  if (detail.monthStage === '长生' || detail.monthStage === '冠带') push(1, `月建为${detail.element}之${detail.monthStage}`, '《三命通会·五行寄生十二宫》')
  if (detail.monthStage === '墓') push(-1, `本爻入月墓（${detail.element}墓于${'辰戌丑未'[0]}之类）`, '《增删卜易·入墓》')
  if (detail.monthStage === '绝') push(-2, `月建为${detail.element}之绝地`, '《三命通会·五行寄生十二宫》')

  if (detail.monthHarmony) push(1, `与月建六合`, '《黄金策·合冲》')
  if (detail.dayHarmony) push(1, `与日辰六合`, '《黄金策·合冲》')
  if (detail.monthBreak) push(-3, `月破（与月建${ctx.monthBranch}相冲）`, '《增删卜易·月破》')
  if (detail.dayClash) push(detail.moving ? -2 : 0, detail.moving ? `动爻逢日辰${ctx.dayBranch}相冲，为日散` : `静爻逢日辰相冲而不散`, '《增删卜易·日辰》')
  if (detail.monthControl) push(-1, `月建${ctx.monthElement}克本爻`, '《增删卜易·月建》')
  if (detail.monthGenerate) push(1, `月建生本爻`, '《增删卜易·月建》')
  if (detail.dayGenerate) push(1, `日辰生本爻`, '《增删卜易·日辰》')
  if (detail.dayControl) push(-1, `日辰${ctx.dayElement}克本爻`, '《增删卜易·日辰》')
  if (detail.kong) push(detail.moving ? -1 : -2, detail.moving ? '动而逢空（待出空）' : '静而逢空（旬空）', '《增删卜易·旬空》')
  if (detail.dayPunish || detail.monthPunish) push(-1, '逢刑', '《黄金策·刑》')
  if (detail.dayHarm || detail.monthHarm) push(-1, '逢害', '《易冒·六害》')

  if (detail.changed) {
    const c = detail.changed
    if (c.backGenerate) push(3, `化回头生（变爻${c.stem}${c.branch}${c.element}生本爻）`, '《增删卜易·回头生》')
    if (c.backControl) push(-3, `化回头克（变爻${c.stem}${c.branch}${c.element}克本爻）——大凶之象`, '《增删卜易·回头克》')
    if (c.selfGenerate) push(-1, `本爻生变爻，泄气`, '《增删卜易·化泄》')
    if (c.selfControl) push(-1, `本爻克变爻，力有耗`, '《增删卜易·克出》')
    if (c.advanceRetreat?.type === '进神') push(2, `化进神（${c.advanceRetreat.rule}）`, '《增删卜易·进神》')
    if (c.advanceRetreat?.type === '退神') push(-2, `化退神（${c.advanceRetreat.rule}）`, '《增删卜易·退神》')
    if (c.kong) push(-1, '化空', '《增删卜易·化空》')
    if (c.monthBreak) push(-2, '化月破', '《增删卜易·化破》')
    if (c.harmony) push(1, '化六合', '《黄金策·合》')
    if (c.clash) push(-1, '化六冲', '《黄金策·冲》')
  }

  const total = items.reduce((s, it) => s + it.score, 0)
  const verdict = total >= 5 ? '旺相有力' : total >= 2 ? '偏旺' : total > -2 ? '中和' : total > -5 ? '偏衰' : '休囚无力'
  return { total, verdict, items }
}

// —— 三合局 / 三会方检测 ——
function detectTrines(mainLines, changedLines, moving, pillars) {
  const results = []
  const branchSet = new Map()
  mainLines.forEach((l, i) => {
    if (moving.includes(i)) branchSet.set(l.branch, `动爻${['初', '二', '三', '四', '五', '上'][i]}`)
  })
  if (changedLines) {
    changedLines.forEach((l, i) => {
      if (moving.includes(i)) branchSet.set(l.branch, `${branchSet.get(l.branch) ?? ''}变爻${['初', '二', '三', '四', '五', '上'][i]}`.trim())
    })
  }
  branchSet.set(pillars.month.branch, '月建')
  branchSet.set(pillars.day.branch, '日辰')

  for (const t of TRINE_GROUPS) {
    const hit = t.branches.filter(b => branchSet.has(b))
    if (hit.length === 3) {
      const sources = hit.map(b => `${b}(${branchSet.get(b)})`).join('、')
      results.push({ kind: '三合局', name: t.name, element: t.element, detail: `${sources}合成${t.name}`, source: '《增删卜易·三合局》' })
    } else if (hit.length === 2) {
      const rest = t.branches.filter(b => !branchSet.has(b))
      const restMoving = mainLines.some((l, i) => moving.includes(i) && rest.includes(l.branch))
      results.push({
        kind: '半合（虚一待用）', name: t.name, element: t.element,
        detail: `${hit.map(b => `${b}(${branchSet.get(b)})`).join('、')}缺${rest.join('')}，须待${rest.join('/')}之日${restMoving ? '（本卦有之，可成局）' : '来凑方成'}`,
        source: '《增删卜易·三合局》',
      })
    }
  }
  for (const d of DIRECTION_GROUPS) {
    const hit = d.branches.filter(b => branchSet.has(b))
    if (hit.length === 3) {
      results.push({ kind: '三会方', name: d.name, element: d.element, detail: `${hit.map(b => `${b}(${branchSet.get(b)})`).join('、')}会成${d.name}`, source: '《易冒·会局》' })
    }
  }
  return results
}

// —— 世应关系分析 ——
export function analyzeShiYing(chart) {
  const shi = chart.main.lines.find(l => l.shi)
  const ying = chart.main.lines.find(l => l.ying)
  const out = []
  if (!shi || !ying) return out
  const rel = relationBetween(shi, ying)
  out.push({ kind: '世应', text: `世在${shi.positionName}${shi.relative}${shi.stem}${shi.branch}${shi.element}，应在${ying.positionName}${ying.relative}${ying.stem}${ying.branch}${ying.element}；${rel}`, source: '《黄金策·世应》' })
  if (SIX_CLASH[shi.branch] === ying.branch) out.push({ kind: '世应相冲', text: '世应相冲，主彼此背离、事多阻隔', source: '《卜筮正宗·世应》' })
  if (SIX_HARMONY[shi.branch] === ying.branch) out.push({ kind: '世应相合', text: '世应相合，主彼此相与、事易谐和', source: '《卜筮正宗·世应》' })
  return out
}

function relationBetween(a, b) {
  if (GENERATES[a.element] === b.element) return `${a.relative}生${b.relative}，世生应（我往求人，费力）`
  if (GENERATES[b.element] === a.element) return `${b.relative}生${a.relative}，应生世（人来就我，得力）`
  if (CONTROLS[a.element] === b.element) return `${a.relative}克${b.relative}，世克应（我能制彼）`
  if (CONTROLS[b.element] === a.element) return `${b.relative}克${a.relative}，应克世（彼来伤我）`
  return `${a.relative}与${b.relative}比和（同类相助）`
}

// —— 用神取用 ——
export function pickYongshen(chart, topic) {
  // 用神取用：依《增删卜易·用神章》，先定所问之事，再以六亲配之。
  // 注意：这是关键词匹配，不是语义理解——写死的词表命中什么就是什么，
  // 命中不到就返回 null（宁可不取，也不乱取），由分析层给出「需注明所问之事」。
  const KEYWORDS = [
    { key: '父母', words: ['父母', '父', '母', '长辈', '师长', '文书', '合同', '契据', '房产', '房子', '车', '车船', '学历', '考试', '证件', '雨', '庇护', '学校', '学业', '成绩', '文凭', '证书'] },
    { key: '兄弟', words: ['兄弟', '姐妹', '同辈', '朋友', '同事', '合伙', '竞争', '同学', '室友', '哥们', '闺蜜'] },
    { key: '子孙', words: ['子女', '孩子', '儿女', '学生', '晚辈', '医', '药', '僧', '道', '六畜', '宠物', '福', '解忧', '儿女', '孙子', '孙女', '胎儿', '怀孕'] },
    // 配偶与恋人依所问者身份而异（男占妻看妻财、女占夫看官鬼），故此处按词面分别归入；
    // 泛称「婚姻／感情／结婚」未辨身份，交由下方 AMBIGUOUS 提示补明，不硬猜。
    { key: '妻财', words: ['妻', '妻财', '财', '钱', '财帛', '工资', '薪', '货', '买卖', '生意', '投资', '股票', '女友', '女朋友', '未婚妻', '老婆', '太太', '夫人', '妻子', '媳妇', '相亲对象', '物品', '器皿', '收成', '利润', '收益', '营收', '奖金'] },
    { key: '官鬼', words: ['官', '官鬼', '官运', '官职', '功名', '丈夫', '老公', '夫君', '男友', '男朋友', '未婚夫', '工作', '事业', '官司', '诉讼', '疾病', '病', '盗', '贼', '忧', '鬼', '上司', '领导', '考试名次', '升迁', '职位', '求职', '面试', '调动', '小人'] },
  ]

  // 身份未明、不能确定用神的问法（照实说明，代之以猜测）
  const AMBIGUOUS = ['婚姻', '感情', '结婚', '婚事', '恋爱', '姻缘', '婚配', '伴侣', '对象', '脱单', '复合']

  const t = String(topic ?? '')
  // 按「命中的关键词越长越优先」定用神。
  // 纯 includes 会让「问女朋友」命中「朋友」而误取兄弟——长词优先可避免此类误判。
  let hit = null
  let bestLen = 0
  for (const group of KEYWORDS) {
    for (const w of group.words) {
      if (w.length > bestLen && t.includes(w)) {
        hit = group
        bestLen = w.length
      }
    }
  }
  const use = hit ? hit.key : null
  const lines = use ? chart.main.lines.filter(l => l.relative === use) : []
  const hiddenOnes = use ? chart.hidden.hidden.filter(h => h.relative === use) : []
  const needsRole = !use && AMBIGUOUS.some(w => t.includes(w))
  return {
    topic,
    use,
    needsRole,
    needsRoleNote: needsRole
      ? '婚姻感情之占，用神随所问者身份而定：男占妻（女友、未婚妻）看妻财，女占夫（男友、未婚夫）看官鬼。请注明是问夫还是问妻（如「问妻子」「问男朋友」）。依《增删卜易·用神章》。'
      : null,
    rule: YONGSHEN_RULE.find(r => r.topic === use)?.detail ?? null,
    present: lines.length,
    lines,
    hidden: hiddenOnes,
    pick: lines.length > 1 ? YONGSHEN_PICK : null,
    notOnChart: lines.length === 0,
  }
}
