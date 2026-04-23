import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconstructChartData } from '../src/lib/data-viz/svg-data-reconstructor.ts';
import type { ChartGeometry, MarkGeometry } from '../src/lib/data-viz/types.ts';

function mkBar(
	x: number,
	width: number,
	y: number,
	height: number,
	fill = '#2563eb'
): MarkGeometry {
	return {
		tag: 'rect',
		role: 'rect',
		x,
		y,
		width,
		height,
		fill,
		stroke: null,
		title: null,
		dataLabel: null
	};
}

test('reconstructs bar chart values from axis scale', () => {
	const geometry: ChartGeometry = {
		viewBox: null,
		xAxisTicks: [
			{ label: 'Jan', position: 50, numeric: null },
			{ label: 'Feb', position: 150, numeric: null },
			{ label: 'Mar', position: 250, numeric: null }
		],
		yAxisTicks: [
			{ label: '100', position: 0, numeric: 100 },
			{ label: '0', position: 200, numeric: 0 }
		],
		xAxisLabel: null,
		yAxisLabel: null,
		title: null,
		marks: [mkBar(40, 20, 150, 50), mkBar(140, 20, 100, 100), mkBar(240, 20, 50, 150)],
		legend: [],
		markTypes: { rect: 3 }
	};
	const data = reconstructChartData(geometry, 'bar');
	assert.equal(data.rows.length, 3);
	assert.equal(data.rows[0].category, 'Jan');
	assert.ok(data.rows[0].value !== null);
	assert.ok(data.confidence.axisParse > 0);
});

test('returns empty rows and reports notes when geometry is null', () => {
	const data = reconstructChartData(null, 'unknown');
	assert.equal(data.rows.length, 0);
	assert.ok(data.notes.length > 0);
});

test('reconstructs line chart using xScale + yScale inversion', () => {
	const geometry: ChartGeometry = {
		viewBox: null,
		xAxisTicks: [
			{ label: '0', position: 0, numeric: 0 },
			{ label: '10', position: 100, numeric: 10 }
		],
		yAxisTicks: [
			{ label: '0', position: 100, numeric: 0 },
			{ label: '10', position: 0, numeric: 10 }
		],
		xAxisLabel: null,
		yAxisLabel: null,
		title: null,
		marks: [
			{
				tag: 'circle',
				role: 'circle',
				x: 5,
				y: 95,
				width: 0,
				height: 0,
				fill: '#2563eb',
				stroke: null,
				title: null,
				dataLabel: null
			},
			{
				tag: 'circle',
				role: 'circle',
				x: 95,
				y: 5,
				width: 0,
				height: 0,
				fill: '#2563eb',
				stroke: null,
				title: null,
				dataLabel: null
			}
		],
		legend: [],
		markTypes: { circle: 2 }
	};
	const data = reconstructChartData(geometry, 'line');
	assert.equal(data.rows.length, 2);
	assert.equal(data.confidence.axisParse, 1);
});
