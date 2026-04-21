import type { TabOrderElement, TabOrderResult } from './types.ts';

function buildScanExpression(): string {
	return `(function() {
	var NATURAL_SELECTORS = [
		'a[href]', 'button:not([disabled])', 'input:not([disabled])',
		'select:not([disabled])', 'textarea:not([disabled])', 'summary',
		'[contenteditable="true"]', '[contenteditable=""]',
		'audio[controls]', 'video[controls]', 'details'
	].join(', ');

	function getPath(el) {
		var parts = [];
		var cur = el;
		while (cur && cur !== document.body && parts.length < 6) {
			var tag = cur.tagName.toLowerCase();
			var nth = 1;
			var sib = cur;
			while ((sib = sib.previousElementSibling)) {
				if (sib.tagName === cur.tagName) nth++;
			}
			parts.unshift(tag + ':nth-of-type(' + nth + ')');
			cur = cur.parentElement;
		}
		return parts.join(' > ');
	}

	document.querySelectorAll('[data-tab-order-id]').forEach(function(el) {
		el.removeAttribute('data-tab-order-id');
	});

	var seen = new Set();
	var positiveTabindex = [];
	var zeroTabindex = [];

	var all = document.querySelectorAll('*');
	for (var i = 0; i < all.length; i++) {
		var el = all[i];
		if (seen.has(el)) continue;

		var ti = el.getAttribute('tabindex');
		var tabindex = ti !== null ? parseInt(ti, 10) : null;

		if (tabindex !== null && isNaN(tabindex)) tabindex = null;

		var isNaturallyFocusable = el.matches(NATURAL_SELECTORS);

		if (tabindex !== null && tabindex < 0) continue;

		if (tabindex !== null && tabindex > 0) {
			positiveTabindex.push({ el: el, tabindex: tabindex, natural: isNaturallyFocusable });
		} else if (tabindex === 0 || isNaturallyFocusable) {
			zeroTabindex.push({ el: el, tabindex: tabindex !== null ? tabindex : (isNaturallyFocusable ? 0 : null), natural: isNaturallyFocusable });
		}
		seen.add(el);
	}

	positiveTabindex.sort(function(a, b) { return a.tabindex - b.tabindex; });

	var ordered = positiveTabindex.concat(zeroTabindex);
	var results = [];

	for (var j = 0; j < ordered.length; j++) {
		var item = ordered[j];
		var el = item.el;
		var rect = el.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) continue;

		var id = results.length;
		el.setAttribute('data-tab-order-id', String(id));

		var text = (el.innerText || el.textContent || '').trim().substring(0, 80);

		results.push({
			tag: el.tagName.toLowerCase(),
			text: text,
			role: el.getAttribute('role'),
			tabindex: item.tabindex,
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			path: getPath(el),
			attributes: {
				id: el.id || null,
				class: el.className && typeof el.className === 'string' ? el.className : null,
				role: el.getAttribute('role'),
				type: el.getAttribute('type'),
				href: el.getAttribute('href'),
				'aria-label': el.getAttribute('aria-label'),
				name: el.getAttribute('name'),
				placeholder: el.getAttribute('placeholder')
			},
			focusable: item.tabindex !== null && item.tabindex >= 0 && !item.natural ? 'programmatic' : 'natural'
		});
	}

	return results;
})()`;
}

const DYNAMIC_CONTAINER_SELECTORS = [
	'canvas',
	'.leaflet-container',
	'.mapboxgl-map',
	'.maplibregl-map',
	'.ol-viewport',
	'[class*="gm-style"]',
	'.plotly',
	'.js-plotly-plot',
	'.highcharts-container',
	'.echarts',
	'[class*="echarts"]',
	'[data-highcharts-chart]',
	'.vis-network',
	'.sigma-container',
	'.cytoscape-container'
].join(', ');

function buildOverlayCSS(color: string): string {
	return `
#tab-order-overlay-container {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 0 !important;
  height: 0 !important;
  overflow: visible !important;
  pointer-events: none !important;
  z-index: 100000 !important;
}
.tab-order-badge {
  position: absolute !important;
  z-index: 100000 !important;
  min-width: 22px !important;
  height: 22px !important;
  padding: 0 5px !important;
  border-radius: 11px !important;
  background: ${color} !important;
  color: #fff !important;
  font: bold 11px/22px system-ui, sans-serif !important;
  text-align: center !important;
  pointer-events: none !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
  box-sizing: border-box !important;
}
#tab-order-connectors {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  pointer-events: none !important;
  z-index: 99999 !important;
  overflow: visible !important;
}
.tab-order-hover-highlight {
  outline: 2px solid ${color} !important;
  outline-offset: 2px !important;
  z-index: 100001 !important;
}
.tab-order-active-highlight {
  outline: 3px solid ${color} !important;
  outline-offset: 3px !important;
  z-index: 100001 !important;
  animation: tab-order-pulse 0.5s ease-in-out 3 !important;
}
@keyframes tab-order-pulse {
  0%, 100% { outline-offset: 2px; }
  50% { outline-offset: 6px; }
}
.tab-order-recalc-btn {
  position: absolute !important;
  z-index: 100002 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 4px 10px !important;
  border: none !important;
  border-radius: 6px !important;
  background: ${color} !important;
  color: #fff !important;
  font: 600 11px/1 system-ui, sans-serif !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
  box-sizing: border-box !important;
  transition: opacity 0.15s, transform 0.15s !important;
  opacity: 0.85 !important;
  white-space: nowrap !important;
}
.tab-order-recalc-btn:hover {
  opacity: 1 !important;
  transform: scale(1.05) !important;
}
.tab-order-recalc-btn:active {
  transform: scale(0.95) !important;
}
.tab-order-recalc-btn svg {
  width: 12px !important;
  height: 12px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 2.5 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
}

function buildInjectOverlayExpression(color: string): string {
	const css = buildOverlayCSS(color);
	return `(function() {
	if (document.getElementById('tab-order-overlay-css')) return;

	var style = document.createElement('style');
	style.id = 'tab-order-overlay-css';
	style.textContent = ${JSON.stringify(css)};
	document.head.appendChild(style);

	var container = document.createElement('div');
	container.id = 'tab-order-overlay-container';
	document.body.appendChild(container);

	var sx = window.scrollX;
	var sy = window.scrollY;
	var els = document.querySelectorAll('[data-tab-order-id]');
	var centers = [];

	for (var i = 0; i < els.length; i++) {
		var el = els[i];
		var id = parseInt(el.getAttribute('data-tab-order-id'), 10);
		var rect = el.getBoundingClientRect();

		var docX = rect.x + sx;
		var docY = rect.y + sy;

		var badge = document.createElement('span');
		badge.className = 'tab-order-badge';
		badge.textContent = String(id + 1);
		badge.setAttribute('data-tab-order-badge', '');
		badge.style.left = (docX - 10) + 'px';
		badge.style.top = (docY - 10) + 'px';
		container.appendChild(badge);

		centers.push({
			x: docX + rect.width / 2,
			y: docY + rect.height / 2
		});
	}

	var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.id = 'tab-order-connectors';
	var docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
	var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
	svg.setAttribute('width', docW);
	svg.setAttribute('height', docH);

	var MAX_LINE_W = 4;
	var MIN_LINE_W = 0.4;
	var BASE_LINE_W = 1.5;
	var DECAY_K = 1.5;

	for (var j = 0; j < centers.length - 1; j++) {
		var c1 = centers[j];
		var c2 = centers[j + 1];

		var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', c1.x);
		line.setAttribute('y1', c1.y);
		line.setAttribute('x2', c2.x);
		line.setAttribute('y2', c2.y);
		line.setAttribute('stroke', '${color}');
		line.setAttribute('stroke-width', String(BASE_LINE_W));
		line.setAttribute('stroke-opacity', '0.3');
		line.setAttribute('stroke-dasharray', '6 4');
		line.setAttribute('data-line-idx', String(j));
		line.style.transition = 'stroke-width 0.15s ease, stroke-opacity 0.15s ease';
		svg.appendChild(line);
	}

	var BASE_OPACITY = 0.3;
	var MAX_OPACITY = 0.9;
	var MIN_OPACITY = 0.08;

	window.__tabOrderUpdateLineWidths = function(hovId) {
		var svgEl = document.getElementById('tab-order-connectors');
		if (!svgEl) return;
		var lines = svgEl.querySelectorAll('line[data-line-idx]');
		for (var li = 0; li < lines.length; li++) {
			var idx = parseInt(lines[li].getAttribute('data-line-idx'), 10);
			if (hovId < 0) {
				lines[li].setAttribute('stroke-width', String(BASE_LINE_W));
				lines[li].setAttribute('stroke-opacity', String(BASE_OPACITY));
			} else {
				var dist = Math.min(Math.abs(idx - hovId), Math.abs(idx + 1 - hovId));
				var w = MAX_LINE_W / (1 + DECAY_K * Math.log(1 + dist));
				if (w < MIN_LINE_W) w = MIN_LINE_W;
				var opacity = MAX_OPACITY / (1 + DECAY_K * Math.log(1 + dist));
				if (opacity < MIN_OPACITY) opacity = MIN_OPACITY;
				lines[li].setAttribute('stroke-width', String(w));
				lines[li].setAttribute('stroke-opacity', String(opacity));
			}
		}
	};

	container.appendChild(svg);

	// Add hover listeners on annotated elements for page→panel sync
	window.__tabOrderHoveredId = -1;
	for (var hi = 0; hi < els.length; hi++) {
		(function(el) {
			el.addEventListener('mouseenter', function() {
				var hid = parseInt(this.getAttribute('data-tab-order-id'), 10);
				window.__tabOrderHoveredId = hid;
				this.classList.add('tab-order-hover-highlight');
				if (window.__tabOrderUpdateLineWidths) window.__tabOrderUpdateLineWidths(hid);
			});
			el.addEventListener('mouseleave', function() {
				window.__tabOrderHoveredId = -1;
				this.classList.remove('tab-order-hover-highlight');
				if (window.__tabOrderUpdateLineWidths) window.__tabOrderUpdateLineWidths(-1);
			});
		})(els[hi]);
	}

	// Inject recalculate buttons on dynamic containers
	window.__tabOrderRecalcRequested = false;
	var DYNAMIC_SEL = ${JSON.stringify(DYNAMIC_CONTAINER_SELECTORS)};
	var dynamics = document.querySelectorAll(DYNAMIC_SEL);

	// Also find large SVGs (> 150px both dimensions) that aren't tiny icons
	var allSvgs = document.querySelectorAll('svg');
	var largeSvgs = [];
	for (var s = 0; s < allSvgs.length; s++) {
		var sr = allSvgs[s].getBoundingClientRect();
		if (sr.width > 150 && sr.height > 150) largeSvgs.push(allSvgs[s]);
	}

	var seen = new Set();
	var allDynamic = [];
	for (var d = 0; d < dynamics.length; d++) { if (!seen.has(dynamics[d])) { seen.add(dynamics[d]); allDynamic.push(dynamics[d]); } }
	for (var d2 = 0; d2 < largeSvgs.length; d2++) { if (!seen.has(largeSvgs[d2])) { seen.add(largeSvgs[d2]); allDynamic.push(largeSvgs[d2]); } }

	for (var di = 0; di < allDynamic.length; di++) {
		var dynEl = allDynamic[di];
		var dynRect = dynEl.getBoundingClientRect();
		var dynDocX = dynRect.x + sx + dynRect.width - 110;
		var dynDocY = dynRect.y + sy + 8;

		var btn = document.createElement('button');
		btn.className = 'tab-order-recalc-btn';
		btn.setAttribute('data-tab-order-recalc', '');
		btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Recalculate';
		btn.style.left = dynDocX + 'px';
		btn.style.top = dynDocY + 'px';
		btn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.__tabOrderRecalcRequested = true;
			this.innerHTML = '<svg viewBox="0 0 24 24" style="animation:spin .5s linear infinite"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Refreshing...';
		});
		container.appendChild(btn);
	}
})()`;
}

function buildRemoveOverlayExpression(): string {
	return `(function() {
	var style = document.getElementById('tab-order-overlay-css');
	if (style) style.remove();
	var container = document.getElementById('tab-order-overlay-container');
	if (container) container.remove();
	document.querySelectorAll('[data-tab-order-id]').forEach(function(el) {
		el.removeAttribute('data-tab-order-id');
		el.classList.remove('tab-order-active-highlight');
		el.classList.remove('tab-order-hover-highlight');
	});
	window.__tabOrderRecalcRequested = false;
	window.__tabOrderHoveredId = -1;
})()`;
}

function buildHighlightExpression(id: number | null): string {
	return `(function() {
	document.querySelectorAll('.tab-order-active-highlight').forEach(function(el) {
		el.classList.remove('tab-order-active-highlight');
	});
	${
		id !== null
			? `var target = document.querySelector('[data-tab-order-id="${id}"]');
	if (target) {
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		target.classList.add('tab-order-active-highlight');
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

interface RawElement {
	tag: string;
	text: string;
	role: string | null;
	tabindex: number | null;
	rect: { x: number; y: number; width: number; height: number };
	path?: string | null;
	attributes: Record<string, string | null>;
	focusable: 'natural' | 'programmatic';
}

export async function scanTabOrder(color: string = '#2563eb'): Promise<TabOrderResult> {
	// Clear any existing overlay before re-scanning
	await evalInPage(`(function() {
	var style = document.getElementById('tab-order-overlay-css');
	if (style) style.remove();
	var container = document.getElementById('tab-order-overlay-container');
	if (container) container.remove();
})()`);
	const rawElements = (await evalInPage(buildScanExpression())) as RawElement[];
	await evalInPage(buildInjectOverlayExpression(color));

	const elements: TabOrderElement[] = rawElements.map((el, i) => ({
		id: i,
		tag: el.tag,
		text: el.text,
		role: el.role,
		tabindex: el.tabindex,
		rect: el.rect,
		path: el.path,
		attributes: el.attributes,
		focusable: el.focusable
	}));

	const natural = elements.filter((e) => e.focusable === 'natural').length;
	const programmatic = elements.filter((e) => e.focusable === 'programmatic').length;

	return {
		elements,
		summary: {
			total: elements.length,
			natural,
			programmatic,
			hasPositiveTabindex: elements.some((e) => e.tabindex !== null && e.tabindex > 0)
		},
		timestamp: new Date().toISOString()
	};
}

export async function updateAnnotationColor(color: string): Promise<void> {
	const css = buildOverlayCSS(color);
	await evalInPage(`(function() {
	var style = document.getElementById('tab-order-overlay-css');
	if (style) style.textContent = ${JSON.stringify(css)};

	var container = document.getElementById('tab-order-overlay-container');
	if (!container) return;

	var badges = container.querySelectorAll('.tab-order-badge');
	for (var i = 0; i < badges.length; i++) {
		badges[i].style.background = '${color}';
	}

	var oldSvg = document.getElementById('tab-order-connectors');
	if (oldSvg) {
		var lines = oldSvg.querySelectorAll('line');
		for (var j = 0; j < lines.length; j++) {
			lines[j].setAttribute('stroke', '${color}');
		}
	}
})()`);
}

export async function highlightTabElement(id: number | null): Promise<void> {
	await evalInPage(buildHighlightExpression(id));
}

export async function hoverTabElement(id: number | null): Promise<void> {
	await evalInPage(`(function() {
	document.querySelectorAll('.tab-order-hover-highlight').forEach(function(el) {
		el.classList.remove('tab-order-hover-highlight');
	});
	${
		id !== null
			? `var target = document.querySelector('[data-tab-order-id="${id}"]');
	if (target) {
		target.classList.add('tab-order-hover-highlight');
	}`
			: ''
	}
	if (window.__tabOrderUpdateLineWidths) window.__tabOrderUpdateLineWidths(${id !== null ? id : -1});
})()`);
}

export async function pollHoveredId(): Promise<number> {
	const result = await evalInPage(`(function() {
	return typeof window.__tabOrderHoveredId === 'number' ? window.__tabOrderHoveredId : -1;
})()`);
	return result as number;
}

export async function checkRecalcRequested(): Promise<boolean> {
	const result = await evalInPage(`(function() {
	if (window.__tabOrderRecalcRequested) {
		window.__tabOrderRecalcRequested = false;
		return true;
	}
	return false;
})()`);
	return result as boolean;
}

export async function clearTabOrder(): Promise<void> {
	await evalInPage(buildRemoveOverlayExpression());
}
