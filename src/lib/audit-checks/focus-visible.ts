import { FOCUS_CONTRAST_MIN, FOCUSABLE_SELECTORS } from '../constants.ts';
import type { ElementRect } from '../types.ts';
import { wrapPageScript, type RawFinding } from './shared.ts';

export interface FocusVisibleRaw {
	index: number;
	tag: string;
	text: string;
	rect: ElementRect;
	selector: string | null;
	domPath: string | null;
	attributes: Record<string, string | null>;
	outlineStyle: string;
	outlineWidth: number;
	outlineColor: string;
	backgroundColor: string;
	ringContrast: number | null;
	outlineRemoved: boolean;
	hasReplacementIndicator: boolean;
}

export function classifyFocusVisible(raw: FocusVisibleRaw): RawFinding[] {
	const findings: RawFinding[] = [];

	if (raw.outlineRemoved && !raw.hasReplacementIndicator) {
		findings.push({
			wcag: '2.4.7',
			status: 'fail',
			tag: raw.tag,
			text: raw.text,
			rect: raw.rect,
			selector: raw.selector,
			domPath: raw.domPath,
			attributes: raw.attributes,
			evidence: {
				outlineStyle: raw.outlineStyle,
				outlineWidth: raw.outlineWidth,
				hasReplacementIndicator: raw.hasReplacementIndicator
			},
			suggestion: `Focus indicator is removed (outline:0/none) with no visible replacement. Add a :focus-visible outline, box-shadow, or border change to satisfy WCAG 2.4.7.`
		});
		return findings;
	}

	if (raw.ringContrast !== null && raw.ringContrast < FOCUS_CONTRAST_MIN) {
		findings.push({
			wcag: '1.4.11',
			status: 'fail',
			tag: raw.tag,
			text: raw.text,
			rect: raw.rect,
			selector: raw.selector,
			domPath: raw.domPath,
			attributes: raw.attributes,
			evidence: {
				outlineColor: raw.outlineColor,
				backgroundColor: raw.backgroundColor,
				contrast: raw.ringContrast,
				threshold: FOCUS_CONTRAST_MIN
			},
			suggestion: `Focus indicator contrast is ${raw.ringContrast.toFixed(2)}:1 against the surrounding background — below WCAG 1.4.11's 3:1 minimum.`
		});
	}

	return findings;
}

export function buildFocusVisibleCheck(): string {
	const body = `
var SELECTOR = ${JSON.stringify(FOCUSABLE_SELECTORS)};
var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));

function parseColor(str) {
  if (!str) return null;
  var m = str.match(/rgba?\\(([^)]+)\\)/);
  if (!m) return null;
  var parts = m[1].split(',').map(function(p) { return parseFloat(p.trim()); });
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
}
function luminance(c) {
  function ch(v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
function contrast(a, b) {
  var la = luminance(a), lb = luminance(b);
  var L1 = Math.max(la, lb), L2 = Math.min(la, lb);
  return (L1 + 0.05) / (L2 + 0.05);
}
function bgColorWalk(el) {
  var cur = el.parentElement;
  while (cur) {
    var cs = window.getComputedStyle(cur);
    var bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) return bg;
    cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

var raws = [];
for (var i = 0; i < els.length && i < 200; i++) {
  var el = els[i];
  if (!__audit_visible(el)) continue;
  var cs = window.getComputedStyle(el);
  var outlineStyle = cs.outlineStyle;
  var outlineWidth = parseFloat(cs.outlineWidth) || 0;
  var outlineColor = cs.outlineColor;
  var bg = cs.backgroundColor;

  var outlineRemoved = outlineStyle === 'none' || outlineWidth === 0;
  // Heuristic: check for a box-shadow or border-width change on :focus-visible
  // We can't read pseudo-class styles without forcing focus. Approximate by
  // checking for any non-zero box-shadow or a border-width > 0 on the element.
  var boxShadow = cs.boxShadow && cs.boxShadow !== 'none';
  var borderWidth = parseFloat(cs.borderTopWidth) || 0;
  var hasReplacementIndicator = boxShadow || borderWidth >= 2;

  var ringContrast = null;
  if (!outlineRemoved) {
    var oc = parseColor(outlineColor);
    var parentBg = bgColorWalk(el);
    if (oc) ringContrast = contrast(oc, parentBg);
  }

  raws.push({
    index: i,
    tag: el.tagName.toLowerCase(),
    text: __audit_text(el),
    rect: __audit_rect(el),
    selector: __audit_getSelector(el),
    domPath: __audit_getPath(el),
    attributes: __audit_attrMap(el),
    outlineStyle: outlineStyle,
    outlineWidth: outlineWidth,
    outlineColor: outlineColor,
    backgroundColor: bg,
    ringContrast: ringContrast,
    outlineRemoved: outlineRemoved,
    hasReplacementIndicator: hasReplacementIndicator
  });
}
return { raws: raws };
`;
	return wrapPageScript(body);
}

export interface FocusVisiblePageResult {
	raws: FocusVisibleRaw[];
	__error?: string;
}
