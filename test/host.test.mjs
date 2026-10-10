// Host 半自检：零依赖，直接导入 lib/index.js 真身。
// 校验：导出形状、内联 Standard Schema 配置校验、原始 JSON Schema 工具定义合法性、
//       RPC 通道端点行为、包解析（模拟 profile 安装）。
import { mkdirSync, rmSync, existsSync, symlinkSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = dirname(here)

let fail = 0
const check = (ok, label, extra = '') => {
  if (ok) console.log(`✓ ${label}`)
  else { fail += 1; console.log(`✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}

const mod = await import(pathToFileURL(join(pluginRoot, 'lib', 'index.js')).href)

console.log('--- 零依赖与插件形状 ---')
const hostSource = readFileSync(join(pluginRoot, 'lib', 'index.js'), 'utf8')
const bareImports = [...hostSource.matchAll(/from\s+['"]([^'".][^'"]*)['"]/g)]
  .map(m => m[1])
  .filter(spec => !spec.startsWith('node:'))
check(bareImports.length === 0, '不导入任何裸 npm 模块（零依赖）', bareImports.join(','))
check(mod.name === 'liuyao', 'name 导出', String(mod.name))
check(Array.isArray(mod.inject) && mod.inject.includes('tools'), 'inject 含 tools', JSON.stringify(mod.inject))
check(typeof mod.apply === 'function', 'apply 为函数')

console.log('--- 内联 Standard Schema 配置校验 ---')
const std = mod.Config?.['~standard']
check(std && std.version === 1 && typeof std.validate === 'function', 'Config 暴露 ~standard.validate')
const filled = std.validate({})
check(filled.issues === undefined && filled.value.enabled === true && filled.value.boardBackground === true, '空配置被补全默认值')
check(filled.value.backgroundMode === 'auto', 'backgroundMode 默认 auto', String(filled.value.backgroundMode))
const partial = std.validate({ enabled: false, coinAnimation: false })
check(partial.value.enabled === false && partial.value.coinAnimation === false && partial.value.citationStrict === true, '部分配置被合并')
for (const mode of ['auto', 'global', 'columns', 'off']) {
  check(std.validate({ backgroundMode: mode }).value?.backgroundMode === mode, `backgroundMode 接受 ${mode}`)
}
const badMode = std.validate({ backgroundMode: 'overlay' })
check(Array.isArray(badMode.issues) && badMode.issues[0].path[0] === 'backgroundMode', 'backgroundMode 非法取值被拒', JSON.stringify(badMode.issues))
const bad = std.validate({ enabled: 'yes' })
check(Array.isArray(bad.issues) && bad.issues.length === 1, '非法类型被拒', JSON.stringify(bad.issues))
const notObj = std.validate([1, 2])
check(Array.isArray(notObj.issues), '非对象被拒')

console.log('--- 工具定义合法性（原始 JSON Schema） ---')
const tools = new Map()
const routes = []
const logs = []
const modelCalls = []
const fakeLlm = {
  async prepareCall(config) {
    return {
      config,
      async *stream(options) {
        modelCalls.push(options)
        yield { type: 'text-delta', index: 0, text: '三爻妻财动而化' }
        yield { type: 'text-delta', index: 0, text: '回头克，钱难留。' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    }
  },
}
const buildCtx = (services = {}) => ({
  logger: { info: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')) },
  tools: {
    register: (def) => {
      // 模拟 registry 的强制校验
      if (def.output === undefined || typeof def.output.render !== 'function') throw new TypeError('must declare output { schema, render }')
      tools.set(def.name, def)
      return () => tools.delete(def.name)
    },
  },
  effect: (fn) => fn(),
  inject: (deps, cb) => {
    if (deps.includes('webServer')) {
      cb({ webServer: { register: (route) => { routes.push(route); return () => {} } } })
    }
    return () => {}
  },
  get: (key) => {
    if (key === 'llm') return 'llm' in services ? services.llm : fakeLlm
    if (key === 'agentDefaultModel') {
      return 'agentDefaultModel' in services
        ? services.agentDefaultModel
        : { currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-flash' }) }
    }
    return undefined
  },
})
const ctx = buildCtx()
mod.apply(ctx, {
  enabled: true, boardBackground: true, coinAnimation: true, requireConfirmEachToss: true, citationStrict: true,
})

check(tools.size === 3, '注册了 3 个工具', [...tools.keys()].join(','))
check(['liuyao_cast', 'liuyao_toss', 'liuyao_opening'].every(n => tools.has(n)), '工具名齐备')

// 原始 JSON Schema 约束：按 dsh-tools 的 checkSchemaNode 规则逐条复刻校验
import { assertSupportedJsonSchema } from '../src/schema-check.mjs'
const negative = assertSupportedJsonSchema({ type: 'object', additionalProperties: false, properties: { a: { type: 'json' } } }, 'neg')
check(negative.length === 1 && negative[0].includes('json'), '校验器能识别不被支持的 type："json"', negative.join('; '))
const negative2 = assertSupportedJsonSchema({ type: 'object', additionalProperties: false, properties: { a: { type: 'string', required: true } } }, 'neg2')
check(negative2.length === 1 && negative2[0].includes('not supported on type'), '校验器能识别属性级 required（defineTool DSL 专用写法）', negative2.join('; '))
for (const [n, def] of tools) {
  const errs = [
    ...assertSupportedJsonSchema(def.parameters, `${n}.parameters`),
    ...assertSupportedJsonSchema(def.output.schema, `${n}.output.schema`),
  ]
  check(errs.length === 0, `${n} 的 schema 符合原始注册约束`, errs.join('; '))
  check(typeof def.description === 'string' && def.description.length > 20, `${n} 有描述`)
  check(typeof def.execute === 'function', `${n} 有 execute`)
  const rendered = def.output.render({}, { text: 'x', opening: 'y', round: 1, position: '初爻', coins: ['背', '背', '背'], value: 9, name: '老阳', description: 'd', yinYang: '阳', moving: true })
  check(Array.isArray(rendered) && rendered[0].type === 'text', `${n} 的 render 返回 text 块`)
}

console.log('--- 工具执行 ---')
const fakeExec = { signal: undefined }
const opening = await tools.get('liuyao_opening').execute({}, fakeExec)
check(typeof opening.opening === 'string' && opening.opening.includes('《周易'), 'liuyao_opening 返回周易原文', opening.opening.slice(0, 22))
const tos = await tools.get('liuyao_toss').execute({ round: 1 }, fakeExec)
check([6, 7, 8, 9].includes(tos.value) && tos.coins.length === 3, 'liuyao_toss 合法', JSON.stringify(tos.coins))
const cast = await tools.get('liuyao_cast').execute({ time: '2008-12-23 08:37', yao: [7, 8, 9, 8, 8, 9], topic: '问财运' }, fakeExec)
const castChart = JSON.parse(cast.chart)
const castAnalysis = JSON.parse(cast.analysis)
check(castChart.main.name === '山火贲', 'liuyao_cast 排盘主卦', castChart.main.name)
check(cast.text.includes('丁酉日') && cast.text.includes('甲辰时'), 'liuyao_cast 干支与时辰')
check(castAnalysis.sections.length >= 6, 'analysis 章节齐全', String(castAnalysis.sections.length))
check(cast.evidence.includes('增删卜易'), 'evidence 列出典籍')
// 输出值与 output.schema 的 required 一致
for (const key of ['text', 'opening', 'chart', 'analysis', 'evidence']) {
  check(typeof cast[key] === 'string' && cast[key].length > 0, `输出字段 ${key} 为字符串`)
}
check(castChart.changed.name === '地雷复', 'liuyao_cast 变卦（按动爻应为地雷复，非雷山小过）', castChart.changed.name)
let timeRejected = false
try { await tools.get('liuyao_cast').execute({ time: '不是时间', yao: [7, 7, 7, 7, 7, 7] }, fakeExec) } catch { timeRejected = true }
check(timeRejected, '时间非法被拒')
let yaoRejected = false
try { await tools.get('liuyao_cast').execute({ time: '2026-10-10 12:00', yao: [1, 2, 3] }, fakeExec) } catch { yaoRejected = true }
check(yaoRejected, '爻数不足被拒')

console.log('--- HTTP 端点 ---')
const expectedPaths = ['/dsh-liuyao/config', '/dsh-liuyao/opening', '/dsh-liuyao/selftest', '/dsh-liuyao/toss', '/dsh-liuyao/cast', '/dsh-liuyao/analyze', '/dsh-liuyao/analyze-ai', '/dsh-liuyao/about', '/dsh-liuyao/ask']
check(routes.length === expectedPaths.length, `注册 ${expectedPaths.length} 个 exact 路由`, routes.map(r => r.path).join(','))
check(routes.every(r => r.kind === 'exact'), '全部为 exact 路由（优先于静态兜底，不再返回 405）')
check(expectedPaths.every(p => routes.some(r => r.path === p)), '端点路径齐备', routes.map(r => r.path).join(','))

// 以桩 req/res 调用路由处理器
const callRoute = async (path, options = {}) => {
  const route = routes.find(r => r.path === path)
  if (!route) throw new Error('路由不存在: ' + path)
  const { method = 'POST', body = '{}', headers = {} } = options
  const out = { status: 0, headers: null, text: '' }
  const res = {
    writeHead: (status, h) => { out.status = status; out.headers = h },
    end: (text) => { out.text = text ?? '' },
  }
  const listeners = {}
  const req = {
    method,
    headers: { host: '127.0.0.1:19387', 'sec-fetch-site': 'same-origin', ...headers },
    on: (evt, cb) => { listeners[evt] = cb },
    destroy: () => {},
  }
  const done = route.handler(req, res)
  if (body !== null && listeners.data !== undefined) {
    listeners.data(Buffer.from(body))
    listeners.end()
  }
  await done
  await new Promise(r => setTimeout(r, 5))
  return { ...out, json: out.text ? JSON.parse(out.text) : null }
}

const cfgRes = await callRoute('/dsh-liuyao/config')
check(cfgRes.status === 200 && cfgRes.json.ok === true, 'POST config 返回 200 与 {ok:true}', String(cfgRes.status))
check(cfgRes.json.value.config.backgroundMode === 'auto', 'config 返回 backgroundMode')
check((await callRoute('/dsh-liuyao/opening')).json.value.opening.length > 10, 'endpoint opening')
check((await callRoute('/dsh-liuyao/toss')).json.value.coins.length === 3, 'endpoint toss')
const c1 = (await callRoute('/dsh-liuyao/cast', { body: JSON.stringify({ time: '2026-10-10 12:08', yao: [7, 8, 8, 7, 7, 7], topic: '问事业' }) })).json.value
check(c1.chart.main.name === '天雷无妄', 'endpoint cast', c1.chart?.main?.name)
check(c1.analysis.sections.length >= 6, 'endpoint cast 返回断卦依据')
const a1 = (await callRoute('/dsh-liuyao/analyze', { body: JSON.stringify({ time: '2026-10-10 12:08', yao: [7, 7, 7, 7, 7, 7], topic: '问财' }) })).json.value
check(a1.analysis.yongshen.use === '妻财', 'endpoint analyze 取用神')
check(Array.isArray((await callRoute('/dsh-liuyao/selftest')).json.value.anchor), 'endpoint selftest')

console.log('--- 关于（咨询与赞助）端点 ---')
const about = (await callRoute('/dsh-liuyao/about')).json.value
check(about.name === 'dsh-liuyao' && about.version === mod.VERSION, 'endpoint about 名称与版本', `${about.name} ${about.version}`)
check(about.license === 'MIT', 'endpoint about 许可')
check(about.consultWechat === 'Ljx_0609300', 'endpoint about 微信号', String(about.consultWechat))
check(typeof about.sponsorNote === 'string' && about.sponsorNote.length > 0, 'endpoint about 赞助说明非空')
check(Array.isArray(about.privacy) && about.privacy.length >= 3, 'endpoint about 数据透明条目', String((about.privacy || []).length))
check(Array.isArray(about.disclaimer) && about.disclaimer.length >= 3, 'endpoint about 免责条目', String((about.disclaimer || []).length))
check(Array.isArray(about.anchors) && about.anchors.length >= 3, 'endpoint about 历法锚点', String((about.anchors || []).length))
check(about.feedbackUrl.includes('github.com/ljxdsg12/dsh-liuyao'), 'endpoint about 反馈地址')
// 微信号可通过配置清空隐藏
const hiddenCfg = mod.Config['~standard'].validate({ enabled: true, consultWechat: '' })
check(hiddenCfg.value.consultWechat === '', '可将 consultWechat 置空以隐藏该栏')

console.log('--- 端点安全与错误处理 ---')
const getRes = await callRoute('/dsh-liuyao/cast', { method: 'GET' })
check(getRes.status === 405 && getRes.json.ok === false, '非 POST 一律 405 + {ok:false}', String(getRes.status))
const crossRes = await callRoute('/dsh-liuyao/cast', { headers: { 'sec-fetch-site': 'cross-site' } })
check(crossRes.status === 403, '跨站请求被拒（Sec-Fetch-Site）', String(crossRes.status))
const originRes = await callRoute('/dsh-liuyao/cast', { headers: { 'sec-fetch-site': undefined, origin: 'http://evil.example' } })
check(originRes.status === 403, '异源 Origin 被拒', String(originRes.status))
const badJson = await callRoute('/dsh-liuyao/cast', { body: '{not json' })
check(badJson.status === 400 && badJson.json.error.includes('JSON'), '非法 JSON 返回 400', JSON.stringify(badJson.json))
const badYao = await callRoute('/dsh-liuyao/cast', { body: JSON.stringify({ yao: [1, 2, 3, 4, 5, 6] }) })
check(badYao.status === 400 && badYao.json.error.includes('摇卦值非法'), '非法爻值返回 400', JSON.stringify(badYao.json))
const optRes = await callRoute('/dsh-liuyao/cast', { method: 'OPTIONS', body: null })
check(optRes.status === 204, 'OPTIONS 返回 204', String(optRes.status))
check(logs.some(l => l.includes('已注册')), '启动日志记录端点注册数', logs.filter(l => l.includes('端点')).join(' | '))

console.log('--- 一卦一断：追问端点 ---')
const askRoute = routes.find(r => r.path === '/dsh-liuyao/ask')
check(askRoute !== undefined, '注册 /dsh-liuyao/ask 端点', routes.map(r => r.path).join(','))

const callStreamOn = async (routeList, path, body, options = {}) => {
  const route = routeList.find(r => r.path === path)
  if (!route) throw new Error('路由不存在: ' + path)
  const chunks = []
  let status = 0
  let headers = null
  const res = {
    writeHead: (s, h) => { status = s; headers = h },
    write: (line) => { chunks.push(line) },
    end: (line) => { if (line !== undefined) chunks.push(line) },
  }
  const listeners = {}
  const req = {
    method: options.method ?? 'POST',
    headers: { host: '127.0.0.1:19387', 'sec-fetch-site': 'same-origin', ...(options.headers ?? {}) },
    on: (evt, cb) => { listeners[evt] = cb },
    destroy: () => {},
  }
  const done = route.handler(req, res)
  if (typeof body === 'string' && listeners.data) { listeners.data(Buffer.from(body)); listeners.end() }
  await done
  await new Promise(r => setTimeout(r, 5))
  const events = chunks.join('').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return { type: 'parse-error', raw: l } } })
  return { status, headers, events }
}
const callStream = (path, body, options) => callStreamOn(routes, path, body, options)
const askBody = (question, extra = {}) => JSON.stringify({
  time: '2008-12-23 08:37',
  yao: [7, 8, 9, 8, 8, 9],
  topic: '问今年财运',
  question,
  history: [],
  ...extra,
})

const refused = await callStream('/dsh-liuyao/ask', askBody('帮我写一段 Python 代码'))
check(refused.status === 200, '流式端点返回 200', String(refused.status))
check(/ndjson/.test(String(refused.headers?.['content-type'])), '内容类型为 NDJSON', String(refused.headers?.['content-type']))
check(refused.events.some(e => e.type === 'refused'), '越界提问被拒', JSON.stringify(refused.events.slice(0, 2)))
check(refused.events.some(e => e.type === 'refused' && e.text.includes('一卦一断')), '拒答文本带一卦一断')
check(modelCalls.length === 0, '越界提问不消耗模型调用', String(modelCalls.length))

const another = await callStream('/dsh-liuyao/ask', askBody('再起一卦问问别的'))
check(another.events.some(e => e.type === 'refused' && e.kind === 'other-casting'), '另起一卦的请求被拒', JSON.stringify(another.events.map(e => e.kind)))

const overLimit = await callStream('/dsh-liuyao/ask', askBody('世爻逢空是什么意思？', {
  history: [0, 1, 2].flatMap(i => [{ role: 'user', text: '问' + i }, { role: 'assistant', text: '答' + i }]),
}))
check(overLimit.events.some(e => e.type === 'refused' && e.kind === 'limit'), '达到追问上限后拒答', JSON.stringify(overLimit.events.map(e => e.kind)))

const streamed = await callStream('/dsh-liuyao/ask', askBody('三爻妻财动而化回头克，钱是不是留不住？'))
check(streamed.events.filter(e => e.type === 'delta').length === 2, '合法提问按增量推送', JSON.stringify(streamed.events.map(e => e.type)))
check(streamed.events.some(e => e.type === 'done'), '以 done 事件收束')
const doneText = streamed.events.find(e => e.type === 'done')?.text ?? ''
check(doneText === '三爻妻财动而化回头克，钱难留。', 'done 文本为全部增量拼接', doneText)
check(modelCalls.length === 1, '恰好调用一次模型', String(modelCalls.length))
check(modelCalls[0].system.includes('一卦一断') && modelCalls[0].system.includes('山火贲'), '系统提示词含一卦一断与卦象')
check(modelCalls[0].system.includes('三爻') && modelCalls[0].system.includes('回头克'), '提示词含具体爻象')
check(modelCalls[0].messages.length === 1 && modelCalls[0].messages[0].role === 'user', '消息只含本次提问', JSON.stringify(modelCalls[0].messages.map(m => m.role)))
check(modelCalls[0].provider === 'deepseek-official' && modelCalls[0].model === 'deepseek-flash', '使用默认模型', `${modelCalls[0].provider}/${modelCalls[0].model}`)

const withHistory = await callStream('/dsh-liuyao/ask', askBody('那应期呢？', {
  history: [{ role: 'user', text: '前问' }, { role: 'assistant', text: '前答' }],
}))
check(modelCalls.length === 2, '带历史时再次调用模型', String(modelCalls.length))
check(modelCalls[1].messages.length === 3, '历史一并送入', JSON.stringify(modelCalls[1].messages.map(m => m.role)))

const badAsk = await callStream('/dsh-liuyao/ask', JSON.stringify({ time: '2026-10-10 12:00', yao: [1, 2, 3, 4, 5, 6], question: '世爻如何？' }))
check(badAsk.status === 400, '非法爻值返回 400', String(badAsk.status))

const crossAsk = await callStream('/dsh-liuyao/ask', askBody('世爻是什么意思？'), { headers: { 'sec-fetch-site': 'cross-site' } })
check(crossAsk.status === 403, '追问端点同样受同源门禁保护', String(crossAsk.status))

// 无 llm 服务时给出可读提示
const noLlmRoutes = []
const ctxNoLlm = buildCtx({ llm: undefined })
ctxNoLlm.inject = (deps, cb) => { if (deps.includes('webServer')) cb({ webServer: { register: (r) => { noLlmRoutes.push(r); return () => {} } } }); return () => {} }
mod.apply(ctxNoLlm, { enabled: true })
const noLlm = await callStreamOn(noLlmRoutes, '/dsh-liuyao/ask', askBody('世爻是什么意思？'))
check(noLlm.events.some(e => e.type === 'error' && e.text.includes('模型服务')), '缺 llm 时给出可读提示', JSON.stringify(noLlm.events.map(e => e.text?.slice(0, 20))))

console.log('--- 关闭开关 ---')
const tools2 = new Map()
mod.apply({
  logger: { info: () => {}, warn: () => {} },
  tools: { register: (d) => { tools2.set(d.name, d) } },
  effect: () => {},
  inject: () => {},
}, { enabled: false })
check(tools2.size === 0, 'enabled=false 时不注册任何工具')

console.log('--- 包解析（模拟 profile 安装） ---')
const shim = join(here, '.shim')
rmSync(shim, { recursive: true, force: true })
mkdirSync(join(shim, 'node_modules'), { recursive: true })
const linkTarget = join(shim, 'node_modules', 'dsh-liuyao')
try {
  symlinkSync(pluginRoot, linkTarget, 'junction')
  const pkg = JSON.parse(readFileSync(join(linkTarget, 'package.json'), 'utf8'))
  check(pkg.name === 'dsh-liuyao', '包名正确', pkg.name)
  check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'dsh.bundle.patch 指向 patch 文件')
  check(pkg.dsh?.client?.platform === 'web', 'dsh.client.platform = web')
  check(pkg.peerDependencies === undefined && pkg.dependencies === undefined, '无 npm 依赖声明')
  check(existsSync(join(linkTarget, 'client', 'client.js')), '客户端 bundle 存在')
  const req = createRequire(pathToFileURL(join(shim, 'index.js')).href)
  const rHost = req.resolve('dsh-liuyao')
  const rClient = req.resolve('dsh-liuyao/client')
  check(/lib[\\/]index\.js$/.test(rHost), 'exports["."] 解析到 Host 半', rHost)
  check(/client[\\/]client\.js$/.test(rClient), 'exports["./client"] 解析到浏览器半', rClient)
  // 真正加载一次浏览器半，确认其 id 与包名一致
  const clientSource = readFileSync(rClient, 'utf8')
  const idMatch = /id:\s*"([^"]+)"/.exec(clientSource)
  check(idMatch && idMatch[1] === pkg.name, 'bundle 注册 id 与包名一致', idMatch ? idMatch[1] : 'n/a')
} catch (error) {
  check(false, '包解析检查', String(error?.message ?? error))
}
rmSync(shim, { recursive: true, force: true })

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
