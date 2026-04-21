import {
	INTERACTIVE_SELECTORS,
	TOUCH_TARGET_MINIMUM,
	TOUCH_TARGET_RECOMMENDED
} from './constants.ts';
import type { AuditElement, AuditResult } from './types.ts';

interface RawElement {
	tag: string;
	text: string;
	rect: { x: number; y: number; width: number; height: number };
	selector: string | null;
	domPath: string | null;
	attributes: Record<string, string | null>;
	status: 'pass' | 'warning' | 'fail';
}

function buildSuggestion(el: RawElement): string {
	const { width, height } = el.rect;

	if (el.status === 'pass') {
		return `Touch target is ${Math.round(width)}\u00d7${Math.round(height)}px \u2014 meets the recommended 44\u00d744px.`;
	}

	if (el.status === 'warning') {
		const parts: string[] = [];
		if (width < TOUCH_TARGET_RECOMMENDED)
			parts.push(`width from ${Math.round(width)}px to ${TOUCH_TARGET_RECOMMENDED}px`);
		if (height < TOUCH_TARGET_RECOMMENDED)
			parts.push(`height from ${Math.round(height)}px to ${TOUCH_TARGET_RECOMMENDED}px`);
		return `Touch target is ${Math.round(width)}\u00d7${Math.round(height)}px \u2014 meets the 24px minimum but consider increasing ${parts.join(' and ')} to reach the recommended 44\u00d744px.`;
	}

	const parts: string[] = [];
	if (width < TOUCH_TARGET_MINIMUM)
		parts.push(`width from ${Math.round(width)}px to at least ${TOUCH_TARGET_MINIMUM}px`);
	if (height < TOUCH_TARGET_MINIMUM)
		parts.push(`height from ${Math.round(height)}px to at least ${TOUCH_TARGET_MINIMUM}px`);
	return `Touch target is ${Math.round(width)}\u00d7${Math.round(height)}px \u2014 fails the WCAG 24px minimum. Increase ${parts.join(' and ')}.`;
}

function toAuditElement(el: RawElement, index: number): AuditElement {
	return {
		id: index,
		tag: el.tag,
		text: el.text,
		rect: el.rect,
		selector: el.selector,
		domPath: el.domPath,
		attributes: el.attributes,
		status: el.status,
		touchWidth: Math.round(el.rect.width),
		touchHeight: Math.round(el.rect.height),
		suggestion: buildSuggestion(el)
	};
}

/**
 * Code string evaluated inside the inspected page.
 * Returns a JSON-serializable array of raw element data.
 */
function buildAuditExpression(): string {
	return `(function() {
	var SELECTOR = ${JSON.stringify(INTERACTIVE_SELECTORS)};
	var MIN = ${TOUCH_TARGET_MINIMUM};
	var REC = ${TOUCH_TARGET_RECOMMENDED};

	function cssEscape(value) {
		if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
		return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
	}

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

	function getSelector(el) {
		if (el.id) return '#' + cssEscape(el.id);
		var aria = el.getAttribute('aria-label');
		if (aria) return el.tagName.toLowerCase() + '[aria-label="' + aria.replace(/"/g, '\\"') + '"]';
		var name = el.getAttribute('name');
		if (name) return el.tagName.toLowerCase() + '[name="' + name.replace(/"/g, '\\"') + '"]';
		return getPath(el);
	}

	document.querySelectorAll('[data-audit-id]').forEach(function(el) {
		el.removeAttribute('data-audit-id');
		el.removeAttribute('data-audit-status');
		el.removeAttribute('data-audit-w');
		el.removeAttribute('data-audit-h');
	});

	var els = document.querySelectorAll(SELECTOR);
	var results = [];

	for (var i = 0; i < els.length; i++) {
		var el = els[i];
		var rect = el.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) continue;

		var id = results.length;
		var status =
			rect.width >= REC && rect.height >= REC ? 'pass'
			: rect.width >= MIN && rect.height >= MIN ? 'warning'
			: 'fail';

		el.setAttribute('data-audit-id', String(id));
		el.setAttribute('data-audit-status', status);
		el.setAttribute('data-audit-w', String(Math.round(rect.width)));
		el.setAttribute('data-audit-h', String(Math.round(rect.height)));

		var text = (el.innerText || el.textContent || '').trim().substring(0, 80);

		results.push({
			tag: el.tagName.toLowerCase(),
			text: text,
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			selector: getSelector(el),
			domPath: getPath(el),
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
			status: status
		});
	}

	return results;
})()`;
}

const OVERLAY_CSS = `
[data-audit-status="fail"] {
  outline: 2.5px solid rgba(239, 68, 68, 0.9) !important;
  outline-offset: 1px !important;
}
[data-audit-status="warning"] {
  outline: 2.5px solid rgba(245, 158, 11, 0.9) !important;
  outline-offset: 1px !important;
}
[data-audit-status="pass"] {
  outline: 2px solid rgba(34, 197, 94, 0.75) !important;
  outline-offset: 1px !important;
}
[data-audit-status] {
  cursor: pointer !important;
}
.audit-active-highlight {
  outline-width: 4px !important;
  outline-offset: 3px !important;
  z-index: 99999 !important;
  position: relative !important;
  animation: audit-pulse 0.5s ease-in-out 3 !important;
}
@keyframes audit-pulse {
  0%, 100% { outline-offset: 1px; }
  50% { outline-offset: 5px; }
}
`;

function buildInjectOverlayExpression(): string {
	return `(function() {
	if (document.getElementById('audit-overlay-css')) return;
	var style = document.createElement('style');
	style.id = 'audit-overlay-css';
	style.textContent = ${JSON.stringify(OVERLAY_CSS)};
	document.head.appendChild(style);
})()`;
}

function buildRemoveOverlayExpression(): string {
	return `(function() {
	var style = document.getElementById('audit-overlay-css');
	if (style) style.remove();
	document.querySelectorAll('[data-audit-id]').forEach(function(el) {
		el.removeAttribute('data-audit-id');
		el.removeAttribute('data-audit-status');
		el.removeAttribute('data-audit-w');
		el.removeAttribute('data-audit-h');
	});
	document.querySelectorAll('.audit-active-highlight').forEach(function(el) {
		el.classList.remove('audit-active-highlight');
	});
})()`;
}

function buildHighlightExpression(id: number | null): string {
	return `(function() {
	document.querySelectorAll('.audit-active-highlight').forEach(function(el) {
		el.classList.remove('audit-active-highlight');
	});
	${
		id !== null
			? `var target = document.querySelector('[data-audit-id="${id}"]');
	if (target) {
		target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		target.classList.add('audit-active-highlight');
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

export async function runAudit(): Promise<AuditResult> {
	const rawElements = (await evalInPage(buildAuditExpression())) as RawElement[];
	await evalInPage(buildInjectOverlayExpression());

	const elements = rawElements.map((el, i) => toAuditElement(el, i));

	return {
		elements,
		summary: {
			total: elements.length,
			pass: elements.filter((e) => e.status === 'pass').length,
			warning: elements.filter((e) => e.status === 'warning').length,
			fail: elements.filter((e) => e.status === 'fail').length
		},
		timestamp: new Date().toISOString()
	};
}

export async function highlightElement(id: number | null): Promise<void> {
	await evalInPage(buildHighlightExpression(id));
}

export async function clearAudit(): Promise<void> {
	await evalInPage(buildRemoveOverlayExpression());
}
