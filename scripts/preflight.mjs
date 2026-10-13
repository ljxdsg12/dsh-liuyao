// 发布前一致性检查：截图引用、包内容、仓库地址
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
let bad = 0
const ok = (cond, label, extra = '') => {
  if (cond) console.log(`  ✓ ${label}`)
  else { bad += 1; console.log(`  ✗ ${label}${extra ? ' :: ' + extra : ''}`) }
}
const pkg = JSON.parse(read('package.json'))

console.log('— README / 目录条目引用的截图 —')
for (const file of ['README.md', 'README.en.md', 'catalog-entry.json', 'screenshots.json']) {
  const text = read(file)
  const refs = [...text.matchAll(/assets\/screenshot-\d+\.png/g)].map(m => m[0])
  for (const ref of new Set(refs)) ok(existsSync(join(root, ref)), `${file} → ${ref}`)
}

console.log('— screenshots.json（收录指南指定的市场截图声明）—')
{
  const raw = JSON.parse(read('screenshots.json'))
  const list = Array.isArray(raw) ? raw : raw.screenshots
  ok(Array.isArray(list), 'screenshots.json 是数组或 {"screenshots": [...]}')
  ok(list.length >= 1 && list.length <= 8, '张数在 1–8 之间', String(list?.length))
  ok(list.every(p => !p.startsWith('/') && !p.includes('..')), '相对路径不跳出插件目录')
  ok(list.every(p => !/^https?:/.test(p)), '未使用绝对 URL（改图只需推自己的仓库）')
  for (const p of list) ok(existsSync(join(root, p)), `screenshots.json → ${p}`)
  ok(pkg.files.includes('screenshots.json'), 'files 白名单含 screenshots.json')
}

console.log('— assets 目录 —')
for (const n of [1, 2, 3, 4]) {
  const p = `assets/screenshot-${n}.png`
  const exists = existsSync(join(root, p))
  ok(exists, p)
  if (exists) {
    const b = readFileSync(join(root, p))
    const isPng = b.slice(0, 8).toString('hex') === '89504e470d0a1a0a'
    const isJpeg = b[0] === 0xff && b[1] === 0xd8
    const w = isPng ? b.readUInt32BE(16) : null
    const h = isPng ? b.readUInt32BE(20) : null
    console.log(`      实际编码: ${isPng ? `PNG ${w}x${h}` : isJpeg ? 'JPEG（扩展名为 .png，浏览器与 GitHub 均按内容识别，可正常显示）' : '未知'}`)
  }
}

console.log('— 包元数据 —')
ok(pkg.name === 'dsh-liuyao', 'name')
ok(/^\d+\.\d+\.\d+$/.test(pkg.version), 'version 为语义化版本', pkg.version)
ok(pkg.private === undefined, '未声明 private（可发布）')
ok(pkg.files.includes('assets'), 'files 白名单含 assets')
ok(pkg.homepage.includes('ljxdsg12/dsh-liuyao'), 'homepage 指向规范小写地址', pkg.homepage)
ok(pkg.repository.url.includes('ljxdsg12/dsh-liuyao'), 'repository 一致')
ok(pkg.bugs.url.includes('ljxdsg12/dsh-liuyao'), 'bugs 一致')
ok(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'dsh.bundle 已声明（收录 gate 门槛之一）')
ok(pkg.dsh?.client?.platform === 'web', 'dsh.client.platform = web')

console.log('— 版本号一致性 —')
const hostSource = read('lib/index.js')
const versionInHost = /export const VERSION = '([^']+)'/.exec(hostSource)?.[1]
ok(versionInHost === pkg.version, 'lib/index.js 的 VERSION 与 package.json 一致', `${versionInHost} vs ${pkg.version}`)

console.log('— 联系与赞助信息 —')
const wechat = /\[?'consultWechat', 'string', '([^']*)'/.exec(hostSource)?.[1]
ok(typeof wechat === 'string' && wechat.length > 0, '默认咨询微信号已配置', String(wechat))

console.log('— 目录条目 —')
const entry = JSON.parse(read('catalog-entry.json'))
for (const k of ['name', 'owner', 'url', 'description', 'category', 'install']) ok(Boolean(entry[k]), `字段 ${k}`)
ok(entry.description.en && entry.description.zh, '中英双语描述')
ok(Array.isArray(entry.capabilities) && entry.capabilities.length === 0, 'capabilities 为空（无红线）')
ok(entry.install.includes('github:ljxdsg12/dsh-liuyao#v' + pkg.version), 'install 使用已验证的 git 规格', entry.install)
ok(!entry.install.includes('releases/download'), 'install 不使用失效的 tarball 直链')
ok(entry.screenshots.length === 4, 'screenshots 4 张', String(entry.screenshots.length))
ok(entry.screenshots.every(u => u.includes('/v' + pkg.version + '/assets/')), 'screenshots 指向标签快照（跟随标签前移）')

console.log('— 面向用户的安装命令不得使用失效直链 —')
for (const file of ['README.md', 'README.en.md', 'RELEASE-NOTES-v0.2.0.md', 'NEXT-STEPS.md']) {
  const text = read(file)
  const usesBroken = /dsh plugin[^\n]*add "https:\/\/github\.com\/ljxdsg12\/dsh-liuyao\/releases\/download/.test(text)
  ok(!usesBroken, `${file} 未把失效直链写成安装命令`)
}
// 说明性文档里可以出现该 URL（用于解释问题），故不检查 KNOWN-ISSUE / PUBLISHING

console.log(bad === 0 ? '\n全部通过' : `\n失败 ${bad} 项`)
process.exit(bad === 0 ? 0 : 1)
