import { evalInPage } from '../shared/devtools-eval.ts';
import type { AxNode, AxTreeResult, VisualNode } from './types.ts';

export async function extractAxTree(): Promise<AxTreeResult> {
	const expr = `(function() {
		var IMPLICIT_ROLES = {
			'a': 'link', 'article': 'article', 'aside': 'complementary',
			'button': 'button', 'datalist': 'listbox', 'details': 'group',
			'dialog': 'dialog', 'dt': 'term', 'fieldset': 'group',
			'figure': 'figure', 'footer': 'contentinfo', 'form': 'form',
			'h1': 'heading', 'h2': 'heading', 'h3': 'heading', 'h4': 'heading', 'h5': 'heading', 'h6': 'heading',
			'header': 'banner', 'hr': 'separator', 'img': 'img', 'input': 'textbox',
			'li': 'listitem', 'main': 'main', 'nav': 'navigation', 'ol': 'list',
			'option': 'option', 'output': 'status', 'progress': 'progressbar',
			'section': 'region', 'select': 'combobox', 'summary': 'button',
			'table': 'table', 'textarea': 'textbox', 'thead': 'rowgroup',
			'tbody': 'rowgroup', 'tfoot': 'rowgroup', 'tr': 'row', 'td': 'cell', 'th': 'columnheader',
			'ul': 'list'
		};

		function visible(el) {
			var s = window.getComputedStyle(el);
			if (s.display === 'none' || s.visibility === 'hidden') return false;
			if (el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return false;
			var r = el.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return false;
			return true;
		}

		function roleOf(el) {
			var explicit = el.getAttribute('role');
			if (explicit) return explicit;
			var tag = el.tagName.toLowerCase();
			if (tag === 'input') {
				var type = (el.getAttribute('type') || 'text').toLowerCase();
				if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return 'button';
				if (type === 'checkbox') return 'checkbox';
				if (type === 'radio') return 'radio';
				if (type === 'range') return 'slider';
				if (type === 'search') return 'searchbox';
				return 'textbox';
			}
			return IMPLICIT_ROLES[tag] || 'generic';
		}

		function accessibleName(el) {
			var labelledBy = el.getAttribute('aria-labelledby');
			if (labelledBy) {
				var parts = [];
				var ids = labelledBy.split(/\\s+/);
				for (var i = 0; i < ids.length; i++) {
					var ref = document.getElementById(ids[i]);
					if (ref) parts.push((ref.textContent || '').trim());
				}
				var n = parts.join(' ').trim();
				if (n) return n.slice(0, 120);
			}
			var aria = el.getAttribute('aria-label');
			if (aria && aria.trim()) return aria.trim().slice(0, 120);

			if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
				if (el.id) {
					var label = document.querySelector('label[for=' + CSS.escape(el.id) + ']');
					if (label) return (label.textContent || '').trim().slice(0, 120);
				}
				var parentLabel = el.closest('label');
				if (parentLabel) return (parentLabel.textContent || '').trim().slice(0, 120);
				var ph = el.getAttribute('placeholder');
				if (ph) return ph.slice(0, 120);
			}

			if (el.tagName === 'IMG' || el.tagName === 'AREA' || el.tagName === 'INPUT' && el.getAttribute('type') === 'image') {
				var alt = el.getAttribute('alt');
				if (alt !== null) return alt.trim().slice(0, 120);
			}

			if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY') {
				var text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
				if (text) return text.slice(0, 120);
			}

			if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'H5' || el.tagName === 'H6') {
				return (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
			}

			var title = el.getAttribute('title');
			if (title) return title.slice(0, 120);

			return '';
		}

		function pathOf(el) {
			var parts = [];
			var c = el;
			while (c && c !== document.body && parts.length < 8) {
				var tag = c.tagName.toLowerCase();
				var nth = 1, sib = c;
				while ((sib = sib.previousElementSibling)) { if (sib.tagName === c.tagName) nth++; }
				parts.unshift(tag + ':nth-of-type(' + nth + ')');
				c = c.parentElement;
			}
			return parts.join(' > ');
		}

		var axNodes = [];
		var visualNodes = [];

		function walk(el, level, parentInAx) {
			if (!visible(el)) return;
			var role = roleOf(el);
			var name = accessibleName(el);
			var ariaProps = {};
			for (var j = 0; j < el.attributes.length; j++) {
				var attr = el.attributes[j];
				if (attr.name.indexOf('aria-') === 0 || attr.name === 'role') {
					ariaProps[attr.name] = attr.value;
				}
			}
			var r = el.getBoundingClientRect();
			var path = pathOf(el);
			var id = 'n' + axNodes.length;

			var shouldInAx = role !== 'generic' || name.length > 0;
			if (shouldInAx && parentInAx !== el) {
				axNodes.push({
					id: id,
					role: role,
					name: name,
					path: path,
					level: level,
					tag: el.tagName.toLowerCase(),
					rect: { x: r.x, y: r.y, width: r.width, height: r.height },
					ariaProps: ariaProps
				});
			}

			// Record as visual node if semantically interesting
			var isInteractive = /^(button|a|input|select|textarea|summary)$/.test(el.tagName.toLowerCase());
			var hasExplicitRole = el.getAttribute('role');
			var isSemantic = ['h1','h2','h3','h4','h5','h6','nav','main','aside','section','header','footer','article','img','figure','table'].indexOf(el.tagName.toLowerCase()) !== -1;
			if (isInteractive || hasExplicitRole || isSemantic) {
				var text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
				visualNodes.push({
					id: 'v' + visualNodes.length,
					tag: el.tagName.toLowerCase(),
					text: text,
					path: path,
					rect: { x: r.x, y: r.y, width: r.width, height: r.height },
					role: el.getAttribute('role')
				});
			}

			for (var i = 0; i < el.children.length; i++) {
				walk(el.children[i], level + (shouldInAx ? 1 : 0), shouldInAx ? el : parentInAx);
			}
		}

		walk(document.body, 0, null);

		return { axNodes: axNodes, visualNodes: visualNodes };
	})()`;

	const raw = await evalInPage<{ axNodes: AxNode[]; visualNodes: VisualNode[] }>(expr);
	return {
		axNodes: raw.axNodes,
		visualNodes: raw.visualNodes,
		timestamp: new Date().toISOString()
	};
}

export async function highlightAxNode(path: string | null): Promise<void> {
	const expr = `(function() {
		document.querySelectorAll('.ax-tree-highlight').forEach(function(el) { el.classList.remove('ax-tree-highlight'); });
		if (!document.getElementById('ax-tree-style')) {
			var s = document.createElement('style');
			s.id = 'ax-tree-style';
			s.textContent = '.ax-tree-highlight { outline: 3px solid #8b5cf6 !important; outline-offset: 3px !important; }';
			document.head.appendChild(s);
		}
		${
			path
				? `try {
			var el = document.querySelector(${JSON.stringify('body > ' + path)});
			if (!el) el = document.querySelector(${JSON.stringify(path)});
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				el.classList.add('ax-tree-highlight');
			}
		} catch (e) {}`
				: ''
		}
	})()`;
	await evalInPage(expr);
}

export async function clearAxHighlight(): Promise<void> {
	await evalInPage(`(function() {
		document.querySelectorAll('.ax-tree-highlight').forEach(function(el) { el.classList.remove('ax-tree-highlight'); });
		var s = document.getElementById('ax-tree-style');
		if (s) s.remove();
	})()`);
}
