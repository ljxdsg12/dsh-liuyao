// 追问作用域判定自检：既判"该放的要放"，也判"该拒的要拒"。
// 放宽的动机：用户在「问同学的财运」之下问「具体是什么事情导致破财」被误拒——
// 该问题显然同域，只是没点到"卦/爻"字眼。
// 用法：node test/followup-scope.test.mjs
import { checkScope } from '../src/followup.mjs'

let fail = 0
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fail += 1
}

console.log('--- 应当放行：同域追问（不要求点到具体爻）---')
const ALLOW = [
  ['问财运', '具体是什么事情导致破财'],   // 用户实际被误拒的那句
  ['问财运', '钱什么时候能回来'],
  ['问财运', '那这笔投资能回本吗'],
  ['问财运', '生意上该注意什么'],
  ['问事业', '什么时候有升迁机会'],
  ['问事业', '面试能不能过'],
  ['问婚姻', '感情什么时候能稳定'],
  ['问婚姻', '对方是什么态度'],
  ['问健康', '这个病什么时候能好'],
  ['问健康', '需要手术吗'],
  ['问考试', '成绩大概什么水平'],
  ['问官司', '这场诉讼结果如何'],
  ['问子女', '孩子学业怎么样'],
  ['问房子', '这套房能买成吗'],
  ['问出行', '这趟行程顺利吗'],
]
for (const [topic, q] of ALLOW) {
  const r = checkScope(q, topic)
  check(r.inScope, `「${topic}」→「${q}」`, r.inScope ? r.kind : '被拒：' + r.reason.slice(0, 30))
}

console.log('--- 应当放行：点到卦中术语 ---')
const TERM = [
  ['问财运', '三爻妻财动而化克是什么意思'],
  ['问财运', '用神旺衰如何'],
  ['问事业', '世应关系说明什么'],
  ['问财运', '应期在什么时候'],
]
for (const [topic, q] of TERM) {
  const r = checkScope(q, topic)
  check(r.inScope, `「${q}」`, r.kind)
}

console.log('--- 应当拒答：明确要另起一卦 ---')
const REFUSE_OTHER = [
  '帮我起一卦看看婚姻',
  '再起一卦问工作',
  '换一个卦',
  '重新起卦',
]
for (const q of REFUSE_OTHER) {
  const r = checkScope(q, '问财运')
  check(!r.inScope && r.kind === 'other-casting', `「${q}」`, r.kind)
}

console.log('--- 应当拒答：偏离到另一件事 ---')
const REFUSE_OFF = [
  ['问财运', '我明天该不该跟老板吵架'],
  ['问财运', '孩子这次考试能过吗'],
  ['问事业', '我和老婆感情怎么样'],
]
for (const [topic, q] of REFUSE_OFF) {
  const r = checkScope(q, topic)
  check(!r.inScope, `「${topic}」→「${q}」`, r.inScope ? '误放行（' + r.kind + '）' : r.kind)
}

console.log('--- 应当拒答：过短或空 ---')
for (const q of ['', '嗯']) {
  const r = checkScope(q, '问财运')
  check(!r.inScope && r.kind === 'too-short', `「${q}」`, r.kind)
}

console.log('--- 未给 topic 时仍能靠术语/指代放行 ---')
check(checkScope('用神旺衰如何').inScope, '无 topic + 卦中术语 → 放行')
check(checkScope('那它什么时候有转机').inScope, '无 topic + 指代与疑问 → 放行')
check(!checkScope('我明天该不该跟老板吵架').inScope, '无 topic + 无关短句 → 拒答')

console.log('--- 域词表覆盖度抽查 ---')
// 每个域取两个词，确认都能被识别（防止词表漏词导致误拒）
const PAIRS = [
  ['财运', '破财'], ['财运', '回本'], ['事业', '升迁'], ['事业', '跳槽'],
  ['婚姻', '感情'], ['婚姻', '复合'], ['健康', '手术'], ['健康', '复发'],
  ['考试', '上岸'], ['官司', '判决'], ['出行', '航班'], ['房产', '装修'],
  ['人际', '小人'], ['子女', '叛逆'], ['失物', '找回来'],
]
for (const [domainHint, word] of PAIRS) {
  // 用「问<域>」的问法当 topic，再问该域的关键词
  const topic = '问' + domainHint
  const r = checkScope(`关于${word}怎么说`, topic)
  check(r.inScope, `「${topic}」识别「${word}」`, r.inScope ? r.kind : '漏词')
}

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
