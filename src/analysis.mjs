// 断卦依据引擎：用神、原神、忌神、仇神、进退化、生克合冲、六神、纳音、伏神、应期
// 出处皆注于 source 字段；典籍无据者不出断语。
import {
  BRANCH_ELEMENT, GENERATES, CONTROLS, GENERATED_BY, CONTROLLED_BY, SIX_CLASH, SIX_HARMONY,
  SIX_HARM, PUNISHMENT, SIX_RELATIVES, GOD_MEANING, TRIGRAM_IMAGE, TRIGRAMS,
} from './constants.mjs'
import { pickYongshen } from './engine.mjs'

const NUM = ['初', '二', '三', '四', '五', '上']

export function analyze(chart, topic) {
  const sections = []
  const yong = pickYongshen(chart, topic)
  const shi = chart.main.lines.find(l => l.shi)
  const ying = chart.main.lines.find(l => l.ying)

  sections.push(sectionUseGod(chart, yong))
  sections.push(sectionRelations(chart, yong))
  sections.push(sectionMoving(chart))
  sections.push(sectionShiYing(chart, shi, ying))
  sections.push(sectionGods(chart))
  sections.push(sectionNayin(chart))
  sections.push(sectionHidden(chart, yong))
  sections.push(sectionOverall(chart, yong))
  return {
    topic,
    yongshen: summarizeYong(yong),
    summary: buildSummary(chart, yong),
    sections: sections.filter(Boolean),
    verdict: buildVerdict(chart, yong),
  }
}

function summarizeYong(yong) {
  return {
    topic: yong.topic,
    use: yong.use,
    rule: yong.rule,
    present: yong.present,
    onLines: yong.lines.map(l => `${l.positionName}${l.stem}${l.branch}${l.element}(${l.scores.verdict})`),
    hidden: yong.hidden.map(h => `${NUM[h.hideAt]}爻下伏${h.stem}${h.branch}${h.element}`),
    notOnChart: yong.notOnChart,
    pick: yong.pick,
  }
}

// —— 用神 ——
function sectionUseGod(chart, yong) {
  if (!yong.use) {
    return {
      title: '用神取用',
      points: [{
        text: '所占之事未明，无从取用神。依《增删卜易·用神章》须先定所问之事（父母、兄弟、子孙、妻财、官鬼），再论吉凶，不可无的放矢。',
        source: '《增删卜易·用神章》',
      }],
      needTopic: true,
    }
  }
  const points = [{ text: `所问「${yong.topic}」，依《增删卜易·用神章》以${yong.use}为用神。${yong.rule}`, source: '《增删卜易·用神章》' }]

  if (yong.notOnChart) {
    points.push({
      text: `用神${yong.use}不上卦（六爻所无），依《增删卜易·伏神章》须于本宫首卦借伏：${yong.hidden.map(h => `${NUM[h.hideAt]}爻伏${h.stem}${h.branch}${h.element}`).join('、') || '本宫首卦亦无，则事无所依，主事不谐、无成'}`,
      source: '《增删卜易·伏神章》',
    })
    if (yong.hidden.length > 0) {
      const h = yong.hidden[0]
      const fly = chart.main.lines[h.hideAt]
      points.push({
        text: `伏神${h.relative}${h.stem}${h.branch}${h.element}伏于${NUM[h.hideAt]}爻${fly.relative}${fly.stem}${fly.branch}${fly.element}之下。飞神${GENERATES[fly.element] === h.element ? '生伏神，伏神得助而可用' : CONTROLS[fly.element] === h.element ? '克伏神，伏神受制而难出' : GENERATES[h.element] === fly.element ? '受伏神之生，伏神有力可出' : '与伏神比和，伏神易于透出'}（${fly.element}与${h.element}）。`,
        source: '《卜筮正宗·伏神章》',
      })
      points.push({
        text: '伏神须得日月生扶、飞神不克，方为有用；伏而不出，则事体难成。',
        source: '《易隐·伏神》',
      })
    }
  } else {
    for (const l of yong.lines) {
      points.push({
        text: `用神现于${l.positionName}（${l.relative}${l.stem}${l.branch}${l.element}）：${l.state}于月建，${l.stage ? l.stage + '之地' : ''}，旺衰评${l.scores.total}分（${l.scores.verdict}）${l.moving ? '，且发动' : '，安静'}${l.kong ? '，逢旬空' : ''}${l.monthBreak ? '，月破' : ''}。`,
        source: '《增删卜易·用神章》《卜筮正宗·月建日辰》',
      })
    }
    if (yong.lines.length > 1) {
      points.push({ text: `用神两现。${yong.pick}`, source: '《增删卜易·两现章》' })
    }
  }
  return { title: '用神取用', points }
}

// —— 原神 / 忌神 / 仇神与生克合冲 ——
function sectionRelations(chart, yong) {
  const points = []
  if (!yong.use) return null
  const useElement = relativeElement(chart, yong)
  if (!useElement) return null
  const gen = GENERATED_BY[useElement] // 生用神者 = 原神
  const ctrl = CONTROLLED_BY[useElement] // 克用神者 = 忌神
  const chou = CONTROLLED_BY[gen] // 克原神者 = 仇神

  const findOnes = (element) => chart.main.lines.filter(l => l.element === element)
  const describe = (label, element, note, source) => {
    const ones = findOnes(element)
    if (ones.length === 0) {
      points.push({ text: `${label}${element}不上卦（六爻所无）。${note}`, source })
      return
    }
    points.push({
      text: `${label}${element}：${ones.map(l => `${l.positionName}${l.relative}${l.stem}${l.branch}（${l.scores.verdict}${l.moving ? '·发动' : ''}${l.kong ? '·空' : ''}${l.monthBreak ? '·月破' : ''}）`).join('、')}。${note}`,
      source,
    })
  }
  describe('原神（生用神者）', gen, `原神旺相生动，则用神有根；原神受制，用神失援。`, '《增删卜易·原神章》')
  describe('忌神（克用神者）', ctrl, `忌神宜安静休囚受制，最忌发动；忌神发动克用，事多阻逆。`, '《增删卜易·忌神章》')
  describe('仇神（克原神者）', chou, '仇神动则原神受伤，用神无援。', '《增删卜易·仇神章》')

  // 用神与世爻
  const shi = chart.main.lines.find(l => l.shi)
  if (shi && yong.lines.length > 0) {
    const useLine = yong.lines.find(l => l.moving) ?? yong.lines[0]
    if (GENERATES[useLine.element] === shi.element) points.push({ text: `用神${useLine.element}生世爻${shi.element}——用神生世，主事来就我、求之易得。`, source: '《黄金策·用神》' })
    else if (GENERATES[shi.element] === useLine.element) points.push({ text: `世爻生用神——我去生它，主我费力而事可成，然恐耗己。`, source: '《黄金策·用神》' })
    else if (CONTROLS[useLine.element] === shi.element) points.push({ text: `用神克世爻——用神克世，主事虽成而累己，或所求之物反为害。`, source: '《黄金策·用神》' })
    else if (CONTROLS[shi.element] === useLine.element) points.push({ text: `世爻克用神——世克用神，主我能制之，所求可成，但须我着力。`, source: '《黄金策·用神》' })
    else points.push({ text: `用神与世爻比和（同${useLine.element}），主同气相求、彼此相与。`, source: '《黄金策·用神》' })
    if (SIX_HARMONY[useLine.branch] === shi.branch) points.push({ text: '用神与世爻六合——事必成、人必至、物必得。', source: '《增删卜易·六合》' })
    if (SIX_CLASH[useLine.branch] === shi.branch) points.push({ text: '用神与世爻相冲——主事难谐、人来而复去。', source: '《增删卜易·六冲》' })
    if (SIX_HARM[useLine.branch] === shi.branch) points.push({ text: '用神与世爻相害——主暗中受损、情意不投。', source: '《易冒·六害》' })
    if ((PUNISHMENT[useLine.branch] ?? []).includes(shi.branch)) points.push({ text: '用神与世爻相刑——主纠缠刑伤、事有反复。', source: '《黄金策·刑》' })
  }

  // 与月建日辰的关系
  const useLine = yong.lines.find(l => l.moving) ?? yong.lines[0]
  if (useLine) {
    const shi2 = []
    if (useLine.monthHarmony) shi2.push('用神与月建六合，得月之助')
    if (useLine.monthBreak) shi2.push('用神月破，主事已破败、物已损')
    if (useLine.dayHarmony) shi2.push('用神与日辰六合，得日之助')
    if (useLine.dayClash) shi2.push('用神逢日冲' + (useLine.moving ? '（动而逢冲为日散）' : '（静而不散，旺则冲起）'))
    if (shi2.length) points.push({ text: shi2.join('；') + '。', source: '《增删卜易·月建日辰》' })
  }
  return { title: '原神·忌神·仇神与生克合冲', points }
}

function relativeElement(chart, yong) {
  if (yong.lines.length > 0) return (yong.lines.find(l => l.moving) ?? yong.lines[0]).element
  if (yong.hidden.length > 0) return yong.hidden[0].element
  return null
}

// —— 动爻与变爻 ——
function sectionMoving(chart) {
  const points = []
  if (!chart.changed) {
    points.push({ text: '六爻安静，无动变。依《增删卜易》：静卦以世应、用神与日月生克论之，事体迟而未动，成事须待日辰冲起或用神值日。', source: '《增删卜易·静卦》' })
    return { title: '动爻与变爻', points }
  }
  for (const i of chart.moving) {
    const l = chart.main.lines[i]
    const c = l.changed
    const bits = [`${l.positionName}${l.god}${l.relative}${l.stem}${l.branch}${l.element}发动（${l.value === 9 ? '老阳' : '老阴'}），化${c.relative}${c.stem}${c.branch}${c.element}`]
    if (c.advanceRetreat) bits.push(c.advanceRetreat.type === '进神' ? '为化进神，其力方增' : '为化退神，其力渐减')
    if (c.backGenerate) bits.push('变爻回头生本爻，大吉')
    if (c.backControl) bits.push('变爻回头克本爻，大凶')
    if (c.selfGenerate) bits.push('本爻生变爻，泄气')
    if (c.selfControl) bits.push('本爻克变爻，气有所耗')
    if (c.harmony) bits.push('化六合')
    if (c.clash) bits.push('化六冲')
    if (c.kong) bits.push('化空，待出空之日方应')
    if (c.monthBreak) bits.push('化月破')
    if (c.sameElement) bits.push('与本爻同气（化比和）')
    else if (GENERATES[c.element] === l.element) bits.push('变爻生本爻')
    else if (CONTROLS[c.element] === l.element) bits.push('变爻克本爻')
    points.push({ text: bits.join('，') + '。', source: '《增删卜易·动变章》《卜筮正宗·化进退》' })
  }
  // 反吟伏吟
  const innerChanged = chart.moving.some(i => i <= 2)
  const outerChanged = chart.moving.some(i => i >= 3)
  const mainLower = chart.main.lowerName
  const mainUpper = chart.main.upperName
  const chLower = chart.changed.lowerName
  const chUpper = chart.changed.upperName
  if (innerChanged && isClashingTrigram(mainLower, chLower)) {
    points.push({ text: `内卦${mainLower}变${chLower}，为内卦反吟——事体反复颠倒、去而复来。`, source: '《增删卜易·反吟》' })
  }
  if (outerChanged && isClashingTrigram(mainUpper, chUpper)) {
    points.push({ text: `外卦${mainUpper}变${chUpper}，为外卦反吟——外来之事反复无常。`, source: '《增删卜易·反吟》' })
  }
  if (chart.changed.name === chart.main.name) points.push({ text: '卦名不变，为伏吟之象，主呻吟忧愁、事体停滞。', source: '《增删卜易·伏吟》' })
  return { title: '动爻与变爻', points }
}

// 八卦相冲（六冲卦之对）：乾为天↔坤为地、震为雷↔巽为风、坎为水↔离为火、艮为山↔兑为泽
const CLASHING_TRIGRAM = { 乾: '坤', 坤: '乾', 震: '巽', 巽: '震', 坎: '离', 离: '坎', 艮: '兑', 兑: '艮' }
function isClashingTrigram(a, b) {
  return CLASHING_TRIGRAM[a] === b
}

// —— 世应 ——
function sectionShiYing(chart, shi, ying) {
  const points = []
  points.push({
    text: `世爻在${shi.positionName}${shi.relative}${shi.stem}${shi.branch}${shi.element}（${shi.scores.verdict}，${shi.state}），应爻在${ying.positionName}${ying.relative}${ying.stem}${ying.branch}${ying.element}（${ying.scores.verdict}）。${describeRelation(shi.element, ying.element)}`,
    source: '《黄金策·世应》',
  })
  if (shi.kong) points.push({ text: '世爻逢空——主自己心无主张或事不实，须待填实、冲空之期方应。', source: '《增删卜易·旬空》' })
  if (shi.monthBreak) points.push({ text: '世爻月破——主己身有损、根基不固。', source: '《增删卜易·月破》' })
  if (shi.moving) points.push({ text: '世爻发动——主自己主动求变，事由己起。', source: '《卜筮正宗·世应动静》' })
  if (shi.dayClash && shi.moving) points.push({ text: '世爻动而逢日冲，为世散，主己身不定。', source: '《增删卜易·日辰》' })
  if (shi.isYangren) points.push({ text: '世临羊刃，主刚猛易折、争斗之象。', source: '《三命通会·羊刃》' })
  points.push({ text: `卦身${NUM[chart.main.palace.shi - 1]}爻，属${chart.main.palace.palace}宫${chart.main.palace.stageName}卦。`, source: '《火珠林·八卦六爻》' })
  return { title: '世应与卦身', points }
}

function describeRelation(a, b) {
  if (GENERATES[a] === b) return '世生应，主我往求彼、我费力而彼受惠。'
  if (GENERATES[b] === a) return '应生世，主彼来就我、得人之助。'
  if (CONTROLS[a] === b) return '世克应，主我能制彼、事由我主。'
  if (CONTROLS[b] === a) return '应克世，主彼来伤我、受制于人。'
  return '世应比和，主彼此同心、谋为相济。'
}

// —— 六神 ——
function sectionGods(chart) {
  const points = []
  const movingGods = chart.main.lines.filter(l => l.moving)
  const target = movingGods.length > 0 ? movingGods : chart.main.lines.filter(l => l.shi || l.ying)
  for (const l of target) {
    const g = GOD_MEANING[l.god]
    points.push({
      text: `${l.positionName}${l.shi ? '（世）' : l.ying ? '（应）' : ''}临${l.god}${l.moving ? '发动' : ''}，${l.god}属${g.element}，主${g.main}；与所临${l.relative}${l.element}相参，${GENERATES[g.element] === l.element ? '六神生爻，其象增力' : CONTROLS[g.element] === l.element ? '六神克爻，其象带损' : GENERATES[l.element] === g.element ? '爻生六神，其力外泄' : CONTROLS[l.element] === g.element ? '爻克六神，可制其凶' : '与爻比和，其象相乘'}。`,
      source: '《卜筮正宗·六神篇》《增删卜易·六神》',
    })
  }
  const huo = chart.main.lines.find(l => l.value === 9)
  const shui = chart.main.lines.find(l => l.value === 6)
  points.push({
    text: `${huo ? `老阳发动者${huo.positionName}（${huo.relative}${huo.branch}），阳极化阴，主事极而反` : '无老阳发动'}；${shui ? `老阴发动者${shui.positionName}（${shui.relative}${shui.branch}），阴极化阳，主静极思动` : '无老阴发动'}。`,
    source: '《火珠林·老阳老阴》',
  })
  return { title: '六神与动变之象', points }
}

// —— 纳音 ——
function sectionNayin(chart) {
  const points = []
  for (const i of chart.moving) {
    const l = chart.main.lines[i]
    const c = l.changed
    if (!l.nayin || !c?.nayin) continue
    const same = l.nayin.name === c.nayin.name
    points.push({
      text: `${NUM[i]}爻${l.stem}${l.branch}纳音${l.nayin.name}（${l.nayin.element}），化${c.stem}${c.branch}纳音${c.nayin.name}（${c.nayin.element}）：${same ? '纳音相同，为同气相助' : GENERATES[l.nayin.element] === c.nayin.element ? '本爻纳音生变爻纳音，气外泄' : CONTROLS[l.nayin.element] === c.nayin.element ? '本爻纳音克变爻纳音，我可制彼' : GENERATES[c.nayin.element] === l.nayin.element ? '变爻纳音生本爻纳音，得助' : CONTROLS[c.nayin.element] === l.nayin.element ? '变爻纳音克本爻纳音，受损' : '纳音比和无碍'}。`,
      source: '《易隐·纳音》《火珠林·纳音》',
    })
  }
  if (points.length === 0) points.push({ text: '六爻安静，纳音以世应二爻论：' + [chart.main.lines.find(l => l.shi), chart.main.lines.find(l => l.ying)].filter(Boolean).map(l => `${l.positionName}${l.stem}${l.branch}纳音${l.nayin?.name ?? '—'}（${l.nayin?.element ?? '—'}）`).join('、') + '。纳音同气则相助，相生则相扶，相克则相损。', source: '《易隐·纳音》' })
  return { title: '纳音五行', points }
}

// —— 伏神对照 ——
function sectionHidden(chart, yong) {
  const points = []
  if (chart.hidden.hidden.length === 0) {
    points.push({ text: '本宫首卦六亲皆已上卦，无伏神可论。', source: '《卜筮正宗·伏神章》' })
    return { title: '伏神', points }
  }
  for (const h of chart.hidden.hidden) {
    const fly = chart.main.lines[h.hideAt]
    const state = fly ? `${fly.relative}${fly.stem}${fly.branch}${fly.element}` : ''
    points.push({
      text: `${NUM[h.hideAt]}爻${state}之下伏${h.relative}${h.stem}${h.branch}${h.element}${h.nayin ? `（纳音${h.nayin.name}）` : ''}${h.provider ? '——主卦不现此六亲，若所占之事以此为用神，则须借伏神论之' : ''}。`,
      source: '《增删卜易·伏神章》《卜筮正宗·伏神章》',
    })
  }
  points.push({ text: '伏神有用者：得日月生扶、旺相、临日月、飞神生伏、动爻生伏；伏神无用者：休囚、被日月克、飞神克伏、空破墓绝。伏而不出，则所问之事无着落。', source: '《增删卜易·伏神章》' })
  return { title: '伏神', points }
}

// —— 综合断语 ——
function sectionOverall(chart, yong) {
  const points = []
  const shi = chart.main.lines.find(l => l.shi)
  const movingRel = [...new Set(chart.moving.map(i => chart.main.lines[i].relative))]
  points.push({
    text: `主卦${chart.main.name}（${chart.main.palace.palace}宫${chart.main.palace.stageName}）${chart.changed ? `变${chart.changed.name}（${chart.changed.palace.palace}宫${chart.changed.palace.stageName}）` : '六爻安静'}。发动之爻为${movingRel.length ? movingRel.join('、') : '无'}。`,
    source: '《火珠林》《增删卜易》',
  })
  if (shi && yong.use) {
    const useEl = relativeElement(chart, yong)
    if (useEl) {
      const rel = GENERATES[useEl] === shi.element ? '用神生世'
        : GENERATES[shi.element] === useEl ? '世生用神'
          : CONTROLS[useEl] === shi.element ? '用神克世'
            : CONTROLS[shi.element] === useEl ? '世克用神' : '用神与世比和'
      points.push({
        text: `用神与世爻之关系为「${rel}」。依《增删卜易》：用神生世、世克用神者，事可求而得；用神克世者，求之反受其累；世生用神者，费心力而可得；比和者，同气相求。`,
        source: '《增删卜易·用神章》',
      })
    }
  }
  const kong = chart.kong.empty
  const kongLines = chart.main.lines.filter(l => l.kong)
  if (kongLines.length > 0) {
    points.push({
      text: `${kongLines.map(l => l.positionName + l.relative).join('、')}逢旬空（${kong.join('')}空）。空亡之爻：动而空者待出空之期，静而空者终成虚耗；用神空则事虚，世空则己不实，忌神空则凶不为害。`,
      source: '《增删卜易·旬空》',
    })
  }
  const trineText = chart.trines.length ? chart.trines.map(t => t.detail).join('；') : '无三合、三会之局'
  points.push({ text: `合局之论：${trineText}。`, source: '《增删卜易·三合局》《易冒·会局》' })
  return { title: '综合判断', points }
}

// —— 结论清单（可验证性最高的几条）——
function buildVerdict(chart, yong) {
  const items = []
  const shi = chart.main.lines.find(l => l.shi)
  if (yong.use && yong.notOnChart) {
    items.push({ level: '关键', text: `用神${yong.use}不上卦，事之主体不现——主所问之人、物、事难以直接把握；须看伏神与飞神生克。`, source: '《增删卜易·伏神章》' })
  }
  for (const i of chart.moving) {
    const c = chart.main.lines[i].changed
    if (!c) continue
    if (c.backControl) items.push({ level: '凶', text: `${NUM[i]}爻化回头克（${chart.main.lines[i].branch}→${c.branch}），发动之爻自受其伤，其事必阻。`, source: '《增删卜易·回头克》' })
    if (c.backGenerate) items.push({ level: '吉', text: `${NUM[i]}爻化回头生（${chart.main.lines[i].branch}→${c.branch}），发动之爻得变爻生扶，力足事成。`, source: '《增删卜易·回头生》' })
    if (c.advanceRetreat?.type === '进神') items.push({ level: '吉', text: `${NUM[i]}爻化进神，事势进而增。`, source: '《增删卜易·进神》' })
    if (c.advanceRetreat?.type === '退神') items.push({ level: '凶', text: `${NUM[i]}爻化退神，事势退而减，主始勤终怠、得而复失。`, source: '《增删卜易·退神》' })
  }
  const broken = chart.main.lines.filter(l => l.monthBreak)
  if (broken.length) items.push({ level: '凶', text: `${broken.map(l => NUM[l.position - 1]).join('、')}爻月破，其象已损，主事已破、物已伤。`, source: '《增删卜易·月破》' })
  if (chart.main.palace.palace === chart.changed?.palace.palace) items.push({ level: '吉', text: '变卦不离本宫，事在自己掌握之内，不假外求。', source: '《易冒·八宫》' })
  else if (chart.changed) items.push({ level: '平', text: `变卦入${chart.changed.palace.palace}宫，事之外象转入他宫，主事体易手、外力参与。`, source: '《易冒·八宫》' })
  if (shi?.kong) items.push({ level: '平', text: '世爻逢空，主己心不定或事体未实，须待出空填实之期。', source: '《增删卜易·旬空》' })
  const storeLines = chart.main.lines.filter(l => l.isStore && l.moving)
  if (storeLines.length) items.push({ level: '关键', text: `${storeLines.map(l => NUM[l.position - 1]).join('、')}爻为四库（辰戌丑未）而发动，主事入库收藏：财入库存财、鬼入库主暗昧，应期多在水火墓库之月日。`, source: '《易隐·四库》《增删卜易·入墓》' })
  const horseLines = chart.main.lines.filter(l => l.isHorse && (l.shi || l.moving))
  if (horseLines.length) items.push({ level: '关键', text: `${horseLines.map(l => NUM[l.position - 1]).join('、')}爻临驿马${horseLines.some(l => l.moving) ? '而发动' : ''}，主出行、迁动、外来之事；静而临马，行意未决。`, source: '《易隐·驿马》' })
  const flowerLines = chart.main.lines.filter(l => l.isFlower && (l.moving || l.shi))
  if (flowerLines.length) items.push({ level: '平', text: `${flowerLines.map(l => NUM[l.position - 1]).join('、')}爻临桃花，主情色、交际、虚花之事。`, source: '《易隐·咸池》' })
  return { items, note: '以上每条皆出典籍明文；凡卦中无据之象，不作推断。' }
}

// —— 通俗总结（说人话）：口语表达，但每层判断仍由上述典籍条目支撑 ——
const TOPIC_SUBJECT = {
  父母: '所问的长辈、文书契约、房子车船、学业考试或庇护之力',
  兄弟: '所问的同辈、朋友、同事、竞争或合伙之事',
  子孙: '所问的子女晚辈、医药、宠物或解忧之事',
  妻财: '所问的钱财、货物、薪资、经营之利或妻妾女友',
  官鬼: '所问的官职功名、工作事业、丈夫、官司或疾病忧患',
}
const REL_VERB = { 父母: '文书、房子、学业', 兄弟: '同辈、合伙、竞争', 子孙: '子女、医药、解忧', 妻财: '钱财、货物、经营', 官鬼: '工作、官讼、疾病' }

function gradeYong(line) {
  if (!line) return null
  if (line.monthBreak || line.scores.total <= -4) return '无力'
  if (line.scores.total >= 5) return '有力'
  if (line.scores.total >= 1) return '尚可'
  return '偏弱'
}

function buildSummary(chart, yong) {
  const shi = chart.main.lines.find(l => l.shi)
  const paragraphs = []
  const advice = []
  const use = yong.use

  paragraphs.push(`你看的这一卦，主卦是「${chart.main.name}」${chart.changed ? `，动爻变出「${chart.changed.name}」` : '，六爻都不动'}，问的是${yong.topic ? `「${yong.topic}」` : '一件事'}。`)

  if (!use) {
    const graded = gradeYong(shi)
    const strength = graded === '有力' || graded === '尚可' ? '自身气势不弱' : '自身气势不足'
    return {
      title: strength,
      oneLine: `你没说具体问什么，所以只报盘面、不下吉凶结论。世爻代表你自己，这一卦里${strength}。`,
      paragraphs: paragraphs.concat([
        `要把话说实，请先告诉我所问何事——是问财、问工作、问文书房子、问考试、问病，还是问某个人。六爻断卦第一步就是"取用神"：不同的问事对应卦里不同的那一爻，取错了爻，后面全盘都错。`,
        `世爻（代表你自己）在${shi.positionName}${shi.relative}${shi.stem}${shi.branch}${shi.element}，旺衰评${shi.scores.total}分，属「${shi.scores.verdict}」${shi.kong ? '，而且逢旬空' : ''}${shi.monthBreak ? '，而且月破' : ''}。`,
      ]),
      advice,
      note: '以下每条结论都注明典籍出处；典籍没有明文的情形，我不作推断。',
    }
  }

  // 1) 当事人的状态
  const shiGrade = gradeYong(shi)
  const shiWord = {
    有力: `气势很足（月建日辰都帮它，旺衰评 ${shi.scores.total} 分）`,
    尚可: `气势还算可以（旺衰评 ${shi.scores.total} 分）`,
    偏弱: `气势偏弱（旺衰评 ${shi.scores.total} 分）`,
    无力: `气势很弱（旺衰评 ${shi.scores.total} 分）`,
  }[shiGrade]
  paragraphs.push(`世爻就是你。世爻在${shi.positionName}${shi.relative}${shi.stem}${shi.branch}${shi.element}，${shiWord}${shi.kong ? '，而且落在旬空里（心里没底、事情还没落到实处）' : ''}${shi.monthBreak ? '，而且被月建冲破（根基受损）' : ''}。`)

  // 2) 用神的状态
  const useLine = yong.lines.length ? (yong.lines.find(l => l.moving) ?? yong.lines[0]) : null
  const useGrade = gradeYong(useLine)
  const subject = TOPIC_SUBJECT[use]
  if (yong.notOnChart) {
    const h = yong.hidden[0]
    paragraphs.push(h
      ? `代表${subject}的那一爻（${use}）在卦里根本没出现，只能从本宫首卦里借出来看：它藏在${NUM[h.hideAt]}爻下面，是${h.stem}${h.branch}${h.element}。卦书上的话叫"用神不上卦"，意思是你问的这个人或这件事，眼下没有真正露面——可能是还没到位，也可能是你目前够不着。`
      : `代表${subject}的那一爻（${use}）在卦里完全找不到，本宫首卦里也没有。卦书讲"用神不上卦"，所问之人、事、物无一实体可依，主事无着落。`)
  } else if (useGrade === '有力' || useGrade === '尚可') {
    paragraphs.push(`代表${subject}的那一爻（${use}${useLine.stem}${useLine.branch}${useLine.element}）在${useLine.positionName}，${useGrade === '有力' ? '气势很旺——时机是站在这件事这一边的' : '底气尚在'}。`)
  } else {
    paragraphs.push(`代表${subject}的那一爻（${use}${useLine.stem}${useLine.branch}${useLine.element}）在${useLine.positionName}，但${useGrade === '无力' ? '气势很弱，时机不在它这一边' : '底气不足'}${useLine.kong ? '；又逢旬空，这件事本身是虚的' : ''}${useLine.monthBreak ? '；又逢月破，这件事已经受损' : ''}。`)
  }

  // 3) 动爻：事情怎么走
  if (!chart.changed) {
    paragraphs.push('六爻一个都没动，卦书叫"六爻安静"。意思是：眼下的局面不动，事情还得等——真要动，往往要等到日辰冲动某一爻、或轮到用神当值的日子才会有变化。所以这一卦更适合看趋势，不适合催结果。')
  } else {
    const bits = []
    for (const i of chart.moving) {
      const l = chart.main.lines[i]
      const c = l.changed
      const head = `${NUM[i]}爻（${l.relative}${l.stem}${l.branch}${l.element}）在动，变成了${c.relative}${c.stem}${c.branch}${c.element}`
      if (c.backControl) bits.push(`${head}——变出来的这一爻回头克它，等于事情动起来反而伤了自己，这是最不利的一种；`)
      else if (c.backGenerate) bits.push(`${head}——变出来的这一爻回头生它，等于越动越有帮手，这是最有利的一种；`)
      else if (c.advanceRetreat?.type === '进神') bits.push(`${head}，而且是朝着更进一步的方向变（化进神），势头在涨；`)
      else if (c.advanceRetreat?.type === '退神') bits.push(`${head}，而且是往回缩的方向（化退神），多半是开头热、后头冷；`)
      else if (c.selfGenerate) bits.push(`${head}，本爻去生变爻，等于自己在耗力气；`)
      else if (c.selfControl) bits.push(`${head}，本爻去克变爻，能压住，但也要费劲；`)
      else bits.push(`${head}；`)
    }
    paragraphs.push(`卦里有 ${chart.moving.length} 个爻在动，动的爻就是事情变化的地方：${bits.join('')}`)
  }

  // 4) 世与用神的关系
  const useEl = useLine?.element ?? (yong.hidden[0]?.element ?? null)
  if (useEl) {
    const relWord = GENERATES[useEl] === shi.element ? '它来生你——事情是往你这边靠的，属于"人来就我"，比较省力'
      : GENERATES[shi.element] === useEl ? '你去生它——得你主动去够、花力气，能成但费劲'
        : CONTROLS[useEl] === shi.element ? '它来克你——这事对你本身有压力甚至损害，求之反而受其累'
          : CONTROLS[shi.element] === useEl ? '你能克它——主动权在你手里，只要肯使力就能拿下'
            : '你俩同气——属于同求相合、彼此好商量'
    paragraphs.push(`再看它和你的关系：${relWord}。`)
  }

  // 5) 吉凶判断
  const strong = useGrade === '有力' || useGrade === '尚可'
  const backControl = chart.moving.some(i => chart.main.lines[i].changed?.backControl)
  const backGenerate = chart.moving.some(i => chart.main.lines[i].changed?.backGenerate)
  const useBackControl = useLine && chart.moving.includes(useLine.position - 1) && useLine.changed?.backControl
  const useBackGenerate = useLine && chart.moving.includes(useLine.position - 1) && useLine.changed?.backGenerate
  const retreat = chart.moving.some(i => chart.main.lines[i].changed?.advanceRetreat?.type === '退神')

  let oneLine
  let title
  if (yong.notOnChart) {
    title = '主体不现，事无着落'
    oneLine = `你问的这件事（${REL_VERB[use]}），卦里连它的影子都没有——现在还不具备谈成的实体条件，宜先等它露面，别急着下注。`
    advice.push('先把"对象"落实：人未到、事未起、物未定，这种情况下任何结论都是空的。')
    advice.push('留意伏神所在爻位对应的日子（' + (yong.hidden[0] ? `${NUM[yong.hidden[0].hideAt]}爻` : '本宫首卦') + '），伏神透出的日子往往是事情才有转机的时候。')
  } else if (!strong) {
    title = '用神无力，事难成'
    oneLine = `就眼下这时候看，这件事（${REL_VERB[use]}）不容易成：代表它的那一爻没有气力，时机不在你这边。`
    advice.push('别在当下硬推，先把根基养起来——等它转到旺相、值日、出空的时段再动。')
    if (useLine?.kong) advice.push('它现在逢空，等"出空"或者被日辰冲实的时候才有实质进展。')
    if (useLine?.monthBreak) advice.push('它已经被月建冲破，说明这件事本身已经受损，多半要另起炉灶。')
  } else if (useBackControl) {
    title = '事本可为，动则自伤'
    oneLine = `底子是好的——那一爻本身旺，但偏偏是它自己发动、又被变出来的爻回头克，等于一动就伤自己。这一卦的重点不是"能不能"，而是"别在这个时候动"。`
    advice.push('这一爻不动的时候是好事，一动就坏事——所以问题出在"动"上，坐得住比出手强。')
    advice.push('若非动不可，避开它值日、逢冲的那几天。')
  } else if (backControl) {
    title = '有阻，但不在主体'
    oneLine = '你所问的那一爻本身有气力，坏在别的爻发动以后回头受克——是旁生枝节拖累，不是事情本身不行。'
    advice.push('找出那个"回头受克"的爻代表谁、代表哪一环，先把那一环处理掉。')
  } else if (retreat) {
    title = '先热后冷'
    oneLine = '势头是有的，但动爻化退——开头看着热闹，往后会一路减下去，属于"始勤终怠、得而复失"的类型。'
    advice.push('要办就趁早，它往后是走下坡的。')
  } else if (backGenerate) {
    title = '越动越顺'
    oneLine = '用神有气力，动爻又化回头生——这件事越推进越有帮手，是能成的格局。'
    advice.push('放心推进，主动一些反而更好。')
  } else if (useGrade === '有力') {
    title = '成算较大'
    oneLine = `就卦上看，这件事（${REL_VERB[use]}）成的机会大：代表它的那一爻正当旺，月建日辰都帮着它。`
    advice.push('时机在你这边，可以着手办，不必再等。')
  } else {
    title = '可成，但需着力'
    oneLine = `这件事（${REL_VERB[use]}）能办，但不算轻松：那一爻底气尚在，却谈不上旺，得你自己出力去够。`
    advice.push('别指望顺水推舟，主动争取才有可能。')
  }

  if (shi.kong && !yong.notOnChart) advice.push('你自己（世爻）逢空，说明你心里还没定下来，或者事体还没坐实——先把自己的主意定死，再谈成败。')
  if (chart.trines.some(t => t.kind === '三合局')) advice.push('卦里已合成三合局，力量攒到一处了，这时候的推动会格外明显。')
  else if (chart.trines.some(t => t.kind.includes('半合'))) advice.push('卦里有半合、差一支——机会要等"缺的那一支"到位才真正成形，可以据此推应期。')

  return {
    title,
    oneLine,
    paragraphs,
    advice,
    note: '上面的每一层判断都对应卦里的具体某一爻、某个生克关系，前面的条文写了它们的出处；典籍没有明文的地方，我不编。',
  }
}

export { SIX_RELATIVES }
