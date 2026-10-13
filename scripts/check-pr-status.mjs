// 查 PR 的 CI 状态与评审意见
import { execFileSync } from 'node:child_process'

const PROXY = 'http://127.0.0.1:7897'
const TOKEN = process.env.GH_TOKEN_TMP
const UPSTREAM = 'awesome-dsh-plugin/awesome-dsh-plugin'
const PR = process.env.PR_NUMBER || '7252'

function api(path) {
  const out = execFileSync('curl.exe', [
    '-sL', '--max-time', '120', '-x', PROXY,
    '-H', `Authorization: Bearer ${TOKEN}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com${path}`,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  try { return JSON.parse(out) } catch { return { __raw: out } }
}

const pr = api(`/repos/${UPSTREAM}/pulls/${PR}`)
console.log(`── PR #${pr.number} ──`)
console.log(`  标题: ${pr.title}`)
console.log(`  状态: ${pr.state}   mergeable=${pr.mergeable}  merged=${pr.merged}`)
console.log(`  head: ${pr.head?.label} @ ${pr.head?.sha?.slice(0, 7)}`)
console.log(`  改动: +${pr.additions} -${pr.deletions}，${pr.changed_files} 个文件`)
console.log(`  URL : ${pr.html_url}`)

// CI 检查
console.log('\n── CI 检查（check runs）──')
const head = pr.head?.sha
const checks = api(`/repos/${UPSTREAM}/commits/${head}/check-runs`)
if (checks.check_runs?.length) {
  for (const c of checks.check_runs) {
    console.log(`  [${c.status}/${c.conclusion ?? '-'}] ${c.name}`)
    if (c.output?.summary) console.log(`      ${c.output.summary.split('\n').slice(0, 6).join('\n      ')}`)
  }
} else {
  console.log('  （还没有 check run，CI 可能尚未启动）')
}

// 合并状态（有些仓库用 status API 而非 check runs）
console.log('\n── commit status ──')
const st = api(`/repos/${UPSTREAM}/commits/${head}/status`)
console.log(`  state=${st.state}  statuses=${st.statuses?.length ?? 0}`)
for (const s of st.statuses ?? []) console.log(`  [${s.state}] ${s.context}`)

// 评论
console.log('\n── 评论 ──')
const comments = api(`/repos/${UPSTREAM}/issues/${PR}/comments`)
if (Array.isArray(comments) && comments.length) {
  for (const c of comments) {
    console.log(`  @${c.user.login}  ${c.created_at}`)
    console.log(`    ${c.body.split('\n').slice(0, 12).join('\n    ')}`)
  }
} else {
  console.log('  （暂无评论）')
}

console.log('\n── 评审 ──')
const reviews = api(`/repos/${UPSTREAM}/pulls/${PR}/reviews`)
if (Array.isArray(reviews) && reviews.length) {
  for (const r of reviews) console.log(`  @${r.user.login}  ${r.state}  ${(r.body ?? '').slice(0, 200)}`)
} else {
  console.log('  （暂无评审）')
}
