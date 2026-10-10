// 六爻算卦插件 —— Host 半
// 设计原则：零 npm 依赖，避免任何模块解析风险。
//   · 工具用 ctx.tools.register() 的原始 JSON Schema 形式注册（不经 defineTool）；
//   · Config 用内联的 Standard Schema v1 校验器（不经 schemastery）；
//   · 浏览器半经插件自有的 exact HTTP 端点 /dsh-liuyao/* 访问本半。
import { randomInt } from 'node:crypto'
import { buildChart, tossThreeCoins, lineFromValue } from '../src/engine.mjs'
import { analyze } from '../src/analysis.mjs'
import { formatFull } from '../src/format.mjs'
import { pickOpening, OPENING_LINES } from '../src/opening.mjs'
import { checkScope, chartContext, buildAskSystemPrompt, refusalText } from '../src/followup.mjs'
import { buildChartFacts, buildAnalysisSystemPrompt, noModelNotice, extractHeadline } from '../src/analysis-ai.mjs'

export const name = 'liuyao'
export const inject = ['tools']

// 与 package.json 的 version 保持一致（scripts/preflight.mjs 会断言二者相同）
export const VERSION = '0.2.0'

// —— 内联 Standard Schema v1 配置校验器（无外部依赖）——
const BACKGROUND_MODES = ['auto', 'global', 'columns', 'off']
const ANALYSIS_MODES = ['ai', 'rule']
// 各 enum 字段的取值表（校验时按字段取其自身列表，不能共用一个）
const ENUM_VALUES = {
  backgroundMode: BACKGROUND_MODES,
  analysisMode: ANALYSIS_MODES,
  analysisDepth: ['full', 'brief'],
  analysisReasoning: ['off', 'low', 'high', 'max', 'default'],
}
const CONFIG_FIELDS = [
  ['enabled', 'boolean', true, '插件总开关：关闭后工具与卦盘数据通道均不注册'],
  ['boardBackground', 'boolean', true, '是否铺陈先天八卦底纹'],
  ['backgroundMode', 'enum', 'auto', '底纹铺法：auto 自动选择｜global 铺在应用基础背景层（仅当应用各列未自铺不透明底色时可见）｜columns 铺在应用两列（Windows 标题栏模式的默认，必然可见且永不压字）｜off 关闭'],
  ['coinAnimation', 'boolean', true, '电脑摇卦时是否显示铜钱动画'],
  ['requireConfirmEachToss', 'boolean', true, '每次抛掷前是否需用户确认'],
  ['citationStrict', 'boolean', true, '严格模式：只输出典籍有明文依据的断语'],
  ['followUpEnabled', 'boolean', true, '解读之后是否提供「一卦一断」追问对话框'],
  ['maxFollowUps', 'number', 3, '同一卦允许追问的次数上限'],
  ['followUpProvider', 'string', '', '追问所用模型的 provider（留空则用当前默认模型）'],
  ['followUpModel', 'string', '', '追问所用模型的 model id（留空则用当前默认模型）'],
  ['aboutEnabled', 'boolean', true, '是否显示「关于」入口'],
  ['consultWechat', 'string', 'Ljx_0609300', '咨询与赞助的联系微信号（留空则隐藏该项）'],
  ['sponsorNote', 'string', '', '赞助说明（留空则用默认文案）'],
  ['feedbackUrl', 'string', 'https://github.com/ljxdsg12/dsh-liuyao/issues', '问题反馈地址'],
  ['analysisMode', 'enum', 'ai', '断卦方式：ai 由模型依典籍推理（消耗 token，推荐）｜rule 用内置规则引擎（不消耗 token，离线可用）'],
  ['analysisDepth', 'enum', 'full', 'AI 断卦详细度：full 完整七段（较慢）｜brief 精简五段、600 字内（明显更快）'],
  ['analysisReasoning', 'enum', 'off', 'AI 断卦思考强度。DeepSeek 适配器只认 off/low/high/max：off 关闭思考（默认；实测 max 会产生 135 秒不可见思考，而断卦只是依规则推演，不需要它）｜low 轻度思考｜high｜max 最重｜default 跟随当前模型选择'],
  ['analysisMaxTokens', 'number', 0, 'AI 断卦输出上限（tokens）。0 为不限制；设 1200 左右可强制简短、避免冗长拖慢'],
]

// 配置默认值兜底：loader 校验过的配置已含默认值，但直接调用 apply()（自检、测试、
// 或未在 cordis.patch.yml 声明该字段时）拿到的可能是残缺对象，这里补齐。
function withDefaults(config) {
  const out = Object.assign({}, config ?? {})
  for (const [key, , def] of CONFIG_FIELDS) {
    if (out[key] === undefined) out[key] = def
  }
  return out
}

function makeConfigSchema() {
  const properties = {}
  for (const [key, type, def, description] of CONFIG_FIELDS) {
    properties[key] = type === 'enum'
      ? { type: 'string', enum: ENUM_VALUES[key] ?? [], default: def, description }
      : { type, default: def, description }
  }
  return {
    '~standard': {
      version: 1,
      vendor: 'dsh-liuyao',
      validate(input) {
        const source = input === undefined || input === null ? {} : input
        if (typeof source !== 'object' || Array.isArray(source)) {
          return { issues: [{ message: '六爻插件配置必须为对象', path: [] }] }
        }
        const issues = []
        const value = {}
        for (const [key, type, def] of CONFIG_FIELDS) {
          const raw = source[key]
          if (raw === undefined || raw === null) { value[key] = def; continue }
          if (type === 'enum') {
            const allowed = ENUM_VALUES[key] ?? []
            if (typeof raw !== 'string' || !allowed.includes(raw)) {
              issues.push({ message: `config.${key} 必须是 ${allowed.join('/')} 之一`, path: [key] })
              continue
            }
            value[key] = raw
            continue
          }
          if (typeof raw !== type) {
            issues.push({ message: `config.${key} 必须为 ${type}`, path: [key] })
            continue
          }
          if (type === 'number' && (!Number.isFinite(raw) || raw <= 0)) {
            issues.push({ message: `config.${key} 必须为正数`, path: [key] })
            continue
          }
          value[key] = raw
        }
        return issues.length > 0 ? { issues } : { value }
      },
    },
  }
}
export const Config = makeConfigSchema()

const YAO_ENUM = [6, 7, 8, 9]

function cronRandom() {
  return randomInt(0, 1_000_000) / 1_000_000
}

function parseTimeParts(input) {
  if (input && typeof input === 'object') {
    const parts = {
      year: Number(input.year), month: Number(input.month), day: Number(input.day),
      hour: Number(input.hour ?? 0), minute: Number(input.minute ?? 0),
    }
    if (!Number.isFinite(parts.year) || !Number.isFinite(parts.month) || !Number.isFinite(parts.day)) {
      throw new Error('时间字段非法：year/month/day 必须是数字')
    }
    return parts
  }
  const m = String(input ?? '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2}))?/)
  if (!m) throw new Error(`时间无法解析：${input}（示例：2026-10-10 12:08）`)
  return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] ? +m[4] : 0, minute: m[5] ? +m[5] : 0 }
}

function nowParts() {
  const now = new Date()
  return {
    year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
    hour: now.getHours(), minute: now.getMinutes(),
  }
}

function normalizeYao(input) {
  if (!Array.isArray(input) || input.length !== 6) {
    throw new Error('yao 必须为长度 6 的数组（自初爻至上爻，取值 6/7/8/9）')
  }
  const yao = input.map(Number)
  yao.forEach(v => lineFromValue(v)) // 非法值即抛错
  return yao
}

function buildAndAnalyze({ time, lineValues, topic }) {
  const chart = buildChart({ time, lineValues })
  const analysis = analyze(chart, topic ?? '')
  return { chart, analysis, text: formatFull(chart, analysis), opening: pickOpening(cronRandom) }
}

const toPlain = (value) => JSON.parse(JSON.stringify(value))

// —— 模型调用 ——
// DSH 的 prepareCall / stream 是「准备—派发」两段式：stream() 的入参必须与准备阶段解析出的
// 完整配置逐字段相等（provider / model / reasoningEffort / temperature / maxTokens / stop），
// 否则抛 INVALID_PREPARED_CALL: "prepared LLM call config changed before adapter dispatch"。
// 所以必须把 prepared.config 原样展平传回，不能只传 provider 与 model。
async function streamPrepared(prepared, { system, messages, onDelta, onNotice }) {
  let acc = ''
  for await (const chunk of prepared.stream({ ...prepared.config, system, messages })) {
    if (chunk?.type === 'text-delta' && typeof chunk.text === 'string' && chunk.text.length > 0) {
      acc += chunk.text
      onDelta(chunk.text)
    } else if (chunk?.type === 'finish' && chunk.reason?.kind && chunk.reason.kind !== 'stop' && chunk.reason.kind !== 'tool-calls') {
      onNotice(`生成未正常结束：${chunk.reason.kind}${chunk.reason.failure?.message ? '（' + chunk.reason.failure.message + '）' : ''}`)
    }
  }
  return acc
}

// 典籍依据清单（断卦出处，界面与工具共用）
export const EVIDENCE = [
  '《增删卜易》（野鹤老人）——用神、原神、忌神、仇神、月建日辰、旬空、月破、进退神、回头生克、伏神、反吟伏吟、三合局',
  '《卜筮正宗》（王洪绪）——纳甲装卦、世应、六神篇、伏神章、化进退',
  '《黄金策》（刘伯温）——用神与世应、合冲刑害',
  '《易冒》（程良玉）——八宫、会局、六害、纳音取象',
  '《易隐》（曹九锡）——伏神、四库、驿马、咸池、纳音',
  '《火珠林》（题麻衣道者）——纳甲法、八卦六爻、老阳老阴',
  '《周易应用经验学》（秦伦诗）——现代应用取象与应期',
  '《周易》经传——开场辞原文',
].join('\n')

// 引擎自检锚点（与通胜万年历核对，供界面展示可信度）
export const SELFTEST_RESULTS = {
  anchor: [
    { date: '1949-10-01', expected: '己丑年 癸酉月 甲子日 农历八月初十' },
    { date: '2008-12-23 08:37', expected: '戊子年 甲子月 丁酉日 甲辰时（旬空辰巳）农历冬月廿六' },
    { date: '2026-10-10 12:08', expected: '丙午年 戊戌月 丁巳日 丙午时（旬空子丑）农历九月初一' },
  ],
  najia: [
    { hexagram: '乾为天', expected: '甲子 甲寅 甲辰 壬午 壬申 壬戌' },
    { hexagram: '坤为地', expected: '乙未 乙巳 乙卯 癸丑 癸亥 癸酉' },
    { hexagram: '山火贲', expected: '己卯 己丑 己亥 丙戌 丙子 丙寅（艮宫一世，世初应四）' },
  ],
  lunar: '定气定朔天文算法（太阳视黄经求节气、Meeus 定朔定月首），非查表',
  ganzhi: '日干支以 1949-10-01 甲子日为锚点推算六十甲子',
  note: '纳甲、八宫世应、六亲、伏神依《火珠林》《卜筮正宗》纳甲体系。',
}

export function apply(ctx, config) {
  const resolved = withDefaults(config)
  if (resolved.enabled === false) {
    ctx.logger?.info?.('六爻插件已关闭（config.enabled = false）')
    return
  }

  // —— Agent 工具（原始 JSON Schema 形式，零框架依赖）——
  const register = (definition) => {
    try {
      return ctx.tools.register(definition)
    } catch (error) {
      ctx.logger?.warn?.(`六爻插件：工具 ${definition.name} 注册失败：${String(error?.message ?? error)}`)
      return undefined
    }
  }

  register({
    name: 'liuyao_cast',
    description: '六爻起卦排盘与断卦。输入起卦时刻与六爻（自初爻至上爻），依《火珠林》纳甲法排出主卦、变卦、八宫世应、六亲、六神、旬空、伏神、神煞、纳音，并按《增删卜易》《卜筮正宗》《黄金策》《易冒》《易隐》逐项给出有典籍依据的断语。六爻取值：6=老阴(动) 7=少阳 8=少阴 9=老阳(动)。起卦时间必须是用户提供的当前准确时间；先用 liuyao_toss 或用户手工结果取得六爻，再调用本工具。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['time', 'yao'],
      properties: {
        time: { type: 'string', description: '起卦时刻，格式 YYYY-MM-DD HH:mm（用户提供的当前准确时间）' },
        yao: {
          type: 'array',
          description: '六爻摇卦值，自初爻至上爻，共 6 个，取值 6/7/8/9',
          items: { type: 'integer', enum: YAO_ENUM, description: '6 老阴动 / 7 少阳 / 8 少阴 / 9 老阳动' },
        },
        topic: { type: 'string', description: '所问之事（用于取用神，如"问今年财运""问考试能否通过"）；未提供则只排盘不取用神' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'opening', 'chart', 'analysis', 'evidence'],
        properties: {
          text: { type: 'string', description: '与参考图同序的完整文本排盘' },
          opening: { type: 'string', description: '《周易》开场辞' },
          chart: { type: 'string', description: '结构化排盘数据（JSON 字符串，含六爻纳甲、六亲、六神、世应、旬空、伏神、纳音、旺衰、合局）' },
          analysis: { type: 'string', description: '结构化断卦依据（JSON 字符串，含用神、原神忌神仇神、动变、六神、纳音、伏神、综合判断与结论清单，每条带典籍出处）' },
          evidence: { type: 'string', description: '所依典籍清单' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    execute(args, exec) {
      exec.signal?.throwIfAborted?.()
      const time = parseTimeParts(args?.time)
      const yao = normalizeYao(args?.yao)
      const { chart, analysis, text, opening } = buildAndAnalyze({ time, lineValues: yao, topic: args?.topic ?? '' })
      return {
        text,
        opening,
        chart: JSON.stringify(toPlain(chart)),
        analysis: JSON.stringify(toPlain(analysis)),
        evidence: EVIDENCE,
      }
    },
  })

  register({
    name: 'liuyao_toss',
    description: '电脑摇卦：模拟抛三枚铜钱，正反完全随机（系统加密随机源）。每次调用抛一爻，须自初爻至上爻依次调用六次；若要求"每抛一次前确认"，则每次调用前先向用户确认。返回三枚铜钱正反、爻值(6/7/8/9)、爻名与阴阳动静。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['round'],
      properties: {
        round: { type: 'integer', description: '第几次抛掷（1..6，自初爻起）', enum: [1, 2, 3, 4, 5, 6] },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['round', 'position', 'coins', 'value', 'name', 'description', 'yinYang', 'moving'],
        properties: {
          round: { type: 'integer' },
          position: { type: 'string' },
          coins: { type: 'array', items: { type: 'string', enum: ['背', '字'] } },
          value: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          yinYang: { type: 'string' },
          moving: { type: 'boolean' },
        },
      },
      render: (_args, v) => [{
        type: 'text',
        text: `第${v.round}次 · ${v.position}：${v.coins.join(' ')} → ${v.value} ${v.name}（${v.description}）`,
      }],
    },
    execute(args, exec) {
      exec.signal?.throwIfAborted?.()
      const round = Math.min(6, Math.max(1, Number(args?.round) || 1))
      const t = tossThreeCoins(cronRandom)
      return {
        round,
        position: ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][round - 1],
        coins: t.coins.map(c => (c === 'back' ? '背' : '字')),
        value: t.value,
        name: t.name,
        description: t.desc,
        yinYang: t.yang ? '阳' : '阴',
        moving: t.moving,
      }
    },
  })

  register({
    name: 'liuyao_opening',
    description: '取一段《周易》经传原文作为开场辞（系辞、说卦、序卦及卦爻辞原文，不改一字），用于六爻占问的开场。',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['opening'],
        properties: { opening: { type: 'string' } },
      },
      render: (_args, v) => [{ type: 'text', text: v.opening }],
    },
    execute() {
      return { opening: pickOpening(cronRandom) }
    },
  })

  // —— 浏览器半的私有 HTTP 端点 ——
  // 直接注册在 webServer 上（kind:'exact'），不依赖任何可选服务。
  // 教训：早先用 ctx.inject(['connection']) 注册 RPC 通道，运行时该回调未触发，
  // /dsh-liuyao 前缀路由从未建立，POST 于是落到前端静态兜底处理器并返回 405。
  // 安全：webServer 本身无同源策略，故此处自带同源门禁 + 请求体上限 + JSON 校验。
  const API_PREFIX = '/dsh-liuyao/'
  const MAX_BODY = 256 * 1024

  const sendJson = (res, status, body) => {
    const text = JSON.stringify(body)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(text),
      'cache-control': 'no-store',
    })
    res.end(text)
  }

  // 只接受同源请求：优先看 Sec-Fetch-Site，退化到 Origin/Host 比对。
  const sameOrigin = (req) => {
    const site = req.headers['sec-fetch-site']
    if (typeof site === 'string') return site === 'same-origin' || site === 'none'
    const origin = req.headers.origin
    if (origin === undefined) return true
    try { return new URL(origin).host === req.headers.host } catch (error) { return false }
  }

  const readJsonBody = (req) => new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) { reject(new Error('请求体过大')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw === '') { resolve({}); return }
      try { resolve(JSON.parse(raw)) } catch (error) { reject(new Error('请求体不是合法 JSON')) }
    })
    req.on('error', reject)
  })

  ctx.inject(['webServer'], (hostCtx) => {
    const endpoints = {
      config: () => ({ config: serializeConfig(resolved) }),
      opening: () => ({ opening: pickOpening(cronRandom), count: OPENING_LINES.length }),
      selftest: () => SELFTEST_RESULTS,
      toss: () => {
        const t = tossThreeCoins(cronRandom)
        return {
          coins: t.coins.map(c => (c === 'back' ? '背' : '字')),
          coinFaces: t.coins,
          value: t.value,
          name: t.name,
          yang: t.yang,
          moving: t.moving,
          description: t.desc,
        }
      },
      cast: (payload) => {
        const time = payload?.time ? parseTimeParts(payload.time) : nowParts()
        const yao = normalizeYao(payload?.yao)
        const { chart, analysis, text, opening } = buildAndAnalyze({ time, lineValues: yao, topic: payload?.topic ?? '' })
        return { chart: toPlain(chart), analysis: toPlain(analysis), text, opening, evidence: EVIDENCE }
      },
      analyze: (payload) => {
        const time = payload?.time ? parseTimeParts(payload.time) : nowParts()
        const yao = normalizeYao(payload?.yao)
        const { analysis } = buildAndAnalyze({ time, lineValues: yao, topic: payload?.topic ?? '' })
        return { analysis: toPlain(analysis) }
      },
    }

    // —— 追问（一卦一断）：流式端点单独注册 ——
    ctx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: `${API_PREFIX}ask`,
      handler: async (req, res) => {
        if (req.method === 'OPTIONS') { res.writeHead(204, { allow: 'POST, OPTIONS' }); res.end(); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed: use POST' }); return }
        if (!sameOrigin(req)) { sendJson(res, 403, { ok: false, error: 'cross-origin request refused' }); return }
        let payload
        try { payload = await readJsonBody(req) } catch (error) { sendJson(res, 400, { ok: false, error: String(error?.message ?? error) }); return }

        let chart
        let analysis
        try {
          const time = payload?.time ? parseTimeParts(payload.time) : nowParts()
          const yao = normalizeYao(payload?.yao)
          const built = buildAndAnalyze({ time, lineValues: yao, topic: payload?.topic ?? '' })
          chart = built.chart
          analysis = built.analysis
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          return
        }

        const question = String(payload?.question ?? '').trim()
        const history = Array.isArray(payload?.history)
          ? payload.history.slice(-12).map(h => ({ role: h?.role === 'assistant' ? 'assistant' : 'user', text: String(h?.text ?? '').slice(0, 1500) }))
          : []
        // 上限以"截断后实际带入的提问数"为准，避免长会话永远超限
        const asked = history.filter(h => h.role === 'user').length
        const maxQuestions = Number.isFinite(resolved.maxFollowUps) ? resolved.maxFollowUps : 3

        // 流式响应（NDJSON）：先声明头，再逐行推送
        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-accel-buffering': 'no',
        })
        const emit = (obj) => { res.write(`${JSON.stringify(obj)}\n`) }
        const finish = (obj) => { emit(obj); res.end() }

        const scope = checkScope(question)
        if (!scope.inScope) {
          finish({ type: 'refused', kind: scope.kind, text: refusalText(scope) })
          return
        }
        if (asked >= maxQuestions) {
          finish({ type: 'refused', kind: 'limit', text: `【一卦一断】本卦的追问已达上限（${maxQuestions} 次）。要问新的事，请另起一卦。` })
          return
        }
        const llm = ctx.get('llm')
        if (llm === undefined) {
          finish({ type: 'error', text: '本机未挂载模型服务（llm），暂时无法生成追问的回答；卦象与条文仍可照常查看。' })
          return
        }
        const target = resolveModel(ctx, resolved)
        if (!target) {
          finish({ type: 'error', text: '未能确定可用的模型（可在插件配置里指定 model/provider）。' })
          return
        }

        try {
          const prepared = await llm.prepareCall({
            provider: target.provider,
            model: target.model,
            ...(target.reasoningEffort ? { reasoningEffort: target.reasoningEffort } : {}),
          })
          const chartText = chartContext(chart, analysis, payload?.topic ?? '')
          const system = buildAskSystemPrompt({
            chartText,
            topic: payload?.topic ?? '',
            questionCount: asked,
            maxQuestions,
          })
          const messages = [
            ...history.map(turn => ({ role: turn.role, content: [{ type: 'text', text: turn.text }] })),
            { role: 'user', content: [{ type: 'text', text: question }] },
          ]
          let acc = ''
          try {
            acc = await streamPrepared(prepared, {
              system,
              messages,
              onDelta: (text) => emit({ type: 'delta', text }),
              onNotice: (text) => emit({ type: 'notice', text }),
            })
          } catch (error) {
            finish({ type: 'error', text: `追问失败：${String(error?.message ?? error)}` })
            return
          }
          finish({ type: 'done', text: acc })
        } catch (error) {
          finish({ type: 'error', text: `追问失败：${String(error?.message ?? error)}` })
        }
      },
    }), `liuyao: POST ${API_PREFIX}ask`)

    // —— AI 断卦（流式）：盘面由规则引擎算出作为事实，断卦交给模型 ——
    // 与「一卦一断」同一套模型调用范式，但 system 提示词不同（这里要产出完整断卦）。
    ctx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: `${API_PREFIX}analyze-ai`,
      handler: async (req, res) => {
        if (req.method === 'OPTIONS') { res.writeHead(204, { allow: 'POST, OPTIONS' }); res.end(); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed: use POST' }); return }
        if (!sameOrigin(req)) { sendJson(res, 403, { ok: false, error: 'cross-origin request refused' }); return }
        let payload
        try { payload = await readJsonBody(req) } catch (error) { sendJson(res, 400, { ok: false, error: String(error?.message ?? error) }); return }

        let chart
        let analysis
        try {
          const time = payload?.time ? parseTimeParts(payload.time) : nowParts()
          const yao = normalizeYao(payload?.yao)
          const built = buildAndAnalyze({ time, lineValues: yao, topic: payload?.topic ?? '' })
          chart = built.chart
          analysis = built.analysis
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          return
        }

        const topic = String(payload?.topic ?? '').trim()

        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-accel-buffering': 'no',
        })
        const emit = (obj) => { res.write(`${JSON.stringify(obj)}\n`) }
        const finish = (obj) => { emit(obj); res.end() }

        const llm = ctx.get('llm')
        if (llm === undefined) {
          finish({ type: 'error', text: noModelNotice() })
          return
        }
        const target = resolveModel(ctx, resolved)
        if (!target) {
          finish({ type: 'error', text: '未能确定可用的模型（可在插件配置里指定 followUpProvider / followUpModel）。' })
          return
        }

        try {
          // 断卦是「依规则推理 + 组织语言」，不像数学或代码那样需要长链思考。
          // DeepSeek V4 默认开启思考模式，会产生一大段不可见推理，首字延迟因此很长；
          // 这里允许按配置降级思考强度（off 最快），并把 maxTokens 作为输出去冗的硬约束。
          const prepared = await llm.prepareCall({
            provider: target.provider,
            model: target.model,
            ...(resolveReasoning(resolved, target) ? { reasoningEffort: resolveReasoning(resolved, target) } : {}),
            ...(Number(resolved.analysisMaxTokens) > 0 ? { maxTokens: Number(resolved.analysisMaxTokens) } : {}),
          })

          const y = analysis?.yongshen
          const yongshenHint = y?.use
            ? `${y.use}${y.rule ? '——' + y.rule : ''}`
              + (y.notOnChart ? `（不上卦，伏神：${(y.hidden ?? []).join('、') || '本宫首卦亦无'}）` : `（现于：${(y.onLines ?? []).join('、')}）`)
            : (y?.needsRole && y?.needsRoleNote ? y.needsRoleNote : '')

          const system = buildAnalysisSystemPrompt({
            chartFacts: buildChartFacts(chart, topic),
            topic,
            yongshenHint,
            strictCitation: resolved.citationStrict !== false,
            depth: resolved.analysisDepth === 'brief' ? 'brief' : 'full',
          })

          const messages = [{
            role: 'user',
            content: [{ type: 'text', text: topic ? `请断此卦：${topic}` : '请断此卦。（求测者未注明所问之事，请按格式要求说明需要补充什么信息）' }],
          }]

          let acc = ''
          const t0 = Date.now()
          let firstAt = 0
          try {
            acc = await streamPrepared(prepared, {
              system,
              messages,
              onDelta: (text) => {
                if (firstAt === 0) firstAt = Date.now()
                emit({ type: 'delta', text })
              },
              onNotice: (text) => emit({ type: 'notice', text }),
            })
          } catch (error) {
            finish({ type: 'error', text: `AI 断卦失败：${String(error?.message ?? error)}` })
            return
          }
          const totalMs = Date.now() - t0
          // 耗时上报：首字延迟反映「思考」开销（关掉思考强度会显著下降），
          // 总时长反映输出长度。用户据此判断该调哪个旋钮。
          finish({
            type: 'done',
            text: acc,
            headline: extractHeadline(acc),
            timing: {
              firstTokenMs: firstAt ? firstAt - t0 : null,
              totalMs,
              outputChars: acc.length,
              depth: resolved.analysisDepth === 'brief' ? 'brief' : 'full',
              reasoning: resolveReasoning(resolved, target) ?? 'default',
            },
          })
        } catch (error) {
          finish({ type: 'error', text: `AI 断卦失败：${String(error?.message ?? error)}` })
        }
      },
    }), `liuyao: POST ${API_PREFIX}analyze-ai`)

    // —— 关于：版本、数据透明、咨询与赞助 ——
    // 全部为静态文案，不发起任何网络请求；外链由浏览器打开，与插件的"零网络"能力无关。
    ctx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: `${API_PREFIX}about`,
      handler: async (req, res) => {
        if (req.method === 'OPTIONS') { res.writeHead(204, { allow: 'POST, OPTIONS' }); res.end(); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed: use POST' }); return }
        if (!sameOrigin(req)) { sendJson(res, 403, { ok: false, error: 'cross-origin request refused' }); return }
        const selftest = SELFTEST_RESULTS
        sendJson(res, 200, {
          ok: true,
          value: {
            name: 'dsh-liuyao',
            version: VERSION,
            license: 'MIT',
            repository: 'https://github.com/ljxdsg12/dsh-liuyao',
            verifiedOn: 'DSH 0.2.0-rc.2 / pnpm 11.7.0',
            consultWechat: resolved.consultWechat || '',
            sponsorNote: resolved.sponsorNote
              || '插件免费且开源（MIT）。若它帮到了你，欢迎赞助；也承接六爻排盘与断卦相关的定制开发。',
            feedbackUrl: resolved.feedbackUrl || '',
            privacy: [
              '零 npm 依赖：Host 半只 import Node 内置模块',
              '无网络访问、无文件写入、不读取任何凭据',
              '一卦一断的追问只发给本机配置的模型服务',
            ],
            disclaimer: [
              '干支历、纳甲、六亲、神煞均按典籍规则推算，断语逐条注明出处；典籍无明文者不作推断。',
              '本插件属中国传统文化研究工具，仅供文化参考与娱乐，不构成医疗、法律、投资或其他专业建议。',
              '不承诺任何预测准确率；一卦一断的回答由你本机配置的模型生成，其准确性取决于该模型。',
            ],
            anchors: selftest.anchor,
            note: selftest.note,
          },
        })
      },
    }), `liuyao: POST ${API_PREFIX}about`)

    for (const [name, handler] of Object.entries(endpoints)) {
      ctx.effect(() => hostCtx.webServer.register({
        kind: 'exact',
        path: `${API_PREFIX}${name}`,
        handler: async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, { allow: 'POST, OPTIONS', 'cache-control': 'no-store' })
            res.end()
            return
          }
          if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed: use POST' }); return }
          if (!sameOrigin(req)) { sendJson(res, 403, { ok: false, error: 'cross-origin request refused' }); return }
          try {
            const payload = await readJsonBody(req)
            sendJson(res, 200, { ok: true, value: handler(payload) })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        },
      }), `liuyao: POST ${API_PREFIX}${name}`)
    }

    ctx.logger?.info?.(`六爻算卦插件：已注册 ${Object.keys(endpoints).length} 个端点于 ${API_PREFIX}*`)
  })

  ctx.logger?.info?.('六爻算卦插件已就绪：先天八卦盘与纳甲排盘')
}

function serializeConfig(config) {
  const out = {}
  for (const [key, , def] of CONFIG_FIELDS) out[key] = config[key] === undefined ? def : config[key]
  return out
}

// 断卦的思考强度。DeepSeek 适配器只认 off/low/high/max；分析任务用不到高思考，
// 默认 off（实测 max 会产生 135 秒不可见思考，而可见输出只花 5 秒）。
// 'default' 表示跟随当前模型选择，需要时可在配置里改回。
const REASONING_CHOICES = ['off', 'low', 'high', 'max']
function resolveReasoning(config, target) {
  const mode = config.analysisReasoning
  if (REASONING_CHOICES.includes(mode)) return mode
  return target.reasoningEffort ?? null
}

// 追问用的模型：优先插件配置，其次当前会话默认模型
function resolveModel(ctx, config) {
  if (config.followUpProvider && config.followUpModel) {
    return { provider: config.followUpProvider, model: config.followUpModel }
  }
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
  if (selection && typeof selection === 'object' && selection.provider && selection.model) {
    return {
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    }
  }
  return null
}
