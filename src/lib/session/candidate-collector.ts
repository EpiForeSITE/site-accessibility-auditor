import { evalInPage } from '../shared/devtools-eval.ts';
import type { CandidateKind, InteractionCandidate } from './types.ts';

interface RawCandidate {
	kind: CandidateKind;
	selector: string;
	label: string;
	rect: { x: number; y: number; width: number; height: number };
}

export async function collectCandidates(max = 24): Promise<InteractionCandidate[]> {
	const expr = `(function() {
		var MAX = ${max};
		var seen = new Set();
		var out = [];

		function pathSelector(el) {
			if (el.id && /^[a-zA-Z][\\w-]*$/.test(el.id)) return '#' + el.id;
			var parts = [];
			var c = el;
			while (c && c !== document.body && parts.length < 6) {
				var tag = c.tagName.toLowerCase();
				var nth = 1, sib = c;
				while ((sib = sib.previousElementSibling)) { if (sib.tagName === c.tagName) nth++; }
				var seg = tag + ':nth-of-type(' + nth + ')';
				if (c.id && /^[a-zA-Z][\\w-]*$/.test(c.id)) seg = tag + '#' + c.id;
				parts.unshift(seg);
				c = c.parentElement;
			}
			return parts.join(' > ');
		}

		function visibleRect(el) {
			var r = el.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return null;
			var s = window.getComputedStyle(el);
			if (s.visibility === 'hidden' || s.display === 'none') return null;
			return r;
		}

		function label(el) {
			var t = (el.getAttribute('aria-label') || el.getAttribute('title') || (el.innerText || '') || '').trim();
			if (!t && el.querySelector) {
				var i = el.querySelector('svg title, img[alt]');
				if (i) t = (i.getAttribute('alt') || i.textContent || '').trim();
			}
			return t.replace(/\\s+/g, ' ').slice(0, 80);
		}

		function consider(el, kind) {
			if (seen.has(el)) return;
			seen.add(el);
			if (out.length >= MAX) return;
			var r = visibleRect(el);
			if (!r) return;

			// destructive filters
			if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
				var type = (el.getAttribute('type') || '').toLowerCase();
				if (type === 'submit' || type === 'reset') return;
			}
			if (el.tagName === 'A') {
				var href = el.getAttribute('href') || '';
				if (!href || href.startsWith('http') && !href.startsWith(location.origin)) return;
				if (el.getAttribute('download') !== null) return;
				if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
			}
			var lbl = label(el);
			if (!lbl) lbl = '(' + kind + ')';

			out.push({
				kind: kind,
				selector: pathSelector(el),
				label: lbl,
				rect: { x: r.x, y: r.y, width: r.width, height: r.height }
			});
		}

		// Disclosures (aria-expanded)
		var disclosures = document.querySelectorAll('[aria-expanded="false"]');
		for (var i = 0; i < disclosures.length; i++) consider(disclosures[i], 'disclosure');

		// Summary
		var summaries = document.querySelectorAll('details:not([open]) > summary');
		for (var j = 0; j < summaries.length; j++) consider(summaries[j], 'summary');

		// Tab widgets
		var tabs = document.querySelectorAll('[role="tab"][aria-selected="false"]');
		for (var k = 0; k < tabs.length; k++) consider(tabs[k], 'tab');

		// Dialog openers: buttons with data-dialog, aria-haspopup="dialog", or matching text
		var dialogOpeners = document.querySelectorAll('[aria-haspopup="dialog"], [data-toggle="modal"], [data-dialog]');
		for (var d = 0; d < dialogOpeners.length; d++) consider(dialogOpeners[d], 'dialog-opener');

		// Menu openers
		var menuOpeners = document.querySelectorAll('[aria-haspopup="menu"], [aria-haspopup="true"][aria-expanded="false"]');
		for (var m = 0; m < menuOpeners.length; m++) consider(menuOpeners[m], 'menu-opener');

		// In-page hash links
		var hashLinks = document.querySelectorAll('a[href^="#"]');
		for (var h = 0; h < hashLinks.length; h++) consider(hashLinks[h], 'in-page-link');

		// Buttons as last resort (non-destructive labels)
		if (out.length < MAX / 2) {
			var buttons = document.querySelectorAll('button:not([type="submit"]):not([type="reset"])');
			for (var b = 0; b < buttons.length && out.length < MAX; b++) {
				var lbl = (buttons[b].innerText || '').toLowerCase();
				if (/delete|remove|destroy|clear|reset|cancel|discard|sign\\s*out|logout|buy|purchase|submit/.test(lbl)) continue;
				consider(buttons[b], 'button');
			}
		}

		return out.slice(0, MAX);
	})()`;
	const raw = await evalInPage<RawCandidate[]>(expr);
	return raw.map((c, i) => ({ id: i, ...c }));
}
