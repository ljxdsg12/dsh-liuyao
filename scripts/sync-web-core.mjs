// 把 src/ 下的核心模块复制到 web/core/，供浏览器直接 ES module 加载。
// 这些模块是纯 ESM、零 Node 依赖（唯一例外见下），所以复制即可，不改一行逻辑。
//
// 例外：format.mjs 内部用到 Buffer（Node 专有）。网页版由 app.js 提供最小 polyfill 兜底。
//
// 用法：node scripts/sync-web-core.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'src')
const to = join(root, 'web', 'core')

// 网站需要的模块：cli.mjs 是命令行工具，不进网站
const MODULES = [
  'constants.mjs',
  'calendar.mjs',
  'hexagrams.mjs',
  'engine.mjs',
  'analysis.mjs',
  'format.mjs',
  'opening.mjs',
  'followup.mjs',
]

mkdirSync(to, { recursive: true })

let copied = 0
const problems = []
for (const name of MODULES) {
  const src = join(from, name)
  if (!existsSync(src)) {
    problems.push(`${name} 不存在`)
    continue
  }
  const text = readFileSync(src, 'utf8')
  // 安全检查：确认没有 Node 专有依赖混进来
  const nodeImports = [...text.matchAll(/from\s+['"]node:([^'"]+)['"]/g)].map(m => m[1])
  if (nodeImports.length > 0) {
    problems.push(`${name} 引入了 Node 模块：${nodeImports.join(', ')}`)
    continue
  }
  copyFileSync(src, join(to, name))
  copied += 1
  const bufferUse = /\bBuffer\b/.test(text) ? '  （用到 Buffer，网页侧需 polyfill）' : ''
  console.log(`  ✓ ${name}${bufferUse}`)
}

// 写一个清单文件，便于确认网站打包了哪些模块
writeFileSync(join(to, 'README.txt'),
  '本目录由 scripts/sync-web-core.mjs 从 ../../src/ 自动生成，请勿手改。\n'
  + '改逻辑请改 src/，然后重新运行该脚本。\n\n'
  + '包含模块：\n' + MODULES.map(m => '  ' + m).join('\n') + '\n', 'utf8')

if (problems.length > 0) {
  console.error('\n✗ 有问题：')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log(`\n完成：复制 ${copied} 个模块到 web/core/`)
