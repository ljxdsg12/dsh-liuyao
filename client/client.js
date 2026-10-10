window.__ModuleLoader__.load({
	id: "dsh-liuyao",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");
		var h = React.createElement;

		// 先天八卦（伏羲）方位：乾南居上，顺时针兑东南、离东、震东北、巽西南、坎西、艮西北、坤北
		var XIANTIAN = [
			{ name: "乾", bits: [1, 1, 1], angle: 0, direction: "南", element: "金", nature: "天" },
			{ name: "兑", bits: [1, 1, 0], angle: 45, direction: "东南", element: "金", nature: "泽" },
			{ name: "离", bits: [1, 0, 1], angle: 90, direction: "东", element: "火", nature: "火" },
			{ name: "震", bits: [1, 0, 0], angle: 135, direction: "东北", element: "木", nature: "雷" },
			{ name: "巽", bits: [0, 1, 1], angle: 225, direction: "西南", element: "木", nature: "风" },
			{ name: "坎", bits: [0, 1, 0], angle: 270, direction: "西", element: "水", nature: "水" },
			{ name: "艮", bits: [0, 0, 1], angle: 315, direction: "西北", element: "土", nature: "山" },
			{ name: "坤", bits: [0, 0, 0], angle: 180, direction: "北", element: "土", nature: "地" },
		];
		var HEXAGRAM_RING = [
			"乾为天", "泽天夬", "火天大有", "雷天大壮", "风天小畜", "水天需", "山天大畜", "地天泰",
			"天泽履", "兑为泽", "火泽睽", "雷泽归妹", "风泽中孚", "水泽节", "山泽损", "地泽临",
			"天火同人", "泽火革", "离为火", "雷火丰", "风火家人", "水火既济", "山火贲", "地火明夷",
			"天雷无妄", "泽雷随", "火雷噬嗑", "震为雷", "风雷益", "水雷屯", "山雷颐", "地雷复",
			"天风姤", "泽风大过", "火风鼎", "雷风恒", "巽为风", "水风井", "山风蛊", "地风升",
			"天水讼", "泽水困", "火水未济", "雷水解", "风水涣", "坎为水", "山水蒙", "地水师",
			"天山遁", "泽山咸", "火山旅", "雷山小过", "风山渐", "水山蹇", "艮为山", "地山谦",
			"天地否", "泽地萃", "火地晋", "雷地豫", "风地观", "水地比", "山地剥", "坤为地",
		];
		var POS_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
		// 摇卦取值：爻名、卦象符号、以及三枚铜钱的直观说明。
		// 记法：背为阳面（计 3）、字为阴面（计 2）；一背二字＝少阳(7)、二背一字＝少阴(8)、
		// 三背＝老阳(9·动)、三字＝老阴(6·动)。背用实心 ●、字用空心 ○。
		var YAO_INFO = {
			7: { label: "少阳", mark: "单", symbol: "▅▅▅▅▅", coins: "一背二字", coinsGlyph: "●○○", moving: false },
			8: { label: "少阴", mark: "拆", symbol: "▅▅　▅▅", coins: "二背一字", coinsGlyph: "●●○", moving: false },
			9: { label: "老阳", mark: "重", symbol: "▅▅▅▅▅", coins: "三背", coinsGlyph: "●●●", moving: true },
			6: { label: "老阴", mark: "交", symbol: "▅▅　▅▅", coins: "三字", coinsGlyph: "○○○", moving: true },
		};
		var YAO_ORDER = [7, 8, 9, 6];
		var YAO_LABEL = {
			6: "老阴 三字", 7: "少阳 一背二字", 8: "少阴 二背一字", 9: "老阳 三背",
		};
		// 下拉项文字：钱文 → 爻名 → 动静（保证符号只出现一次）
		function yaoOptionText(v) {
			var info = YAO_INFO[v];
			return info.coinsGlyph + "　" + YAO_LABEL[v] + (info.moving ? "（动）" : "（静）");
		}

		// 三枚铜钱的正反：背为阳面（实心 ●）、字为阴面（空心 ○）
		function coinChips(glyph, tone) {
			return h("span", { className: "ly-chips" }, glyph.split("").map(function (ch, i) {
				return h("span", {
					key: "c" + i,
					className: "ly-chip" + (ch === "●" ? " back" : "") + (tone === "dim" ? " dim" : ""),
				}, ch === "●" ? "背" : "字");
			}));
		}

		// ——————— 先天八卦底纹：铺在应用基础背景层上，永不遮盖内容 ———————
		// 缘由：.BynINW_frame 自带不透明背景 var(--dsw-alias-bg-base)，凡置于其后的元素一律不可见；
		// 凡置于其上的元素又会压住正文与对话框。故不以「上层浮层」实现，而把卦图作为
		// body（同为 --dsw-alias-bg-base）的固定背景底纹——它是绘制顺序里的第一层：
		// 不参与层级竞争、不接收指针事件、任何文字与对话框都天然在其之上。
		var BACKDROP_CLASS = "ly-bagua-backdrop";
		var BACKDROP_RULE = "liuyao-bagua-backdrop";

		function svgDataUri(svg) {
			return "url(\"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg) + "\")";
		}

		function diagramSvg(stroke, opacity) {
			var lines = [];
			lines.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="none">');
			lines.push('<g stroke="' + stroke + '" stroke-opacity="' + opacity + '" fill="none">');
			[86, 108, 196, 396, 430].forEach(function (r) {
				lines.push('<circle cx="500" cy="500" r="' + r + '" stroke-width="2"/>');
			});
			// 太极双鱼
			lines.push('<path stroke-width="2" d="M500 414 A43 43 0 0 1 500 500 A43 43 0 0 0 500 586 A86 86 0 0 1 500 414 Z"/>');
			lines.push('<circle cx="500" cy="457" r="13" stroke-width="2"/>');
			lines.push('<circle cx="500" cy="543" r="13" stroke-width="2"/>');
			// 六十四卦环
			for (var i = 0; i < HEXAGRAM_RING.length; i += 1) {
				var a = (i * 360) / 64;
				var rad = (a * Math.PI) / 180;
				var x = 500 + 150 * Math.sin(rad);
				var y = 500 - 150 * Math.cos(rad);
				lines.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="15" fill="' + stroke +
					'" fill-opacity="' + opacity + '" stroke="none" text-anchor="middle" font-family="serif" transform="rotate(' + a.toFixed(2) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">' + HEXAGRAM_RING[i] + '</text>');
			}
			// 八经卦：先天方位
			XIANTIAN.forEach(function (t) {
				var rad = (t.angle * Math.PI) / 180;
				var cx = 500 + 300 * Math.sin(rad);
				var cy = 500 - 300 * Math.cos(rad);
				var step = 22;
				for (var k = 0; k < 3; k += 1) {
					var y = cy + (1 - k) * step - step / 2;
					if (t.bits[k]) {
						lines.push('<rect x="' + (cx - 46) + '" y="' + y.toFixed(1) + '" width="92" height="13" rx="6" stroke-width="2"/>');
					} else {
						lines.push('<rect x="' + (cx - 46) + '" y="' + y.toFixed(1) + '" width="37" height="13" rx="6" stroke-width="2"/>');
						lines.push('<rect x="' + (cx + 9) + '" y="' + y.toFixed(1) + '" width="37" height="13" rx="6" stroke-width="2"/>');
					}
				}
				lines.push('<text x="' + cx.toFixed(1) + '" y="' + (cy + 86).toFixed(1) + '" font-size="34" fill="' + stroke +
					'" fill-opacity="' + opacity + '" stroke="none" text-anchor="middle" font-family="serif">' + t.name + '</text>');
			});
			lines.push('</g>');
			lines.push('<text x="500" y="952" font-size="26" fill="' + stroke + '" fill-opacity="' + opacity +
				'" text-anchor="middle" font-family="serif" letter-spacing="10">先天八卦·伏羲方位</text>');
			lines.push('</svg>');
			return lines.join("");
		}

		var SVG_LIGHT = diagramSvg("#1f2430", "0.075");
		var SVG_DARK = diagramSvg("#ffffff", "0.06");

		function isDarkTheme() {
			if (typeof document === "undefined" || !document.body) return false;
			if (document.body.hasAttribute("data-ds-dark-theme")) return true;
			if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
				try { return window.matchMedia("(prefers-color-scheme: dark)").matches === true } catch (error) { return false }
			}
			return false;
		}

		// 背景底纹只写 background 系列属性，绝不触碰 pointer-events / z-index，故不可能拦截点击。
		// 两种铺法：
		//   global —— 铺在 body（应用基础背景层）；仅当应用各列未自铺不透明底色时可见。
		//   columns —— 铺在应用自身的两列（侧栏列与中列）的背景层上；
		//              列背景永远在列内所有内容（正文、对话框）之下，因此绝不会压住文字。
		function elementFor(scope) {
			if (scope === "body") return document.body
			if (typeof document.querySelector !== "function") return null
			return document.querySelector('[class*="_sidebarCol"]') || document.querySelector('[class*="_centerCol"]')
		}

		function paintScope(scope, css) {
			var el = elementFor(scope)
			if (!el) return false
			el.style.backgroundImage = css;
			el.style.backgroundRepeat = "no-repeat";
			el.style.backgroundPosition = "center center";
			el.style.backgroundSize = "min(92vmin, 940px) min(92vmin, 940px)";
			el.style.backgroundAttachment = "fixed";
			el.setAttribute("data-" + BACKDROP_RULE, "");
			return true
		}

		function unpaintScope(scope) {
			var el = elementFor(scope)
			if (!el) return
			el.style.backgroundImage = "";
			el.style.backgroundRepeat = "";
			el.style.backgroundPosition = "";
			el.style.backgroundSize = "";
			el.style.backgroundAttachment = "";
			el.removeAttribute("data-" + BACKDROP_RULE);
		}

		// 全局模式只铺 body 的 background 系列属性（不触碰 pointer-events / z-index）。
		function applyBackdropGlobal() {
			if (typeof document === "undefined" || !document.body) return;
			paintScope("body", svgDataUri(isDarkTheme() ? SVG_DARK : SVG_LIGHT))
		}

		function clearBackdropGlobal() {
			if (typeof document === "undefined" || !document.body) return;
			unpaintScope("body")
		}

		// 按列模式：在插件自有样式表里以 class 选择器铺图，避免逐元素内联样式，且创建/销毁都干净。
		// 选择器用 class 子串匹配（如 [class*="_sidebarCol"]）：应用本体是 hash 化 CSS module，
		// 类名随构建变化，只匹配「有背景、能承载图片、且是列的祖先」的元素，避免误伤其它容器。
		function columnsRule(css) {
			var common = '{background-image:' + css + ';background-repeat:no-repeat;' +
				'background-position:center center;background-size:min(92vmin,940px) min(92vmin,940px);background-attachment:fixed}';
			return '[class*="_sidebarCol"]' + common + ',[class*="_centerCol"]' + common
		}

		function paintColumns(css) {
			if (typeof document === "undefined" || !document.head) return 0;
			var found = typeof document.querySelectorAll === "function"
				? document.querySelectorAll('[class*="_sidebarCol"],[class*="_centerCol"]')
				: [];
			for (var i = 0; i < found.length; i += 1) {
				if (found[i] !== document.body) found[i].setAttribute("data-" + BACKDROP_RULE, "");
			}
			return found.length
		}

		function clearColumns() {
			if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
			var nodes = document.querySelectorAll("[" + "data-" + BACKDROP_RULE + "]");
			for (var i = 0; i < nodes.length; i += 1) {
				var el = nodes[i];
				if (el === document.body) continue;
				el.removeAttribute("data-" + BACKDROP_RULE);
			}
		}

		function columnsRuleTag(css) {
			if (typeof document === "undefined" || !document.head) return null;
			var id = CSS_ID + "/backdrop";
			var tag = typeof document.querySelector === "function"
				? document.querySelector("style[data-plugin-css=" + JSON.stringify(id) + "]")
				: null;
			if (tag === null || tag === undefined) {
				tag = document.createElement("style");
				tag.dataset.plugin = name;
				tag.dataset.pluginCss = id;
				document.head.appendChild(tag);
			}
			tag.textContent = columnsRule(css);
			return tag;
		}

		var CSS = [
			// 面板内的卦图水印：置于面板内容之下（z-index:-1），文字与表格始终在其上。
			".ly-watermark{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1;",
			"display:flex;align-items:center;justify-content:center}",
			".ly-watermark svg{width:min(76vmin,780px);height:min(76vmin,780px);opacity:.07}",
			"body[data-ds-dark-theme] .ly-watermark svg{opacity:.1}",
			// 面板自身即滚动容器：应用的主面板槽位于 overflow:hidden 的网格列内，
			// 面板若不自带滚动，超出部分会被直接裁掉且无法滚动（表现为「画面不完整、滚不动」）。
			".ly-panel{position:relative;height:100%;min-height:0;overflow-y:auto;overflow-x:hidden;",
			"overscroll-behavior:contain;box-sizing:border-box;isolation:isolate}",
			// 定位块：至少一屏高，水印铺满可视区；内容正常参与滚动。
			".ly-panel-body{position:relative;min-height:100%;box-sizing:border-box;padding:18px 18px 32px}",
			".ly-wrap{max-width:1080px;margin:0 auto;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.7}",
			".ly-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}",
			".ly-title{font-size:20px;font-weight:600;letter-spacing:.12em}",
			".ly-sub{color:var(--dsw-alias-label-secondary);font-size:12px}",
			// —— 关于面板 ——
			".ly-about{border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);padding:14px 16px;margin-top:12px;",
			"background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.05))}",
			".ly-about-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".ly-about-name{font-size:16px;font-weight:600;letter-spacing:.04em}",
			".ly-about-ver{font-size:12px;color:var(--dsw-alias-brand-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:1px 8px}",
			".ly-about-lic{font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".ly-about-sec{margin-top:14px;min-width:0}",
			".ly-about-sec h4{margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:.04em}",
			".ly-about-ul{margin:0;padding-left:18px;color:var(--dsw-alias-label-secondary)}",
			".ly-about-ul li{margin:3px 0;overflow-wrap:anywhere}",
			".ly-about-row{display:flex;gap:10px;align-items:baseline;margin-top:4px;min-width:0;flex-wrap:wrap}",
			".ly-about-k{color:var(--dsw-alias-label-secondary);font-size:12px;flex:0 0 auto}",
			".ly-about-v{min-width:0;overflow-wrap:anywhere}",
			".ly-about-a{color:var(--dsw-alias-brand-primary);text-decoration:none;overflow-wrap:anywhere}",
			".ly-about-a:hover{text-decoration:underline}",
			".ly-about-wechat{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 4px}",
			".ly-about-code{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;",
			"background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 7px;overflow-wrap:anywhere}",
			// —— AI 断卦 ——
			".ly-ai{border-left:3px solid var(--dsw-alias-brand-primary);padding-left:12px;margin-top:10px}",
			".ly-ai-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}",
			".ly-ai-tag{font-size:12px;font-weight:600;letter-spacing:.06em;color:#fff;background:var(--dsw-alias-brand-primary);border-radius:999px;padding:2px 10px}",
			".ly-ai-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:ly-pulse 1s ease-in-out infinite}",
			"@keyframes ly-pulse{0%,100%{opacity:.25}50%{opacity:1}}",
			".ly-card{border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);padding:14px 16px;margin-top:14px;",
			"background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.05))}",
			".ly-opening{font-size:14px;line-height:2;color:var(--dsw-alias-label-primary);letter-spacing:.02em;",
			"border-left:3px solid var(--dsw-alias-state-business-primary);padding-left:12px;margin:2px 0}",
			".ly-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}",
			".ly-label{color:var(--dsw-alias-label-secondary);font-size:12px;min-width:76px}",
			".ly-input,.ly-select{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary);",
			"border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);padding:6px 9px;font:inherit;font-size:13px}",
			".ly-input:focus,.ly-select:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}",
			".ly-btn{background:var(--dsw-alias-state-business-primary);color:#fff;border:none;border-radius:var(--dsw-radius-md,8px);",
			"padding:7px 16px;font:inherit;font-size:13px;cursor:pointer;letter-spacing:.06em}",
			".ly-btn:hover{filter:brightness(1.08)}",
			".ly-btn[disabled]{opacity:.45;cursor:not-allowed}",
			".ly-btn.ghost{background:transparent;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2)}",
			".ly-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:8px;margin-top:8px}",
			// 爻槽位：标签行（爻位 + 已选爻的钱文）在上，下拉独占一行；
			// 一律 min-width:0 / max-width:100% ，长文案只在自己格子里截断，不会压到相邻格子。
			".ly-slot{overflow:hidden;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,9px);",
			"padding:8px 10px;font-size:12px;display:flex;flex-direction:column;gap:6px;",
			"min-width:0;max-width:100%;box-sizing:border-box}",
			".ly-slot.filled{border-style:solid;border-color:var(--dsw-alias-state-business-primary)}",
			".ly-slot-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}",
			".ly-slot-head>span:first-child{flex:none;font-weight:600}",
			".ly-slot-head .ly-chips{min-width:0;flex-wrap:wrap;justify-content:flex-end}",
			".ly-slot .ly-select{width:100%;max-width:100%;min-width:0;box-sizing:border-box;",
			"text-overflow:ellipsis;white-space:nowrap;overflow:hidden}",
			".ly-status{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;",
			"border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,9px);padding:8px 10px;font-size:12px;min-width:0}",
			".ly-coins{display:flex;gap:6px;margin-top:8px}",
			".ly-coin{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;",
			"font-size:12px;border:2px solid #b08d57;background:#e8d9b5;color:#5a4322;font-weight:600}",
			".ly-coin.back{background:#c9a227;color:#3a2a00}",
			".ly-coin.spin{animation:ly-spin .5s linear infinite}",
			"@keyframes ly-spin{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}",
			// 三枚铜钱的正反标记：背＝实心（阳面），字＝空心（阴面）
			".ly-chips{display:inline-flex;gap:3px;vertical-align:middle;margin-right:2px}",
			".ly-chip{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 4px;",
			"border-radius:10px;border:1.5px solid var(--dsw-alias-border-l2);background:transparent;",
			"color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;vertical-align:middle}",
			".ly-chip.back{border-color:#b08d57;background:#c9a227;color:#3a2a00;font-weight:600}",
			".ly-chip.dim{opacity:.6}",
			".ly-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}",
			".ly-table th,.ly-table td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;white-space:nowrap}",
			".ly-table th{background:var(--dsw-alias-bg-layer-1,#fafafa);font-weight:500;color:var(--dsw-alias-label-secondary);font-size:12px}",
			".ly-gua{font-family:ui-monospace,Consolas,monospace;letter-spacing:1px;font-size:13px}",
			".ly-mark{color:var(--dsw-alias-state-business-primary);font-weight:600}",
			".ly-dim{color:var(--dsw-alias-label-secondary)}",
			".ly-key{color:var(--dsw-alias-state-error-primary);font-weight:600}",
			".ly-good{color:var(--dsw-alias-state-success-primary,#1a7f37);font-weight:600}",
			".ly-tag{display:inline-block;font-size:11px;padding:0 5px;border-radius:5px;margin-left:4px;",
			"border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}",
			".ly-sec{margin-top:16px}",
			// 通俗总结块：配色区分于条文，先看结论
			".ly-summary{margin-top:16px;padding:14px 16px;border-radius:var(--dsw-radius-lg,12px);",
			"border:1px solid var(--dsw-alias-state-business-primary);",
			"background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, transparent)}",
			".ly-summary-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}",
			".ly-summary-tag{font-size:11px;padding:1px 7px;border-radius:6px;color:#fff;",
			"background:var(--dsw-alias-state-business-primary);letter-spacing:.08em}",
			".ly-summary-title{font-size:17px;font-weight:600;letter-spacing:.04em}",
			".ly-summary-line{font-size:14px;line-height:1.85;font-weight:500}",
			".ly-summary-p{margin:8px 0 0;font-size:13px;line-height:1.85;color:var(--dsw-alias-label-primary)}",
			".ly-summary-advice{margin-top:10px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l2)}",
			".ly-summary-advice-h{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);margin-bottom:4px}",
			".ly-summary-advice-i{font-size:13px;line-height:1.85}",
			// 一卦一断·追问对话框
			".ly-ask{margin-top:18px;padding:14px 16px;border-radius:var(--dsw-radius-lg,12px);",
			"border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,#fafafa)}",
			".ly-ask-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
			".ly-ask-rule{font-size:12px;font-weight:600;letter-spacing:.16em;padding:2px 9px;border-radius:6px;",
			"color:#fff;background:var(--dsw-alias-state-business-primary)}",
			".ly-ask-title{font-size:14px;font-weight:600}",
			".ly-ask-count{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".ly-ask-sub{margin-top:6px;font-size:12px;line-height:1.8;color:var(--dsw-alias-label-secondary)}",
			".ly-ask-empty{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary);opacity:.85}",
			".ly-ask-turns{margin-top:10px;display:flex;flex-direction:column;gap:8px}",
			".ly-ask-turn{border-radius:var(--dsw-radius-md,9px);padding:8px 10px;font-size:13px;line-height:1.8;",
			"border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-width:0}",
			".ly-ask-turn.user{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent);",
			"border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent)}",
			".ly-ask-who{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);margin-bottom:3px}",
			".ly-ask-text{white-space:pre-wrap;overflow-wrap:anywhere}",
			".ly-ask-text.refused{color:var(--dsw-alias-state-warn-primary)}",
			".ly-ask-text.failed{color:var(--dsw-alias-state-error-primary)}",
			".ly-ask-notice{margin-top:8px;font-size:12px;color:var(--dsw-alias-state-warn-primary)}",
			".ly-ask-form{display:flex;gap:8px;align-items:flex-end;margin-top:10px}",
			".ly-ask-input{flex:1;min-width:0;resize:vertical;background:var(--dsw-alias-bg-layer-2,#fff);",
			"color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);",
			"border-radius:var(--dsw-radius-md,8px);padding:7px 9px;font:inherit;font-size:13px;line-height:1.6;box-sizing:border-box}",
			".ly-ask-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}",
			".ly-ask-input[disabled]{opacity:.6;cursor:not-allowed}",
			".ly-sec h4{margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:.06em;",
			"border-left:3px solid var(--dsw-alias-state-business-primary);padding-left:8px}",
			".ly-src{color:var(--dsw-alias-label-secondary);font-size:11.5px}",
			".ly-err{color:var(--dsw-alias-state-error-primary);font-size:12px;margin-top:6px}",
			".ly-mono{font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap;font-size:12.5px;line-height:1.75}",
			".ly-foot{margin-top:16px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.9}",
			".ly-toggle{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}",
		].join("");

		// ——————— 先天八卦图（纯内联 SVG） ———————
		function trigramGlyph(cx, cy, halfWidth, bits, thickness, gap, color) {
			var lines = [];
			var step = thickness + gap;
			for (var i = 0; i < 3; i += 1) {
				var y = cy + (1 - i) * step - step / 2;
				if (bits[i]) {
					lines.push(h("rect", { key: "s" + i, x: cx - halfWidth, y: y, width: halfWidth * 2, height: thickness, rx: thickness / 2, fill: color }));
				} else {
					var seg = (halfWidth * 2 - gap) / 2;
					lines.push(h("rect", { key: "l" + i, x: cx - halfWidth, y: y, width: seg, height: thickness, rx: thickness / 2, fill: color }));
					lines.push(h("rect", { key: "r" + i, x: cx + halfWidth - seg, y: y, width: seg, height: thickness, rx: thickness / 2, fill: color }));
				}
			}
			return lines;
		}

		function trigramGroup(t, r, color) {
			var cx = 500 + r * Math.sin((t.angle * Math.PI) / 180);
			var cy = 500 - r * Math.cos((t.angle * Math.PI) / 180);
			var nodes = trigramGlyph(cx, cy, 46, t.bits, 11, 7, color);
			nodes.push(h("text", {
				key: "n", x: cx, y: cy + 78, textAnchor: "middle", fill: color,
				fontSize: 34, fontFamily: "serif", letterSpacing: 2,
			}, t.name));
			nodes.push(h("text", {
				key: "d", x: cx, y: cy + 104, textAnchor: "middle", fill: color, opacity: 0.75,
				fontSize: 17, fontFamily: "serif",
			}, t.nature + "·" + t.direction));
			return h("g", { key: "tri-" + t.name }, nodes);
		}

		function BaguaDiagram(props) {
			var color = props.color || "currentColor";
			var center = [];
			center.push(h("circle", { key: "c1", cx: 500, cy: 500, r: 86, fill: "none", stroke: color, strokeWidth: 1.2, opacity: 0.55 }));
			// 太极：双鱼以两段半圆拼合
			center.push(h("path", {
				key: "taiji", fill: color, opacity: 0.9,
				d: "M500 414 A43 43 0 0 1 500 500 A43 43 0 0 0 500 586 A86 86 0 0 1 500 414 Z",
			}));
			center.push(h("circle", { key: "d1", cx: 500, cy: 457, r: 13, fill: "var(--dsw-alias-bg-base)" }));
			center.push(h("circle", { key: "d2", cx: 500, cy: 543, r: 13, fill: color }));
			var ring = [];
			for (var i = 0; i < HEXAGRAM_RING.length; i += 1) {
				var a = (i * 360) / 64;
				var rr = 150;
				var x = 500 + rr * Math.sin((a * Math.PI) / 180);
				var y = 500 - rr * Math.cos((a * Math.PI) / 180);
				ring.push(h("text", {
					key: "hg" + i, x: x, y: y, textAnchor: "middle", fontSize: 12.5, fill: color, opacity: 0.85,
					fontFamily: "serif", transform: "rotate(" + a + " " + x + " " + y + ")",
				}, HEXAGRAM_RING[i]));
			}
			var rings = [
				h("circle", { key: "r1", cx: 500, cy: 500, r: 108, fill: "none", stroke: color, strokeWidth: 1, opacity: 0.4 }),
				h("circle", { key: "r2", cx: 500, cy: 500, r: 196, fill: "none", stroke: color, strokeWidth: 1, opacity: 0.4 }),
				h("circle", { key: "r3", cx: 500, cy: 500, r: 396, fill: "none", stroke: color, strokeWidth: 1, opacity: 0.35 }),
				h("circle", { key: "r4", cx: 500, cy: 500, r: 430, fill: "none", stroke: color, strokeWidth: 1.5, opacity: 0.25 }),
			];
			return h("svg", { viewBox: "0 0 1000 1000", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true" },
				rings,
				ring,
				XIANTIAN.map(function (t) { return trigramGroup(t, 300, color); }),
				h("g", { key: "core" }, center),
				h("text", {
					key: "t1", x: 500, y: 946, textAnchor: "middle", fontSize: 26, fill: color,
					fontFamily: "serif", letterSpacing: 8, opacity: 0.9,
				}, "先天八卦·伏羲方位"),
			);
		}

		// ——————— 与 Host 的通信 ———————
		// 走插件自有的 exact HTTP 端点（POST /dsh-liuyao/<endpoint>，JSON）。
		// 教训：曾用 Connection RPC 前缀通道，注册回调在运行时未触发，
		// 请求落到前端静态兜底处理器，只会得到 HTTP 405。
		var API_PREFIX = "/dsh-liuyao/";

		function endpointUrl(name) {
			var relative = (API_PREFIX + name).replace(/^\/+/, "");
			if (typeof document === "undefined") return "/" + relative;
			try { return new URL(relative, document.baseURI).pathname } catch (error) { return "/" + relative }
		}

		function post(name, payload) {
			return fetch(endpointUrl(name), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload === undefined ? {} : payload),
			}).then(function (res) {
				return res.text().then(function (text) {
					var body = null;
					try { body = text ? JSON.parse(text) : null } catch (error) { body = null }
					if (!res.ok || body === null || body.ok !== true) {
						throw new Error((body && body.error) || ("HTTP " + res.status + " " + endpointUrl(name)));
					}
					return body.value;
				});
			});
		}

		// 流式端点（NDJSON，逐行增量）：追问与 AI 断卦共用
		function postStream(name, payload, onEvent, signal) {
			return fetch(endpointUrl(name), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload === undefined ? {} : payload),
				...(signal ? { signal: signal } : {}),
			}).then(function (res) {
				if (!res.ok) {
					return res.text().then(function (text) {
						throw new Error("HTTP " + res.status + " " + (text || endpointUrl(name)));
					});
				}
				if (!res.body || typeof res.body.getReader !== "function") {
					return res.text().then(function (text) {
						text.split("\n").filter(Boolean).forEach(function (line) {
							try { onEvent(JSON.parse(line)) } catch (error) { /* 忽略半行 */ }
						});
					});
				}
				var reader = res.body.getReader();
				var decoder = new TextDecoder();
				var buffer = "";
				var pump = function () {
					return reader.read().then(function (step) {
						if (step.done) {
							if (buffer.trim() !== "") { try { onEvent(JSON.parse(buffer)) } catch (error) { /* 忽略 */ } }
							return;
						}
						buffer += decoder.decode(step.value, { stream: true });
						var lines = buffer.split("\n");
						buffer = lines.pop();
						lines.filter(function (l) { return l.trim() !== "" }).forEach(function (line) {
							try { onEvent(JSON.parse(line)) } catch (error) { /* 忽略半行 */ }
						});
						return pump();
					});
				};
				return pump();
			});
		}

		function makeApi() {
			return {
				config: function () { return post("config", {}) },
				opening: function () { return post("opening", {}) },
				toss: function () { return post("toss", {}) },
				cast: function (body) { return post("cast", body) },
				analyze: function (body) { return post("analyze", body) },
				selftest: function () { return post("selftest", {}) },
				about: function () { return post("about", {}) },
				analyzeAi: function (body, onEvent) { return postStream("analyze-ai", body, onEvent) },
			};
		}

		// ——————— 卦盘渲染 ———————
		function lineGlyph(yang) {
			return yang ? "\u2585\u2585\u2585\u2585\u2585" : "\u2585\u2585\u3000\u2585\u2585";
		}

		function ChartTable(props) {
			var chart = props.chart;
			var rows = [];
			for (var i = 5; i >= 0; i -= 1) {
				var m = chart.main.lines[i];
				var c = chart.changed ? chart.changed.lines[i] : null;
				var hidden = (m.hiddenSpirits && m.hiddenSpirits[0]) || null;
				rows.push(h("tr", { key: "r" + i },
					h("td", { className: "ly-dim" }, m.god),
					h("td", { className: "ly-dim" }, hidden ? shortRel(hidden.relative) + hidden.stem + hidden.branch + hidden.element : ""),
					h("td", null,
						m.moving ? h("span", { className: "ly-mark" }, m.value === 9 ? "○ " : "× ") : null,
						m.relative + m.stem + m.branch + m.element,
						m.shi ? h("span", { className: "ly-mark" }, " 世") : null,
						m.ying ? h("span", { className: "ly-mark" }, " 应") : null,
						m.kong ? h("span", { className: "ly-tag" }, "空") : null,
						m.monthBreak ? h("span", { className: "ly-tag" }, "月破") : null,
						m.changed && m.changed.backControl ? h("span", { className: "ly-tag ly-key" }, "回头克") : null,
						m.changed && m.changed.backGenerate ? h("span", { className: "ly-tag ly-good" }, "回头生") : null,
					),
					h("td", { className: "ly-gua" }, lineGlyph(m.yang)),
					h("td", { className: "ly-gua" }, c && c.moving ? lineGlyph(c.yang) : ""),
					h("td", null, c && c.moving
						? c.relative + c.stem + c.branch + c.element + (c.shi ? " 世" : c.ying ? " 应" : "")
						: ""),
				));
			}
			return h("table", { className: "ly-table" },
				h("thead", null, h("tr", null,
					h("th", null, "六神"), h("th", null, "伏神"), h("th", null, "本卦六亲纳甲"),
					h("th", null, "本卦"), h("th", null, "变卦"), h("th", null, "变卦六亲纳甲"),
				)),
				h("tbody", null, rows),
			);
		}

		function shortRel(rel) {
			return ({ 父母: "父", 兄弟: "兄", 子孙: "孙", 妻财: "财", 官鬼: "官" })[rel] || rel;
		}

		// 通俗总结：先说人话，再给条文依据
		function SummaryView(props) {
			var s = props.summary;
			if (!s) return null;
			return h("div", { className: "ly-summary" },
				h("div", { className: "ly-summary-head" },
					h("span", { className: "ly-summary-tag" }, "通俗总结"),
					h("span", { className: "ly-summary-title" }, s.title),
				),
				h("div", { className: "ly-summary-line" }, s.oneLine),
				(s.paragraphs || []).map(function (p, i) {
					return h("p", { className: "ly-summary-p", key: "sp" + i }, p);
				}),
				(s.advice || []).length
					? h("div", { className: "ly-summary-advice" },
						h("div", { className: "ly-summary-advice-h" }, "怎么办"),
						s.advice.map(function (a, i) {
							return h("div", { className: "ly-summary-advice-i", key: "sa" + i }, "· " + a);
						}),
					)
					: null,
				s.note ? h("div", { className: "ly-src", style: { marginTop: 8 } }, "（" + s.note + "）") : null,
			);
		}

		function AnalysisView(props) {
			var analysis = props.analysis;
			return h("div", null,
				analysis.sections.map(function (s, i) {
					return h("div", { className: "ly-sec", key: "sec" + i },
						h("h4", null, s.title, s.needTopic ? h("span", { className: "ly-tag" }, "需注明所问之事") : null),
						s.points.map(function (p, j) {
							return h("div", { key: "p" + j, style: { marginBottom: 4 } },
								h("div", null, "· " + p.text),
								p.source ? h("div", { className: "ly-src" }, "〔" + p.source + "〕") : null,
							);
						}),
					);
				}),
				h("div", { className: "ly-sec" },
					h("h4", null, "结论清单"),
					(analysis.verdict.items || []).map(function (it, i) {
						var cls = it.level === "凶" ? "ly-key" : it.level === "吉" ? "ly-good" : "ly-mark";
						return h("div", { key: "v" + i, style: { marginBottom: 3 } },
							h("span", { className: cls }, "[" + it.level + "] "),
							it.text,
							h("span", { className: "ly-src" }, " 〔" + it.source + "〕"),
						);
					}),
					(analysis.verdict.items || []).length === 0
						? h("div", { className: "ly-dim" }, "本卦无典籍明文可断之象，故不作吉凶断语。")
						: null,
					h("div", { className: "ly-src", style: { marginTop: 6 } }, analysis.verdict.note),
				),
				// 通俗总结放在最后：先看条文与结论，末尾再给白话归纳
				h(SummaryView, { summary: analysis.summary }),
			);
		}

		// 一卦一断：追问对话框
		function AskDialog(props) {
			var maxQ = typeof props.maxFollowUps === "number" && props.maxFollowUps > 0 ? props.maxFollowUps : 6;
			var [turns, setTurns] = React.useState([]);
			var [text, setText] = React.useState("");
			var [busy, setBusy] = React.useState(false);
			var [notice, setNotice] = React.useState("");

			var asked = turns.filter(function (t) { return t.role === "user" }).length;
			var limited = asked >= maxQ;

			function submit() {
				var q = text.trim();
				if (q === "" || busy) return;
				if (limited) { setNotice("【一卦一断】本卦追问已达上限（" + maxQ + " 次），要问新的事请另起一卦。"); return }
				setNotice("");
				setText("");
				setBusy(true);
				var history = turns.map(function (t) { return { role: t.role, text: t.text } });
				var base = turns.concat([{ role: "user", text: q }, { role: "assistant", text: "", pending: true }]);
				setTurns(base);
				var appendToLast = function (delta) {
					setTurns(function (prev) {
						var next = prev.slice();
						var last = next[next.length - 1];
						next[next.length - 1] = Object.assign({}, last, { text: last.text + delta, pending: false });
						return next;
					});
				};
				var settleLast = function (patch) {
					setTurns(function (prev) {
						var next = prev.slice();
						var last = next[next.length - 1];
						next[next.length - 1] = Object.assign({}, last, { pending: false }, patch || {});
						return next;
					});
				};
				postStream("ask", {
					time: props.time,
					yao: props.yao,
					topic: props.topic,
					question: q,
					history: history,
				}, function (evt) {
					if (!evt || typeof evt !== "object") return;
					if (evt.type === "delta" && typeof evt.text === "string") { appendToLast(evt.text); return }
					if (evt.type === "refused") { settleLast({ text: evt.text || "【一卦一断】此问不在本卦范围。", refused: true }); return }
					if (evt.type === "notice") { setNotice(evt.text || ""); return }
					if (evt.type === "error") { settleLast({ text: evt.text || "追问失败。", failed: true }); return }
					if (evt.type === "done") { settleLast({ text: evt.text || "" }); return }
				}).catch(function (error) {
					settleLast({ text: "追问请求失败：" + String(error && error.message ? error.message : error), failed: true });
				}).then(function () {
					setBusy(false);
				});
			}

			return h("div", { className: "ly-ask" },
				h("div", { className: "ly-ask-head" },
					h("span", { className: "ly-ask-rule" }, "一卦一断"),
					h("span", { className: "ly-ask-title" }, "就这一卦继续问"),
					h("span", { className: "ly-ask-count" }, "已问 " + asked + " / " + maxQ),
				),
				h("div", { className: "ly-ask-sub" },
					"只答与本次所问「", props.topic ? props.topic : "（未注明）", "」直接相关的问题，回答只依据本卦的爻象与条文。",
					"要问别的事，请另起一卦。"),
				turns.length === 0
					? h("div", { className: "ly-ask-empty" }, "例：三爻妻财动而化回头克，是不是说这笔钱留不住？／应期大概什么时候？")
					: h("div", { className: "ly-ask-turns" }, turns.map(function (t, i) {
						return h("div", { className: "ly-ask-turn " + t.role, key: "t" + i },
							h("div", { className: "ly-ask-who" }, t.role === "user" ? "你问" : "答（依本卦）"),
							h("div", { className: "ly-ask-text" + (t.refused ? " refused" : t.failed ? " failed" : "") },
								t.text === "" && t.pending ? "推演中…" : t.text),
						);
					})),
				notice ? h("div", { className: "ly-ask-notice" }, notice) : null,
				h("div", { className: "ly-ask-form" },
					h("textarea", {
						className: "ly-ask-input",
						rows: 2,
						value: text,
						placeholder: limited ? "本卦追问已达上限，请另起一卦" : "只问本卦相关的事，尽量点到具体爻位…",
						disabled: limited,
						onChange: function (e) { setText(e.target.value); },
						onKeyDown: function (e) {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit() }
						},
					}),
					h("button", {
						className: "ly-btn",
						onClick: submit,
						disabled: busy || limited || text.trim() === "",
					}, busy ? "推演中…" : "提问"),
				),
				h("div", { className: "ly-src" }, "Ctrl/⌘ + Enter 发送。回答由模型依本卦生成，凡卦中无据者不作推断。"),
			);
		}

		// 关于：版本、数据透明、咨询与赞助（纯静态展示；外链由浏览器打开，插件本身不发请求）
		function AboutRow(props) {
			return h("div", { className: "ly-about-row" },
				h("span", { className: "ly-about-k" }, props.k),
				h("span", { className: "ly-about-v" }, props.children),
			);
		}

		function AboutDialog(props) {
			var info = props.info;
			return h("div", { className: "ly-about" },
				h("div", { className: "ly-about-head" },
					h("span", { className: "ly-about-name" }, info.name),
					h("span", { className: "ly-about-ver" }, "v" + info.version),
					h("span", { className: "ly-about-lic" }, info.license),
					h("button", { className: "ly-btn ghost", style: { marginLeft: "auto" }, onClick: props.onClose }, "收起"),
				),
				h("div", { className: "ly-about-sec" },
					h("h4", null, "这是什么"),
					h("p", { className: "ly-summary-p" },
						"六爻纳甲排盘与断卦工具：先天八卦为盘、火珠林纳甲为法、增删卜易为断。排盘与断语逐条注明典籍出处，典籍无明文者不作推断。"),
					h(AboutRow, { k: "已验证环境" }, info.verifiedOn),
					h(AboutRow, { k: "项目地址" }, h("a", { className: "ly-about-a", href: info.repository, target: "_blank", rel: "noreferrer" }, info.repository)),
					info.feedbackUrl
						? h(AboutRow, { k: "问题反馈" }, h("a", { className: "ly-about-a", href: info.feedbackUrl, target: "_blank", rel: "noreferrer" }, info.feedbackUrl))
						: null,
				),
				h("div", { className: "ly-about-sec" },
					h("h4", null, "数据透明"),
					h("ul", { className: "ly-about-ul" }, (info.privacy || []).map(function (t, i) { return h("li", { key: "pv" + i }, t) })),
				),
				info.consultWechat
					? h("div", { className: "ly-about-sec" },
						h("h4", null, "咨询与赞助"),
						h("p", { className: "ly-summary-p" }, info.sponsorNote),
						h("div", { className: "ly-about-wechat" },
							h("span", { className: "ly-about-k" }, "微信号"),
							h("code", { className: "ly-about-code" }, info.consultWechat),
							h("button", {
								className: "ly-btn ghost",
								onClick: function () {
									try {
										if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
											navigator.clipboard.writeText(info.consultWechat);
										}
									} catch (error) { /* 复制失败不影响展示 */ }
								},
							}, "复制"),
						),
						h("div", { className: "ly-src" }, "加微信请注明来意（咨询／定制／赞助）。插件本身免费开源，赞助与咨询都自愿。"),
					)
					: null,
				h("div", { className: "ly-about-sec" },
					h("h4", null, "免责与边界"),
					h("ul", { className: "ly-about-ul" }, (info.disclaimer || []).map(function (t, i) { return h("li", { key: "dc" + i }, t) })),
				),
				h("div", { className: "ly-about-sec" },
					h("h4", null, "历法自检锚点"),
					h("div", { className: "ly-src" }, "干支历以天文算法推算（定气定朔），下列结果与通胜万年历逐字核对："),
					h("ul", { className: "ly-about-ul" }, (info.anchors || []).map(function (a, i) {
						return h("li", { key: "an" + i }, h("code", { className: "ly-about-code" }, a.date), " → " + a.expected);
					})),
					info.note ? h("div", { className: "ly-src" }, info.note) : null,
				),
			);
		}

		// AI 断卦：把模型输出的受限 Markdown 解析成可渲染的块。
		// 约定（见 src/analysis-ai.mjs 的 FORMAT_RULES）：
		//   ## 小标题       → 一个区块
		//   - [吉]/[凶]/[中] → 结论清单条目
		//   其他非空行       → 正文段落
		function parseAiMarkdown(text) {
			var secs = [];
			var cur = null;
			var lines = String(text || "").split("\n");
			for (var i = 0; i < lines.length; i += 1) {
				var line = lines[i];
				var t = line.trim();
				if (t === "") continue;
				var head = /^#{1,3}\s*(.+?)\s*$/.exec(t);
				if (head) {
					cur = { title: head[1], paras: [], items: [] };
					secs.push(cur);
					continue;
				}
				var item = /^[-*]\s*\[(吉|凶|中)\]\s*(.+)$/.exec(t);
				if (item) {
					if (!cur) { cur = { title: "结论", paras: [], items: [] }; secs.push(cur) }
					var body = item[2];
					var src = "";
					var sm = /〔([^〕]+)〕\s*$/.exec(body);
					if (sm) { src = sm[1]; body = body.slice(0, sm.index).trim() }
					cur.items.push({ level: item[1], text: body, source: src });
					continue;
				}
				if (!cur) { cur = { title: "", paras: [], items: [] }; secs.push(cur) }
				// 段内可能自带〔出处〕，单独提出以便用出处样式显示
				var srcm = /〔([^〕]+)〕\s*$/.exec(t);
				if (srcm) cur.paras.push({ text: t.slice(0, srcm.index).trim(), source: srcm[1] });
				else cur.paras.push({ text: t, source: "" });
			}
			return secs;
		}

		// AI 断卦结果渲染：流式过程中就按区块显示，不整段变一次
		function AiAnalysisView(props) {
			var text = props.text || "";
			var streaming = props.streaming;
			if (!text && !streaming) return null;
			var secs = parseAiMarkdown(text);
			return h("div", { className: "ly-ai" },
				h("div", { className: "ly-ai-head" },
					h("span", { className: "ly-ai-tag" }, "AI 断卦"),
					h("span", { className: "ly-sub" }, streaming ? "正在生成…" : "依典籍推理生成"),
					streaming ? h("span", { className: "ly-ai-dot" }) : null,
				),
				secs.map(function (s, i) {
					return h("div", { className: "ly-sec", key: "ai" + i },
						s.title ? h("h4", null, s.title) : null,
						s.paras.map(function (p, j) {
							return h("div", { key: "aip" + j, style: { marginBottom: 6 } },
								h("div", null, p.text),
								p.source ? h("div", { className: "ly-src" }, "〔" + p.source + "〕") : null,
							);
						}),
						s.items.map(function (it, j) {
							var cls = it.level === "凶" ? "ly-key" : it.level === "吉" ? "ly-good" : "ly-mark";
							return h("div", { key: "aii" + j, style: { marginBottom: 3 } },
								h("span", { className: cls }, "[" + it.level + "] "),
								it.text,
								it.source ? h("span", { className: "ly-src" }, " 〔" + it.source + "〕") : null,
							);
						}),
					);
				}),
			);
		}

		function nowString() {
			var d = new Date();
			var p2 = function (n) { return String(n).padStart(2, "0"); };
			return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes());
		}

		// ——————— 面板状态缓存 ———————
		// 面板在 DSH 里是随槽位挂载/卸载的：切到对话再切回来，组件会被重建，React 状态全部丢失，
		// 表现就是「退出对话后面板回到初始界面」。本模块由 ModuleLoader 加载一次并常驻，
		// 所以用一个模块级对象把界面状态留在内存里，重挂载时恢复。
		//
		// 有意不落盘（不写 localStorage）：一是「关于」里声明了不保存任何起卦记录，
		// 二是卦象属隐私内容，不该在磁盘留痕。刷新页面即清空。
		var boardCache = {
			seeded: false,
			opening: "",
			topic: "",
			time: "",
			mode: "manual",
			manual: ["", "", "", "", "", ""],
			tossed: [null, null, null, null, null, null],
			tossRound: 0,
			lastToss: null,
			result: null,
			aiMode: true,
			aiText: "",
			aiError: "",
			aiNotice: "",
			aiTiming: "",
		};

		function Board(props) {
			var api = props.api;
			// 首次进入取当前时间；之后复用缓存的时间，避免每次切回来时间都被改写
			if (!boardCache.seeded) { boardCache.time = nowString(); boardCache.seeded = true }
			// 组件是否仍挂载：流式回包可能在用户切走之后到达，此时只更新缓存、不 setState
			var mounted = React.useRef(true);
			React.useEffect(function () {
				mounted.current = true;
				return function () { mounted.current = false };
			}, []);
			/** 写状态 + 同步缓存（两条路径，保证切走再回来能看到同样的内容） */
			function put(key, value, setter) {
				boardCache[key] = typeof value === "function" ? value(boardCache[key]) : value;
				if (mounted.current) setter(boardCache[key]);
			}

			var [opening, setOpening] = React.useState(boardCache.opening);
			var [topic, setTopic] = React.useState(boardCache.topic);
			var [time, setTime] = React.useState(boardCache.time);
			var [mode, setMode] = React.useState(boardCache.mode);
			var [yao, setYao] = React.useState(boardCache.tossed);
			var [manual, setManual] = React.useState(boardCache.manual);
			var [tossState, setTossState] = React.useState({ round: boardCache.tossRound, busy: false, last: boardCache.lastToss });
			var [confirmEach, setConfirmEach] = React.useState(props.requireConfirmEach !== false);
			var [awaiting, setAwaiting] = React.useState(false);
			var [result, setResult] = React.useState(boardCache.result);
			var [error, setError] = React.useState("");
			var [busy, setBusy] = React.useState(false);
			var [showRaw, setShowRaw] = React.useState(false);
			var [about, setAbout] = React.useState(null);
			var [aboutOpen, setAboutOpen] = React.useState(false);
			// AI 断卦（默认走 AI；盘面事实仍由规则引擎算出后交给模型）
			var [aiMode, setAiMode] = React.useState(boardCache.aiMode);
			var [aiText, setAiText] = React.useState(boardCache.aiText);
			var [aiStreaming, setAiStreaming] = React.useState(false);
			var [aiError, setAiError] = React.useState(boardCache.aiError);
			var [aiNotice, setAiNotice] = React.useState(boardCache.aiNotice);
			var [aiTiming, setAiTiming] = React.useState(boardCache.aiTiming);

			React.useEffect(function () {
				var alive = true;
				if (!api) { setError("与 Host 的连接不可用"); return undefined; }
				if (!boardCache.opening) {
					api.opening().then(function (v) {
						boardCache.opening = v.opening;
						if (mounted.current) setOpening(v.opening);
					}).catch(function () {});
				}
				api.config().then(function (v) {
					if (alive && v && v.config) {
						setConfirmEach(v.config.requireConfirmEach !== false);
						boardCache.aiMode = v.config.analysisMode !== "rule";
						setAiMode(boardCache.aiMode);
						if (v.config.aboutEnabled !== false && typeof api.about === "function") {
							api.about().then(function (a) { if (alive && a && a.value) setAbout(a.value); }).catch(function () {});
						}
					}
				}).catch(function () {});
				return function () { alive = false; };
			}, [api]);

			var values = mode === "manual"
				? manual.map(function (s) { return s === "" ? null : Number(s); })
				: yao;

			var allFilled = values.every(function (v) { return v === 6 || v === 7 || v === 8 || v === 9; });

			function doToss() {
				setError("");
				setTossState(function (s) { return { round: s.round, busy: true, last: s.last }; });
				var roundNow = tossState.round;
				api.toss().then(function (v) {
					setYao(function (prev) {
						var next = prev.slice();
						next[roundNow] = v.value;
						boardCache.tossed = next;
						return next;
					});
					setTossState(function (s) {
						var next = { round: s.round + 1, busy: false, last: v };
						boardCache.tossRound = next.round;
						boardCache.lastToss = next.last;
						return next;
					});
					setAwaiting(false);
				}).catch(function (e) {
					setError(String(e.message || e));
					setTossState(function (s) { return { round: s.round, busy: false, last: s.last }; });
				});
			}

			function requestToss() {
				if (tossState.round >= 6) return;
				if (confirmEach) setAwaiting(true);
				else doToss();
			}

			function resetToss() {
				boardCache.tossed = [null, null, null, null, null, null];
				boardCache.tossRound = 0;
				boardCache.lastToss = null;
				setYao([null, null, null, null, null, null]);
				setTossState({ round: 0, busy: false, last: null });
				setAwaiting(false);
				boardCache.result = null;
				setResult(null);
				setError("");
				stopAi();
			}

			// —— AI 断卦的流式状态 ——
			// 流式过程不因面板卸载而中断：切走后回包只写缓存，切回来时能直接看到完整结果。
			var activeAi = React.useRef(null);

			function stopAi() {
				if (activeAi.current) { try { activeAi.current.abort() } catch (e) {} activeAi.current = null }
				boardCache.aiText = "";
				boardCache.aiError = "";
				boardCache.aiNotice = "";
				boardCache.aiTiming = "";
				if (mounted.current) { setAiText(""); setAiStreaming(false); setAiError(""); setAiNotice(""); setAiTiming("") }
			}

			function runAiAnalysis(body) {
				var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
				activeAi.current = controller;
				boardCache.aiText = "";
				boardCache.aiError = "";
				boardCache.aiNotice = "";
				boardCache.aiTiming = "";
				if (mounted.current) { setAiText(""); setAiError(""); setAiNotice(""); setAiTiming(""); setAiStreaming(true) }
				api.analyzeAi(body, function (ev) {
					if (ev.type === "delta") {
						boardCache.aiText += ev.text;
						if (mounted.current) setAiText(boardCache.aiText);
					} else if (ev.type === "notice") {
						boardCache.aiNotice = ev.text;
						if (mounted.current) setAiNotice(ev.text);
					} else if (ev.type === "error") {
						boardCache.aiError = ev.text || "AI 断卦失败";
						if (mounted.current) setAiError(boardCache.aiError);
					} else if (ev.type === "done" && ev.timing) {
						// 耗时展示：首字延迟反映「思考」开销，总时长反映输出长度
						var t = ev.timing;
						var secs = function (ms) { return ms === null || ms === undefined ? "—" : (ms / 1000).toFixed(1) + "s" };
						boardCache.aiTiming = "首字 " + secs(t.firstTokenMs) + "　共 " + secs(t.totalMs)
							+ "　输出 " + t.outputChars + " 字　详细度 " + (t.depth === "brief" ? "精简" : "完整")
							+ "　思考 " + (t.reasoning === "default" ? "跟随默认" : t.reasoning);
						if (mounted.current) setAiTiming(boardCache.aiTiming);
					}
				}, controller ? controller.signal : undefined)
					.then(function () { if (mounted.current) setAiStreaming(false) })
					.catch(function (e) {
						if (String(e && e.name) === "AbortError") return;
						boardCache.aiError = String((e && e.message) || e);
						if (mounted.current) { setAiError(boardCache.aiError); setAiStreaming(false) }
					});
			}

			function cast() {
				setError("");
				if (!allFilled) { setError("六爻未齐：请填写或摇出初爻至上爻共六爻（取值 6/7/8/9）"); return; }
				setBusy(true);
				stopAi();
				var body = { time: time, yao: values, topic: topic };
				api.cast(body)
					.then(function (v) {
						boardCache.result = v;
						setResult(v);
						setBusy(false);
						// AI 断卦：盘面（含规则引擎算出的事实）已就绪，交给模型推理
						if (aiMode) runAiAnalysis(body);
					})
					.catch(function (e) { setError(String(e.message || e)); setBusy(false); });
			}

			var tossCard = h("div", { className: "ly-card" },
				h("div", { className: "ly-row" },
					h("span", { className: "ly-label" }, "起卦方式"),
					h("button", {
						className: "ly-btn" + (mode === "manual" ? "" : " ghost"),
						onClick: function () { boardCache.mode = "manual"; setMode("manual"); },
					}, "手工输入卦象"),
					h("button", {
						className: "ly-btn" + (mode === "toss" ? "" : " ghost"),
						onClick: function () { boardCache.mode = "toss"; setMode("toss"); },
					}, "电脑摇卦（三枚铜钱）"),
				),
				mode === "manual"
					? h("div", null,
						h("div", { className: "ly-row" },
							h("span", { className: "ly-label" }, "起卦时间"),
							h("input", { className: "ly-input", value: time, onChange: function (e) { boardCache.time = e.target.value; setTime(e.target.value); }, placeholder: "YYYY-MM-DD HH:mm" }),
							h("button", { className: "ly-btn ghost", onClick: function () { boardCache.time = nowString(); setTime(boardCache.time); } }, "取当前时间"),
						),
						h("div", { className: "ly-grid" },
							POS_NAMES.map(function (p, i) {
								return h("div", { className: "ly-slot" + (manual[i] !== "" ? " filled" : ""), key: "m" + i },
									h("div", { className: "ly-slot-head" },
										h("span", null, p),
										manual[i] === ""
											? null
											: coinChips(YAO_INFO[Number(manual[i])].coinsGlyph),
									),
									h("select", {
										className: "ly-select",
										value: manual[i],
										onChange: function (e) {
											setManual(function (prev) {
												var next = prev.slice();
												next[i] = e.target.value;
												boardCache.manual = next;
												return next;
											});
										},
									},
										h("option", { value: "" }, "— 请选择 —"),
										YAO_ORDER.map(function (v) { return h("option", { key: v, value: String(v) }, yaoOptionText(v)); }),
									),
								);
							}),
						),
					)
					: h("div", null,
						h("div", { className: "ly-row" },
							h("span", { className: "ly-label" }, "起卦时间"),
							h("input", { className: "ly-input", value: time, onChange: function (e) { boardCache.time = e.target.value; setTime(e.target.value); } }),
							h("button", { className: "ly-btn ghost", onClick: function () { boardCache.time = nowString(); setTime(boardCache.time); } }, "取当前时间"),
							h("label", { className: "ly-toggle" },
								h("input", { type: "checkbox", checked: confirmEach, onChange: function (e) { setConfirmEach(e.target.checked); } }),
								"每抛一次前确认",
							),
						),
						h("div", { className: "ly-src", style: { marginTop: 6 } }, "模拟抛三枚铜钱，正反由系统加密随机数决定，每爻独立随机；三背为老阳○、三字为老阴×、两背一字为少阴、一背二字为少阳。"),
						h("div", { className: "ly-status", style: { marginTop: 8 } },
							h("span", null, "第 " + Math.min(tossState.round + 1, 6) + " / 6 爻　" + POS_NAMES[Math.min(tossState.round, 5)]),
							h("span", { className: "ly-dim" }, tossState.round >= 6 ? "六爻已齐" : (awaiting ? "待确认" : "未抛")),
						),
						h("div", { className: "ly-coins" },
							(tossState.last ? tossState.last.coins : ["—", "—", "—"]).map(function (c, i) {
								return h("div", {
									key: "coin" + i,
									className: "ly-coin" + (c === "背" ? " back" : "") + (tossState.busy ? " spin" : ""),
								}, c);
							}),
							tossState.last
								? h("div", { style: { alignSelf: "center", marginLeft: 8 } },
									h("span", { className: "ly-mark" }, tossState.last.value + " " + tossState.last.name),
									h("span", { className: "ly-dim" }, "　" + tossState.last.description))
								: null,
						),
						h("div", { className: "ly-row" },
							awaiting
								? h("span", null,
									h("button", { className: "ly-btn", onClick: doToss, disabled: tossState.busy }, "开始抛第 " + (tossState.round + 1) + " 爻"),
									h("button", { className: "ly-btn ghost", style: { marginLeft: 8 }, onClick: function () { setAwaiting(false); } }, "先不抛"),
								)
								: h("button", {
									className: "ly-btn",
									onClick: requestToss,
									disabled: tossState.busy || tossState.round >= 6,
								}, tossState.round >= 6 ? "六爻已齐" : "摇第 " + (tossState.round + 1) + " 爻"),
							h("button", { className: "ly-btn ghost", onClick: resetToss }, "重新摇卦"),
						),
						h("div", { className: "ly-grid" },
							POS_NAMES.map(function (p, i) {
								var v = yao[i];
								return h("div", { className: "ly-slot" + (v !== null ? " filled" : ""), key: "y" + i },
									h("div", { className: "ly-slot-head" },
										h("span", null, p),
										v === null
											? h("span", { className: "ly-dim" }, "未抛")
											: coinChips(YAO_INFO[v].coinsGlyph),
									),
									v === null
										? null
										: h("span", { className: "ly-mark" }, YAO_INFO[v].label + (YAO_INFO[v].moving ? "（动）" : "（静）")),
								);
							}),
						),
					),
				h("div", { className: "ly-row" },
					h("span", { className: "ly-label" }, "所问之事"),
					h("input", {
						className: "ly-input", style: { minWidth: 280 }, value: topic,
						placeholder: "如：问今年财运 / 问考试能否通过 / 问与某人合作",
						onChange: function (e) { boardCache.topic = e.target.value; setTopic(e.target.value); },
					}),
					h("button", { className: "ly-btn", onClick: cast, disabled: busy || !allFilled }, busy ? "排盘中…" : "起卦 / 排盘"),
				),
				error ? h("div", { className: "ly-err" }, error) : null,
			);

			return h("div", { className: "ly-panel" },
				h("div", { className: "ly-panel-body" },
					h("div", { className: "ly-watermark", "aria-hidden": "true" }, h(BaguaDiagram, { color: "var(--dsw-alias-label-primary)" })),
					h("div", { className: "ly-wrap" },
					h("div", { className: "ly-head" },
						h("div", { className: "ly-title" }, "六爻·纳甲"),
						h("div", { className: "ly-sub" }, "先天八卦为盘　火珠林纳甲为法　增删卜易为断"),
						about
							? h("button", {
								className: "ly-btn ghost",
								style: { marginLeft: "auto", alignSelf: "center" },
								onClick: function () { setAboutOpen(function (v) { return !v }) },
							}, aboutOpen ? "收起关于" : "关于")
							: null,
					),
					aboutOpen && about ? h(AboutDialog, { info: about, onClose: function () { setAboutOpen(false) } }) : null,
					opening ? h("div", { className: "ly-card" }, h("div", { className: "ly-opening" }, opening)) : null,
					tossCard,
					result
						? h("div", { className: "ly-card" },
							h("div", { className: "ly-head" },
								h("div", { className: "ly-title", style: { fontSize: 16 } }, result.chart.main.name),
								result.chart.changed
									? h("div", { className: "ly-sub" }, "之 " + result.chart.changed.name)
									: h("div", { className: "ly-sub" }, "六爻安静"),
								h("div", { className: "ly-sub" }, result.chart.main.palace.palace + "宫·" + result.chart.main.palace.stageName),
							),
							h("div", { className: "ly-mono" }, result.text.split("\n").slice(0, 5).join("\n")),
							h(ChartTable, { chart: result.chart }),
							h("div", { className: "ly-row" },
								h("span", { className: "ly-label" }, "旺衰"),
								h("span", { className: "ly-dim" }, result.chart.main.lines.map(function (l) {
									return l.positionName + l.scores.total + "(" + l.scores.verdict + ")";
								}).join("　")),
							),
							h("div", { className: "ly-row" },
								h("button", { className: "ly-btn ghost", onClick: function () { setShowRaw(!showRaw); } }, showRaw ? "隐藏原始排盘" : "查看原始排盘文本"),
							),
							showRaw ? h("pre", { className: "ly-mono", style: { marginTop: 8 } }, result.text) : null,
							// 断卦方式切换：AI 由模型依典籍推理；规则为内置引擎（离线、零 token）
							h("div", { className: "ly-row", style: { marginTop: 4 } },
								h("span", { className: "ly-label" }, "断卦方式"),
								h("button", {
									className: "ly-btn" + (aiMode ? "" : " ghost"),
									onClick: function () {
										boardCache.aiMode = true; setAiMode(true);
										if (!aiText && !aiStreaming) runAiAnalysis({ time: time, yao: values, topic: topic });
									},
								}, "AI 断卦"),
								h("button", {
									className: "ly-btn" + (aiMode ? " ghost" : ""),
									onClick: function () { stopAi(); boardCache.aiMode = false; setAiMode(false) },
								}, "规则断卦"),
								// 有意不提供「重新生成」：断卦须可复现——同一卦同一问应得同一断。
								// 允许重生成等于允许「重算到满意为止」，与「不许迎合」直接相违。
								// 要重来请重新起卦：那是新的占问，不是把同一卦刷到顺眼。
							),
							aiMode
								? h("div", null,
									aiError
										? h("div", { className: "ly-card" },
											h("div", { className: "ly-key" }, "AI 断卦未能完成"),
											h("div", { style: { marginTop: 6 } }, aiError),
											h("div", { className: "ly-src" }, "可切换到「规则断卦」查看内置规则引擎的结果。"))
										: h(AiAnalysisView, { text: aiText, streaming: aiStreaming }),
									aiNotice ? h("div", { className: "ly-src" }, aiNotice) : null,
									// 耗时：首字延迟反映思考开销，总时长反映输出长度 —— 便于判断该调哪个旋钮
									aiTiming ? h("div", { className: "ly-src", style: { marginTop: 6 } }, aiTiming) : null,
								)
								: h(AnalysisView, { analysis: result.analysis }),
							// 一卦一断：解读之后的追问对话框
							props.followUpEnabled === false
								? null
								: h(AskDialog, {
									time: time,
									yao: values,
									topic: topic,
									maxFollowUps: props.maxFollowUps,
								}),
						)
						: null,
					h("div", { className: "ly-foot" },
						"断卦依据：《增删卜易》《卜筮正宗》《黄金策》《易冒》《易隐》（曹九锡）《火珠林》（题麻衣道者）《周易应用经验学》（秦伦诗）。",
						h("br"),
						"旺相休囚依月建五行，十二长生依五行寄生十二宫，化进化退依同气六支次序，四库四马依支局，六神依日干起例，纳音依六十甲子纳音，旬空依日辰旬首；凡典籍无明文者，不作推断。",
					),
					),
				),
			);
		}

		// 侧栏图标
		function PanelIcon() {
			return h("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
				h("rect", { x: 1.5, y: 2, width: 13, height: 1.6, rx: 0.8, fill: "currentColor" }),
				h("rect", { x: 1.5, y: 5.2, width: 5.6, height: 1.6, rx: 0.8, fill: "currentColor" }),
				h("rect", { x: 8.9, y: 5.2, width: 5.6, height: 1.6, rx: 0.8, fill: "currentColor" }),
				h("rect", { x: 1.5, y: 8.4, width: 13, height: 1.6, rx: 0.8, fill: "currentColor" }),
				h("rect", { x: 1.5, y: 11.6, width: 5.6, height: 1.6, rx: 0.8, fill: "currentColor" }),
				h("rect", { x: 8.9, y: 11.6, width: 5.6, height: 1.6, rx: 0.8, fill: "currentColor" }),
			);
		}

		// ——————— 插件体 ———————
		var name = "dsh-liuyao";
		var inject = ["slots"];
		var CSS_ID = "dsh-liuyao/client.css";

		// 客户端包没有 styles.insert：自建 <style data-plugin>，由模块系统在停用/HMR 时回收。
		function injectStyles() {
			if (typeof document === "undefined" || !document.head) return;
			var existing = document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]");
			if (existing !== null && existing.textContent === CSS) return;
			var tag = existing || document.createElement("style");
			tag.dataset.plugin = name;
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			if (existing === null) document.head.appendChild(tag);
		}

		function apply(ctx, config) {
			var settings = Object.assign({ boardBackground: true, coinAnimation: true, requireConfirmEachToss: true }, config || {});
			injectStyles();

			// 背景底纹：只写 background 系列属性（绘制顺序第一层），不占层级、不接事件。
			// mode: auto（默认，按环境自选）｜ global（铺 body）｜ columns（铺应用两列）｜ off
			if (settings.boardBackground !== false && settings.backgroundMode !== "off") {
				ctx.effect(function () {
					var mode = settings.backgroundMode || "auto";
					var useColumns = mode === "columns" || mode === "auto";

					var paint = function () {
						var css = svgDataUri(isDarkTheme() ? SVG_DARK : SVG_LIGHT);
						if (useColumns) {
							paintColumns(css);
							columnsRuleTag(css);
						} else {
							applyBackdropGlobal()
						}
					};

					paint();
					// 主题切换（明/暗）时换用对应墨色的同一张图
					var observer = typeof MutationObserver === "function"
						? new MutationObserver(function () { paint() })
						: null;
					if (observer && typeof document !== "undefined" && document.body) {
						observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
					}
					return function () {
						if (observer) observer.disconnect();
						clearColumns();
						clearBackdropGlobal();
						if (typeof document !== "undefined" && typeof document.querySelector === "function") {
							var tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID + "/backdrop") + "]");
							if (tag && typeof tag.remove === "function") tag.remove();
						}
					};
				}, "liuyao: 先天八卦背景底纹")
			}

			var slots = ctx.get("slots");
			if (slots === undefined) return;
			var api = makeApi();
			var face = function () {
				return {
					api: api,
					requireConfirmEach: settings.requireConfirmEachToss !== false,
					followUpEnabled: settings.followUpEnabled !== false,
					maxFollowUps: settings.maxFollowUps,
				};
			};

			// 主面板：卦盘（侧栏面板图标可切换进入）。背景水印随面板渲染，位于面板内容之下。
			slots.inject("main", function () {
				return slots.register({ name: "main", key: "liuyao", label: function () { return "六爻"; }, inject: face }, Board);
			});

			// 侧栏面板图标
			slots.inject("sidebar.panellist", function () {
				return slots.register({ name: "sidebar.panellist", id: "liuyao", order: 40, label: function () { return "六爻"; } }, PanelIcon);
			});
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		exports.BaguaDiagram = BaguaDiagram;
		exports.SummaryView = SummaryView;
		return module.exports;
	},
});
