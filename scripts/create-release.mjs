// 用已存的 git 凭据调 GitHub API：强推 v0.2.0 标签、建 Release、传资产、验证直链
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'

const PROXY = 'http://127.0.0.1:7897'
const TOKEN = process.env.GH_TOKEN_TMP
const REPO = 'LJXDSG12/dsh-liuyao'
const API = `https://api.github.com/repos/${REPO}`
const TAG = 'v0.2.0'
const ASSET = process.argv[2]

const curl = (args, opts = {}) => execFileSync('curl.exe', [
  '-sL', '--max-time', '120', '-x', PROXY,
  '-H', `Authorization: Bearer ${TOKEN}`,
  '-H', 'Accept: application/vnd.github+json',
  '-H', 'X-GitHub-Api-Version: 2022-11-28',
  ...args,
], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...opts })

const curlCode = (args) => execFileSync('curl.exe', [
  '-s', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null',
  '-w', '%{http_code}', '--max-time', '120', '-x', PROXY, ...args,
], { encoding: 'utf8' })

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

// ── 1. 强推 v0.2.0 标签（远端停在旧提交）──
console.log('── 1. 推送 v0.2.0 标签 ──')
const local = execFileSync('git', ['rev-parse', `${TAG}^{commit}`], { encoding: 'utf8' }).trim()
console.log(`  本地 ${TAG} → ${local.slice(0, 7)}`)
try {
  const out = execFileSync('git', ['push', '--force', 'origin', `refs/tags/${TAG}`], {
    encoding: 'utf8', env: { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
  })
  console.log(`  ${out.trim().split('\n').filter(Boolean).join(' | ')}`)
} catch (e) {
  console.log(`  推送失败：${e.message}`)
  process.exit(1)
}

// ── 2. 建 Release ──
console.log('\n── 2. 建 Release ──')
const existing = JSON.parse(curl([`${API}/releases/tags/${TAG}`]) || '{}')
if (existing.id) {
  console.log(`  已存在 Release id=${existing.id}，先删除以便重建`)
  curl(['-X', 'DELETE', `${API}/releases/${existing.id}`])
}
const notes = readFileSync('RELEASE-NOTES-v0.2.0.md', 'utf8')
const payload = JSON.stringify({
  tag_name: TAG,
  name: `dsh-liuyao ${TAG}`,
  body: notes,
  draft: false,
  prerelease: false,
})
const created = JSON.parse(curl(['-X', 'POST', '-H', 'Content-Type: application/json', '--data-raw', payload, `${API}/releases`]))
if (!created.id) {
  console.log(`  建 Release 失败：${JSON.stringify(created).slice(0, 600)}`)
  process.exit(1)
}
console.log(`  ✓ id=${created.id}  tag=${created.tag_name}  draft=${created.draft}  prerelease=${created.prerelease}`)
console.log(`  URL: ${created.html_url}`)
console.log(`  正文字节: ${Buffer.byteLength(notes, 'utf8')}`)

// ── 3. 传资产 ──
console.log('\n── 3. 上传 tarball ──')
const name = ASSET.split(/[\\/]/).pop()
const size = statSync(ASSET).size
const localSha = sha256(ASSET)
console.log(`  本地文件: ${name}  ${size} 字节`)
console.log(`  SHA256  : ${localSha}`)
const up = JSON.parse(curl([
  '-X', 'POST',
  '-H', 'Content-Type: application/gzip',
  '--data-binary', `@${ASSET}`,
  `https://uploads.github.com/repos/${REPO}/releases/${created.id}/assets?name=${name}`,
]))
if (up.id) {
  console.log(`  ✓ 资产 id=${up.id}  name=${up.name}  size=${up.size}  state=${up.state}`)
} else {
  console.log(`  上传失败：${JSON.stringify(up).slice(0, 600)}`)
  process.exit(1)
}

// ── 4. 验证直链（不带令牌，模拟普通人）──
console.log('\n── 4. 验证公网直链（不带任何令牌）──')
const url = `https://github.com/${REPO}/releases/download/${TAG}/${name}`
const code = curlCode([url]).trim()
console.log(`  ${url}`)
console.log(`  HTTP ${code}`)
if (code !== '200') {
  console.log('  ✗ 直链不可用')
  process.exit(1)
}
// 下载回来比对 SHA256，确认拿到的就是本地那个文件
const tmp = process.env.TEMP + '\\verify-dl.tgz'
curlCode(['-o', tmp, url])
const dlSha = sha256(tmp)
console.log(`  下载回来 SHA256: ${dlSha}`)
console.log(`  ${dlSha === localSha ? '✓ 与本地文件逐字节一致' : '✗ 哈希不一致'}`)
process.exit(dlSha === localSha ? 0 : 1)
