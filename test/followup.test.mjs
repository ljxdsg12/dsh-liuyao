// 一卦一断：作用域判定、提示词约束、上下文构造
import { checkScope, chartContext, buildAskSystemPrompt, refusalText } from '../src/followup.mjs'
import { buildChart } from '../src/engine.mjs'
import { analyze } from '../src/analysis.mjs'

let fail = 0
const check = (ok, label, extra = '') => {
  if (ok) console.log(`✓ ${label}`)
  else { fail += 1; console.log(`✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}

console.log('--- 作用域判定：应当放行 ---')
const allow = [
  '三爻妻财动而化回头克，是不是说钱留不住？',
  '世爻逢空是什么意思？',
  '应期大概在什么时候？',
  '用神两现，取哪一个？',
  '这个卦里父母爻在哪？',
  '六神里螣蛇临妻财，是不是主虚惊？',
  '那它什么时候能出空？',
  '此卦变卦入他宫怎么讲？',
  '月破是不是就没救了？',
]
for (const q of allow) {
  const r = checkScope(q)
  check(r.inScope === true, `放行「${q}」`, `${r.kind} / ${r.reason}`)
}

console.log('--- 作用域判定：应当拦下 ---')
const deny = [
  ['', 'too-short'],
  ['嗯', 'too-short'],
  ['再起一卦问问我的婚姻', 'other-casting'],
  ['帮我起卦看看明天股票', 'other-casting'],
  ['我明天该不该跟老板吵架', 'unrelated'],
  ['今天天气怎么样', 'unrelated'],
  ['帮我写一段 Python 代码', 'unrelated'],
]
for (const [q, kind] of deny) {
  const r = checkScope(q)
  check(r.inScope === false, `拦下「${q.slice(0, 18)}」`)
  check(r.kind === kind, `　归类为 ${kind}`, r.kind)
  check(r.reason.includes('一卦一断') || r.reason.includes('太短') || r.reason.includes('为空'), '　给出拒绝理由', r.reason)
}
check(checkScope('再起一卦').reason.includes('另起一卦'), '另起一卦的提示语明确')

console.log('--- 拒绝文本 ---')
const refusal = refusalText(checkScope('帮我写一段 Python 代码'))
check(refusal.includes('【一卦一断】'), '拒绝文本带一卦一断标记')
check(refusal.includes('另起一卦'), '拒绝文本引导另起一卦')

console.log('--- 卦象上下文 ---')
const chart = buildChart({ time: { year: 2008, month: 12, day: 23, hour: 8, minute: 37 }, lineValues: [7, 8, 9, 8, 8, 9] })
const analysis = analyze(chart, '问今年财运')
const ctxText = chartContext(chart, analysis, '问今年财运')
check(ctxText.includes('山火贲') && ctxText.includes('地雷复'), '含主卦与变卦名', '')
check(ctxText.includes('丁酉日') && ctxText.includes('甲辰时'), '含四柱')
check(ctxText.includes('旬空辰巳') || ctxText.includes('旬空辰、巳') || ctxText.includes('旬空辰巳'), '含旬空', ctxText.split('\n')[0])
check(ctxText.includes('问今年财运'), '含所问之事')
check(ctxText.includes('三爻') && ctxText.includes('回头克'), '含动爻与回头克')
check(ctxText.includes('用神') && ctxText.includes('妻财'), '含用神')
check(ctxText.includes('已下结论'), '含已下结论')
check(ctxText.split('\n').length >= 10, '上下文信息充足', String(ctxText.split('\n').length))
check(!ctxText.includes('undefined') && !ctxText.includes('NaN'), '无未定义值泄漏')

console.log('--- 提示词约束 ---')
const prompt = buildAskSystemPrompt({ chartText: ctxText, topic: '问今年财运', questionCount: 1, maxQuestions: 6 })
// 放宽后不再要求用户点到具体爻，所以检查"同域即答"这一功能要求，而非字面短语
check(prompt.includes('同一个问题域') && prompt.includes('不要求用户点到具体爻'), '提示词要求同域追问即作答、不要求点到具体爻')
check(prompt.includes('问今年财运'), '提示词写明所问之事')
check(prompt.includes('另起一卦'), '提示词要求偏离到另一件事时引导另起一卦')
check(prompt.includes('不得凭空编造'), '提示词禁止编造')
check(prompt.includes('典籍出处'), '提示词要求注明出处')
check(prompt.includes('心诚则灵'), '提示词点名禁止套话')
check(prompt.includes('卦中确实无据可断'), '提示词允许"无据可断"')
check(prompt.includes(ctxText), '提示词内嵌完整卦象')
check(prompt.includes('只此一卦'), '提示词强调不得引入其他卦')
check(prompt.includes('已追问 1 次'), '提示词带上追问计数')
const promptNoTopic = buildAskSystemPrompt({ chartText: ctxText, topic: '', questionCount: 0, maxQuestions: 6 })
check(promptNoTopic.includes('未注明所问之事'), '未注明所问之事时明确标注')

console.log('--- 计数与上限 ---')
check(buildAskSystemPrompt({ chartText: 'x', topic: 't', questionCount: 0, maxQuestions: 0 }).includes('上限') === false, 'maxQuestions=0 时不写计数行')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
