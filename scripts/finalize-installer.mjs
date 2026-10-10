// 修正批处理安装器的行尾与编码，并生成一份"干跑副本"用于验证。
// 背景：批处理文件必须是 CRLF 行尾；LF-only 会让 cmd 误解析，表现为"闪一下就没了"。
// 用法：node scripts/finalize-installer.mjs <installer.cmd> [dryRunOut.cmd]
import { readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2]
const dryOut = process.argv[3]

if (!src) {
  console.error('用法: node scripts/finalize-installer.mjs <installer.cmd> [dryRunOut.cmd]')
  process.exit(1)
}

let text = readFileSync(src, 'utf8')
// 归一为 LF 再统一转 CRLF，避免出现 CRLF+LF 混杂
text = text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')

// 批处理对非 ASCII 极其脆弱（cmd 的代码页处理不可靠），强制要求纯 ASCII
const nonAscii = [...text].filter(c => c.charCodeAt(0) > 127)
if (nonAscii.length > 0) {
  console.error(`✗ 含 ${nonAscii.length} 个非 ASCII 字符，批处理不接受：`)
  console.error('  ' + [...new Set(nonAscii)].slice(0, 10).join(' '))
  process.exit(1)
}

writeFileSync(src, text, 'ascii')
const crlf = (text.match(/\r\n/g) ?? []).length
const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length
console.log(`✓ 已修正行尾：CRLF ${crlf} 个，裸 LF ${bareLf} 个，非 ASCII 0 个`)

if (dryOut) {
  // 干跑副本：把真正执行安装的那行换成回显，并去掉 pause 以免阻塞
  const installLine = '"%DSH%" plugin --profile %PROFILE% add "%PKG%"'
  if (!text.includes(installLine)) {
    console.error('✗ 未找到安装命令行，脚本可能已改动：' + installLine)
    process.exit(1)
  }
  let dry = text.replace(installLine, 'echo [DRYRUN] target profile = %PROFILE%')
  dry = dry.replace(/^pause\r$/m, 'echo (dryrun end)\r')
  writeFileSync(dryOut, dry, 'ascii')
  console.log('✓ 已生成干跑副本：' + dryOut)
}
