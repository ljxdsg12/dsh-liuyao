// 排版清洗自检：验证显示层能去掉模型偶发输出的 Markdown 标记。
//
// 动机：模型在追问环节自行加了 **加粗** 与自造小标题，界面把星号当普通文字显示出来。
// 两层防护：① 提示词明确禁令 ② 显示层清洗兜底。本测试覆盖第二层。
// 用法：node test/markdown-strip.test.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fail = 0
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ' :: ' + extra : ''}`)
  if (!ok) fail += 1
}

// ---------- 从客户端源码里取出 stripMd 及其规则，独立求值后再测 ----------
// 这样测的是真实实现，而不是另写一份可能走样的副本。
const src = readFileSync(join(root, 'client', 'client.js'), 'utf8')
const rulesMatch = /var MD_RULES = \[([\s\S]*?)\];/.exec(src)
const fnMatch = /function stripMd\(text\) \{([\s\S]*?)\n\t\t\}/.exec(src)
check(Boolean(rulesMatch), '在客户端源码中找到 MD_RULES')
check(Boolean(fnMatch), '在客户端源码中找到 stripMd')

// 用源码里的规则文本构造真实函数（正则字面量在 eval 里可用）
const stripMd = new Function('text', `
  var MD_RULES = [${rulesMatch[1]}];
  var s = String(text === null || text === undefined ? "" : text);
  for (var i = 0; i < MD_RULES.length; i += 1) s = s.replace(MD_RULES[i][0], MD_RULES[i][1]);
  return s;
`)

console.log('--- 应被清除的标记 ---')
const CASES = [
  ['**结论**：靠自己能经营货殖', '结论：靠自己能经营货殖'],
  ['**依据**：1. 用神妻财', '依据：1. 用神妻财'],
  ['*斜体文字*', '斜体文字'],
  ['***粗斜体***', '粗斜体'],
  ['__加粗__', '加粗'],
  ['~~删除~~', '删除'],
  ['`代码`', '代码'],
  ['# 标题行', '标题行'],
  ['## 二级标题', '二级标题'],
]
for (const [input, want] of CASES) {
  const got = stripMd(input)
  check(got === want, `「${input}」→「${got}」`, got === want ? '' : `期望「${want}」`)
}

console.log('--- 用户截图里的实际文本 ---')
// 截图里出现的三种写法
const REAL = '**结论：靠自己能经营货殖、凭技艺或服务生财，并借同辈／合伙人之力，最终要有一纸文书（合同、凭证、门面）才落袋；应期看\"寅\"。**'
const realOut = stripMd(REAL)
check(!realOut.includes('*'), '整段包裹的 ** 被清除', realOut.slice(0, 24) + '…')
check(realOut.startsWith('结论：'), '开头的标记已去', realOut.slice(0, 12))

console.log('--- 不应被破坏的正常文本 ---')
const KEEP = [
  '用神妻财己酉金不上卦',
  '《增删卜易·飞伏生克》',
  '五爻官鬼丙子水旬空、日冲、化未土回头克',
  '应期：待寅日成局',              // 全角冒号不是 Markdown
  '〔《卜筮正宗·月建日辰》〕',
  '3. 三爻兄弟戊午火发动化妻财辛酉金',
  '财爻：日辰能生能克能合能冲',      // 单个全角冒号
]
for (const t of KEEP) {
  check(stripMd(t) === t, `原样保留：${t.slice(0, 22)}`)
}

console.log('--- 边界 ---')
check(stripMd('') === '', '空串')
check(stripMd(null) === '', 'null 不抛错')
check(stripMd(undefined) === '', 'undefined 不抛错')
check(stripMd('单个星号 * 不配对') === '单个星号 * 不配对', '不配对的星号保持原样（避免误删正文）')

console.log('--- 提示词里有明确禁令 ---')
const aiSrc = readFileSync(join(root, 'src', 'analysis-ai.mjs'), 'utf8')
check(aiSrc.includes('【排版禁令】'), '断卦提示词含排版禁令段')
check(aiSrc.includes('不得用 * 或 **'), '断卦提示词点名禁止星号')
check(aiSrc.includes('结论：') && aiSrc.includes('自造标题'), '断卦提示词禁止自造小标题')
const askSrc = readFileSync(join(root, 'src', 'followup.mjs'), 'utf8')
check(askSrc.includes('排版严禁'), '追问提示词含排版禁令')
check(askSrc.includes('不得用 * 或 **'), '追问提示词点名禁止星号')

console.log('--- 两处渲染都走了清洗 ---')
check(/stripMd\(t\.text\)/.test(src), '追问回答经 stripMd')
check(/stripMd\(p\.text\)/.test(src), 'AI 断卦段落经 stripMd')
check(/stripMd\(it\.text\)/.test(src), 'AI 断卦结论行经 stripMd')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
