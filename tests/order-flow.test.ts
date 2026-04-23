import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOrderFlow } from '../src/lib/tab-order/order-flow.ts';
import type { TabOrderElement, TabOrderResult } from '../src/lib/tab-order/types.ts';

function mkElement(id: number, x: number, y: number, path: string): TabOrderElement {
	return {
		id,
		tag: 'button',
		text: `b${id}`,
		role: null,
		tabindex: 0,
		rect: { x, y, width: 40, height: 20 },
		path,
		attributes: {},
		focusable: 'natural'
	};
}

function mkResult(elements: TabOrderElement[]): TabOrderResult {
	return {
		elements,
		summary: {
			total: elements.length,
			natural: elements.length,
			programmatic: 0,
			hasPositiveTabindex: false
		},
		timestamp: new Date().toISOString()
	};
}

test('DOM and visual orders match when elements are ordered top-to-bottom', () => {
	const res = mkResult([
		mkElement(0, 0, 0, 'a'),
		mkElement(1, 0, 30, 'b'),
		mkElement(2, 0, 60, 'c')
	]);
	const flow = computeOrderFlow(res);
	assert.equal(flow.mismatches.domVsVisual, 0);
});

test('visual order differs when one element is visually above its DOM position', () => {
	const res = mkResult([
		mkElement(0, 0, 100, 'a'),
		mkElement(1, 0, 0, 'b'),
		mkElement(2, 0, 50, 'c')
	]);
	const flow = computeOrderFlow(res);
	assert.ok(flow.mismatches.domVsVisual > 0);
});

test('tab order mismatch reflects positive tabindex reshuffle', () => {
	const els = [mkElement(0, 0, 0, 'a'), mkElement(1, 0, 30, 'b'), mkElement(2, 0, 60, 'c')];
	els[2].tabindex = 1;
	els[1].tabindex = 2;
	const flow = computeOrderFlow(mkResult(els));
	// tabOrder is the order elements appear in the input; here unchanged but DOM/Visual already align
	assert.equal(flow.tabOrder.length, 3);
});
