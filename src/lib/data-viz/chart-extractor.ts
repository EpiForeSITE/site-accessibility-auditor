import type { DetectedChart } from './types.ts';
import { evalInPage } from '../shared/devtools-eval.ts';

const MIN_CHART_SIZE = 60;
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
	'donut',
	'trend',
	'distribution',
	'timeseries',
	'time series',
	'choropleth',
	'radar',
	'boxplot',
	'waterfall'
];

const LIBRARY_SELECTORS: Record<string, string> = {
	highcharts: '.highcharts-container, [data-highcharts-chart]',
	plotly: '.js-plotly-plot, .plotly, .plotly-graph-div',
	echarts: '[_echarts_instance_], .echarts-container',
	recharts: '.recharts-wrapper, .recharts-surface',
	'chart.js': '.chartjs-size-monitor, canvas.chartjs-render-monitor, canvas[data-chart-type]',
	vega: '.vega-embed, .vega-vis',
	apexcharts: '.apexcharts-canvas',
	nivo: '.nivo-chart, [class*="nivo-"]',
	victory: '.VictoryContainer',
	c3: '.c3',
	billboard: '.bb',
	amcharts: '[class*="amcharts"], .amcharts-chart-div',
	google: '.google-visualization-chart, .chart-container[id^="google"]',
	tableau: '.tableauPlaceholder, .tab-visualizations',
	d3: 'svg[class*="d3"], g.d3-chart, [data-d3]',
	dygraph: '.dygraph-chart, .dygraph',
	uplot: '.uplot',
	flourish: '.flourish-embed',
	datawrapper: '.dw-chart-container, .datawrapper-embed',
	infogram: '.infogram-embed',
	chartist: '.ct-chart',
	frappe: '.frappe-chart, .graph-svg-tip',
	observable: '[class*="oi-"], .observablehq',
	leaflet: '.leaflet-container',
	mapbox: '.mapboxgl-map',
	deckgl: '[id*="deckgl"], canvas[aria-label*="deck"]',
	lightning: '.luxchart, [class*="lightning-chart"]'
};

function buildExtractionExpression(): string {
	return `(function() {
	var MIN_SIZE = ${MIN_CHART_SIZE};
	var MIN_SHAPES = ${MIN_SVG_SHAPES};
	var KEYWORDS = ${JSON.stringify(CHART_KEYWORDS)};
	var LIB_SELECTORS = ${JSON.stringify(LIBRARY_SELECTORS)};
	var charts = [];
	var seen = new WeakSet();

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
			cur = cur.parentElement || (cur.getRootNode && cur.getRootNode().host) || null;
		}
		return parts.join(' > ');
	}

	function getLabel(el) {
		return el.getAttribute('aria-label')
			|| el.getAttribute('alt')
			|| el.getAttribute('title')
			|| '';
	}

	function getLongDescription(el) {
		var ownerDoc = el.ownerDocument || document;
		var describedBy = el.getAttribute('aria-describedby');
		if (describedBy) {
			var ids = describedBy.split(/\\s+/);
			for (var i = 0; i < ids.length; i++) {
				var target = ownerDoc.getElementById(ids[i]);
				if (target) {
					var t = (target.textContent || '').replace(/\\s+/g, ' ').trim();
					if (t) return t.substring(0, 2000);
				}
			}
		}
		var desc = el.querySelector && el.querySelector('desc');
		if (desc) {
			var dt = (desc.textContent || '').trim();
			if (dt) return dt.substring(0, 2000);
		}
		return null;
	}

	function collectLabels(root, selector, limit) {
		var values = [];
		if (!root || !root.querySelectorAll) return values;
		var nodes = root.querySelectorAll(selector);
		for (var i = 0; i < nodes.length && values.length < limit; i++) {
			var text = (nodes[i].textContent || '').replace(/\\s+/g, ' ').trim();
			if (text && values.indexOf(text) === -1) values.push(text.substring(0, 80));
		}
		return values;
	}

	function getFigcaption(el) {
		var figure = el.closest && el.closest('figure');
		if (figure) {
			var cap = figure.querySelector('figcaption');
			if (cap) return cap.textContent.trim().substring(0, 240);
		}
		return '';
	}

	function findTableFallbackText(el) {
		var figure = el.closest && el.closest('figure');
		if (figure) {
			var t = figure.querySelector('table');
			if (t) return (t.innerText || t.textContent || '').trim().substring(0, 2000);
		}
		var parent = el.parentElement;
		if (parent) {
			var t2 = parent.querySelector('table');
			if (t2) return (t2.innerText || t2.textContent || '').trim().substring(0, 2000);
		}
		return null;
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
		var figure = el.closest && el.closest('figure');
		if (figure && figure.querySelector('table')) return true;
		var parent = el.parentElement;
		if (!parent) return false;
		return !!parent.querySelector('table');
	}

	function detectKeyboardSupport(el) {
		if (el.matches && el.matches('[tabindex], a[href], button, input, select, textarea, summary')) return true;
		return !!(el.querySelector && el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
	}

	function collectColorChannels(el) {
		var values = [];
		var nodes = [el];
		if (el.querySelectorAll) {
			var childMatches = el.querySelectorAll('path, rect, circle, line, polyline, polygon, ellipse, [style], [fill], [stroke]');
			for (var i = 0; i < childMatches.length && i < 32; i++) nodes.push(childMatches[i]);
		}
		for (var j = 0; j < nodes.length; j++) {
			try {
				var cs = getComputedStyle(nodes[j]);
				var fill = cs.fill || '';
				var stroke = cs.stroke || '';
				var bg = cs.backgroundColor || '';
				[fill, stroke, bg].forEach(function(value) {
					if (!value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return;
					if (values.indexOf(value) === -1) values.push(value);
				});
			} catch (_e) {}
			if (values.length >= 10) break;
		}
		return values.slice(0, 10);
	}

	function collectNearbyControls(el) {
		var parent = el.parentElement;
		if (!parent) return [];
		return collectLabels(parent, 'button, a[href], input[type="button"], input[type="submit"], [role="button"]', 6);
	}

	function parseNumeric(text) {
		if (!text) return null;
		var cleaned = text.replace(/[,$%\\s]/g, '');
		var m = cleaned.match(/-?\\d+(?:\\.\\d+)?/);
		if (!m) return null;
		var n = parseFloat(m[0]);
		return isNaN(n) ? null : n;
	}

	function collectLegendSwatches(el) {
		var results = [];
		var seenPairs = new Set();
		function push(label, color) {
			label = (label || '').replace(/\\s+/g, ' ').trim();
			if (!label || label.length > 120) return;
			var key = label + '|' + (color || '');
			if (seenPairs.has(key)) return;
			seenPairs.add(key);
			results.push({ label: label.substring(0, 80), color: color || null });
		}
		if (el.querySelectorAll) {
			var svgLegendNodes = el.querySelectorAll('[class*="legend" i] g, g[class*="legend-item" i], g[aria-label*="legend" i] > g');
			for (var i = 0; i < svgLegendNodes.length && results.length < 24; i++) {
				var node = svgLegendNodes[i];
				var swatch = node.querySelector('rect, circle, path, line');
				var textNode = node.querySelector('text, tspan, title');
				var color = null;
				if (swatch) {
					try {
						var scs = getComputedStyle(swatch);
						color = (scs.fill && scs.fill !== 'none') ? scs.fill : (swatch.getAttribute('fill') || null);
						if (!color || color === 'none') {
							color = (scs.stroke && scs.stroke !== 'none') ? scs.stroke : (swatch.getAttribute('stroke') || null);
						}
					} catch (_e) {}
				}
				push(textNode ? textNode.textContent : node.textContent, color);
			}
		}
		var container = el.parentElement;
		if (container) {
			var htmlLegends = container.querySelectorAll('[class*="legend" i] [class*="item" i], .legend-item, [class*="legend-entry" i], .legend li, [role="listitem"]');
			for (var h = 0; h < htmlLegends.length && results.length < 24; h++) {
				var item = htmlLegends[h];
				var sw = item.querySelector('[class*="swatch" i], [class*="color" i], [style*="background"], i[style*="background"]');
				var col = null;
				if (sw) {
					try {
						var swcs = getComputedStyle(sw);
						col = swcs.backgroundColor && swcs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? swcs.backgroundColor : null;
					} catch (_e) {}
				}
				push(item.textContent, col);
			}
		}
		return results;
	}

	function nearestHeadingText(el) {
		var cur = el.parentElement;
		var hops = 0;
		while (cur && hops < 6) {
			var h = cur.querySelector && cur.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
			if (h) {
				var t = (h.textContent || '').replace(/\\s+/g, ' ').trim();
				if (t) return t.substring(0, 200);
			}
			cur = cur.parentElement;
			hops++;
		}
		return null;
	}

	function domSnippet(el) {
		try {
			var html = el.outerHTML || '';
			if (html.length > 1200) html = html.substring(0, 1200) + '...';
			return html;
		} catch (_e) {
			return null;
		}
	}

	function extractSvgGeometry(svg) {
		var svgRect = svg.getBoundingClientRect();
		var origin = { x: svgRect.left, y: svgRect.top };
		var vb = null;
		try {
			var vbAttr = svg.getAttribute('viewBox');
			if (vbAttr) {
				var parts = vbAttr.split(/[\\s,]+/).map(parseFloat);
				if (parts.length === 4 && parts.every(function(v) { return !isNaN(v); })) {
					vb = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
				}
			}
		} catch (_e) {}

		var texts = svg.querySelectorAll('text, tspan');
		var labelNodes = [];
		for (var i = 0; i < texts.length; i++) {
			var t = texts[i];
			var r = t.getBoundingClientRect();
			if (r.width <= 0 && r.height <= 0) continue;
			var txt = (t.textContent || '').replace(/\\s+/g, ' ').trim();
			if (!txt) continue;
			labelNodes.push({
				text: txt,
				x: r.left - origin.x,
				y: r.top - origin.y,
				w: r.width,
				h: r.height,
				cx: r.left - origin.x + r.width / 2,
				cy: r.top - origin.y + r.height / 2
			});
		}

		var w = svgRect.width;
		var h = svgRect.height;

		var xAxisTicks = [];
		var yAxisTicks = [];
		var xAxisLabel = null;
		var yAxisLabel = null;

		if (labelNodes.length > 0) {
			var yClusters = {};
			var xClusters = {};
			for (var li = 0; li < labelNodes.length; li++) {
				var ln = labelNodes[li];
				var yKey = Math.round(ln.cy / 10) * 10;
				var xKey = Math.round(ln.cx / 10) * 10;
				(yClusters[yKey] = yClusters[yKey] || []).push(ln);
				(xClusters[xKey] = xClusters[xKey] || []).push(ln);
			}
			var yKeys = Object.keys(yClusters).map(Number).sort(function(a,b){return a-b;});
			var xKeys = Object.keys(xClusters).map(Number).sort(function(a,b){return a-b;});

			var bestX = null;
			for (var yi = 0; yi < yKeys.length; yi++) {
				var yk = yKeys[yi];
				if (yk < h * 0.55) continue;
				var cluster = yClusters[yk];
				if (cluster.length < 2) continue;
				if (!bestX || cluster.length > bestX.length) bestX = cluster;
			}
			if (bestX) {
				bestX.sort(function(a, b) { return a.cx - b.cx; });
				for (var bi = 0; bi < bestX.length; bi++) {
					xAxisTicks.push({
						label: bestX[bi].text,
						position: bestX[bi].cx,
						numeric: parseNumeric(bestX[bi].text)
					});
				}
			}

			var bestY = null;
			for (var xi = 0; xi < xKeys.length; xi++) {
				var xk = xKeys[xi];
				if (xk > w * 0.45) continue;
				var clusterY = xClusters[xk];
				if (clusterY.length < 2) continue;
				if (!bestY || clusterY.length > bestY.length) bestY = clusterY;
			}
			if (bestY) {
				bestY.sort(function(a, b) { return a.cy - b.cy; });
				for (var byi = 0; byi < bestY.length; byi++) {
					yAxisTicks.push({
						label: bestY[byi].text,
						position: bestY[byi].cy,
						numeric: parseNumeric(bestY[byi].text)
					});
				}
			}

			var remaining = [];
			var usedSet = new Set();
			if (bestX) for (var ux = 0; ux < bestX.length; ux++) usedSet.add(bestX[ux]);
			if (bestY) for (var uy = 0; uy < bestY.length; uy++) usedSet.add(bestY[uy]);
			for (var lr = 0; lr < labelNodes.length; lr++) {
				if (!usedSet.has(labelNodes[lr]) && labelNodes[lr].text.length > 2) remaining.push(labelNodes[lr]);
			}
			remaining.sort(function(a,b){ return b.text.length - a.text.length; });
			for (var rem = 0; rem < remaining.length; rem++) {
				var rn = remaining[rem];
				if (!xAxisLabel && rn.cy > h * 0.75 && rn.cx > w * 0.3 && rn.cx < w * 0.7) {
					xAxisLabel = rn.text;
				}
				if (!yAxisLabel && rn.cx < w * 0.18 && rn.cy > h * 0.25 && rn.cy < h * 0.75) {
					yAxisLabel = rn.text;
				}
			}
		}

		var title = null;
		if (labelNodes.length > 0) {
			var topCandidates = labelNodes.filter(function(n) { return n.cy < h * 0.15; });
			topCandidates.sort(function(a,b){ return b.text.length - a.text.length; });
			if (topCandidates.length > 0) title = topCandidates[0].text;
		}

		var shapeNodes = svg.querySelectorAll('rect, circle, ellipse, path, polygon, line');
		var marks = [];
		var markTypes = {};
		for (var mi = 0; mi < shapeNodes.length; mi++) {
			var s = shapeNodes[mi];
			if (marks.length >= 500) break;
			var tag = s.tagName.toLowerCase();
			markTypes[tag] = (markTypes[tag] || 0) + 1;
			var rr = s.getBoundingClientRect();
			if (rr.width <= 0 || rr.height <= 0) continue;
			var isGridLike = tag === 'line' || (tag === 'path' && (rr.width < 2 || rr.height < 2));
			if (isGridLike && marks.length > 0 && (rr.width > w * 0.85 || rr.height > h * 0.85)) continue;
			if (tag === 'rect' && rr.width > w * 0.9 && rr.height > h * 0.9) continue;

			var cs = getComputedStyle(s);
			var role = 'other';
			if (tag === 'rect') role = 'rect';
			else if (tag === 'circle' || tag === 'ellipse') role = 'circle';
			else if (tag === 'line') role = 'line';
			else if (tag === 'path') role = 'path';
			else if (tag === 'polygon') role = 'polygon';

			var titleChild = s.querySelector('title');
			var titleText = titleChild ? (titleChild.textContent || '').trim() : null;
			var dataLabel = s.getAttribute('data-label') || s.getAttribute('data-value') || s.getAttribute('data-name') || null;

			marks.push({
				tag: tag,
				role: role,
				x: rr.left - origin.x,
				y: rr.top - origin.y,
				width: rr.width,
				height: rr.height,
				fill: cs.fill && cs.fill !== 'none' ? cs.fill : (s.getAttribute('fill') || null),
				stroke: cs.stroke && cs.stroke !== 'none' ? cs.stroke : (s.getAttribute('stroke') || null),
				title: titleText,
				dataLabel: dataLabel
			});
		}

		var legend = [];
		var legendContainers = svg.querySelectorAll('[class*="legend" i], g[aria-label*="legend" i], [id*="legend" i]');
		for (var lc = 0; lc < legendContainers.length && legend.length < 20; lc++) {
			var lcn = legendContainers[lc];
			var swatches = lcn.querySelectorAll('rect, circle, path');
			var lcTexts = lcn.querySelectorAll('text, tspan');
			for (var li2 = 0; li2 < Math.min(swatches.length, lcTexts.length) && legend.length < 20; li2++) {
				var sw = swatches[li2];
				var tx = lcTexts[li2];
				var swCs = getComputedStyle(sw);
				var color = swCs.fill && swCs.fill !== 'none' ? swCs.fill : (sw.getAttribute('fill') || null);
				var lbl = (tx.textContent || '').trim();
				if (lbl) legend.push({ label: lbl.substring(0, 80), color: color });
			}
		}

		return {
			viewBox: vb,
			xAxisTicks: xAxisTicks,
			yAxisTicks: yAxisTicks,
			xAxisLabel: xAxisLabel,
			yAxisLabel: yAxisLabel,
			title: title,
			marks: marks,
			legend: legend,
			markTypes: markTypes
		};
	}

	function buildCaptureHint(el, type) {
		if (type === 'canvas') return { kind: 'canvas', imageSrc: null };
		if (type === 'svg') return { kind: 'svg', imageSrc: null };
		if (type === 'img') {
			var src = el.currentSrc || el.getAttribute('src') || null;
			return { kind: 'img', imageSrc: src };
		}
		return { kind: 'viewport', imageSrc: null };
	}

	function addChart(el, type, library, frameOrigin, shadowPath) {
		if (seen.has(el)) return;
		seen.add(el);
		var rect = el.getBoundingClientRect();
		if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) return;

		var label = getLabel(el) || getFigcaption(el);
		var hasName = !!label;
		if (!label) {
			label = type.toUpperCase() + ' element (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ')';
		}
		var captionText = getFigcaption(el) || null;
		var accessibleName = getLabel(el) || null;
		var longDescription = getLongDescription(el);

		var shapeCount = 0;
		if (type === 'svg') {
			shapeCount = countShapes(el);
		}

		var legendItems = collectLabels(el.parentElement || el, '.legend text, .legend-item, .highcharts-legend text, .plotly .legendtext, .vega-bind-name, [role="listitem"]', 10);
		var legendSwatches = collectLegendSwatches(el);
		var seriesLabels = collectLabels(el, '[aria-label], title, text', 12);
		var hasTableFallback = detectTableFallback(el);
		var tableFallbackText = findTableFallbackText(el);
		var supportsKeyboard = detectKeyboardSupport(el);
		var colorChannels = collectColorChannels(el);
		var nearbyControls = collectNearbyControls(el);
		var nearestHeading = nearestHeadingText(el);
		var snippet = domSnippet(el);

		var geometry = null;
		var geometryAvailable = false;
		if (type === 'svg') {
			try {
				geometry = extractSvgGeometry(el);
				geometryAvailable = true;
			} catch (_e) {
				geometry = null;
			}
		}

		var captureHint = buildCaptureHint(el, type);

		el.setAttribute('data-viz-id', String(charts.length));

		charts.push({
			id: charts.length,
			type: type,
			library: library,
			label: label.substring(0, 150),
			accessibleName: accessibleName,
			captionText: captionText,
			longDescription: longDescription,
			dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			path: getPath(el),
			nearestHeading: nearestHeading,
			domSnippet: snippet,
			frameOrigin: frameOrigin,
			shadowPath: shadowPath,
			captureHint: captureHint,
			hasAccessibleName: hasName,
			hasTableFallback: hasTableFallback,
			tableFallbackText: tableFallbackText,
			supportsKeyboard: supportsKeyboard,
			legendItems: legendItems,
			legendSwatches: legendSwatches,
			seriesLabels: seriesLabels,
			colorChannels: colorChannels,
			nearbyControls: nearbyControls,
			childShapeCount: shapeCount,
			geometryAvailable: geometryAvailable,
			geometry: geometry
		});
	}

	function scanRoot(root, frameOrigin, shadowPath) {
		var libNames = Object.keys(LIB_SELECTORS);
		for (var li = 0; li < libNames.length; li++) {
			var libName = libNames[li];
			var selector = LIB_SELECTORS[libName];
			var matches;
			try {
				matches = root.querySelectorAll(selector);
			} catch (_e) { matches = []; }
			for (var mi = 0; mi < matches.length; mi++) {
				var el = matches[mi];
				var svg = el.querySelector('svg');
				var canvas = el.querySelector('canvas');
				var img = el.querySelector('img');
				if (svg) {
					addChart(svg, 'svg', libName, frameOrigin, shadowPath);
				} else if (canvas) {
					addChart(canvas, 'canvas', libName, frameOrigin, shadowPath);
				} else if (img) {
					addChart(img, 'img', libName, frameOrigin, shadowPath);
				} else {
					addChart(el, 'container', libName, frameOrigin, shadowPath);
				}
			}
		}

		var svgs = root.querySelectorAll ? root.querySelectorAll('svg') : [];
		for (var si = 0; si < svgs.length; si++) {
			var svgEl = svgs[si];
			if (seen.has(svgEl)) continue;
			var rect = svgEl.getBoundingClientRect();
			if (rect.width < MIN_SIZE && rect.height < MIN_SIZE) continue;
			var shapes = countShapes(svgEl);
			if (shapes < MIN_SHAPES) {
				var role = svgEl.getAttribute('role');
				var svgLabel = getLabel(svgEl) || getFigcaption(svgEl);
				if (role === 'img' || role === 'graphics-document' || hasChartKeyword(svgLabel)) {
					addChart(svgEl, 'svg', null, frameOrigin, shadowPath);
				}
				continue;
			}
			addChart(svgEl, 'svg', null, frameOrigin, shadowPath);
		}

		var canvases = root.querySelectorAll ? root.querySelectorAll('canvas') : [];
		for (var ci = 0; ci < canvases.length; ci++) {
			var canvasEl = canvases[ci];
			if (seen.has(canvasEl)) continue;
			var crect = canvasEl.getBoundingClientRect();
			if (crect.width < MIN_SIZE && crect.height < MIN_SIZE) continue;
			var clabel = getLabel(canvasEl) || getFigcaption(canvasEl) || (canvasEl.parentElement ? getLabel(canvasEl.parentElement) : '');
			var croleAttr = canvasEl.getAttribute('role');
			if (crect.width < 240 && crect.height < 240 && !clabel && !hasChartKeyword(clabel) && croleAttr !== 'img') {
				continue;
			}
			addChart(canvasEl, 'canvas', null, frameOrigin, shadowPath);
		}

		var imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
		for (var ii = 0; ii < imgs.length; ii++) {
			var imgEl = imgs[ii];
			if (seen.has(imgEl)) continue;
			var irect = imgEl.getBoundingClientRect();
			if (irect.width < MIN_SIZE && irect.height < MIN_SIZE) continue;
			var alt = imgEl.getAttribute('alt') || '';
			var title = imgEl.getAttribute('title') || '';
			var figcap = getFigcaption(imgEl);
			var src = imgEl.getAttribute('src') || '';
			if (hasChartKeyword(alt) || hasChartKeyword(title) || hasChartKeyword(figcap) || hasChartKeyword(src)) {
				addChart(imgEl, 'img', null, frameOrigin, shadowPath);
			}
		}

		var figures = root.querySelectorAll ? root.querySelectorAll('figure') : [];
		for (var fi = 0; fi < figures.length; fi++) {
			var fig = figures[fi];
			if (seen.has(fig)) continue;
			if (fig.querySelector('svg, canvas, img')) continue;
			var figRect = fig.getBoundingClientRect();
			if (figRect.width < MIN_SIZE || figRect.height < MIN_SIZE) continue;
			var figCaption = getFigcaption(fig);
			if (!hasChartKeyword(figCaption) && !hasChartKeyword(getLabel(fig))) continue;
			addChart(fig, 'container', null, frameOrigin, shadowPath);
		}
	}

	function scanShadow(root, depth) {
		if (depth > 4) return;
		scanRoot(root, 'shadow', null);
		var hosts = root.querySelectorAll ? root.querySelectorAll('*') : [];
		for (var i = 0; i < hosts.length; i++) {
			var host = hosts[i];
			if (host.shadowRoot && host.shadowRoot.mode !== 'closed') {
				scanShadow(host.shadowRoot, depth + 1);
			}
		}
	}

	scanRoot(document, 'main', null);

	var shadowHosts = document.querySelectorAll('*');
	for (var sh = 0; sh < shadowHosts.length; sh++) {
		var host = shadowHosts[sh];
		if (host.shadowRoot && host.shadowRoot.mode !== 'closed') {
			scanShadow(host.shadowRoot, 1);
		}
	}

	var iframes = document.querySelectorAll('iframe');
	for (var fri = 0; fri < iframes.length; fri++) {
		var iframe = iframes[fri];
		try {
			var doc = iframe.contentDocument;
			if (doc) scanRoot(doc, 'iframe', null);
		} catch (_e) {}
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

type RawChart = Omit<
	DetectedChart,
	| 'kind'
	| 'data'
	| 'analysis'
	| 'analysisState'
	| 'analysisError'
	| 'scores'
	| 'classifierKind'
	| 'capturedImageDataUrl'
>;

export async function extractCharts(): Promise<{
	charts: RawChart[];
	pageTitle: string;
	url: string;
	timestamp: string;
}> {
	const raw = await evalInPage<{
		charts: RawChart[];
		pageTitle: string;
		url: string;
	}>(buildExtractionExpression());
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
