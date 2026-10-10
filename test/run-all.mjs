// 运行全部自检套件（供 npm test 与 CI 使用）
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const suites = readdirSync(here)
  .filter(name => name.endsWith('.test.mjs'))
  .sort()

let failed = 0
for (const suite of suites) {
  const result = spawnSync(process.execPath, [join(here, suite)], { stdio: 'inherit' })
  if (result.status !== 0) {
    failed += 1
    process.stdout.write(`\n✗ ${suite} 失败（exit ${result.status}）\n`)
  }
}

process.stdout.write(`\n${suites.length - failed}/${suites.length} 个套件通过\n`)
process.exit(failed === 0 ? 0 : 1)
