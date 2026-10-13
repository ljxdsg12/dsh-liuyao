// 给仓库设置 topics：先读现有，合并后写回（不覆盖已有的）
import { execFileSync } from 'node:child_process'

const PROXY = 'http://127.0.0.1:7897'
const REPO = 'LJXDSG12/dsh-liuyao'
const API = `https://api.github.com/repos/${REPO}`
const WANT = ['dsh-plugin', 'deepseek-harness', 'liuyao', 'dsh']

const curl = (args) => execFileSync('curl.exe', [
  '-sL', '--max-time', '30', '-x', PROXY,
  '-H', `Authorization: Bearer ${process.env.GH_TOKEN_TMP}`,
  '-H', 'Accept: application/vnd.github+json',
  '-H', 'X-GitHub-Api-Version: 2022-11-28',
  ...args,
], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })

const put = (url, body) => execFileSync('curl.exe', [
  '-sL', '--max-time', '30', '-x', PROXY, '-X', 'PUT',
  '-H', `Authorization: Bearer ${process.env.GH_TOKEN_TMP}`,
  '-H', 'Accept: application/vnd.github+json',
  '-H', 'X-GitHub-Api-Version: 2022-11-28',
  '-H', 'Content-Type: application/json',
  '-d', body, url,
], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })

const before = JSON.parse(curl([API])).topics ?? []
console.log(`现有 topics: ${before.length ? before.join(', ') : '（空）'}`)

const merged = [...new Set([...before, ...WANT])]
const res = JSON.parse(put(`${API}/topics`, JSON.stringify({ names: merged })))
const after = res.topics ?? []
console.log(`写入后 topics: ${after.join(', ')}`)
console.log('')

for (const t of WANT) {
  console.log(`  ${after.includes(t) ? '✓' : '✗'} ${t}`)
}
const missing = WANT.filter((t) => !after.includes(t))
console.log('')
console.log(missing.length === 0 ? '官方硬性要求（dsh-plugin topic）已满足' : `仍缺：${missing.join(', ')}`)
process.exit(missing.length === 0 ? 0 : 1)
