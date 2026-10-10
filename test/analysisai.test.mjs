// AI 断卦链路自检：用桩模型（假 llm）驱动 /dsh-liuyao/analyze-ai 流式端点，
// 验证「盘面事实 → 提示词 → 流式输出 → NDJSON 事件」整条链路通，且提示词内容合规。
//
// 这样做是因为真实模型调用需要用户额度；桩模型能在不花钱的前提下验证全部接线。
// 用法：node test/analysisai.test.mjs
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fail = 0
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fail += 1
}

// ---------- 桩：捕获 system 与 messages，返回预置的流式片段 ----------
// 关键：桩模仿 DSH 真实的「准备—派发」两段式校验——prepareCall 解析出完整配置（含默认值），
// stream() 的入参必须与之逐字段相等，否则 DSH 抛 INVALID_PREPARED_CALL。
// 桩里做同样校验，才能测出「只传 provider/model」这类调用错误。
const captured = { system: '', messages: null, calls: 0, streamArgs: null }

const RESOLVED_CONFIG = {
  provider: 'deepseek-official',
  model: 'deepseek-flash',
  // 下面两个是 DSH 会补上的默认值，正是「不传回就失败」的字段
  reasoningEffort: 'medium',
  temperature: 1,
  maxTokens: 8192,
}

// 只比对「请求控制」字段，不比对 system/messages —— 与 DSH 的 callConfigEquals 一致
// （DSH 比的是 provider / model / reasoningEffort / temperature / maxTokens / stop）
const CONFIG_KEYS = ['provider', 'model', 'reasoningEffort', 'temperature', 'maxTokens', 'stop']

function configEquals(a, b) {
  for (const k of CONFIG_KEYS) {
    const av = a?.[k]
    const bv = b?.[k]
    if (Array.isArray(av) || Array.isArray(bv)) {
      if (!Array.isArray(av) || !Array.isArray(bv) || av.length !== bv.length) return false
      if (!av.every((x, i) => x === bv[i])) return false
      continue
    }
    if (av !== bv) return false
  }
  return true
}

const FAKE_REPLY = [
  '## 用神取用',
  '所问「问事业」，依《增删卜易·用神章》以官鬼为用神。',
  '',
  '## 用神旺衰',
  '用神官鬼卯木临初爻，月建戌土为木之墓库，日辰巳火泄木之气。',
  '',
  '## 结论清单',
  '- [凶] 官鬼休囚又被日辰泄气，谋事多阻〔《增删卜易·用神章》〕',
  '- [中] 世爻得月建生扶，自身尚可支撑〔《黄金策·世应》〕',
  '',
  '## 通俗总结',
  '这件事目前推不动。',
  '原因在初爻官鬼——卯木在戌月本就无力，偏偏又是管理、职位这条线。',
].join('\n')

const fakeLlm = {
  async prepareCall(config) {
    const resolved = { ...RESOLVED_CONFIG, ...config }
    return {
      config: resolved,
      adapterDefaults: { reasoningEffort: true },
      stream: async function* (options) {
        captured.streamArgs = options
        if (!configEquals(options, resolved)) {
          const err = new Error('prepared LLM call config changed before adapter dispatch')
          err.code = 'INVALID_PREPARED_CALL'
          throw err
        }
        captured.calls += 1
        captured.system = options.system
        captured.messages = options.messages
        const step = 24
        for (let i = 0; i < FAKE_REPLY.length; i += step) {
          yield { type: 'text-delta', text: FAKE_REPLY.slice(i, i + step) }
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    }
  },
}

// ---------- 装载 Host 半 ----------
const mod = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const routes = []
const ctx = {
  logger: { info: () => {}, warn: (m) => console.log('  WARN', m) },
  tools: { register: () => () => {} },
  effect: (f) => f(),
  inject: (deps, cb) => {
    if (deps.includes('webServer')) cb({ webServer: { register: (r) => { routes.push(r); return () => {} } } })
    return () => {}
  },
  get: (key) => {
    if (key === 'llm') return fakeLlm
    if (key === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-flash' }) }
    return undefined
  },
}
mod.apply(ctx, { enabled: true })

console.log('--- 端点注册 ---')
const route = routes.find((r) => r.path === '/dsh-liuyao/analyze-ai')
check(Boolean(route), '注册 /dsh-liuyao/analyze-ai')
check(route?.kind === 'exact', '使用 exact 路由')

// ---------- 调用端点（桩 req/res，收集 NDJSON） ----------
function makeReq(body) {
  const chunks = [Buffer.from(JSON.stringify(body))]
  return {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' },
    on(event, cb) {
      if (event === 'data') chunks.forEach((c) => cb(c))
      if (event === 'end') cb()
      return this
    },
  }
}

const events = []
const res = {
  writeHead: () => {},
  write: (line) => { events.push(JSON.parse(line)) },
  end: () => {},
}

console.log('--- 调用 analyze-ai（桩模型）---')
await route.handler(makeReq({ time: '2026-10-10 15:20', yao: [7, 8, 9, 8, 8, 9], topic: '问事业' }), res)

check(captured.calls === 1, '模型被调用一次', String(captured.calls))
const deltas = events.filter((e) => e.type === 'delta')
const done = events.find((e) => e.type === 'done')
check(deltas.length > 1, '收到多个流式增量（非一次性返回）', `${deltas.length} 个`)
check(Boolean(done), '收到 done 事件')
check(done && done.text.length === FAKE_REPLY.length, '拼回的文本与模型输出等长', `${done?.text.length} vs ${FAKE_REPLY.length}`)
check(done && done.text === FAKE_REPLY, '拼回的文本与模型输出完全一致')
check(done && typeof done.headline === 'string' && done.headline.length > 0, 'done 带标题', done?.headline)

console.log('--- 提示词合规性 ---')
const sys = captured.system
check(sys.length > 1500, '提示词足够完整', `${sys.length} 字符`)
check(sys.includes('盘面事实'), '含盘面事实段')
check(sys.includes('丙午年'), '盘面事实含真实四柱')
check(sys.includes('山火贲'), '盘面事实含主卦名')
check(sys.includes('官鬼'), '盘面事实含六亲')
check(sys.includes('旺衰'), '盘面事实含旺衰评分')
check(sys.includes('旬空'), '盘面事实含旬空')
check(sys.includes('用神参考'), '含用神参考段')
check(sys.includes('增删卜易'), '含典籍法则')
check(session_count(sys) >= 12, '典籍法则条数充足', String(session_count(sys)))
check(sys.includes('不得改动任何一字'), '含"不得改动盘面"约束')
check(sys.includes('不许迎合'), '含"不许迎合"约束')
check(sys.includes('不许使用'), '含禁用套话约束')
check(sys.includes('不作推断'), '含"无据不作推断"约束')
check(sys.includes('【输出格式】'), '含输出格式约束')
check(sys.includes('通俗总结'), '要求输出通俗总结')
check(!sys.includes('undefined'), '提示词无 undefined 残留')
check(!sys.includes('[object Object]'), '提示词无对象序列化残留')

function session_count(s) { return (s.match(/^· /gm) ?? []).length }

console.log('--- 派发契约（回归防护）---')
check(captured.streamArgs !== null, 'stream 被调用并记录了入参')
// reasoningEffort 由插件按 analysisReasoning 决策：默认 low（轻度思考，兼顾质量与速度）。
// 关键仍是「必须把最终值传回 stream」，否则 DSH 抛 INVALID_PREPARED_CALL。
check(captured.streamArgs && captured.streamArgs.reasoningEffort === 'low',
  '默认以 reasoningEffort=low 派发（轻度思考）', String(captured.streamArgs?.reasoningEffort))
check(captured.streamArgs && captured.streamArgs.maxTokens === RESOLVED_CONFIG.maxTokens,
  'stream 入参保留了 maxTokens（未配置上限时沿用解析值）', String(captured.streamArgs?.maxTokens))
check(captured.streamArgs && captured.streamArgs.temperature === RESOLVED_CONFIG.temperature,
  'stream 入参保留了 temperature', String(captured.streamArgs?.temperature))
check(captured.streamArgs && captured.streamArgs.provider === RESOLVED_CONFIG.provider
  && captured.streamArgs.model === RESOLVED_CONFIG.model,
  'stream 入参保留了 provider 与 model')
check(captured.streamArgs && typeof captured.streamArgs.system === 'string' && captured.streamArgs.system.length > 0,
  'stream 入参带 system')
check(captured.streamArgs && Array.isArray(captured.streamArgs.messages), 'stream 入参带 messages')
// 反向验证：只传 provider/model 的旧写法必须被判为不合法
check(!configEquals({ provider: 'deepseek-official', model: 'deepseek-flash' }, RESOLVED_CONFIG),
  '只传 provider/model 会被判为配置不符（正是先前那个 bug）')

console.log('--- 消息体 ---')
check(Array.isArray(captured.messages) && captured.messages.length === 1, '只有一条 user 消息')
check(captured.messages?.[0]?.role === 'user', '角色为 user')
check(String(captured.messages?.[0]?.content?.[0]?.text ?? '').includes('问事业'), '消息含所问之事')

console.log('--- 无模型时的降级 ---')
const routes2 = []
const ctx2 = {
  logger: { info: () => {}, warn: () => {} },
  tools: { register: () => () => {} },
  effect: (f) => f(),
  inject: (deps, cb) => { if (deps.includes('webServer')) cb({ webServer: { register: (r) => { routes2.push(r); return () => {} } } }); return () => {} },
  get: () => undefined,
}
mod.apply(ctx2, { enabled: true })
const route2 = routes2.find((r) => r.path === '/dsh-liuyao/analyze-ai')
if (route2) {
  const events2 = []
  const res2 = { writeHead: () => {}, write: (l) => events2.push(JSON.parse(l)), end: () => {} }
  await route2.handler(makeReq({ time: '2026-10-10 15:20', yao: [7, 8, 9, 8, 8, 9], topic: '问事业' }), res2)
  const err = events2.find((e) => e.type === 'error')
  check(Boolean(err), '无模型时返回 error 事件而非崩溃')
  check(err && err.text.includes('模型'), '错误信息说明了原因', err?.text?.slice(0, 30))
} else {
  check(false, '无模型时仍注册端点')
}

console.log('--- 客户端接线 ---')
const clientSrc = readFileSync(join(root, 'client', 'client.js'), 'utf8')
check(clientSrc.includes('analyzeAi'), '客户端定义 analyzeAi')
check(clientSrc.includes('"analyze-ai"'), '客户端调用 analyze-ai 端点')
check(clientSrc.includes('parseAiMarkdown'), '客户端有 Markdown 解析')
check(clientSrc.includes('AiAnalysisView'), '客户端有 AI 断卦视图')
check(clientSrc.includes('断卦方式'), '客户端有断卦方式切换')
check(clientSrc.includes('规则断卦'), '客户端保留规则断卦入口')
check(/boardCache\.aiMode = v\.config\.analysisMode !== "rule"/.test(clientSrc), '默认随配置走 AI（并写入状态缓存）')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
