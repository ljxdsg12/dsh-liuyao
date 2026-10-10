// 先天八卦图 —— 纯内联 SVG，移植自插件 client/client.js 的 BaguaDiagram。
// 网页版用作页面底纹：固定定位、低透明度、pointer-events:none（不遮盖文字、不拦截点击）。

// 先天八卦（伏羲）方位：乾南居上，顺时针兑东南、离东、震东北、巽西南、坎西、艮西北、坤北
const XIANTIAN = [
  { name: '乾', bits: [1, 1, 1], angle: 0, direction: '南', element: '金', nature: '天' },
  { name: '兑', bits: [1, 1, 0], angle: 45, direction: '东南', element: '金', nature: '泽' },
  { name: '离', bits: [1, 0, 1], angle: 90, direction: '东', element: '火', nature: '火' },
  { name: '震', bits: [1, 0, 0], angle: 135, direction: '东北', element: '木', nature: '雷' },
  { name: '巽', bits: [0, 1, 1], angle: 225, direction: '西南', element: '木', nature: '风' },
  { name: '坎', bits: [0, 1, 0], angle: 270, direction: '西', element: '水', nature: '水' },
  { name: '艮', bits: [0, 0, 1], angle: 315, direction: '西北', element: '土', nature: '山' },
  { name: '坤', bits: [0, 0, 0], angle: 180, direction: '北', element: '土', nature: '地' },
]

const HEXAGRAM_RING = [
  '乾为天', '泽天夬', '火天大有', '雷天大壮', '风天小畜', '水天需', '山天大畜', '地天泰',
  '天泽履', '兑为泽', '火泽睽', '雷泽归妹', '风泽中孚', '水泽节', '山泽损', '地泽临',
  '天火同人', '泽火革', '离为火', '雷火丰', '风火家人', '水火既济', '山火贲', '地火明夷',
  '天雷无妄', '泽雷随', '火雷噬嗑', '震为雷', '风雷益', '水雷屯', '山雷颐', '地雷复',
  '天风姤', '泽风大过', '火风鼎', '雷风恒', '巽为风', '水风井', '山风蛊', '地风升',
  '天水讼', '泽水困', '火水未济', '雷水解', '风水涣', '坎为水', '山水蒙', '地水师',
  '天山遁', '泽山咸', '火山旅', '雷山小过', '风山渐', '水山蹇', '艮为山', '地山谦',
  '天地否', '泽地萃', '火地晋', '雷地豫', '风地观', '水地比', '山地剥', '坤为地',
]

const NS = 'http://www.w3.org/2000/svg'

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue
    node.setAttribute(k, String(v))
  }
  if (text !== undefined) node.textContent = text
  return node
}

function trigramGlyph(cx, cy, halfWidth, bits, thickness, gap, color) {
  const out = []
  const step = thickness + gap
  for (let i = 0; i < 3; i += 1) {
    const y = cy + (1 - i) * step - step / 2
    if (bits[i]) {
      out.push(svgEl('rect', { x: cx - halfWidth, y, width: halfWidth * 2, height: thickness, rx: thickness / 2, fill: color }))
    } else {
      const seg = (halfWidth * 2 - gap) / 2
      out.push(svgEl('rect', { x: cx - halfWidth, y, width: seg, height: thickness, rx: thickness / 2, fill: color }))
      out.push(svgEl('rect', { x: cx + halfWidth - seg, y, width: seg, height: thickness, rx: thickness / 2, fill: color }))
    }
  }
  return out
}

function trigramGroup(t, r, color) {
  const cx = 500 + r * Math.sin((t.angle * Math.PI) / 180)
  const cy = 500 - r * Math.cos((t.angle * Math.PI) / 180)
  const g = svgEl('g', {})
  for (const node of trigramGlyph(cx, cy, 46, t.bits, 11, 7, color)) g.append(node)
  g.append(svgEl('text', {
    x: cx, y: cy + 78, 'text-anchor': 'middle', fill: color,
    'font-size': 34, 'font-family': 'serif', 'letter-spacing': 2,
  }, t.name))
  g.append(svgEl('text', {
    x: cx, y: cy + 104, 'text-anchor': 'middle', fill: color, opacity: 0.75,
    'font-size': 17, 'font-family': 'serif',
  }, `${t.nature}·${t.direction}`))
  return g
}

/**
 * 生成先天八卦图 SVG。
 * @param {object} [options]
 * @param {string} [options.color]    线条与文字颜色，默认取主题色变量
 * @param {number} [options.opacity]  整体不透明度
 * @param {boolean} [options.decorative] 是否标记为纯装饰（默认 true，无障碍隐藏）
 */
export function createBaguaSvg(options = {}) {
  const color = options.color ?? 'var(--dsw-alias-label-primary)'
  const svg = svgEl('svg', {
    viewBox: '0 0 1000 1000',
    xmlns: NS,
    'aria-hidden': options.decorative === false ? null : 'true',
    focusable: 'false',
  })

  // 外圈参考圆
  for (const [r, w, o] of [[108, 1, 0.4], [196, 1, 0.4], [396, 1, 0.35], [430, 1.5, 0.25]]) {
    svg.append(svgEl('circle', { cx: 500, cy: 500, r, fill: 'none', stroke: color, 'stroke-width': w, opacity: o }))
  }

  // 六十四卦名环
  for (let i = 0; i < HEXAGRAM_RING.length; i += 1) {
    const a = (i * 360) / 64
    const rr = 150
    const x = 500 + rr * Math.sin((a * Math.PI) / 180)
    const y = 500 - rr * Math.cos((a * Math.PI) / 180)
    svg.append(svgEl('text', {
      x, y, 'text-anchor': 'middle', 'font-size': 12.5, fill: color, opacity: 0.85,
      'font-family': 'serif', transform: `rotate(${a} ${x} ${y})`,
    }, HEXAGRAM_RING[i]))
  }

  // 八卦
  for (const t of XIANTIAN) svg.append(trigramGroup(t, 300, color))

  // 中心太极
  svg.append(svgEl('circle', { cx: 500, cy: 500, r: 86, fill: 'none', stroke: color, 'stroke-width': 1.2, opacity: 0.55 }))
  svg.append(svgEl('path', {
    fill: color, opacity: 0.9,
    d: 'M500 414 A43 43 0 0 1 500 500 A43 43 0 0 0 500 586 A86 86 0 0 1 500 414 Z',
  }))
  svg.append(svgEl('circle', { cx: 500, cy: 457, r: 13, fill: 'var(--dsw-alias-bg-base)' }))
  svg.append(svgEl('circle', { cx: 500, cy: 543, r: 13, fill: color }))

  // 底部题字
  svg.append(svgEl('text', {
    x: 500, y: 946, 'text-anchor': 'middle', 'font-size': 26, fill: color,
    'font-family': 'serif', 'letter-spacing': 8, opacity: 0.9,
  }, '先天八卦'))

  return svg
}

/**
 * 把八卦图铺成页面底纹。
 * 实现要点（与插件一致的做法）：固定定位、pointer-events:none，
 * 因此它永远不遮盖文字、也不拦截点击。
 */
export function mountBackdrop(options = {}) {
  const layer = document.createElement('div')
  layer.className = 'ly-backdrop'
  layer.setAttribute('aria-hidden', 'true')
  layer.dataset.liuyaoBackdrop = '1'

  const svg = createBaguaSvg({ opacity: options.opacity })
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.opacity = String(options.opacity ?? 0.055)
  layer.append(svg)

  document.body.insertBefore(layer, document.body.firstChild)
  return layer
}
