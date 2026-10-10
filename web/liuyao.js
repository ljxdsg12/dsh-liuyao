// 六爻排盘 —— 纯函数层
// 与 DSH 插件的 lib/index.js（Host 半）保持一致，但把 HTTP 调用换成本地函数调用。
// 逻辑全部来自 web/core/（由 src/ 同步而来），本文件只做组装。

import { buildChart, tossThreeCoins, lineFromValue } from './core/engine.mjs'
import { analyze } from './core/analysis.mjs'
import { formatFull, formatText } from './core/format.mjs'
import { pickOpening, OPENING_LINES } from './core/opening.mjs'

// ---------------------------------------------------------------
// Buffer polyfill：core/format.mjs 内部用到 Buffer（Node 专有）。
// 浏览器没有，这里补一个最小实现，只覆盖被用到的 from(...).toString('base64')。
// 不能改写核心逻辑，所以用 polyfill 而不是去改 format.mjs。
// ---------------------------------------------------------------
if (typeof globalThis.Buffer === 'undefined') {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  globalThis.Buffer = {
    from(input) {
      let bytes
      if (typeof input === 'string') {
        bytes = new TextEncoder().encode(input)
      } else if (input instanceof Uint8Array) {
        bytes = input
      } else if (Array.isArray(input)) {
        bytes = new Uint8Array(input)
      } else {
        bytes = new Uint8Array(0)
      }
      return {
        toString(encoding) {
          if (encoding !== 'base64') return new TextDecoder().decode(bytes)
          let out = ''
          for (let i = 0; i < bytes.length; i += 3) {
            const b0 = bytes[i]
            const b1 = bytes[i + 1]
            const b2 = bytes[i + 2]
            out += B64[b0 >> 2]
            out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
            out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
            out += b2 === undefined ? '=' : B64[b2 & 63]
          }
          return out
        },
      }
    },
  }
}

// ---------------------------------------------------------------
// 随机源：加密安全。与插件用 Node 的 randomInt 等价，改用 Web Crypto。
// ---------------------------------------------------------------
export function cryptoRandom() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 4294967296
}

// ---------------------------------------------------------------
// 时间解析
// ---------------------------------------------------------------
export function parseTimeText(text) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/.exec(String(text).trim())
  if (!m) throw new Error('时间格式应为 2026-10-10 15:20')
  const [, y, mo, d, h, mi] = m
  return { year: +y, month: +mo, day: +d, hour: +h, minute: +mi }
}

export function nowText() {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

function normalizeYao(input) {
  if (!Array.isArray(input) || input.length !== 6) {
    throw new Error('六爻须为长度 6 的数组（自初爻至上爻）')
  }
  const yao = input.map(Number)
  yao.forEach((v) => lineFromValue(v)) // 非法值直接抛错
  return yao
}

// ---------------------------------------------------------------
// 主入口：排盘 + 断卦
// ---------------------------------------------------------------
export function cast({ timeText, yao, topic }) {
  const time = parseTimeText(timeText)
  const lineValues = normalizeYao(yao)
  const chart = buildChart({ time, lineValues })
  const analysis = analyze(chart, topic ?? '')
  const text = formatFull(chart, analysis)
  return { chart, analysis, text, plainText: formatText(chart) }
}

export function opening() {
  return { opening: pickOpening(cryptoRandom), count: OPENING_LINES.length }
}

export function toss() {
  const t = tossThreeCoins(cryptoRandom)
  return {
    coins: t.coins.map((c) => (c === 'back' ? '背' : '字')),
    coinFaces: t.coins,
    value: t.value,
    name: t.name,
    yang: t.yang,
    moving: t.moving,
    description: t.desc,
  }
}

// 起卦值说明（手工输入用）
export const YAO_INFO = {
  6: { name: '老阴', coins: '三字', marks: '○○○', moving: true },
  7: { name: '少阳', coins: '一背二字', marks: '●○○', moving: false },
  8: { name: '少阴', coins: '二背一字', marks: '●●○', moving: false },
  9: { name: '老阳', coins: '三背', marks: '●●●', moving: true },
}

export const YAO_ORDER = [7, 8, 9, 6]

export function yaoOptionText(value) {
  const info = YAO_INFO[value]
  return `${info.marks}　${info.name} ${info.coins}（${info.moving ? '动' : '静'}）`
}
