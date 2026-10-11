// 一卦一断：追问的提示词构造与拒答文案
// 原则（见 skills/liuyao-divination.md）：同一卦只答所问之事，不借题发挥到其他领域。
//
// 判定方式：作用域由模型依语义自行判断，宿主侧不再做关键词/事项域裁定。
// 原因：关键词判定无法理解语义——曾把「问财运」之下的「什么原因导致破财」误判为越界。
// 宿主只保留与语义无关的机械性拦截（空/过短、追问次数上限），见 lib/index.js。

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
    `一、本次所问之事是：「${topic || '（用户未注明所问之事）'}」。`,
    '二、判断这道追问该不该答、该从卦里哪一处作答，都由你依据语义自行判断——不要因为用户没提到"卦""爻"这些字眼就拒答。',
    '三、凡与所问之事**同一个问题域**的追问都要作答。例如问财运时，「什么原因导致破财」「钱什么时候能回来」「该往哪个方向解」都算同域；问事业时，「什么时候有升迁机会」「面试能不能过」都算同域。这类问题由你自己到卦里找出对应之处来解读。',
    '四、只有以下两种情形才拒答，且拒答时**必须以「【一卦一断】」四字加方括号开头**，再说明理由并提示另起一卦：',
    '　　（1）问题确实偏离到另一件事（如问财运却问婚姻）；',
    '　　（2）卦上确实没有依据可断。',
    '五、只依据下面给出的卦象作答。卦里没有的信息，不得凭空编造；凡典籍无明文依据的推断，不得输出。',
    '六、结论要落到具体爻位上（第几爻、什么六亲、什么干支、什么生克关系），并注明典籍出处（如《增删卜易·回头克》）。',
    '七、不得使用"心诚则灵""顺其自然""注意沟通"一类无信息量的套话，不得迎合提问者的期待而改变原有判断；',
    '　　卦凶即言凶，并说明凶在何爻、因何而凶、何时可解。',
    '八、用通俗的中文回答，先给一句结论，再讲依据；长度控制在 300 字以内。',
    '九、排版严禁：不得用 * 或 ** 包裹文字（不许加粗、不许斜体），不得用 # 号，不得加反引号或表情图标，也不得自造「结论：」「依据：」「应期：」这类小标题——直接连着写即可。',
    maxQuestions ? `十、本卦已追问 ${questionCount} 次（上限 ${maxQuestions} 次），请勿重复前面的答复。` : '',
    '',
    '===== 本次卦象（只此一卦，不得引入其他卦） =====',
    chartText,
    '===== 卦象结束 =====',
  ].filter(Boolean).join('\n')
}

/**
 * 宿主侧拒答文案（仅用于与语义无关的机械性拦截：空/过短、次数上限）。
 * 语义性的越界判定已交给模型，模型拒答时须以 REFUSAL_MARK 开头。
 */
export const REFUSAL_MARK = '【一卦一断】'

export function refusalText(check) {
  return [
    REFUSAL_MARK,
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
