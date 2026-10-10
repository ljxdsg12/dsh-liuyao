// AI 断卦：提示词构造与输出约束
//
// 设计原则（与规则引擎的分工）：
//   · 盘面事实由 engine.mjs 算出，作为"不可篡改的事实"写进提示词——AI 不重算干支六亲，
//     否则它会把甲子写成甲丑，而这种错误用户看不出来。
//   · AI 只负责：依典籍规则推理、按所问之事取用神、综合判断、用自然语言表达。
//   · 典籍原则写进提示词，并要求逐条注明出处；无据者须声明不作推断，不许编造出处。
//   · 输出用受限 Markdown（见 FORMAT_RULES），便于客户端做结构化渲染而不是一坨纯文本。

/** 把盘面压成紧凑文本：AI 的唯一事实来源。 */
export function buildChartFacts(chart, topic) {
  const POS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
  const p = chart.pillars
  const L = []

  L.push(`起卦时间：${chart.solar.text}`)
  L.push(`四柱：${p.year.text}年 ${p.month.text}月 ${p.day.text}日 ${p.hour.text}时`)
  L.push(`旬空：${chart.kong.empty.join('')}`)
  L.push(`月建五行：${chart.monthElement}　日辰五行：${chart.dayElement}`)
  L.push(`所问之事：${topic ? topic : '（求测者未注明）'}`)
  L.push('')
  L.push(`主卦：${chart.main.name}（${chart.main.palace.palace}宫·${chart.main.palace.stageName}，`
    + `世在${POS[chart.main.palace.shi - 1]}，应在${POS[chart.main.palace.ying - 1]}）`)
  L.push(chart.changed
    ? `变卦：${chart.changed.name}（${chart.changed.palace.palace}宫）`
    : '变卦：无（六爻安静，无动爻）')
  L.push('')
  L.push('六爻（自初爻至上爻）：')
  chart.main.lines.forEach((l, i) => {
    const parts = [
      POS[i],
      l.god,
      `${l.relative}${l.stem}${l.branch}${l.element}`,
      `纳音${l.nayin?.name ?? '—'}`,
      `月建${l.state}`,
      l.stage ? `长生${l.stage}` : '',
      l.moving ? `发动（${l.value === 9 ? '老阳' : '老阴'}）` : '安静',
    ].filter(Boolean)
    if (l.shi) parts.push('世爻')
    if (l.ying) parts.push('应爻')
    if (l.kong) parts.push('旬空')
    if (l.monthBreak) parts.push('月破')
    if (l.dayClash) parts.push('日冲')
    if (l.dayBreak) parts.push('日破')
    if (l.monthHarmony) parts.push('月合')
    if (l.dayHarmony) parts.push('日合')
    if (l.isHorse) parts.push('驿马')
    if (l.isFlower) parts.push('桃花')
    parts.push(`旺衰${l.scores.total}分（${l.scores.verdict}）`)
    if (l.changed) {
      const c = l.changed
      const marks = [
        `化${c.relative}${c.stem}${c.branch}${c.element}`,
        c.state,
        c.advanceRetreat ? c.advanceRetreat.type : '',
        c.backGenerate ? '回头生' : '',
        c.backControl ? '回头克' : '',
        c.kong ? '化空' : '',
        c.monthBreak ? '化破' : '',
      ].filter(Boolean)
      parts.push(`→ ${marks.join('·')}`)
    }
    const hid = (l.hiddenSpirits ?? [])[0]
    if (hid) parts.push(`此爻下伏${hid.relative}${hid.stem}${hid.branch}${hid.element}`)
    L.push('　' + parts.join('　'))
  })

  if (chart.trines?.length) {
    L.push('')
    L.push(`合局：${chart.trines.map(t => t.detail ?? JSON.stringify(t)).join('；')}`)
  }
  if (chart.absentRelatives?.length) {
    L.push(`不上卦的六亲：${chart.absentRelatives.join('、')}`)
  }
  return L.join('\n')
}

/** 输出格式约束：受限 Markdown，客户端据此做结构化渲染。 */
const FORMAT_RULES = `【输出格式】严格用下面这几种行，不要用其他 Markdown 语法（不要表格、不要代码块、不要加粗）：

## 用神取用
（一段说明：据所问之事取何六亲为用神，依何典籍；若求测者未注明所问之事，说明缺什么信息、你无法取用神，然后停止断吉凶，只讲盘面）

## 用神旺衰
（一段说明：用神在月建、日辰下的旺相休囚，十二长生处于何地，有无旬空月破日冲，逢生逢克）

## 动爻与变爻
（一段说明：何爻发动、化出何爻、化进还是化退、有无回头生克、动爻对用神是生是克）

## 六神取象
（一段说明：用神与世应所临六神各自的取象意义）

## 世应关系
（一段说明：世爻代表求测者自身，应爻代表对方或事体，二者生克合冲与世应旺衰）

## 综合判断
（一段到两段：把上面各项统合，判定事情的成与不成、迟与速）

## 结论清单
- [吉] 结论一条〔《典籍·篇名》〕
- [凶] 结论一条〔《典籍·篇名》〕
- [中] 结论一条〔《典籍·篇名》〕

## 通俗总结
（两到四段白话：先说结论，再解释为什么会这样，最后给"怎么办"的建议。
 不许用"仅供参考""把握机会""保持乐观"这类套话，要具体到这一卦的哪一爻、哪一个字。）

其中「结论清单」每行必须以 "- [吉] "、" - [凶] " 或 "- [中] " 开头，每条末尾用〔《书名·篇名》〕注明出处。`

/** 断卦的系统提示词。 */
export function buildAnalysisSystemPrompt({ chartFacts, topic, yongshenHint, strictCitation }) {
  const L = []

  L.push('你是一位依典籍断卦的六爻纳甲分析师。你的任务是依下面给出的盘面，对求测者所问之事作出判断。')
  L.push('')
  L.push('【最重要的约束】')
  L.push('1. 盘面是已经算好的事实：干支、纳音、六亲、六神、世应、旬空、月破、长生、旺衰评分都已核定，你不得改动任何一字，也不得另行推算干支或六亲。')
  L.push('2. 只依据给定盘面推理，不得引入盘面里没有的信息（不得虚构动爻、不得虚构变卦）。')
  L.push('3. 断语必须有典籍依据，并注明出处；典籍无明文可据者，明确写出「此象典籍无明文，不作推断」，绝不编造出处，也绝不硬下吉凶。')
  L.push('4. 不许迎合：不因求测者语气而偏向吉或凶。凶就是凶，成不了就说成不了。')
  L.push('5. 不许使用"仅供参考""心诚则灵""保持乐观""把握机会"这类套话；每一句都要落在这一卦的具体爻、具体字上。')
  if (strictCitation) {
    L.push('6. 当前为严格模式：凡你不能确指典籍篇目的判断，一律不写。宁可少断，不可妄断。')
  }

  L.push('')
  L.push('【盘面事实】')
  L.push(chartFacts)

  if (yongshenHint) {
    L.push('')
    L.push('【用神参考】')
    L.push(yongshenHint)
    L.push('（这是按关键词匹配得到的参考。若所问之事的语义与之不符，你可以改取用神，但须说明理由。）')
  }

  L.push('')
  L.push('【断卦法则（依下列典籍，逐条对应盘面）】')
  L.push('· 取用神（《增删卜易·用神章》）：先定所问之事，再配六亲。父母主文书、房屋、车船、长辈、学业；兄弟主同辈、朋友、竞争、破财；子孙主子女、下属、医药、解忧、福神；妻财主钱财、货物、器具、妻室（男占）；官鬼主功名、官职、官司、疾病、盗贼、丈夫（女占）。')
  L.push('· 用神两现（《增删卜易·两现章》）：舍静取动、舍衰取旺、舍空取实、舍破取完；世应之内者先取。')
  L.push('· 用神不上卦（《增删卜易·伏神章》）：于本宫首卦借伏神，伏神得日月生扶、或飞神生伏、或伏神临日月，皆为有用；伏神休囚又受飞神克，则事无所依。')
  L.push('· 旺衰（《卜筮正宗·月建日辰》）：月建为提纲，日辰为主宰。旺相者得令得时，休囚者失令无力。日辰能生能克能合能冲，其力重于月建。')
  L.push('· 十二长生（《三命通会》）：以用神五行对月日地支，察长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养，以定气之盛衰。')
  L.push('· 空亡（《增删卜易·旬空》）：用神空亡则事不实、人多虚；动而空者待出空之日，静而空者终成虚耗；世空则己心不实，应空则彼意不诚。')
  L.push('· 月破（《增删卜易·月破》）：爻逢月破，其象已损，主事已破、物已伤；惟动而破者，出月可补。')
  L.push('· 六冲六合（《增删卜易·六冲》《增删卜易·六合》）：六冲主散、主速、主变动；六合主成、主缓、主羁绊。冲中逢合、合处逢冲，皆有转机或变卦。')
  L.push('· 动变（《增删卜易·动变章》）：动爻为事之机，变爻为事之归。化进神（《增删卜易·进神》）则事进，化退神（《增删卜易·退神》）则事退；回头生则吉，回头克则凶（《增删卜易·回头生》《增删卜易·回头克》）；化空、化破、化墓，皆减其力。')
  L.push('· 原神忌神仇神（《增删卜易·原神章》《忌神章》《仇神章》）：生用神者为原神，克用神者为忌神，克原神者为仇神。原神旺则事有成，忌神旺则事有阻。')
  L.push('· 六神取象（《卜筮正宗·六神篇》《增删卜易·六神》）：青龙主喜庆财禄，朱雀主口舌文书，勾陈主田土牵连，螣蛇主虚惊怪异，白虎主凶伤疾病，玄武主暗昧盗骗。以日干起例，随爻而见。')
  L.push('· 世应（《黄金策·世应》《卜筮正宗·世应动静》）：世为己，应为彼。世应相生相合则彼此同心，世应相冲相克则各怀异志；世空己不实，应空彼无诚。')
  L.push('· 纳音（《易隐·纳音》《火珠林·纳音》）：纳音同气则相助，相生则相扶，相克则相损。')
  L.push('· 反吟伏吟（《增删卜易·反吟》《增删卜易·伏吟》）：反吟主反覆变动，伏吟主呻吟忧滞。')
  L.push('· 应期（《增删卜易》）：静而逢冲之日、动而逢合之辰、旬空待出空、月破待填实，皆可为事之应期。')
  L.push('· 老阳老阴（《火珠林·老阳老阴》）：老阳发动主变，老阴发动亦主变；无老阳则无动爻，主事体迟而未动。')

  L.push('')
  L.push(FORMAT_RULES)

  return L.join('\n')
}

/** 无法调用模型时的提示（界面上照实说明，不假装算过）。 */
export function noModelNotice() {
  return '本机未挂载可用的模型服务（llm），无法生成 AI 断卦。'
    + '请确认已配置模型，或在插件配置里指定 provider 与 model。'
}

/** 从模型输出里抽出一个简短的标题，用于结果卡片抬头。 */
export function extractHeadline(text) {
  const m = /##\s*通俗总结\s*\n+([^\n]{4,60})/.exec(text)
  if (m) return m[1].trim()
  const first = text.split('\n').map(s => s.trim()).find(s => s.length > 0 && !s.startsWith('#'))
  return first ? first.slice(0, 40) : ''
}
