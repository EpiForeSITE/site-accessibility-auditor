import type { ChartScanResult } from './types.ts';

const MIN_CHART_SIZE = 80;
const MIN_SVG_SHAPES = 3;

const CHART_KEYWORDS = [
	'chart',
	'graph',
	'plot',
	'diagram',
	'visualization',
	'visualisation',
	'histogram',
	'bar chart',
	'pie chart',
	'line chart',
	'scatter',
	'heatmap',
	'treemap',
	'sparkline',
	'gauge',
	'funnel',
	'sankey',
	'donut'
];

const LIBRARY_SELECTORS: Record<string, string> = {
	highcharts: '.highcharts-container, [data-highcharts-chart]',
	plotly: '.js-plotly-plot, .plotly',
	echarts: '[_echarts_instance_]',
	recharts: '.recharts-wrapper, .recharts-surface',
	'chart.js': '.chartjs-size-monitor, canvas.chartjs-render-monitor',
	vega: '.vega-embed',
	apexcharts: '.apexcharts-canvas',
	nivo: '.nivo-chart',
	victory: '.VictoryContainer',
	c3: '.c3',
	billboard: '.bb',
	amcharts: '[class*="amcharts"]',
	google: '.google-visualization-chart, .chart-container[id^="google"]'
};

function buildExtractionExpression(): string {
	return `(function() {
	var MIN_SIZE = ${MIN_CHART_SIZE};
	var MIN_SHAPES = ${MIN_SVG_SHAPES};
	var KEYWORDS = ${JSON.stringify(CHART_KEYWORDS)};
	var LIB_SELECTORS = ${JSON.stringify(LIBRARY_SELECTORS)};
	var charts = [];
	var seen = new Set();

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

	function getLabel(el) {
		return el.getAttribute('aria-label')
			|| el.getAttribute('alt')
			|| el.getAttribute('title')
			|| '';
	}

	function collectLabels(root, selector, limit) {
		var values = [];
		if (!root) return values;
		var nodes = root.querySelectorAll(selector);
		for (var i = 0; i < nodes.length && values.length < limit; i++) {
			var text = (nodes[i].textContent || '').replace(/\\s+/g, ' ').trim();
			if (text && values.indexOf(text) === -1) values.push(text.substring(0, 80));
		}
		return values;
	}

	function getFigcaption(el) {
		var figure = el.closest('figure');
		if (figure) {
			var cap = figure.querySelector('figcaption');
			if (cap) return cap.textContent.trim().substring(0, 120);
		}
		return '';
	}

	function hasChartKeyword(text) {
		if (!text) return false;
		var lower = text.toLowerCase();
		for (var i = 0; i < KEYWORDS.length; i++) {
			if (lower.indexOf(KEYWORDS[i]) !== -1) return true;
		}
		return false;
	}

	function countShapes(svg) {
		var shapes = svg.querySelectorAll('path, rect, circle, line, polyline, polygon, ellipse');
		return shapes.length;
	}

	function detectTableFallback(el) {
		var figure = el.closest('figure');
		if (figure && figure.querySelector('table')) return true;
		var parent = el.parentElement;
		if (!parent) return false;
		return !!parent.querySelector('table');
	}

	function detectKeyboardSupport(el) {
		if (el.matches('[tabindex], a[href], button, input, select, textarea, summary')) return true;
		return !!el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
	}

	function collectColorChannels(el) {
		var values = [];
		var nodes = [el];
		var childMatches = el.querySelectorAll('path, rect, circle, line, polyline, polygon, ellipse, [style], [fill], [stroke]');
		for (var i = 0; i < childMatches.length && i < 24; i++) nodes.push(childMatches[i]);
		for (var j = 0; j < nodes.length; j++) {
			var cs = getComputedStyle(nodes[j]);
			var fill = cs.fill || '';
			var stroke = cs.stroke || '';
			var bg = cs.backgroundColor || '';
			[fill, stroke, bg].forEach(function(value) {
				if (!value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return;
				if (values.indexOf(value) === -1) values.push(value);
			});
			if (values.length >= 8) break;
		}
		return values.slice(0, 8);
	}

	function collectNearbyControls(el) {
		var parent = el.parentElement;
		if (!parent) return [];
		return collectLabels(parent, 'button, a[href], input[type="button"], input[type="submit"], [role="button"]', 6);
	}

	function addChart(el, type, library) {
		if (seen.has(el)) return;
		seen.add(el);
		var rect = el.getBoundingClientRect();
		if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) return;

		var label = getLabel(el) || getFigcaption(el);
		var hasName = !!label;
		if (!label) {
			label = type.toUpperCase() + ' element (' + Math.round(rect.width) + '\\u00d7' + Math.round(rect.height) + ')';
		}
		var captionText = getFigcaption(el) || null;
		var accessibleName = getLabel(el) || null;

		var shapeCount = 0;
		if (type === 'svg') {
			shapeCount = countShapes(el);
		}

		var legendItems = collectLabels(el.parentElement || el, 'legend text, .legend text, .legend-item, .highcharts-legend text, .plotly .legendtext, .vega-bind-name, [role="listitem"]', 8);
		var seriesLabels = collectLabels(el, '[aria-label], title, text', 10);
		var hasTableFallback = detectTableFallback(el);
		var supportsKeyboard = detectKeyboardSupport(el);
		var colorChannels = collectColorChannels(el);
		var nearbyControls = collectNearbyControls(el);

		el.setAttribute('data-viz-id', String(charts.length));

		charts.push({
			id: charts.length,
			type: type,
			library: library,
			label: label.substring(0, 150),
			accessibleName: accessibleName,
			captionText: captionText,
			dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			path: getPath(el),
			hasAccessibleName: hasName,
			hasTableFallback: hasTableFallback,
			supportsKeyboard: supportsKeyboard,
			legendItems: legendItems,
			seriesLabels: seriesLabels,
			colorChannels: colorChannels,
			nearbyControls: nearbyControls,
			childShapeCount: shapeCount
		});
	}

	// 1. Library-specific containers
	var libNames = Object.keys(LIB_SELECTORS);
	for (var li = 0; li < libNames.length; li++) {
		var libName = libNames[li];
		var selector = LIB_SELECTORS[libName];
		var matches = document.querySelectorAll(selector);
		for (var mi = 0; mi < matches.length; mi++) {
			var el = matches[mi];
			var svg = el.querySelector('svg');
			var canvas = el.querySelector('canvas');
			if (svg) {
				addChart(svg, 'svg', libName);
			} else if (canvas) {
				addChart(canvas, 'canvas', libName);
			} else {
				addChart(el, 'container', libName);
			}
		}
	}

	// 2. SVG charts — large SVGs with enough shape children
	var svgs = document.querySelectorAll('svg');
	for (var si = 0; si < svgs.length; si++) {
		var svg = svgs[si];
		if (seen.has(svg)) continue;
		var rect = svg.getBoundingClientRect();
		if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) continue;
		var shapes = countShapes(svg);
		if (shapes < MIN_SHAPES) {
			// Check ARIA role or keywords as fallback
			var role = svg.getAttribute('role');
			var label = getLabel(svg) || getFigcaption(svg);
			if (role === 'img' || role === 'graphics-document' || hasChartKeyword(label)) {
				addChart(svg, 'svg', null);
			}
			continue;
		}
		addChart(svg, 'svg', null);
	}

	// 3. Canvas elements
	var canvases = document.querySelectorAll('canvas');
	for (var ci = 0; ci < canvases.length; ci++) {
		var canvas = canvases[ci];
		if (seen.has(canvas)) continue;
		var rect = canvas.getBoundingClientRect();
		if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) continue;
		addChart(canvas, 'canvas', null);
	}

	// 4. Images with chart-related context
	var imgs = document.querySelectorAll('img');
	for (var ii = 0; ii < imgs.length; ii++) {
		var img = imgs[ii];
		if (seen.has(img)) continue;
		var rect = img.getBoundingClientRect();
		if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) continue;
		var alt = img.getAttribute('alt') || '';
		var title = img.getAttribute('title') || '';
		var figcap = getFigcaption(img);
		var src = img.getAttribute('src') || '';
		if (hasChartKeyword(alt) || hasChartKeyword(title) || hasChartKeyword(figcap) || hasChartKeyword(src)) {
			addChart(img, 'img', null);
		}
	}

	return {
		charts: charts,
		pageTitle: document.title,
		url: location.href
	};
})()`;
}

const HIGHLIGHT_CSS = `
[data-viz-id] {
	outline: 2.5px dashed rgba(37, 99, 235, 0.7) !important;
	outline-offset: 2px !important;
}
.viz-active-highlight {
	outline: 3px solid rgba(37, 99, 235, 1) !important;
	outline-offset: 4px !important;
	z-index: 99999 !important;
	position: relative !important;
	animation: viz-pulse 0.5s ease-in-out 3 !important;
}
@keyframes viz-pulse {
	0%, 100% { outline-offset: 2px; }
	50% { outline-offset: 6px; }
}
`;

function buildInjectOverlayExpression(): string {
	return `(function() {
	if (document.getElementById('viz-overlay-css')) return;
	var style = document.createElement('style');
	style.id = 'viz-overlay-css';
	style.textContent = ${JSON.stringify(HIGHLIGHT_CSS)};
	document.head.appendChild(style);
})()`;
}

function buildRemoveOverlayExpression(): string {
	return `(function() {
	var style = document.getElementById('viz-overlay-css');
	if (style) style.remove();
	document.querySelectorAll('[data-viz-id]').forEach(function(el) {
		el.removeAttribute('data-viz-id');
		el.classList.remove('viz-active-highlight');
	});
})()`;
}

function buildHighlightExpression(id: number | null): string {
	return `(function() {
	document.querySelectorAll('.viz-active-highlight').forEach(function(el) {
		el.classList.remove('viz-active-highlight');
	});
	${
		id !== null
			? `var target = document.querySelector('[data-viz-id="${id}"]');
	if (target) {
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		target.classList.add('viz-active-highlight');
	}`
			: ''
	}
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

export async function extractCharts(): Promise<ChartScanResult> {
	const raw = (await evalInPage(buildExtractionExpression())) as {
		charts: ChartScanResult['charts'];
		pageTitle: string;
		url: string;
	};
	await evalInPage(buildInjectOverlayExpression());

	return {
		charts: raw.charts,
		pageTitle: raw.pageTitle,
		url: raw.url,
		timestamp: new Date().toISOString()
	};
}

export async function highlightChart(id: number | null): Promise<void> {
	await evalInPage(buildHighlightExpression(id));
}

export async function clearScan(): Promise<void> {
	await evalInPage(buildRemoveOverlayExpression());
}
