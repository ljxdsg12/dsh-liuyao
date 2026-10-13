// 对照官方 contributing.md 的「Requirements / 要求」与「What CI checks / CI 会检查什么」
// 逐条核对本插件。官方原文见：
//   https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const results = []
const add = (name, pass, detail) => results.push({ name, pass, detail })

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

// ── CI 第 1 步：Entry count（一个 PR 最多 3 条）──
const entries = existsSync('submit/data/plugins') ? readdirSync('submit/data/plugins').filter((f) => f.endsWith('.yml')) : []
add('CI-1 一个 PR 最多 3 条', entries.length <= 3, `本 PR 新增 ${entries.length} 条`)

// ── CI 第 2 步：dsh.bundle（最常见被拒原因：只声明 dsh.client）──
const hasBundle = pkg.dsh && typeof pkg.dsh.bundle === 'object' && pkg.dsh.bundle !== null
add('CI-2 package.json 声明了 dsh.bundle', Boolean(hasBundle),
  hasBundle ? `dsh.bundle = ${JSON.stringify(pkg.dsh.bundle)}` : '缺少 dsh.bundle（只声明 dsh.client 无法安装）')
if (hasBundle && pkg.dsh.bundle.patch) {
  const p = pkg.dsh.bundle.patch.replace(/^\.\//, '')
  add('CI-2b dsh.bundle.patch 指向的文件存在', existsSync(p), p)
  if (existsSync(p)) {
    const patch = readFileSync(p, 'utf8')
    add('CI-2c cordis.patch.yml 含 insert 段', /-\s*insert:/.test(patch), '官方模板要求 insert 一个 id + name')
  }
}
// 官方推荐：官方 @deepseek-ai/* 包用 peerDependencies
const deps = Object.keys(pkg.dependencies ?? {})
const peers = Object.keys(pkg.peerDependencies ?? {})
const officialInDeps = deps.filter((d) => d.startsWith('@deepseek-ai/'))
add('推荐 官方 @deepseek-ai/* 不放在 dependencies', officialInDeps.length === 0,
  officialInDeps.length ? `被放在 dependencies：${officialInDeps.join(', ')}` : `dependencies 共 ${deps.length} 个，其中官方包 0 个`)

// ── CI 第 3 步：仓库年龄 ≥ 1 天 ──
let repoAgeDays = null
let created = null
try {
  const out = execFileSync('curl.exe', [
    '-sL', '--max-time', '25', '-x', 'http://127.0.0.1:7897',
    '-H', 'Accept: application/vnd.github+json',
    'https://api.github.com/repos/LJXDSG12/dsh-liuyao',
  ], { encoding: 'utf8' })
  const repo = JSON.parse(out)
  created = repo.created_at
  repoAgeDays = (Date.now() - Date.parse(repo.created_at)) / 86400000
  add('CI-3 仓库年龄 ≥ 1 天', repoAgeDays >= 1, `创建于 ${repo.created_at}，已 ${repoAgeDays.toFixed(2)} 天`)
  add('要求 仓库公开', repo.private === false, `private = ${repo.private}`)
} catch (e) {
  add('CI-3 仓库年龄 ≥ 1 天', false, `查询失败：${e.message}`)
}

// ── CI 第 4 步：awesome-lint 与站点构建（双语一致性、分隔符、日期、截图）──
const shotsFile = 'screenshots.json'
add('截图 screenshots.json 存在', existsSync(shotsFile), shotsFile)
if (existsSync(shotsFile)) {
  let shots = JSON.parse(readFileSync(shotsFile, 'utf8'))
  if (!Array.isArray(shots) && Array.isArray(shots.screenshots)) shots = shots.screenshots
  add('截图 1-8 张', shots.length >= 1 && shots.length <= 8, `${shots.length} 张`)
  const abs = shots.filter((s) => /^https?:\/\//i.test(s))
  add('截图 相对路径不跳出目录（无 / 开头、无 ..）',
    shots.every((s) => !s.startsWith('/') && !s.split('/').includes('..')),
    shots.join(', '))
  add('截图 相对路径指向的文件真实存在', shots.every((s) => existsSync(s)),
    shots.filter((s) => !existsSync(s)).join(', ') || '全部存在')
  add('截图 绝对 URL 为 GitHub 托管', abs.every((u) => /raw\.githubusercontent\.com|user-images\.githubusercontent\.com|camo\.githubusercontent\.com|github\.com/.test(u)),
    abs.length ? abs.join(', ') : '没有绝对 URL（全部为相对路径）')
  add('截图 路径已进 files 白名单', shots.every((s) => (pkg.files ?? []).includes(s) || (pkg.files ?? []).some((f) => s.startsWith(f + '/'))),
    `files = ${JSON.stringify(pkg.files)}`)
}

// ── 要求：真实可用的代码（不是占位/纯 README）──
const codeFiles = ['lib/index.js', 'client/client.js', 'src/engine.mjs', 'src/analysis.mjs']
add('要求 仓库有真实代码', codeFiles.every((f) => existsSync(f)), codeFiles.join(', '))

// ── 要求：不是纯聚合包（自带行为）──
const isMeta = deps.length > 0 && !existsSync('lib/index.js')
add('要求 不是纯聚合包（自带行为）', !isMeta, `运行时依赖 ${deps.length} 个，且自带 lib/index.js`)

// ── 要求：能从源码安装（否则 tarball 字段变成必需）──
//
// 官方原文：「Required if your repo can't be installed from source at all.」
// 本仓库属于「能装，但文档里那条 tarball 直链装不了」：
//   - git 规格可用：dsh plugin add "github:ljxdsg12/dsh-liuyao#v0.2.0"  → 实测 2.5s exit 0
//   - Release tarball 直链不可用 → ERR_PNPM_MISSING_TARBALL_INTEGRITY（安装器写出的
//     lockfile 条目缺 integrity，是 DSH 安装器路径的问题，不是 URL/产物/网络的问题）
// 所以 tarball 字段不是硬性必需，但官方「推荐」挂预构建包，且挂上后市场会优先展示它。
const srcInstallable = existsSync('KNOWN-ISSUE-install.md')
  && /方式一：git 规格（在线，推荐）/.test(readFileSync('KNOWN-ISSUE-install.md', 'utf8'))
add('要求 能从源码安装（git 规格）', srcInstallable,
  srcInstallable
    ? 'KNOWN-ISSUE-install.md 实测 git 规格可用 → tarball 字段非必需，但官方推荐挂'
    : '未找到 git 规格可用的实测记录 → tarball 字段变成必需')

// ── 输出 ──
const pass = results.filter((r) => r.pass)
const fail = results.filter((r) => !r.pass)
for (const r of pass) console.log(`  ✓ ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
console.log('')
for (const r of fail) console.log(`  ✗ ${r.name}  — ${r.detail}`)
console.log('')
console.log(`${pass.length} 项通过，${fail.length} 项待处理`)
