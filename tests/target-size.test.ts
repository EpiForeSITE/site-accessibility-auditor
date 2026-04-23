import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTarget, type TargetSizeRaw } from '../src/lib/audit-checks/target-size.ts';
import { TARGET_MIN, TARGET_RECOMMENDED } from '../src/lib/constants.ts';

function mkTarget(
	partial: Partial<TargetSizeRaw> & { width: number; height: number }
): TargetSizeRaw {
	const { width, height, ...rest } = partial;
	return {
		index: 0,
		tag: 'button',
		text: 'Tap',
		rect: { x: 0, y: 0, width, height },
		selector: 'button',
		domPath: 'button',
		attributes: {},
		smallestDimension: Math.min(width, height),
		nearestNeighborDistance: null,
		nearestNeighborSelector: null,
		exemption: null,
		hasSpacing: false,
		...rest
	};
}

test('44x44 target passes 2.5.8', () => {
	const r = classifyTarget(mkTarget({ width: 44, height: 44 }), TARGET_MIN, TARGET_RECOMMENDED);
	assert.equal(r.wcag, '2.5.8');
	assert.equal(r.status, 'pass');
});

test('24x24 target is a warning (meets minimum, not recommended)', () => {
	const r = classifyTarget(mkTarget({ width: 24, height: 24 }), TARGET_MIN, TARGET_RECOMMENDED);
	assert.equal(r.status, 'warning');
});

test('20x20 target without spacing fails', () => {
	const r = classifyTarget(
		mkTarget({ width: 20, height: 20, hasSpacing: false, nearestNeighborDistance: 4 }),
		TARGET_MIN,
		TARGET_RECOMMENDED
	);
	assert.equal(r.status, 'fail');
});

test('20x20 target with 24+ px clearance passes via spacing exception', () => {
	const r = classifyTarget(
		mkTarget({
			width: 20,
			height: 20,
			hasSpacing: true,
			nearestNeighborDistance: 30,
			nearestNeighborSelector: '.other'
		}),
		TARGET_MIN,
		TARGET_RECOMMENDED
	);
	assert.equal(r.status, 'pass');
	assert.equal((r.evidence as { spacingException?: boolean }).spacingException, true);
});

test('exemption flag yields exempt status', () => {
	const r = classifyTarget(
		mkTarget({ width: 12, height: 12, exemption: 'inline' }),
		TARGET_MIN,
		TARGET_RECOMMENDED
	);
	assert.equal(r.status, 'exempt');
	assert.equal((r.evidence as { exemption?: string }).exemption, 'inline');
});
