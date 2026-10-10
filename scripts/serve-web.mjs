// 本地预览服务器（零依赖，只服务 web/ 目录）
// 用途：在浏览器里看网站实际效果；也可用于局域网给朋友试用。
//
// 用法：
//   node scripts/serve-web.mjs            # 仅本机可访问 http://127.0.0.1:8090
//   node scripts/serve-web.mjs 3000       # 指定端口
//   node scripts/serve-web.mjs 3000 lan   # 允许局域网访问（朋友同网段可直接打开）
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web')
const port = Number(process.argv[2] ?? 8090)
const lan = String(process.argv[3] ?? '').toLowerCase() === 'lan'
const host = lan ? '0.0.0.0' : '127.0.0.1'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/index.html'

    // 防目录穿越：规范化后必须仍在 web/ 之内
    const target = normalize(join(root, pathname))
    if (!target.startsWith(root)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('403 越界')
      return
    }

    const info = await stat(target).catch(() => null)
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('404 未找到：' + pathname)
      return
    }

    const body = await readFile(target)
    res.writeHead(200, {
      'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('500 ' + error.message)
  }
})

server.listen(port, host, () => {
  console.log(`六爻网页版已启动：`)
  console.log(`  本机访问   http://127.0.0.1:${port}`)
  if (lan) {
    console.log(`  局域网访问  http://<你的内网IP>:${port}`)
    console.log(`             （用 ipconfig 查 IPv4 地址；需允许防火墙放行）`)
  }
  console.log(`\n服务目录：${root}`)
  console.log('按 Ctrl+C 停止')
})
