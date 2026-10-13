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
// 早先这里断言「install 不得出现 releases/download」，理由是直链安装会报
// ERR_PNPM_MISSING_TARBALL_INTEGRITY。该结论已被实测推翻（钉住 tag 的直链连装三次成功），
// 所以改成：若用了直链，就必须钉住与当前版本一致的 tag——这才是真正会坏的地方。
if (entry.install.includes('releases/download')) {
  const tag = /releases\/download\/([^/]+)\//.exec(entry.install)?.[1]
  ok(tag === `v${pkg.version}`, 'install 的直链钉住了当前版本的 tag', `tag=${tag}`)
}
ok(entry.screenshots.length === 4, 'screenshots 4 张', String(entry.screenshots.length))
ok(entry.screenshots.every(u => u.includes('/v' + pkg.version + '/assets/')), 'screenshots 指向标签快照（跟随标签前移）')

console.log('— 面向用户的安装命令里的 Release 链接 —')
// 历史上这里连着写错过两次，故改成正面断言，而不是只挡某一种写法：
//   1. 曾经写「不要用本页附件的直链安装」——后来实测直链其实可用，那是错的；
//   2. 官方文档警告 latest/download/ 会「提交当天有效、发下一版就 404」，
//      所以任何 Release 链接都必须钉住 tag，且 tag 必须等于当前版本号。
for (const file of ['README.md', 'README.en.md', 'RELEASE-NOTES-v0.2.0.md', 'NEXT-STEPS.md']) {
  const text = read(file)
  const urls = [...text.matchAll(/https:\/\/github\.com\/ljxdsg12\/dsh-liuyao\/releases\/download\/[^\s"'`)]+/g)].map(m => m[0])
  for (const u of new Set(urls)) {
    const tag = /releases\/download\/([^/]+)\//.exec(u)?.[1]
    ok(tag !== 'latest', `${file} 的 Release 链接未用 latest（会随版本 404）`, u)
    ok(tag === `v${pkg.version}`, `${file} 的 Release 链接钉住的 tag 与当前版本一致`, `tag=${tag} version=v${pkg.version}`)
    const asset = u.split('/').pop()
    ok(asset.includes(pkg.version), `${file} 的资产名含当前版本号`, asset)
  }
  // 反面断言：「直链安装…不可用」这类句子会误伤「直链安装实测：✅ 可用（此前的不可用结论已推翻）」，
  // 于是改成正面要求——凡是提到这个旧错误的地方，必须同时说明它已被推翻。
  const mentionsOldError = /ERR_PNPM_MISSING_TARBALL_INTEGRITY/.test(text)
  if (mentionsOldError) {
    ok(/推翻|错的|更正|不再|已解决|过时|wrong|superseded|no longer|corrected/i.test(text),
      `${file} 提到旧的 integrity 报错时，说明了该结论已被推翻`)
  }
}

console.log('— 打包后包内文件清单（--pack 时执行，最慢但最准）—')
if (process.argv.includes('--pack')) {
  // 这一组是补一个真实踩过的洞：package.json 的 files 白名单曾漏掉 web/，
  // 于是「发布说明写了包里带网站版、而包里其实没有」。只查白名单里有没有
  // 某个名字是不够的——要拿真实打出来的包跟磁盘上的目录对账。
  let listing = ''
  try {
    const tgz = `dsh-liuyao-${pkg.version}.tgz`
    // pnpm 不一定在 PATH 里（本机就是），按几个常见位置找一下再退回到裸 pnpm
    const candidates = [
      process.env.PNPM_CJS,
      join(process.env.USERPROFILE ?? '', '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.cjs'),
      join(root, 'node_modules', '.bin', 'pnpm.cjs'),
    ].filter(Boolean)
    const pnpmCjs = candidates.find(p => existsSync(p))
    if (pnpmCjs) execFileSync(process.execPath, [pnpmCjs, 'pack'], { cwd: root, stdio: 'pipe' })
    else execFileSync('pnpm', ['pack'], { cwd: root, stdio: 'pipe' })
    listing = execFileSync('tar', ['-tzf', tgz], { cwd: root, encoding: 'utf8' })
  } catch (error) {
    ok(false, '能打出 tarball（需要 pnpm 与 tar）', String(error.message).slice(0, 160))
  }
  if (listing) {
    const inPack = new Set(listing.split('\n').map(l => l.trim().replace(/^package\//, '')).filter(Boolean))
    ok(inPack.size > 0, 'tarball 非空', `${inPack.size} 个条目`)
    // 凡是白名单里列出的目录，包内都必须真有东西
    for (const f of pkg.files) {
      const has = [...inPack].some(p => p === f || p.startsWith(f + '/'))
      ok(has, `白名单声明的 "${f}" 确实进了包`)
    }
    // 反向：磁盘上存在、且明显该发布的顶层目录，不得被白名单漏掉
    for (const dir of ['web', 'src', 'lib', 'client', 'skills', 'assets']) {
      if (!existsSync(join(root, dir))) continue
      const has = [...inPack].some(p => p.startsWith(dir + '/'))
      ok(has, `磁盘上的 ${dir}/ 进了包（不会被白名单静默漏掉）`)
    }
    // 文档里承诺过的东西必须在包里
    for (const p of ['screenshots.json', 'cordis.patch.yml', 'LICENSE', 'web/index.html', 'lib/index.js', 'client/client.js']) {
      ok(inPack.has(p), `发布说明承诺的 ${p} 在包内`)
    }
  }
} else {
  console.log('  （跳过；发布前请用 node scripts/preflight.mjs --pack 跑一次全量）')
}

console.log(bad === 0 ? '\n全部通过' : `\n失败 ${bad} 项`)
process.exit(bad === 0 ? 0 : 1)
