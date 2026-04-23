import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	classifyOcclusion,
	verdict,
	type FocusOcclusionRaw
} from '../src/lib/audit-checks/focus-occlusion.ts';

function mkRaw(obstructions: FocusOcclusionRaw['obstructions']): FocusOcclusionRaw {
	return {
		index: 0,
		tag: 'input',
		text: '',
		rect: { x: 0, y: 0, width: 200, height: 40 },
		selector: 'input',
		domPath: 'input',
		attributes: {},
		obstructions
	};
}

test('no obstructions -> clear, no findings', () => {
	const raw = mkRaw([]);
	assert.equal(verdict(raw), 'clear');
	assert.deepEqual(classifyOcclusion(raw), []);
});

test('partial obstruction -> pass 2.4.11, fail 2.4.12', () => {
	const raw = mkRaw([
		{
			selector: 'header.sticky',
			tag: 'header',
			position: 'fixed',
			rect: { x: 0, y: 0, width: 200, height: 20 },
			coversCorners: 2,
			overlapArea: 200 * 20
		}
	]);
	assert.equal(verdict(raw), 'partial');
	const f = classifyOcclusion(raw);
	assert.equal(f.length, 2);
	const m = f.find((x) => x.wcag === '2.4.11');
	const e = f.find((x) => x.wcag === '2.4.12');
	assert.equal(m?.status, 'pass');
	assert.equal(e?.status, 'fail');
});

test('all four corners covered -> fail 2.4.11 and 2.4.12', () => {
	const raw = mkRaw([
		{
			selector: 'div.modal',
			tag: 'div',
			position: 'fixed',
			rect: { x: -10, y: -10, width: 500, height: 500 },
			coversCorners: 4,
			overlapArea: 500 * 500
		}
	]);
	assert.equal(verdict(raw), 'full');
	const f = classifyOcclusion(raw);
	assert.equal(f.find((x) => x.wcag === '2.4.11')?.status, 'fail');
	assert.equal(f.find((x) => x.wcag === '2.4.12')?.status, 'fail');
});
