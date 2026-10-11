// 一卦一断：提示词约束与上下文构造
//
// 注意：宿主侧的关键词/事项域作用域判定（原 checkScope）已移除——
// 追问该不该答改由模型依语义自行判断，宿主只保留与语义无关的机械性拦截
// （空/过短、次数上限），其行为在 test/host.test.mjs 中验证。
import { chartContext, buildAskSystemPrompt, refusalText, REFUSAL_MARK } from '../src/followup.mjs'
import { buildChart } from '../src/engine.mjs'
import { analyze } from '../src/analysis.mjs'

let fail = 0
const check = (ok, label, extra = '') => {
  if (ok) console.log(`✓ ${label}`)
  else { fail += 1; console.log(`✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}

console.log('--- 卦象上下文 ---')
const chart = buildChart({ time: { year: 2008, month: 12, day: 23, hour: 8, minute: 37 }, lineValues: [7, 8, 9, 8, 8, 9] })
const analysis = analyze(chart, '问今年财运')
const ctxText = chartContext(chart, analysis, '问今年财运')
check(ctxText.includes('问今年财运'), '上下文含所问之事')
check(ctxText.includes('初爻'), '上下文含爻位')
check(ctxText.includes('六爻'), '上下文含六爻段')
check(ctxText.includes('用神'), '上下文含用神段')
check(!ctxText.includes('undefined'), '上下文无 undefined 残留')

console.log('--- 提示词约束 ---')
const prompt = buildAskSystemPrompt({ chartText: ctxText, topic: '问今年财运', questionCount: 1, maxQuestions: 6 })
check(prompt.includes('问今年财运'), '提示词写明所问之事')
// 全 AI 判定：该不该答由模型判断，提示词须交代判据与拒答格式
check(prompt.includes('该不该答') && prompt.includes('自行判断'), '提示词要求模型自行判断该不该答')
check(prompt.includes('同一个问题域') && prompt.includes('不要求') === false, '提示词交代同域即答')
check(prompt.includes('什么原因导致破财'), '提示词给出同域示例（用户实际问法）')
check(prompt.includes(REFUSAL_MARK), '提示词规定拒答须带固定标记')
check(prompt.includes('确实偏离到另一件事'), '提示词限定拒答情形之一：偏离')
check(prompt.includes('卦上确实没有依据'), '提示词限定拒答情形之二：无据')
check(prompt.includes('不得凭空编造'), '提示词禁止编造')
check(prompt.includes('排版严禁'), '提示词含排版禁令')
check(prompt.includes(`上限 6 次`) || prompt.includes('6 次'), '提示词写明追问上限')
check(prompt.includes(ctxText), '提示词内嵌卦象上下文')

const promptNoTopic = buildAskSystemPrompt({ chartText: ctxText, topic: '', questionCount: 0, maxQuestions: 6 })
check(promptNoTopic.includes('未注明所问之事'), '未注明所问之事时照实说明')
check(
  buildAskSystemPrompt({ chartText: 'x', topic: 't', questionCount: 0, maxQuestions: 0 }).includes('0 次') === false,
  '次数上限为 0 时不写次数条款',
)

console.log('--- 拒答文案（宿主侧机械性拦截用）---')
const refusal = refusalText({ kind: 'too-short', reason: '问题太短，请把要问的话说完整。' })
check(refusal.startsWith(REFUSAL_MARK), '拒绝文本以固定标记开头（界面据此识别样式）')
check(refusal.includes('另起一卦'), '拒绝文本引导另起一卦')
check(REFUSAL_MARK === '【一卦一断】', '标记内容符合约定', REFUSAL_MARK)

console.log('--- 客户端按标记识别拒答样式 ---')
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const clientSrc = readFileSync(join(rootDir, 'client', 'client.js'), 'utf8')
check(/indexOf\("【一卦一断】"\) === 0/.test(clientSrc), '客户端以标记开头判定为拒答（模型拒答走这条路）')
check(/evt\.type === "refused"/.test(clientSrc), '客户端仍处理 refused 事件（宿主机械性拦截走这条路）')
// 两条路都要能套上 refused 样式
check(/settleLast\(\{ text: evt\.text \|\| [^}]*refused: true \}\)/.test(clientSrc), 'refused 事件套用拒答样式')
check(/refused: finalText\.indexOf\("【一卦一断】"\) === 0/.test(clientSrc), '标记开头的回答也套用拒答样式')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
