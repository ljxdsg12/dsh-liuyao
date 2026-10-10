// 在 asar 内按内容检索：列出包含指定文本的条目（可限定路径子串）
import fs from 'node:fs'

const [asarPath, needle, pathFilter = ''] = process.argv.slice(2)
const fd = fs.openSync(asarPath, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const headerBuf = Buffer.alloc(headerSize)
fs.readSync(fd, headerBuf, 0, headerSize, 16)
const header = JSON.parse(headerBuf.toString('utf8'))
const base = 16 + headerSize

const files = []
const walk = (node, prefix) => {
  for (const [name, value] of Object.entries(node.files ?? {})) {
    const full = prefix ? `${prefix}/${name}` : name
    if (value.files) walk(value, full)
    else if (value.size > 0 && value.size < 4_000_000) files.push({ path: full, size: value.size, offset: Number(value.offset ?? 0) })
  }
}
walk(header, '')

const hits = []
for (const f of files) {
  if (pathFilter && !f.path.includes(pathFilter)) continue
  if (!/\.(js|mjs|cjs|ts|json)$/.test(f.path)) continue
  const buf = Buffer.alloc(f.size)
  fs.readSync(fd, buf, 0, f.size, base + f.offset)
  const text = buf.toString('utf8')
  const idx = text.indexOf(needle)
  if (idx >= 0) {
    hits.push({ path: f.path, size: f.size, around: text.slice(Math.max(0, idx - 160), idx + 160).replace(/\s+/g, ' ') })
  }
}
fs.closeSync(fd)
process.stdout.write(`命中 ${hits.length} 个条目：\n`)
for (const h of hits.slice(0, 25)) {
  process.stdout.write(`\n--- ${h.path} (${h.size})\n    …${h.around}…\n`)
}
