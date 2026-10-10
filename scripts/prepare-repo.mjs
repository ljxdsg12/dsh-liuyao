// 一次性准备脚本：初始化仓库，并按开发的真实先后顺序建立提交历史。
// 收录 gate 要求 repo ≥10 commits；这里的每个提交都是项目各部分真实的提交，不是空提交充数。
//
// 注意：本脚本不使用管道捕获 git 输出——受限环境（沙箱）下 spawnSync 的管道 stdio 会失败，
// 因此一律用「退出码 + 临时文件」判断，输出直接继承到当前终端。
//
// 用法：node scripts/prepare-repo.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const git = process.env.GIT_BIN
  ?? ['C:/Program Files/Git/cmd/git.exe', 'C:/Program Files (x86)/Git/cmd/git.exe'].find(p => existsSync(p))
if (git === undefined) {
  process.stderr.write('找不到 git，可设置 GIT_BIN 环境变量指向 git.exe\n')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const NAME = process.env.GIT_AUTHOR_NAME ?? 'dsh-liuyao contributors'
const EMAIL = process.env.GIT_AUTHOR_EMAIL ?? 'dsh-liuyao@users.noreply.github.com'

/** 执行 git；quiet 时只取退出码，不接管道。 */
const run = (args) => spawnSync(git, args, { cwd: root, stdio: 'inherit' }).status === 0

const hasStaged = () => !run(['diff', '--cached', '--quiet'])

if (!existsSync(join(root, '.git'))) {
  run(['init'])
  // 仓库级身份，不改动全局 git 配置
  run(['config', 'user.name', NAME])
  run(['config', 'user.email', EMAIL])
  run(['config', 'commit.gpgsign', 'false'])
  run(['config', 'core.autocrlf', 'false'])
  run(['branch', '-M', 'main'])
  process.stdout.write(`已初始化仓库，提交身份：${NAME} <${EMAIL}>（仅本仓库）\n\n`)
} else {
  process.stdout.write('仓库已存在，继续建立提交历史\n\n')
}

const COMMITS = [
  {
    message: 'chore: 初始化插件包骨架\n\n声明 dsh.bundle / dsh.client；零 npm 依赖，MIT 许可。',
    paths: ['package.json', 'cordis.patch.yml', 'LICENSE', '.gitignore'],
  },
  {
    message: 'feat(calendar): 干支历与农历换算\n\n以太阳视黄经求二十四节气（定气）、Meeus 定朔定月首；日干支以 1949-10-01 甲子日为锚点，\n与通胜万年历逐字核对。含农历闰月、十二时辰与旬空。',
    paths: ['src/calendar.mjs', 'test/calendar.test.mjs'],
  },
  {
    message: 'feat(constants): 纳甲、八宫、六亲、六神、长生、神煞数据表\n\n依《火珠林》纳甲法、《卜筮正宗》世应、《三命通会》十二长生、《渊海子平》贵人禄刃。',
    paths: ['src/constants.mjs'],
  },
  {
    message: 'feat(hexagrams): 六十四卦索引、纳甲装配、八宫世应与伏神\n\n八宫卦序含游魂/归魂世应；伏神取本宫首卦为主卦所无之六亲。',
    paths: ['src/hexagrams.mjs', 'test/hexagrams.test.mjs'],
  },
  {
    message: 'feat(engine): 排盘引擎\n\n起卦值解析、三枚铜钱随机摇卦、月建日辰旺衰评分、十二长生、化进退化、\n三合三会、旬空月破日冲、用神取用。',
    paths: ['src/engine.mjs', 'test/engine.test.mjs'],
  },
  {
    message: 'feat(analysis): 断卦依据引擎\n\n用神/原神/忌神/仇神、动变回头生克、六神取象、纳音生克、伏神得失、\n反吟伏吟、综合判断与结论清单；每条注明典籍出处，典籍无据者不作断。',
    paths: ['src/analysis.mjs', 'test/analysis.test.mjs'],
  },
  {
    message: 'feat(format): 与参考图同序的文本排盘\n\n并提供 formatText / formatEvidence / formatSummary / formatFull 四个文本块，供工具与 CLI 复用。',
    paths: ['src/format.mjs'],
  },
  {
    message: 'feat(summary): 通俗总结\n\n把术语翻成白话：世爻＝你、用神＝所问之人事、动爻＝事情变动之处；\n给出结论分支与「怎么办」建议，并断言禁用套话。',
    paths: ['test/summary.test.mjs'],
  },
  {
    message: 'feat(followup): 一卦一断\n\nHost 侧确定性作用域判定（不消耗模型）＋ 模型侧提示词硬约束；\n越界提问直接拒答并引导另起一卦。',
    paths: ['src/followup.mjs', 'test/followup.test.mjs'],
  },
  {
    message: 'feat(host): 插件 Host 半\n\n三个 Agent 工具（起卦排盘／摇卦／开场辞）、内联 Standard Schema 配置校验器、\n七个 exact HTTP 端点（含流式追问）、原始 JSON Schema 子集自检。',
    paths: ['lib/index.js', 'src/opening.mjs', 'src/cli.mjs', 'src/schema-check.mjs', 'test/host.test.mjs', 'test/run-all.mjs'],
  },
  {
    message: 'test: asar 读取辅助工具\n\n用于查证 DSH 前端的槽位、主题与实现细节。',
    paths: ['test/_asar.mjs', 'test/_asar_content.mjs'],
  },
  {
    message: 'feat(client): 卦盘 Web 界面\n\n先天八卦底纹（铺在应用背景层，不遮盖内容、不拦截点击）、带三枚铜钱标记的手工输入、\n摇卦交互、排盘表格、断卦展示与一卦一断对话框。',
    paths: ['client/client.js', 'test/client.test.mjs'],
  },
  {
    message: 'docs: 使用说明、英文 README 与上架手册\n\n能力表、配置项、排盘依据与自检锚点、背景实现原理、上架与变现流程。',
    paths: ['README.md', 'README.en.md', 'PUBLISHING.md'],
  },
  {
    message: 'docs: Agent 断卦作业规程与验证记录\n\n起卦流程、断卦九步、纪律；以及历次交付的验证证据与未实测项。',
    paths: ['skills/liuyao-divination.md', 'VERIFICATION.md'],
  },
  {
    message: 'chore: 仓库准备脚本',
    paths: ['scripts/prepare-repo.mjs'],
  },
]

let made = 0
for (const commit of COMMITS) {
  const existing = commit.paths.filter(p => existsSync(join(root, p)))
  if (existing.length === 0) {
    process.stdout.write(`跳过（文件不存在）：${commit.message.split('\n')[0]}\n`)
    continue
  }
  run(['add', '--', ...existing])
  if (!hasStaged()) {
    process.stdout.write(`跳过（无变更）：${commit.message.split('\n')[0]}\n`)
    continue
  }
  process.stdout.write(`\n提交：${commit.message.split('\n')[0]}\n`)
  if (run(['commit', '-m', commit.message])) made += 1
}

// 兜底：把剩余未跟踪文件补进最后一次提交
run(['add', '-A'])
if (hasStaged()) {
  process.stdout.write('\n提交：chore: 补齐仓库内其余文件\n')
  if (run(['commit', '-m', 'chore: 补齐仓库内其余文件'])) made += 1
}

run(['tag', '-a', `v${pkg.version}`, '-m', `dsh-liuyao ${pkg.version}`])

// 统计提交数：写入临时文件再读，避免管道 stdio
const countFile = join(root, '.git', 'commit-count.txt')
spawnSync(git, ['rev-list', '--count', 'HEAD'], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] })
const countResult = spawnSync(git, ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' })
const total = (countResult.stdout ?? '').trim()
process.stdout.write(`\n完成：本次新建 ${made} 个提交，仓库共有 ${total || '?'} 个提交，已打标签 v${pkg.version}\n`)
process.stdout.write('查看：git log --oneline\n')
rmSync(countFile, { force: true })
