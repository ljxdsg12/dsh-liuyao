"""从 client/client.js 提取样式段，生成网页版 styles.css。

做法：原样搬运插件的样式，只在前面加一层主题变量定义（DSH 提供这些变量，
网页里没有 DSH，所以要自己定义）。这样网页与插件的视觉保持一致。
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
client = root / 'client' / 'client.js'
out = root / 'web' / 'styles.css'

src = client.read_text(encoding='utf-8')
lines = src.split('\n')

# 样式段：从 ".ly-panel{" 所在行往前找起点，到 "].join(\"\");" 为终点
start = None
end = None
for i, line in enumerate(lines):
    if start is None and line.strip().startswith('".ly-root') or line.strip().startswith('".ly-panel'):
        start = i
    if start is not None and '].join("");' in line:
        end = i
        break

if start is None or end is None:
    print('未定位到样式段，请检查 client.js 结构', file=sys.stderr)
    sys.exit(1)

block = lines[start:end + 1]
# 每行形如:  ".ly-panel{...}",
css_parts = []
for line in block:
    m = re.match(r'^\s*"(.*)",?\s*$', line)
    if m:
        css_parts.append(m.group(1))
    elif '].join' in line:
        break

css = '\n'.join(css_parts)
# 引号内的 \" 还原
css = css.replace('\\"', '"')

tokens = """/* ============================================================
   主题变量：插件里由 DSH 提供，网页版需要自己定义
   ============================================================ */
:root {
  --dsw-alias-bg-base: #ffffff;
  --dsw-alias-bg-layer-1: #f7f8fa;
  --dsw-alias-bg-layer-2: #ffffff;
  --dsw-alias-border-l1: #e8eaed;
  --dsw-alias-border-l2: #dcdfe4;
  --dsw-alias-label-primary: #1f2329;
  --dsw-alias-label-secondary: #646a73;
  --dsw-alias-brand-primary: #3370ff;
  --dsw-alias-state-business-primary: #3370ff;
  --dsw-alias-state-error-primary: #d83931;
  --dsw-alias-state-success-primary: #2ea121;
  --dsw-alias-state-warn-primary: #dc9b04;
  --dsw-radius-md: 8px;
  --dsw-radius-lg: 12px;
  --dsw-shadow-lv1: 0 1px 2px rgba(0, 0, 0, .05);
  --dsw-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* 深色模式：跟随系统 */
@media (prefers-color-scheme: dark) {
  :root {
    --dsw-alias-bg-base: #17181c;
    --dsw-alias-bg-layer-1: #1f2126;
    --dsw-alias-bg-layer-2: #232529;
    --dsw-alias-border-l1: #2f3238;
    --dsw-alias-border-l2: #3a3e45;
    --dsw-alias-label-primary: #e8eaed;
    --dsw-alias-label-secondary: #a2a7ad;
    --dsw-alias-brand-primary: #4a8cff;
    --dsw-alias-state-business-primary: #4a8cff;
    --dsw-alias-state-error-primary: #f56c6c;
    --dsw-alias-state-success-primary: #4ecb73;
    --dsw-alias-state-warn-primary: #e6a23c;
    --dsw-shadow-lv1: 0 1px 2px rgba(0, 0, 0, .3);
  }
}

/* ============================================================
   网页外壳（插件里由 DSH 的容器提供这些，网页需自己写）
   ============================================================ */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: 14px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  min-height: 100vh;
}
.ly-page { max-width: 1080px; margin: 0 auto; padding: 24px 18px 64px; }
.ly-footer {
  max-width: 1080px; margin: 0 auto; padding: 0 18px 40px;
  color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.9;
}
.ly-footer a { color: var(--dsw-alias-brand-primary); text-decoration: none; }
.ly-footer a:hover { text-decoration: underline; }

/* 插件里面板自带滚动容器；网页版直接铺开即可 */
.ly-panel { height: auto !important; overflow: visible !important; }
.ly-panel-body { min-height: 0 !important; padding: 0 !important; }

/* ============================================================
   以下为插件原有样式，原样搬运
   ============================================================ */
"""

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(tokens + css + '\n', encoding='utf-8')
print(f'已生成 {out}')
print(f'  提取样式 {len(css_parts)} 条，共 {len(css)} 字符')
print(f'  文件总计 {len(tokens) + len(css)} 字符')
