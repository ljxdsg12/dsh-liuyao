// 一卦一断：追问的作用域判定与提示词构造
// 原则（见 skills/liuyao-divination.md）：同一卦只答所问之事，不借题发挥到其他领域。
// 两道关卡：① 本模块的确定性作用域判定（不依赖模型，可测）；② 交给模型的系统提示词约束。

// 卦内词汇：命中任一即视为与本卦相关
export const IN_SCOPE_TERMS = [
  // 六亲
  '父母', '兄弟', '子孙', '妻财', '官鬼', '六亲',
  // 爻位与结构
  '世爻', '应爻', '世应', '本卦', '变卦', '主卦', '动爻', '静爻', '初爻', '二爻', '三爻', '四爻', '五爻', '上爻',
  '卦身', '卦宫', '本宫', '游魂', '归魂', '六冲', '六合', '反吟', '伏吟',
  // 术语
  '用神', '原神', '忌神', '仇神', '旺相', '休囚', '旺衰', '长生', '帝旺', '入墓', '墓库', '四库', '驿马', '桃花',
  '旬空', '空亡', '出空', '月破', '日破', '日辰', '月建', '太岁', '六神', '青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武',
  '纳音', '伏神', '飞神', '进神', '退神', '回头生', '回头克', '化进', '化退', '化空', '生克', '三合', '三会', '半合',
  '卦象', '爻辞', '卦辞', '应期', '流年', '月令',
  // 与所问相关的通常表述
  '这一卦', '这卦', '此卦', '本卦', '上面', '刚才', '前面', '卦里', '卦中', '爻上',
]

// 上下文指代：必须回指本卦本身（含"卦"或"爻"），才算"接着这一卦问"。
// 否则"我明天该不该跟老板吵架"这类短句会被误判为追问。
const FOLLOW_UP_HINTS = ['这卦', '这一卦', '此卦', '本卦', '卦里', '卦中', '卦上', '此爻', '这一爻', '该爻', '此位', '上面', '刚才', '前面']
const DEIXIS_WORDS = ['这', '此', '该', '那', '它', '其']
const FOLLOW_UP_PATTERNS = [/什么时候/, /何时/, /多久/, /怎么(讲|说|看|理解)/, /是不是/, /有没有/, /能不能/, /什么意思/, /为何/, /为什么/]
const OUT_OF_SCOPE_HINTS = [
  '另一个卦', '再起一卦', '重新起卦', '换一个卦', '别的卦', '另外的卦', '帮我起卦', '再来一卦',
]

/**
 * 判定追问是否属于本卦范围。
 * @returns {{inScope: boolean, reason: string, kind: 'term'|'followup'|'too-short'|'other-casting'|'unrelated'}}
 */
export function checkScope(question) {
  const q = String(question ?? '').trim()
  if (q.length === 0) return { inScope: false, reason: '问题为空。', kind: 'too-short' }
  if (q.length < 2) return { inScope: false, reason: '问题太短，请把要问的话说完整。', kind: 'too-short' }

  if (OUT_OF_SCOPE_HINTS.some(t => q.includes(t))) {
    return {
      inScope: false,
      reason: '一卦一断：本卦只管这一次所问之事，不能借它去断另一件事。要问新的事，请另起一卦。',
      kind: 'other-casting',
    }
  }
  if (IN_SCOPE_TERMS.some(t => q.includes(t))) {
    return { inScope: true, reason: '问到卦中具体爻象与术语，属本卦范围。', kind: 'term' }
  }
  // 顺着本卦追问：必须明确回指本卦（含"卦/爻"），或为"那它什么时候…"这类指代＋疑问句
  const refersToChart = q.includes('卦') || q.includes('爻')
  const hasDeixis = DEIXIS_WORDS.some(t => q.includes(t))
  const isQuestionShape = FOLLOW_UP_PATTERNS.some(re => re.test(q))
  if (q.length <= 30 && ((refersToChart && (hasDeixis || isQuestionShape)) || (hasDeixis && isQuestionShape))) {
    return { inScope: true, reason: '顺着本卦的追问。', kind: 'followup' }
  }
  return {
    inScope: false,
    reason: '一卦一断：请只问与本次所问之事相关的问题，并尽量点到卦里的具体爻（如"三爻妻财动而化克，是不是说钱留不住？"）。',
    kind: 'unrelated',
  }
}

const POS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

/** 把排盘与断卦结果压成一段可嵌进提示词的紧凑文本。 */
export function chartContext(chart, analysis, topic) {
  const p = chart.pillars
  const L = []
  L.push(`【起卦时间】${chart.solar.text}（${chart.pillars.year.text}年 ${p.month.text}月 ${p.day.text}日 ${p.hour.text}时，旬空${chart.kong.empty.join('')}）`)
  L.push(`【所问之事】${topic ? topic : '（未注明）'}`)
  L.push(`【卦】主卦 ${chart.main.name}（${chart.main.palace.palace}宫${chart.main.palace.stageName}，世${POS[chart.main.palace.shi - 1]}应${POS[chart.main.palace.ying - 1]}）`
    + (chart.changed ? ` → 变卦 ${chart.changed.name}（${chart.changed.palace.palace}宫）` : '（六爻安静）'))
  L.push('【六爻】自初爻至上爻：')
  chart.main.lines.forEach((l, i) => {
    const bits = [`${POS[i]}`, l.god, `${l.relative}${l.stem}${l.branch}${l.element}`, `纳音${l.nayin?.name ?? '—'}`,
      `${l.state}`, l.stage ?? '', l.moving ? `发动（${l.value === 9 ? '老阳' : '老阴'}）` : '安静']
    if (l.shi) bits.push('世')
    if (l.ying) bits.push('应')
    if (l.kong) bits.push('旬空')
    if (l.monthBreak) bits.push('月破')
    if (l.dayClash) bits.push('日冲')
    if (l.isHorse) bits.push('驿马')
    if (l.isFlower) bits.push('桃花')
    bits.push(`旺衰${l.scores.total}分/${l.scores.verdict}`)
    if (l.changed) {
      const c = l.changed
      bits.push(`化${c.relative}${c.stem}${c.branch}${c.element}（${c.state}`
        + (c.advanceRetreat ? '·' + c.advanceRetreat.type : '')
        + (c.backGenerate ? '·回头生' : '')
        + (c.backControl ? '·回头克' : '')
        + (c.kong ? '·化空' : '')
        + (c.monthBreak ? '·化破' : '') + '）')
    }
    const hid = (l.hiddenSpirits ?? [])[0]
    if (hid) bits.push(`下伏${hid.relative}${hid.stem}${hid.branch}${hid.element}`)
    L.push('　' + bits.join('　'))
  })
  if (chart.trines?.length) L.push(`【合局】${chart.trines.map(t => t.detail).join('；')}`)
  const y = analysis?.yongshen
  if (y?.use) {
    L.push(`【用神】${y.use}——${y.rule ?? ''}`)
    if (y.notOnChart) L.push(`　用神不上卦，伏神：${y.hidden.join('、') || '本宫首卦亦无'}`)
    else L.push(`　现于：${y.onLines.join('、')}`)
  } else {
    L.push('【用神】未注明所问之事，尚未取用神。')
  }
  if (analysis?.verdict?.items?.length) {
    L.push('【已下结论】')
    for (const it of analysis.verdict.items) L.push(`　[${it.level}] ${it.text}`)
  }
  const sum = analysis?.summary
  if (sum) L.push(`【通俗总结】${sum.title}：${sum.oneLine}`)
  return L.join('\n')
}

/**
 * 追问的系统提示词：把模型严格限制在本卦之内。
 */
export function buildAskSystemPrompt({ chartText, topic, questionCount, maxQuestions }) {
  return [
    '你是六爻断卦的助手，正在为**同一个卦**做追问答疑。严格遵守以下规则，违者视为无效回答。',
    '',
    '一、一卦一断：只回答与本次所问之事直接相关的问题。',
    `二、本次所问之事是：「${topic || '（用户未注明所问之事）'}」。任何偏离此事的提问，一律拒答，并提示用户另起一卦。`,
    '三、只依据下面给出的卦象作答。卦里没有的信息，不得凭空编造；凡典籍无明文依据的推断，不得输出。',
    '四、每条结论都要落到具体爻位上（第几爻、什么六亲、什么干支、什么生克关系），并注明典籍出处（如《增删卜易·回头克》）。',
    '五、不得使用"心诚则灵""顺其自然""注意沟通"一类无信息量的套话，不得迎合提问者的期待而改变原有判断；',
    '　　卦凶即言凶，并说明凶在何爻、因何而凶、何时可解。',
    '六、若用户的问题超出本卦范围，或卦中确实无据可断，直接说明"这一点卦上没有依据，不能断"，不要勉强作答。',
    `七、用通俗的中文回答，先给一句结论，再讲依据；长度控制在 300 字以内。`,
    maxQuestions ? `八、本卦已追问 ${questionCount} 次（上限 ${maxQuestions} 次），请勿重复前面的答复。` : '',
    '',
    '===== 本次卦象（只此一卦，不得引入其他卦） =====',
    chartText,
    '===== 卦象结束 =====',
  ].filter(Boolean).join('\n')
}

/**
 * 与卦象无关时的固定答复（不消耗模型调用）。
 */
export function refusalText(check) {
  return [
    '【一卦一断】',
    check.reason,
    '',
    '本卦所问之事已在上面给出解读；与它无关的事，请另起一卦再问。',
  ].join('\n')
}

/** 解析流式响应里的文本增量。 */
export function extractTextDelta(chunk) {
  if (!chunk || typeof chunk !== 'object') return ''
  if (chunk.type === 'text-delta' && typeof chunk.text === 'string') return chunk.text
  if (chunk.type === 'block-end' && chunk.block?.type === 'text' && typeof chunk.block.text === 'string') return ''
  return ''
}
