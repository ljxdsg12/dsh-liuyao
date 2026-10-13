// 一次性维护脚本：把版本相关引用统一到 package.json 的当前版本。
// 用文件形式而非内联命令，是因为内联时 PowerShell 的引号解析极易出错。
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const write = (p, s) => writeFileSync(join(root, p), s)

const pkg = JSON.parse(read('package.json'))
const V = pkg.version
console.log(`目标版本：${V}`)

// 1) 安装器默认包名
{
  const p = 'scripts/make-installer.mjs'
  let s = read(p)
  s = s.replace(/'dsh-liuyao-\d+\.\d+\.\d+\.tar\.gz'/, `'dsh-liuyao-${V}.tar.gz'`)
  write(p, s)
  console.log(`  ✓ ${p} 默认包名 → dsh-liuyao-${V}.tar.gz`)
}

// 2) 预检断言改为跟随版本，不再写死
{
  const p = 'scripts/preflight.mjs'
  let s = read(p)
  s = s.replace(/entry\.install\.includes\('github:ljxdsg12\/dsh-liuyao#v[\d.]+'\)/,
    "entry.install.includes('github:ljxdsg12/dsh-liuyao#v' + pkg.version)")
  s = s.replace(/entry\.screenshots\.every\(u => u\.includes\('\/v[\d.]+\/assets\/'\)\)/,
    "entry.screenshots.every(u => u.includes('/v' + pkg.version + '/assets/'))")
  s = s.replace(/RELEASE-NOTES-v[\d.]+\.md/, `RELEASE-NOTES-v${V}.md`)
  write(p, s)
  console.log(`  ✓ ${p} 断言跟随版本、文档清单 → RELEASE-NOTES-v${V}.md`)
}

// 3) Release 说明：改名并同步版本号
{
  const candidates = ['RELEASE-NOTES-v0.1.0.md', `RELEASE-NOTES-v${V}.md`]
  const from = candidates.find((f) => existsSync(join(root, f)))
  if (from) {
    let s = read(from).replace(/0\.1\.0/g, V)
    const to = `RELEASE-NOTES-v${V}.md`
    write(to, s)
    if (from !== to) unlinkSync(join(root, from))
    console.log(`  ✓ ${from} → ${to}（版本号已同步）`)
  }
}

// 4) 目录条目
{
  const p = 'catalog-entry.json'
  const e = JSON.parse(read(p))
  e.version = V
  e.install = `dsh plugin --profile web add "github:ljxdsg12/dsh-liuyao#v${V}"`
  e.screenshots = (e.screenshots ?? []).map((u) => u.replace(/\/v[\d.]+\//, `/v${V}/`))
  if (e.notes?.zh) e.notes.zh = e.notes.zh.replace(/0\.1\.0/g, V)
  if (e.notes?.en) e.notes.en = e.notes.en.replace(/0\.1\.0/g, V)
  write(p, JSON.stringify(e, null, 2) + '\n')
  console.log(`  ✓ ${p} → v${V}，install 指向 v${V}`)
}

// 5) 文档里指向旧标签的安装命令
for (const f of ['README.md', 'README.en.md', 'NEXT-STEPS.md', 'PUBLISHING.md', 'SHARE.md', 'KNOWN-ISSUE-install.md']) {
  const path = join(root, f)
  if (!existsSync(path)) continue
  let s = read(f)
  const before = s
  s = s.replace(/dsh-liuyao#v\d+\.\d+\.\d+/g, `dsh-liuyao#v${V}`)
  s = s.replace(/dsh-liuyao-\d+\.\d+\.\d+\.tar\.gz/g, `dsh-liuyao-${V}.tar.gz`)
  s = s.replace(/dsh-liuyao-\d+\.\d+\.\d+\.tgz/g, `dsh-liuyao-${V}.tgz`)
  s = s.replace(/releases\/download\/v[\d.]+\//g, `releases/download/v${V}/`)
  s = s.replace(/releases\/tag\/v[\d.]+\b/g, `releases/tag/v${V}`)
  if (s !== before) {
    write(f, s)
    console.log(`  ✓ ${f} 安装命令 → v${V}`)
  }
}

// 6) 提交给官方市场的条目文件。这里只是本地留档——**真正生效的那一份是 PR 分支上的**，
//    所以改版后除了改这里，还要把它推到 awesome-dsh-plugin 的 PR 分支。
//    忘了这一步的后果很具体：市场展示的 tarball 直链会指向上一版的标签。
{
  const p = 'submit/data/plugins/LJXDSG12__dsh-liuyao.yml'
  if (existsSync(join(root, p))) {
    let s = read(p)
    const before = s
    s = s.replace(/dsh-liuyao-\d+\.\d+\.\d+\.tgz/g, `dsh-liuyao-${V}.tgz`)
    s = s.replace(/releases\/download\/v[\d.]+\//g, `releases/download/v${V}/`)
    // 描述里点名的版本号（如「v0.2.0 起支持网站版」）也要跟着走
    s = s.replace(/\bv\d+\.\d+\.\d+\b/g, `v${V}`)
    if (s !== before) {
      write(p, s)
      console.log(`  ✓ ${p} 版本 → v${V}（记得同步推到 PR 分支）`)
    }
  }
}

console.log('\n完成。请运行 scripts/preflight.mjs 与 test/run-all.mjs 复核。')
