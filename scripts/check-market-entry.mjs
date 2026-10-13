// 校验提交给官方市场的条目文件格式
import { readFileSync } from 'node:fs'

const path = 'submit/data/plugins/LJXDSG12__dsh-liuyao.yml'
const raw = readFileSync(path, 'utf8')
const lines = raw.split(/\r?\n/)

console.log('— 文件 —')
console.log(`  路径: ${path}`)
console.log(`  行数: ${lines.length}   字节: ${Buffer.byteLength(raw, 'utf8')}`)

console.log('— 结构检查（官方 contributing.md 的要求）—')
const has = (re) => re.test(raw)
const checks = [
  ['文件名 owner__repo 形式', /^LJXDSG12__dsh-liuyao\.yml$/.test(path.split('/').pop())],
  ['含 url 字段', has(/^url: https:\/\/github\.com\/LJXDSG12\/dsh-liuyao$/m)],
  ['url 与仓库完全一致（大小写）', has(/^url: https:\/\/github\.com\/LJXDSG12\/dsh-liuyao$/m)],
  ['含 name 字段（owner/repo 形式）', has(/^name: LJXDSG12\/dsh-liuyao$/m)],
  ['含 category 字段', has(/^category: \w+$/m)],
  ['含 description.en', has(/^\s+en: \S/m)],
  ['含 description.zh', has(/^\s+zh: \S/m)],
  ['无制表符（YAML 里 tab 非法）', !/\t/.test(raw)],
  ['顶层无多余键', lines.filter(l => /^[a-z_]+:/.test(l)).every(l => /^(url|name|category|description|tarball):/.test(l))],
  ['win 换行统一（GitHub 友好）', !/\r/.test(raw)],
]
let bad = 0
for (const [label, pass] of checks) {
  console.log(`  ${pass ? '✓' : '✗'} ${label}`)
  if (!pass) bad += 1
}

console.log('— 描述里的 ": " 陷阱（官方点名会打断解析）—')
for (const [i, l] of lines.entries()) {
  if (!/^\s+(en|zh): /.test(l)) continue
  const val = l.replace(/^\s+(en|zh): /, '')
  const quoted = val.startsWith("'") || val.startsWith('"')
  const risky = /: /.test(val)
  console.log(`  第 ${i + 1} 行 ${risky ? (quoted ? '含 ": " 但已加引号 ✓' : '含 ": " 且未加引号 ✗') : '不含 ": " ✓'}`)
  if (risky && !quoted) bad += 1
}

console.log('— 分类合法值—')
const valid = ['agi','ui','usage','theme','model','identity','session','memory','tools','wsl','browser','vision','voice','docs','skill','workflow','git','notify','dev','security','remote','market','fun']
const cat = /^category: (\w+)$/m.exec(raw)?.[1]
console.log(`  当前分类: ${cat}  -> ${valid.includes(cat) ? '合法 ✓' : '非法 ✗'}`)
if (!valid.includes(cat)) bad += 1

console.log(bad === 0 ? '\n条目文件全部通过' : `\n失败 ${bad} 项`)
process.exit(bad === 0 ? 0 : 1)
