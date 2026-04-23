import { HELP_KIND_PATTERNS, HELP_MECHANISM_SELECTORS } from '../constants.ts';
import type { HelpMechanism, HelpSignature } from '../session-store.ts';
import { wrapPageScript, type RawFinding } from './shared.ts';

export interface ConsistentHelpPageResult {
	mechanisms: HelpMechanism[];
	url: string;
	__error?: string;
}

/**
 * Compare the current page's help signature against prior pages in the
 * same origin. Returns at most one page-level finding per prior page
 * that disagrees.
 */
export function classifyConsistentHelp(
	current: HelpSignature,
	prior: HelpSignature[]
): { findings: RawFinding[]; shouldRecord: boolean } {
	if (prior.length === 0) {
		return { findings: [], shouldRecord: true };
	}

	const findings: RawFinding[] = [];

	const currentByKindRegion = new Map<string, HelpMechanism>();
	for (const m of current.mechanisms) {
		currentByKindRegion.set(`${m.kind}:${m.region}`, m);
	}

	for (const prev of prior) {
		const diffs: string[] = [];

		for (const pm of prev.mechanisms) {
			const key = `${pm.kind}:${pm.region}`;
			if (!currentByKindRegion.has(key)) {
				// check if present in another region
				const elsewhere = current.mechanisms.find((m) => m.kind === pm.kind);
				if (!elsewhere) {
					diffs.push(`missing ${pm.kind} mechanism (was in ${pm.region} on ${prev.url})`);
				} else {
					diffs.push(`${pm.kind} moved from ${pm.region} to ${elsewhere.region} vs ${prev.url}`);
				}
			}
		}

		for (const cm of current.mechanisms) {
			const matched = prev.mechanisms.find((pm) => pm.kind === cm.kind);
			if (!matched) {
				diffs.push(`${cm.kind} is new on this page (not present on ${prev.url})`);
			}
		}

		if (diffs.length > 0) {
			findings.push({
				wcag: '3.2.6',
				status: 'warning',
				tag: 'document',
				text: current.url,
				rect: null,
				selector: null,
				domPath: null,
				attributes: {},
				evidence: {
					comparedTo: prev.url,
					differences: diffs,
					currentMechanisms: current.mechanisms,
					priorMechanisms: prev.mechanisms
				},
				suggestion: `Help mechanisms differ from ${prev.url}: ${diffs.join('; ')}. WCAG 3.2.6 requires help mechanisms to appear in the same relative order across pages.`
			});
		}
	}

	return { findings, shouldRecord: true };
}

export function buildConsistentHelpCheck(): string {
	const body = `
var SELECTOR = ${JSON.stringify(HELP_MECHANISM_SELECTORS)};
var KIND_PATTERNS = ${JSON.stringify(
		HELP_KIND_PATTERNS.map((p) => ({ kind: p.kind, test: p.test.source, flags: p.test.flags }))
	)};

function classifyKind(el) {
  var href = el.getAttribute && el.getAttribute('href') || '';
  var label = (el.getAttribute && el.getAttribute('aria-label')) || el.textContent || '';
  var haystack = (href + ' ' + label).toLowerCase();
  for (var i = 0; i < KIND_PATTERNS.length; i++) {
    var p = KIND_PATTERNS[i];
    var re = new RegExp(p.test, p.flags || '');
    if (re.test(href) || re.test(label) || re.test(haystack)) return p.kind;
  }
  return 'help';
}

function regionOf(el) {
  var cs = window.getComputedStyle(el);
  if (cs.position === 'fixed' || cs.position === 'sticky') return 'sticky';
  var cur = el;
  while (cur && cur !== document.body) {
    var tag = cur.tagName ? cur.tagName.toLowerCase() : '';
    if (tag === 'header' || (cur.getAttribute && cur.getAttribute('role') === 'banner')) return 'header';
    if (tag === 'footer' || (cur.getAttribute && cur.getAttribute('role') === 'contentinfo')) return 'footer';
    cur = cur.parentElement;
  }
  return 'body';
}

var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
var seen = new Set ? new Set() : null;
var mechanisms = [];
for (var i = 0; i < els.length; i++) {
  var el = els[i];
  if (!__audit_visible(el)) continue;
  var kind = classifyKind(el);
  var region = regionOf(el);
  var key = kind + ':' + region;
  if (seen && seen.has(key)) continue;
  if (seen) seen.add(key);
  mechanisms.push({
    kind: kind,
    region: region,
    text: __audit_text(el),
    href: el.getAttribute ? el.getAttribute('href') : null
  });
}

return { mechanisms: mechanisms, url: location.href };
`;
	return wrapPageScript(body);
}
