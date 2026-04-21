import type { DomColorData } from './types.ts';

/**
 * JS expression evaluated inside the inspected page.
 * Walks the visible DOM, extracts computed color properties
 * and semantic structure hints for AI analysis.
 */
function buildExtractionExpression(): string {
	return `(function() {
	var MAX_ELEMENTS = 1500;
	var MAX_TEXT = 60;
	var results = [];
	var seen = 0;

	function rgbToHex(rgb) {
		if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
		var match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
		if (!match) return rgb;
		var r = parseInt(match[1]);
		var g = parseInt(match[2]);
		var b = parseInt(match[3]);
		return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	function getPath(el) {
		var parts = [];
		var cur = el;
		while (cur && cur !== document.body && parts.length < 5) {
			var tag = cur.tagName.toLowerCase();
			var id = cur.id ? '#' + cur.id : '';
			var cls = '';
			if (cur.classList && cur.classList.length > 0) {
				cls = '.' + Array.from(cur.classList).slice(0, 2).join('.');
			}
			parts.unshift(tag + id + cls);
			cur = cur.parentElement;
		}
		return parts.join(' > ');
	}

	var walker = document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_ELEMENT,
		null
	);

	var node = walker.currentNode;
	while (node && seen < MAX_ELEMENTS) {
		var el = node;
		var rect = el.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			var cs = getComputedStyle(el);
			var bg = rgbToHex(cs.backgroundColor);
			var color = rgbToHex(cs.color);
			var border = rgbToHex(cs.borderColor);
			var outline = rgbToHex(cs.outlineColor);

			var svgFill = null;
			var svgStroke = null;
			if (el instanceof SVGElement) {
				svgFill = rgbToHex(cs.fill) || el.getAttribute('fill');
				svgStroke = rgbToHex(cs.stroke) || el.getAttribute('stroke');
			}

			var colors = {};
			if (bg) colors.background = bg;
			if (color) colors.text = color;
			if (border && border !== bg) colors.border = border;
			if (outline && outline !== bg && outline !== 'invert') colors.outline = outline;
			if (svgFill && svgFill !== 'none') colors.fill = svgFill;
			if (svgStroke && svgStroke !== 'none') colors.stroke = svgStroke;

			if (Object.keys(colors).length > 0) {
				var text = (el.innerText || el.textContent || '').trim().substring(0, MAX_TEXT);
				var tag = el.tagName.toLowerCase();

				var attrs = {};
				if (el.id) attrs.id = el.id;
				if (el.className && typeof el.className === 'string' && el.className.length < 200) {
					attrs.class = el.className;
				}
				var role = el.getAttribute('role');
				if (role) attrs.role = role;
				var ariaLabel = el.getAttribute('aria-label');
				if (ariaLabel) attrs['aria-label'] = ariaLabel;

				results.push({
					tag: tag,
					text: text.replace(/\\s+/g, ' '),
					path: getPath(el),
					rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
					colors: colors,
					attributes: attrs
				});
				seen++;
			}
		}
		node = walker.nextNode();
	}

	return {
		pageTitle: document.title,
		url: location.href,
		elements: results
	};
})()`;
}

function evalInPage(expression: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		chrome.devtools.inspectedWindow.eval(expression, {}, (result, exInfo) => {
			if (exInfo?.isException) {
				reject(new Error(exInfo.value || 'Evaluation failed'));
			} else {
				resolve(result);
			}
		});
	});
}

export async function extractDomColors(): Promise<DomColorData> {
	return (await evalInPage(buildExtractionExpression())) as DomColorData;
}
