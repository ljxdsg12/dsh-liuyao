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

// 上下文指代：回指本卦本身（含"卦"或"爻"）通常表示"接着这一卦问"
const FOLLOW_UP_HINTS = ['这卦', '这一卦', '此卦', '本卦', '卦里', '卦中', '卦上', '此爻', '这一爻', '该爻', '此位', '上面', '刚才', '前面']
const DEIXIS_WORDS = ['这', '此', '该', '那', '它', '其']
const FOLLOW_UP_PATTERNS = [/什么时候/, /何时/, /多久/, /怎么(讲|说|看|理解)/, /是不是/, /有没有/, /能不能/, /什么意思/, /为何/, /为什么/]
const OUT_OF_SCOPE_HINTS = [
  '另一个卦', '再起一卦', '重新起卦', '换一个卦', '别的卦', '另外的卦', '帮我起卦', '再来一卦',
  '起一卦', '起个卦', '起卦看', '起卦问',
]

// 事项域词表：把所问之事归入一个"域"，追问只要落在同域即算相关。
// 这样「问财运」之下问「什么事导致破财」能被接受——不必点到具体爻。
// 注意：这是关键词近似，不是语义理解；所以域内判定的结论是"放行交给模型"，
// 而非"断定相关"。模型侧另有一道可拒绝的约束（见 buildAskSystemPrompt）。
const TOPIC_DOMAINS = {
  财: ['财', '钱', '破财', '进财', '收入', '工资', '薪', '利', '利润', '收益', '亏', '赚', '赔', '投资', '股票', '基金', '买卖', '生意', '客户', '订单', '债务', '欠款', '借', '还', '款', '价', '成本', '开销', '花费', '资金', '周转', '中奖', '彩票', '货款', '租金', '分红', '回本', '本金', '盈利', '亏损', '现金流'],
  事业: ['事业', '工作', '职', '升', '升迁', '调动', '跳槽', '离职', '辞职', '面试', '求职', '应聘', '领导', '上司', '老板', '同事', '下属', '公司', '单位', '项目', '业绩', '考核', '绩效', '编制', '公务员', '考试', '创业', '开业', '合伙'],
  考试: ['考试', '考', '成绩', '分数', '录取', '上岸', '资格', '证书', '论文', '答辩', '学位', '入学', '择校', '升学'],
  婚姻: ['婚', '姻缘', '感情', '结婚', '离婚', '复婚', '恋爱', '对象', '男友', '女友', '男朋友', '女朋友', '丈夫', '妻', '老婆', '老公', '配偶', '相亲', '出轨', '外遇', '分手', '复合', '吵架', '婆媳', '夫妻', '对方', '另一半', '追求', '表白', '暧昧'],
  健康: ['病', '疾', '健康', '身体', '疼', '痛', '手术', '治', '医', '药', '住院', '康复', '复发', '癌', '怀孕', '生育', '体检'],
  官讼: ['官司', '诉讼', '起诉', '被告', '原告', '律师', '法院', '判决', '判', '纠纷', '仲裁', '报警', '案件', '牢', '看守所', '胜诉', '败诉', '开庭'],
  出行: ['出行', '远行', '搬家', '迁移', '旅', '签证', '机票', '车', '船', '航班', '行程', '路', '堵'],
  房产: ['房', '楼', '宅', '屋', '租', '买', '卖', '装修', '物业', '地块', '门面', '铺面', '搬迁'],
  人际: ['朋友', '同学', '同事', '人际', '关系', '小人', '贵人', '合伙', '合作', '介绍', '委托', '托付', '拜托'],
  子女: ['子女', '孩子', '儿女', '儿子', '女儿', '孙', '怀孕', '胎', '学业', '成长', '叛逆'],
  失物: ['失物', '丢', '丢东西', '找', '寻', '被偷', '被盗', '遗失'],
}

/** 取文本命中的全部事项域。 */
function domainsOf(text) {
  const hit = new Set()
  for (const [name, words] of Object.entries(TOPIC_DOMAINS)) {
    for (const w of words) {
      if (text.includes(w)) { hit.add(name); break }
    }
  }
  return hit
}

/**
 * 判定追问是否属于本卦范围。
 * 判定顺序（宽严递降）：
 *   ① 明确要另起一卦 → 拒
 *   ② 点到卦中术语（爻、用神、应期…）→ 放行
 *   ③ 与「所问之事」同事项域 → 放行（这是主要的放宽点：不必点到具体爻）
 *   ④ 顺着本卦的指代/疑问句式 → 放行
 *   ⑤ 其余 → 拒
 *
 * @param {string} question 追问内容
 * @param {string} [topic] 本卦所问之事；给了才能做同域判定
 * @returns {{inScope: boolean, reason: string, kind: string}}
 */
export function checkScope(question, topic = '') {
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

  // 与所问之事同域：如「问财运」之下问「什么事导致破财」，不必点到具体爻
  const t = String(topic ?? '').trim()
  if (t) {
    const topicDomains = domainsOf(t)
    const qDomains = domainsOf(q)
    const shared = [...qDomains].filter(d => topicDomains.has(d))
    if (shared.length > 0) {
      return {
        inScope: true,
        reason: `追问仍属本卦所问之事（${shared.join('、')}），交模型依本卦爻象解读。`,
        kind: 'topic-domain',
      }
    }
  }

  // 顺着本卦追问：明确回指本卦，或为"那它什么时候…"这类指代＋疑问句
  const refersToChart = q.includes('卦') || q.includes('爻')
  const hasDeixis = DEIXIS_WORDS.some(t => q.includes(t))
  const isQuestionShape = FOLLOW_UP_PATTERNS.some(re => re.test(q))
  if (q.length <= 30 && ((refersToChart && (hasDeixis || isQuestionShape)) || (hasDeixis && isQuestionShape))) {
    return { inScope: true, reason: '顺着本卦的追问。', kind: 'followup' }
  }
  return {
    inScope: false,
    reason: '一卦一断：请只问与本次所问之事相关的问题（例如问财运时，问「什么原因导致破财」「什么时候能有转机」都算相关）。要问别的事，请另起一卦。',
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
    `一、本次所问之事是：「${topic || '（用户未注明所问之事）'}」。`,
    '二、凡是与这件事**同一个问题域**的追问，都要尽力依本卦作答——例如问财运时，问「什么原因导致破财」「钱什么时候能回来」「该往哪个方向解」都算同域，**不要求用户点到具体爻**，由你自己去卦里找对应之处。',
    '三、只有当问题**确实偏离到另一件事**（如问财运却问婚姻），或**卦上确实没有依据**时，才拒绝；拒绝时明确说出理由，并提示另起一卦。不要因为用户没提到"卦""爻"这类字眼就拒答。',
    '四、只依据下面给出的卦象作答。卦里没有的信息，不得凭空编造；凡典籍无明文依据的推断，不得输出。',
    '五、结论要落到具体爻位上（第几爻、什么六亲、什么干支、什么生克关系），并注明典籍出处（如《增删卜易·回头克》）。',
    '六、不得使用"心诚则灵""顺其自然""注意沟通"一类无信息量的套话，不得迎合提问者的期待而改变原有判断；',
    '　　卦凶即言凶，并说明凶在何爻、因何而凶、何时可解。',
    '七、若卦中确实无据可断，直接说明"这一点卦上没有依据，不能断"，不要勉强作答。',
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
