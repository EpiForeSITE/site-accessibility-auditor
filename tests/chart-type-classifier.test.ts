import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChartKind } from '../src/lib/data-viz/chart-type-classifier.ts';
import type { ChartGeometry, MarkGeometry } from '../src/lib/data-viz/types.ts';

function mkMark(partial: Partial<MarkGeometry> & { role: MarkGeometry['role'] }): MarkGeometry {
	return {
		tag: 'rect',
		role: partial.role,
		x: 0,
		y: 0,
		width: 10,
		height: 10,
		fill: null,
		stroke: null,
		title: null,
		dataLabel: null,
		...partial
	};
}

function mkGeometry(
	marks: MarkGeometry[],
	markTypes: Record<string, number>,
	axes = true
): ChartGeometry {
	return {
		viewBox: null,
		xAxisTicks: axes
			? [
					{ label: 'A', position: 10, numeric: null },
					{ label: 'B', position: 20, numeric: null }
				]
			: [],
		yAxisTicks: axes
			? [
					{ label: '0', position: 50, numeric: 0 },
					{ label: '10', position: 10, numeric: 10 }
				]
			: [],
		xAxisLabel: null,
		yAxisLabel: null,
		title: null,
		marks,
		legend: [],
		markTypes
	};
}

test('returns unknown for null geometry', () => {
	assert.equal(classifyChartKind(null), 'unknown');
});

test('classifies many rects as bar', () => {
	const marks: MarkGeometry[] = [
		mkMark({ role: 'rect' }),
		mkMark({ role: 'rect' }),
		mkMark({ role: 'rect' }),
		mkMark({ role: 'rect' })
	];
	const g = mkGeometry(marks, { rect: 4 });
	assert.equal(classifyChartKind(g), 'bar');
});

test('classifies many circles as scatter', () => {
	const marks: MarkGeometry[] = Array.from({ length: 8 }, () => mkMark({ role: 'circle' }));
	const g = mkGeometry(marks, { circle: 8 });
	assert.equal(classifyChartKind(g), 'scatter');
});

test('classifies paths with no axes as pie', () => {
	const marks: MarkGeometry[] = [
		mkMark({ role: 'path', x: 100, y: 100, width: 40, height: 40 }),
		mkMark({ role: 'path', x: 105, y: 102, width: 38, height: 42 }),
		mkMark({ role: 'path', x: 103, y: 98, width: 44, height: 40 })
	];
	const g = mkGeometry(marks, { path: 3 }, false);
	assert.equal(classifyChartKind(g), 'pie');
});
