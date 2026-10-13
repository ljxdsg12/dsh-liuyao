// 向官方插件市场提交收录 PR：fork → 建分支 → 只加一个条目文件 → 开 PR
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PROXY = 'http://127.0.0.1:7897'
const TOKEN = process.env.GH_TOKEN_TMP
const UPSTREAM = 'awesome-dsh-plugin/awesome-dsh-plugin'
const FORK_OWNER = 'LJXDSG12'
const FORK = `${FORK_OWNER}/awesome-dsh-plugin`
const ENTRY_PATH = 'data/plugins/LJXDSG12__dsh-liuyao.yml'
const BRANCH = 'add-liuyao-plugin'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function api(method, path, body, { raw = false } = {}) {
  const args = [
    '-sL', '--max-time', '120', '-x', PROXY,
    '-X', method,
    '-H', `Authorization: Bearer ${TOKEN}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
  ]
  if (body !== undefined) {
    args.push('-H', 'Content-Type: application/json', '--data-raw', JSON.stringify(body))
  }
  args.push(`https://api.github.com${path}`)
  const out = execFileSync('curl.exe', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (raw) return out
  try { return JSON.parse(out) } catch { return { __raw: out } }
}

// ── 1. 读上游默认分支 ──
const upstream = api('GET', `/repos/${UPSTREAM}`)
if (!upstream.default_branch) {
  console.log(`  读上游失败：${JSON.stringify(upstream).slice(0, 400)}`)
  process.exit(1)
}
const base = upstream.default_branch
console.log(`── 1. 上游 ${UPSTREAM} 默认分支 = ${base} ──`)

// ── 2. fork（已存在就复用）──
console.log('\n── 2. fork ──')
let fork = api('GET', `/repos/${FORK}`)
if (fork.full_name) {
  console.log(`  已存在：${fork.full_name}（${fork.default_branch}）`)
} else {
  const created = api('POST', `/repos/${UPSTREAM}/forks`, { default_branch_only: true })
  if (!created.full_name) {
    console.log(`  fork 失败：${JSON.stringify(created).slice(0, 400)}`)
    process.exit(1)
  }
  fork = created
  console.log(`  已创建：${fork.full_name}`)
}
// fork 是异步建的，等它就绪
for (let i = 1; i <= 30; i++) {
  const probe = api('GET', `/repos/${FORK}`)
  if (probe.size !== undefined && probe.pushed_at) break
  await sleep(3000)
}
console.log(`  fork 就绪，大小 ${fork.size ?? '?'} KB`)

// ── 3. 取上游 base 分支的 HEAD sha ──
console.log('\n── 3. 建分支 ──')
const ref = api('GET', `/repos/${UPSTREAM}/git/ref/heads/${base}`)
const baseSha = ref.object?.sha
if (!baseSha) {
  console.log(`  取 base sha 失败：${JSON.stringify(ref).slice(0, 400)}`)
  process.exit(1)
}
console.log(`  上游 ${base} = ${baseSha.slice(0, 7)}`)

// 在 fork 里建同名分支（先建，让 PR 的 head 落在 fork 上）
const existing = api('GET', `/repos/${FORK}/git/ref/heads/${BRANCH}`)
if (existing.object?.sha) {
  console.log(`  分支 ${BRANCH} 已存在（${existing.object.sha.slice(0, 7)}），直接复用`)
} else {
  const made = api('POST', `/repos/${FORK}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: baseSha })
  if (!made.ref) {
    console.log(`  建分支失败：${JSON.stringify(made).slice(0, 400)}`)
    process.exit(1)
  }
  console.log(`  已建分叉分支 ${made.ref}`)
}

// ── 4. 只放这一个文件 ──
console.log('\n── 4. 写入条目文件 ──')
const content = readFileSync('submit/data/plugins/LJXDSG12__dsh-liuyao.yml', 'utf8')
const b64 = Buffer.from(content, 'utf8').toString('base64')
const current = api('GET', `/repos/${FORK}/contents/${ENTRY_PATH}?ref=${BRANCH}`)
const putBody = {
  message: 'Add dsh-liuyao plugin',
  content: b64,
  branch: BRANCH,
}
if (current.sha) putBody.sha = current.sha
const put = api('PUT', `/repos/${FORK}/contents/${ENTRY_PATH}`, putBody)
if (!put.commit?.sha) {
  console.log(`  写入失败：${JSON.stringify(put).slice(0, 500)}`)
  process.exit(1)
}
console.log(`  ✓ 提交 ${put.commit.sha.slice(0, 7)} → ${ENTRY_PATH}`)
console.log(`  文件大小 ${Buffer.byteLength(content, 'utf8')} 字节，${content.split('\n').length - 1} 行`)

// ── 5. 确认这个 PR 只动了一个文件 ──
const cmp = api('GET', `/repos/${UPSTREAM}/compare/${base}...${FORK_OWNER}:${BRANCH}`)
if (cmp.files) {
  console.log(`\n── 5. 相对上游的改动（官方要求一个 PR 只加一个文件）──`)
  console.log(`  提交数 ${cmp.commits?.length ?? '?'}，改动文件 ${cmp.files.length} 个`)
  for (const f of cmp.files) console.log(`    ${f.status}  ${f.filename}  (+${f.additions} -${f.deletions})`)
  if (cmp.files.length !== 1) console.log('  ⚠ 改动不止一个文件，官方 CI 会挑毛病')
}

// ── 6. 开 PR ──
console.log('\n── 6. 开 PR ──')
const prBody = [
  'Adds **dsh-liuyao**, a six-yao (I Ching) divination plugin.',
  '',
  'Plugin repository: https://github.com/LJXDSG12/dsh-liuyao',
  '',
  '- `dsh.bundle` declared in `package.json` (`./cordis.patch.yml`), plus `dsh.client.platform: web`',
  '- Repository is well past the 1-day age requirement; topic `dsh-plugin` is set',
  '- Zero npm dependencies — the host half imports only Node built-ins',
  '- No file writes, no credential reads; the browser half talks only to the local DSH host',
  '- 11 self-check suites pass (`npm test`); four screenshots declared in `screenshots.json`',
  '- `tarball` points at a GitHub release asset, pinned to the `v0.2.0` tag (not `latest/download/`)',
  '',
  'This PR adds exactly one file: `data/plugins/LJXDSG12__dsh-liuyao.yml`.',
].join('\n')

const pr = api('POST', `/repos/${UPSTREAM}/pulls`, {
  title: 'Add dsh-liuyao plugin',
  head: `${FORK_OWNER}:${BRANCH}`,
  base,
  body: prBody,
  maintainer_can_modify: true,
})
if (pr.number) {
  console.log(`  ✓ PR #${pr.number}`)
  console.log(`  ${pr.html_url}`)
  console.log(`  head=${pr.head?.label}  base=${pr.base?.label}  state=${pr.state}`)
} else {
  console.log(`  开 PR 失败：${JSON.stringify(pr).slice(0, 800)}`)
  process.exit(1)
}
