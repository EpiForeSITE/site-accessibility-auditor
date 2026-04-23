import { evalInPage } from '../shared/devtools-eval.ts';

function djb2(str: string): string {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = ((h << 5) + h + str.charCodeAt(i)) | 0;
	}
	return (h >>> 0).toString(16).padStart(8, '0');
}

export async function computeStateSignature(): Promise<string> {
	const expr = `(function() {
		var open = Array.from(document.querySelectorAll('[aria-expanded="true"], dialog[open], [role="dialog"]:not([aria-hidden="true"])'));
		var openMarkers = open.map(function(el) {
			var cls = (el.className || '').toString().slice(0, 40);
			var id = el.id || '';
			return el.tagName.toLowerCase() + '#' + id + '.' + cls;
		}).join('|');

		var focusedPath = '';
		var f = document.activeElement;
		if (f && f !== document.body) {
			var parts = [];
			var c = f;
			while (c && c !== document.body && parts.length < 6) {
				var tag = c.tagName.toLowerCase();
				var nth = 1, sib = c;
				while ((sib = sib.previousElementSibling)) { if (sib.tagName === c.tagName) nth++; }
				parts.unshift(tag + ':nth-of-type(' + nth + ')');
				c = c.parentElement;
			}
			focusedPath = parts.join('>');
		}

		var skeleton = '';
		var nodes = document.querySelectorAll('body *');
		var limit = Math.min(nodes.length, 400);
		for (var i = 0; i < limit; i++) {
			var n = nodes[i];
			var style = window.getComputedStyle(n);
			if (style.display === 'none' || style.visibility === 'hidden') continue;
			skeleton += n.tagName.charAt(0).toLowerCase();
		}

		var viewport = window.innerWidth + 'x' + window.innerHeight;
		var scroll = Math.round(window.scrollY / 40) * 40;

		return {
			openMarkers: openMarkers,
			focusedPath: focusedPath,
			skeletonLen: skeleton.length,
			skeletonHead: skeleton.slice(0, 200),
			skeletonTail: skeleton.slice(-80),
			viewport: viewport,
			scroll: scroll
		};
	})()`;
	const raw = await evalInPage<{
		openMarkers: string;
		focusedPath: string;
		skeletonLen: number;
		skeletonHead: string;
		skeletonTail: string;
		viewport: string;
		scroll: number;
	}>(expr);
	return djb2(JSON.stringify(raw));
}
