import { DRAG_SURFACE_SELECTORS } from '../constants.ts';
import type { ElementRect } from '../types.ts';
import { wrapPageScript, type RawFinding } from './shared.ts';

export interface DragRaw {
	index: number;
	tag: string;
	text: string;
	rect: ElementRect;
	selector: string | null;
	domPath: string | null;
	attributes: Record<string, string | null>;
	dragHints: string[];
	hasKeyboardRole: boolean;
	hasAriaValueModel: boolean;
	hasSiblingControls: boolean;
	hasSiblingTextInput: boolean;
}

export function classifyDrag(raw: DragRaw): RawFinding {
	const alternatives: string[] = [];
	if (raw.hasAriaValueModel) alternatives.push('aria-value model (keyboard)');
	if (raw.hasKeyboardRole) alternatives.push('keyboard role');
	if (raw.hasSiblingControls) alternatives.push('adjacent buttons');
	if (raw.hasSiblingTextInput) alternatives.push('adjacent text input');

	if (alternatives.length > 0) {
		return {
			wcag: '2.5.7',
			status: 'pass',
			tag: raw.tag,
			text: raw.text,
			rect: raw.rect,
			selector: raw.selector,
			domPath: raw.domPath,
			attributes: raw.attributes,
			evidence: { dragHints: raw.dragHints, alternatives },
			suggestion: `Drag surface has a non-drag alternative: ${alternatives.join(', ')}.`
		};
	}

	return {
		wcag: '2.5.7',
		status: 'fail',
		tag: raw.tag,
		text: raw.text,
		rect: raw.rect,
		selector: raw.selector,
		domPath: raw.domPath,
		attributes: raw.attributes,
		evidence: { dragHints: raw.dragHints, alternatives: [] },
		suggestion: `Drag surface (${raw.dragHints.join(', ') || 'drag listeners detected'}) has no single-pointer alternative. Add a keyboard interaction (arrow keys with aria-valuenow), a pair of increment/decrement buttons, or a text input to satisfy WCAG 2.5.7.`
	};
}

export function buildDragAlternativeCheck(): string {
	const body = `
var SELECTOR = ${JSON.stringify(DRAG_SURFACE_SELECTORS)};
var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));

var raws = [];
for (var i = 0; i < els.length; i++) {
  var el = els[i];
  if (!__audit_visible(el)) continue;

  var hints = [];
  if (el.getAttribute('draggable') === 'true') hints.push('draggable=true');
  if (el.getAttribute('role') === 'slider') hints.push('role=slider');
  if (el.hasAttribute('onpointerdown')) hints.push('onpointerdown');
  if (el.hasAttribute('onmousedown')) hints.push('onmousedown');
  if (el.hasAttribute('data-rbd-draggable-id')) hints.push('react-beautiful-dnd');
  if (el.hasAttribute('data-draggable')) hints.push('data-draggable');
  var cls = typeof el.className === 'string' ? el.className : '';
  if (/\\bsortable\\b/.test(cls)) hints.push('.sortable');
  if (/\\bdraggable\\b/.test(cls)) hints.push('.draggable');
  if (/\\bui-slider-handle\\b/.test(cls)) hints.push('jquery-ui slider');
  if (/\\bswiper-slide\\b/.test(cls)) hints.push('swiper');
  if (hints.length === 0) continue;

  var role = el.getAttribute('role');
  var hasKeyboardRole = role === 'slider' || role === 'spinbutton' || role === 'scrollbar';
  var hasAriaValueModel =
    el.hasAttribute('aria-valuenow') &&
    (el.hasAttribute('aria-valuemin') || el.hasAttribute('aria-valuemax'));

  var parent = el.parentElement;
  var hasSiblingControls = false;
  var hasSiblingTextInput = false;
  if (parent) {
    var kids = parent.children;
    for (var k = 0; k < kids.length; k++) {
      var kid = kids[k];
      if (kid === el) continue;
      var kt = kid.tagName ? kid.tagName.toLowerCase() : '';
      if (kt === 'button') hasSiblingControls = true;
      if (kt === 'input') {
        var t = (kid.getAttribute('type') || 'text').toLowerCase();
        if (t === 'text' || t === 'number' || t === 'range') hasSiblingTextInput = true;
        if (t === 'button' || t === 'submit') hasSiblingControls = true;
      }
      if (kid.getAttribute && (kid.getAttribute('role') === 'button')) hasSiblingControls = true;
    }
  }

  raws.push({
    index: i,
    tag: el.tagName.toLowerCase(),
    text: __audit_text(el),
    rect: __audit_rect(el),
    selector: __audit_getSelector(el),
    domPath: __audit_getPath(el),
    attributes: __audit_attrMap(el),
    dragHints: hints,
    hasKeyboardRole: hasKeyboardRole,
    hasAriaValueModel: hasAriaValueModel,
    hasSiblingControls: hasSiblingControls,
    hasSiblingTextInput: hasSiblingTextInput
  });
}
return { raws: raws };
`;
	return wrapPageScript(body);
}

export interface DragPageResult {
	raws: DragRaw[];
	__error?: string;
}
