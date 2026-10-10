import { HEXAGRAMS, assembleLines, palaceOf, hexagramOfLines, hiddenSpirits } from '../src/hexagrams.mjs'

let fail = 0
const eq = (a, b, label) => {
  const ok = JSON.stringify(a) === JSON.stringify(b)
  if (!ok) { fail += 1; console.log(`✗ ${label}\n  期望 ${JSON.stringify(b)}\n  实际 ${JSON.stringify(a)}`) }
  else console.log(`✓ ${label}`)
}

console.log('--- 六十四卦表完整性 ---')
eq(HEXAGRAMS.length, 64, '共 64 卦')
const names = new Set(HEXAGRAMS.map(h => h.name))
eq(names.size, 64, '卦名无重复')
// 每卦纳甲应能装配
let assembled = 0
for (const h of HEXAGRAMS) {
  const lines = assembleLines(h.name)
  if (lines.length === 6 && lines.every(l => l.relative && l.branch && l.stem)) assembled += 1
}
eq(assembled, 64, '64 卦纳甲装配齐全')
// 每卦八宫归属
eq(HEXAGRAMS.every(h => palaceOf(h.name).palace), true, '64 卦皆有八宫归属')

console.log('--- 山火贲（对应参考图，验纳甲） ---')
const bi = assembleLines('山火贲')
eq(bi.map(l => l.stem + l.branch), ['己卯', '己丑', '己亥', '丙戌', '丙子', '丙寅'], '贲卦六爻纳甲')
eq(bi.map(l => l.relative), ['官鬼', '兄弟', '妻财', '兄弟', '妻财', '官鬼'], '贲卦六亲')
eq(bi.map(l => l.nayin?.name), ['城头土', '霹雷火', '平地木', '屋上土', '涧下水', '炉中火'], '贲卦纳音')
eq(palaceOf('山火贲'), { palace: '艮', element: '土', stage: 1, stageName: '一世', shi: 1, ying: 4 }, '贲卦属艮宫一世，世初应四')

console.log('--- 乾为天（八纯卦纳甲） ---')
const qian = assembleLines('乾为天')
eq(qian.map(l => l.stem + l.branch), ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'], '乾卦纳甲甲子壬午')
eq(qian.map(l => l.nayin?.name), ['海中金', '大溪水', '覆灯火', '杨柳木', '剑锋金', '大海水'], '乾卦纳音')
eq(palaceOf('乾为天'), { palace: '乾', element: '金', stage: 0, stageName: '六世（本宫）', shi: 6, ying: 3 }, '乾宫六世，世六应三')

console.log('--- 坤为地（八纯卦纳甲） ---')
const kun = assembleLines('坤为地')
eq(kun.map(l => l.stem + l.branch), ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'], '坤卦纳甲乙未癸丑')

console.log('--- 火山旅 / 泽山咸 / 雷山小过（巽兑艮宫核对） ---')
eq(palaceOf('火山旅').palace, '离', '火山旅属离宫')
eq(palaceOf('泽山咸'), { palace: '兑', element: '金', stage: 3, stageName: '三世', shi: 3, ying: 6 }, '泽山咸属兑宫三世，世三应六')
eq(palaceOf('雷山小过'), { palace: '兑', element: '金', stage: 6, stageName: '游魂（四世）', shi: 4, ying: 1 }, '雷山小过属兑宫游魂，世四应初')

console.log('--- 由六爻反查卦名 ---')
eq(hexagramOfLines([1, 0, 1, 0, 0, 1]).name, '山火贲', '101001 -> 山火贲')
eq(hexagramOfLines([1, 1, 1, 1, 1, 1]).name, '乾为天', '111111 -> 乾为天')
eq(hexagramOfLines([0, 0, 0, 0, 0, 0]).name, '坤为地', '000000 -> 坤为地')
eq(hexagramOfLines([0, 1, 1, 0, 0, 1]).name, '山风蛊', '011001 -> 山风蛊')

console.log('--- 伏神（本宫首卦，八宫卦变之法） ---')
const hidden = hiddenSpirits('山火贲', bi)
eq(hidden.pureName, '艮为山', '贲卦伏神取艮为山')
eq(hidden.hidden.map(h => `${h.relative}${h.stem}${h.branch}@${h.hideAt + 1}`), ['兄弟丙辰@1', '父母丙午@2', '子孙丙申@3'], '贲卦伏神：初兄弟丙辰、二父母丙午、三子孙丙申')
eq(hidden.hidden.map(h => h.provider), [false, true, true], '贲卦伏神中父母、子孙为主卦所无（可补用神）')
// 坤宫五世卦：验证五爻为主卦所无之六亲，伏神可补
const kuai = assembleLines('泽天夬')
eq(kuai.map(l => l.relative), ['妻财', '官鬼', '兄弟', '妻财', '子孙', '兄弟'], '泽天夬六亲（无父母）')
eq(palaceOf('泽天夬'), { palace: '坤', element: '土', stage: 5, stageName: '五世', shi: 5, ying: 2 }, '泽天夬属坤宫五世，世五应二')
const hid2 = hiddenSpirits('泽天夬', kuai)
eq(hid2.pureName, '坤为地', '夬卦属坤宫，伏神取坤为地')
eq(hid2.hidden.filter(h => h.provider).map(h => `${h.relative}${h.stem}${h.branch}@${h.hideAt + 1}`), ['父母乙巳@2'], '夬卦伏神中父母乙巳属主卦所无（可补用神）')

console.log(fail === 0 ? '\n全部通过' : `\n失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
