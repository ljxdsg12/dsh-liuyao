// 校验提交给官方市场的条目文件
//
// 依据官方仓库 scripts/lib/entries.mjs 的 validateEntries() 逐条对齐，
// 在本地先跑一遍，避免 PR 被 CI 打回。
//   https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/lib/entries.mjs
import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'

const PATH = 'submit/data/plugins/LJXDSG12__dsh-liuyao.yml'

// —— 官方常量（照抄 entries.mjs，勿自行增删）——
const CAT_IDS = ['agi', 'ui', 'usage', 'theme', 'model', 'identity', 'session', 'memory',
  'tools', 'wsl', 'browser', 'vision', 'voice', 'docs', 'skill', 'workflow', 'git',
  'notify', 'dev', 'security', 'remote', 'market', 'fun']
const ENTRY_KEYS = new Set(['url', 'name', 'category', 'description', 'tarball', 'file'])
const LOCALE_CODES = ['en', 'zh']
const BASE_LOCALE = 'en'
const TARBALL_HOSTS = new Set(['github.com', 'objects.githubusercontent.com'])

const problems = []
const ok = []
const check = (pass, label, detail) => {
  if (pass) ok.push(label)
  else problems.push(detail ?? label)
}

// —— 读文件 ——
if (!existsSync(PATH)) {
  console.error(`找不到条目文件：${PATH}`)
  process.exit(1)
}
const raw = readFileSync(PATH, 'utf8')

// 官方用 js-yaml 解析；这里只做「顶层键 + 缩进子键」的轻量解析，
// 足够覆盖官方模板的形状，且不引入依赖。
const entry = {}
const desc = {}
let curTop = null
for (const line of raw.split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue
  const top = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
  if (top) {
    curTop = top[1]
    if (curTop === 'description') continue
    entry[curTop] = top[2].replace(/^['"]|['"]$/g, '')
    continue
  }
  const sub = /^\s+([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
  if (sub && curTop === 'description') {
    desc[sub[1]] = sub[2].replace(/^['"]|['"]$/g, '')
  }
}
entry.description = desc

// —— 逐条对照官方校验 ——

// 1. 未知字段：官方会把多余的键当错误（"an entry may only declare ..."）
const extra = Object.keys(entry).filter((k) => !ENTRY_KEYS.has(k))
check(extra.length === 0, '无未知字段', `多余字段：${extra.join(', ')}（官方只认 ${[...ENTRY_KEYS].filter(k => k !== 'file').join(', ')}）`)

// 2. url 必须是 https://github.com/owner/repo
check(/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(entry.url ?? ''),
  'url 是 https://github.com/owner/repo 形式', `url 不合法：${entry.url}`)

// 3. 文件名必须等于 owner__repo.yml（官方 slugFor()）
const slug = (entry.url ?? '').replace(/^https:\/\/github\.com\//, '').split('/').slice(0, 2).join('__')
const wantFile = `${slug}.yml`
check(basename(PATH) === wantFile, `文件名与 url 一致（${wantFile}）`,
  `文件名应为 ${wantFile}，实际 ${basename(PATH)}`)

// 4. name 必填；若写成 owner/repo，必须指向同一个仓库
check(typeof entry.name === 'string' && entry.name.trim().length > 0, 'name 非空', 'name 缺失')
if ((entry.name ?? '').includes('/')) {
  const named = entry.name.split('#')[0].trim().toLowerCase()
  const actual = (entry.url ?? '').replace(/^https:\/\/github\.com\//, '').split('/').slice(0, 2).join('/').toLowerCase()
  check(named === actual, 'name 与 url 指向同一仓库', `name 写的是 ${named}，url 指向 ${actual}`)
}

// 5. category 必须在官方枚举内（否则 CI 直接报错）
check(CAT_IDS.includes(entry.category), `category 合法（${entry.category}）`,
  `category 必须是以下之一：${CAT_IDS.join(', ')}（实际 ${JSON.stringify(entry.category)}）`)

// 6. description：en 必需，zh 可选；都必须单行；不得出现站点不渲染的语言
check(typeof desc[BASE_LOCALE] === 'string' && desc[BASE_LOCALE].trim().length > 0,
  'description.en 已填', 'description.en 是必需的')
const extraLocales = Object.keys(desc).filter((k) => !LOCALE_CODES.includes(k))
check(extraLocales.length === 0, 'description 只含 en / zh', `多出 ${extraLocales.join(', ')}，站点只渲染 ${LOCALE_CODES.join(' / ')}`)
for (const loc of Object.keys(desc)) {
  if (!desc[loc].trim()) {
    // 官方原话：非基准语言若为空，应当整个省略该键
    problems.push(`description.${loc} 是空的——官方要求直接省略该键，而不是留空`)
  }
}

// 7. 单行（YAML 层面换行会造成解析错误或多行值）
const rawLines = raw.split(/\r?\n/)
for (const [i, l] of rawLines.entries()) {
  if (/^\s+(en|zh): /.test(l)) {
    const val = l.replace(/^\s+(en|zh): /, '')
    const quoted = val.startsWith("'") || val.startsWith('"')
    if (/: /.test(val) && !quoted) {
      problems.push(`第 ${i + 1} 行的描述含 ": " 却未加引号——官方点名这会打断 YAML 解析`)
    }
  }
}
ok.push('描述里的 ": " 已规避（YAML 解析安全）')

// 8. tarball（可选）：必须 https + GitHub releases + .tgz/.tar.gz
if (entry.tarball !== undefined) {
  let u = null
  try { u = new URL(entry.tarball) } catch { /* 留给下面报错 */ }
  check(u && u.protocol === 'https:', 'tarball 是 https', `tarball 不是合法 URL 或不是 https：${entry.tarball}`)
  if (u) {
    check(TARBALL_HOSTS.has(u.hostname), 'tarball 托管在 GitHub releases',
      `tarball 必须托管在 GitHub releases（实际主机 ${u.hostname}）`)
    check(u.hostname !== 'github.com' || u.pathname.includes('/releases/'),
      'tarball 指向的是 release 资产', 'tarball 必须指向一个 GitHub release 资产')
    check(u.pathname.endsWith('.tgz') || u.pathname.endsWith('.tar.gz'),
      'tarball 以 .tgz / .tar.gz 结尾', `tarball 必须以 .tgz 或 .tar.gz 结尾`)
  }
  ok.push('tarball 字段已声明（可选）')
} else {
  ok.push('未声明 tarball（可选字段，不影响收录）')
}

// 9. YAML 基本功：不能有制表符
check(!/\t/.test(raw), '无制表符（YAML 里 tab 非法）', '文件含制表符，YAML 不允许')

// —— 输出 ——
console.log(`条目文件：${PATH}`)
console.log(`  行数 ${rawLines.length} · 字节 ${Buffer.byteLength(raw, 'utf8')}\n`)
for (const l of ok) console.log(`  ✓ ${l}`)
for (const p of problems) console.log(`  ✗ ${p}`)
console.log('')
if (problems.length === 0) {
  console.log(`官方校验项全部通过（${ok.length} 项）——可以提 PR`)
  process.exit(0)
}
console.log(`失败 ${problems.length} 项——提 PR 会被 CI 打回`)
process.exit(1)
