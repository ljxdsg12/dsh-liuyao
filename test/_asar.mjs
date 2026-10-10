// 轻量 asar 读取：列出/导出指定条目，用于查证 DSH 前端实现细节
import fs from 'node:fs'
import path from 'node:path'

const [asarPath, outDir, mode, ...targets] = process.argv.slice(2)
const fd = fs.openSync(asarPath, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const headerBuf = Buffer.alloc(headerSize)
fs.readSync(fd, headerBuf, 0, headerSize, 16)
const header = JSON.parse(headerBuf.toString('utf8'))
const base = 16 + headerSize

const find = (p) => {
  let node = header
  for (const part of p.split('/')) {
    if (!node.files || !node.files[part]) return null
    node = node.files[part]
  }
  return node
}

if (mode === 'list') {
  const needle = targets[0].toLowerCase()
  const hits = []
  const walk = (node, prefix) => {
    for (const [name, value] of Object.entries(node.files ?? {})) {
      const full = prefix ? `${prefix}/${name}` : name
      if (value.files) walk(value, full)
      else if (full.toLowerCase().includes(needle)) hits.push(`${full} (${value.size})`)
    }
  }
  walk(header, '')
  process.stdout.write(hits.slice(0, 60).join('\n') + '\n')
} else {
  for (const t of targets) {
    const entry = find(t)
    if (!entry || entry.size === undefined) { process.stdout.write(`MISS ${t}\n`); continue }
    const buf = Buffer.alloc(entry.size)
    if (entry.size > 0) fs.readSync(fd, buf, 0, entry.size, base + Number(entry.offset ?? 0))
    const dest = path.join(outDir, t.replace(/^dsh\//, '').replace(/\//g, path.sep))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, buf)
    process.stdout.write(`OK ${t} (${entry.size})\n`)
  }
}
fs.closeSync(fd)
