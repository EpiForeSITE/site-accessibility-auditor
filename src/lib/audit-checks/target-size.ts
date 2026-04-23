import { INTERACTIVE_SELECTORS, TARGET_MIN, TARGET_RECOMMENDED } from '../constants.ts';
import type { ElementRect } from '../types.ts';
import { wrapPageScript, rectCenter, type RawFinding } from './shared.ts';

export interface TargetSizeRaw {
	index: number;
	tag: string;
	text: string;
	rect: ElementRect;
	selector: string | null;
	domPath: string | null;
	attributes: Record<string, string | null>;
	smallestDimension: number;
	/** Nearest other interactive target's edge distance (px) or null. */
	nearestNeighborDistance: number | null;
	nearestNeighborSelector: string | null;
	/** Exemption opt-in via `data-audit-exempt`. */
	exemption: 'inline' | 'essential' | 'equivalent' | 'user-agent' | null;
	/** True if this element's circle has 24-CSS-pixel clearance from every other target's circle. */
	hasSpacing: boolean;
}

/**
 * Pure decision logic used both by the page-side IIFE and by tests.
 * Implements WCAG 2.5.8 with the spacing exception.
 */
export function classifyTarget(r: TargetSizeRaw, minPx: number, recommendedPx: number): RawFinding {
	const w = r.rect.width;
	const h = r.rect.height;
	const smallest = Math.min(w, h);

	if (r.exemption) {
		return {
			wcag: '2.5.8',
			status: 'exempt',
			tag: r.tag,
			text: r.text,
			rect: r.rect,
			selector: r.selector,
			domPath: r.domPath,
			attributes: r.attributes,
			evidence: {
				width: Math.round(w),
				height: Math.round(h),
				exemption: r.exemption
			},
			suggestion: `Marked exempt (${r.exemption}) — WCAG 2.5.8 exception claimed via data-audit-exempt.`
		};
	}

	if (smallest >= recommendedPx) {
		return {
			wcag: '2.5.8',
			status: 'pass',
			tag: r.tag,
			text: r.text,
			rect: r.rect,
			selector: r.selector,
			domPath: r.domPath,
			attributes: r.attributes,
			evidence: { width: Math.round(w), height: Math.round(h), threshold: recommendedPx },
			suggestion: `Target is ${Math.round(w)}\u00d7${Math.round(h)}px — meets the recommended ${recommendedPx}\u00d7${recommendedPx}px.`
		};
	}

	if (smallest >= minPx) {
		return {
			wcag: '2.5.8',
			status: 'warning',
			tag: r.tag,
			text: r.text,
			rect: r.rect,
			selector: r.selector,
			domPath: r.domPath,
			attributes: r.attributes,
			evidence: { width: Math.round(w), height: Math.round(h), threshold: minPx },
			suggestion: `Target is ${Math.round(w)}\u00d7${Math.round(h)}px — meets the ${minPx}px minimum but falls short of the recommended ${recommendedPx}px.`
		};
	}

	if (r.hasSpacing) {
		return {
			wcag: '2.5.8',
			status: 'pass',
			tag: r.tag,
			text: r.text,
			rect: r.rect,
			selector: r.selector,
			domPath: r.domPath,
			attributes: r.attributes,
			evidence: {
				width: Math.round(w),
				height: Math.round(h),
				threshold: minPx,
				spacingException: true,
				nearestNeighborDistance: r.nearestNeighborDistance,
				nearestNeighborSelector: r.nearestNeighborSelector
			},
			suggestion: `Target is ${Math.round(w)}\u00d7${Math.round(h)}px but passes 2.5.8 via the spacing exception (nearest target ${r.nearestNeighborDistance != null ? Math.round(r.nearestNeighborDistance) + 'px' : 'unknown'} away).`
		};
	}

	return {
		wcag: '2.5.8',
		status: 'fail',
		tag: r.tag,
		text: r.text,
		rect: r.rect,
		selector: r.selector,
		domPath: r.domPath,
		attributes: r.attributes,
		evidence: {
			width: Math.round(w),
			height: Math.round(h),
			threshold: minPx,
			nearestNeighborDistance: r.nearestNeighborDistance,
			nearestNeighborSelector: r.nearestNeighborSelector
		},
		suggestion: `Target is ${Math.round(w)}\u00d7${Math.round(h)}px — fails WCAG 2.5.8. Enlarge to at least ${minPx}\u00d7${minPx}px or ensure every other target's 24px circle is fully outside this target's 24px circle.`
	};
}

export function buildTargetSizeCheck(): string {
	const body = `
var SELECTOR = ${JSON.stringify(INTERACTIVE_SELECTORS)};
var MIN = ${TARGET_MIN};

var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
var centers = [];
for (var i = 0; i < els.length; i++) {
  var el = els[i];
  if (!__audit_visible(el)) { centers.push(null); continue; }
  var r = __audit_rect(el);
  centers.push({ cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r });
}

var raws = [];
for (var i = 0; i < els.length; i++) {
  var el = els[i];
  var c = centers[i];
  if (!c) continue;
  var smallest = Math.min(c.r.width, c.r.height);

  var nearestDist = null;
  var nearestSel = null;
  var hasSpacing = true;

  if (smallest < MIN) {
    for (var j = 0; j < els.length; j++) {
      if (i === j) continue;
      var c2 = centers[j];
      if (!c2) continue;
      var dx = c.cx - c2.cx;
      var dy = c.cy - c2.cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (nearestDist === null || d < nearestDist) {
        nearestDist = d;
        nearestSel = __audit_getSelector(els[j]);
      }
      if (d < MIN) { hasSpacing = false; }
    }
  }

  var exempt = el.getAttribute('data-audit-exempt');
  var exemption = null;
  if (exempt === 'inline' || exempt === 'essential' || exempt === 'equivalent' || exempt === 'user-agent') {
    exemption = exempt;
  }
  // Equivalent-control exception: if a sibling with the same accessible name is >= MIN, treat as equivalent.
  if (!exemption && smallest < MIN) {
    var aria = el.getAttribute('aria-label') || el.textContent || '';
    aria = aria.trim().toLowerCase();
    if (aria && el.parentElement) {
      var sibs = el.parentElement.querySelectorAll(SELECTOR);
      for (var s = 0; s < sibs.length; s++) {
        if (sibs[s] === el) continue;
        var sAria = (sibs[s].getAttribute('aria-label') || sibs[s].textContent || '').trim().toLowerCase();
        if (sAria && sAria === aria) {
          var sr = sibs[s].getBoundingClientRect();
          if (Math.min(sr.width, sr.height) >= ${TARGET_RECOMMENDED}) {
            exemption = 'equivalent';
            break;
          }
        }
      }
    }
  }

  raws.push({
    index: i,
    tag: el.tagName.toLowerCase(),
    text: __audit_text(el),
    rect: c.r,
    selector: __audit_getSelector(el),
    domPath: __audit_getPath(el),
    attributes: __audit_attrMap(el),
    smallestDimension: smallest,
    nearestNeighborDistance: nearestDist,
    nearestNeighborSelector: nearestSel,
    exemption: exemption,
    hasSpacing: hasSpacing
  });
}
return { raws: raws };
`;
	return wrapPageScript(body);
}

export interface TargetSizePageResult {
	raws: TargetSizeRaw[];
	__error?: string;
}

export function classifyTargetBatch(raws: TargetSizeRaw[]): RawFinding[] {
	const recommended = TARGET_RECOMMENDED;
	return raws.map((r) => classifyTarget(r, TARGET_MIN, recommended));
}

export { rectCenter };
