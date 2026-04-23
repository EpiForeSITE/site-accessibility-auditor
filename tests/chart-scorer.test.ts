import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreChart } from '../src/lib/data-viz/chart-scorer.ts';
import type { DetectedChart } from '../src/lib/data-viz/types.ts';

function mkChart(partial: Partial<DetectedChart> = {}): DetectedChart {
	return {
		id: 0,
		type: 'svg',
		library: null,
		label: 'chart',
		accessibleName: null,
		captionText: null,
		longDescription: null,
		dimensions: { width: 400, height: 300 },
		rect: { x: 0, y: 0, width: 400, height: 300 },
		path: 'svg',
		nearestHeading: null,
		domSnippet: null,
		frameOrigin: 'main',
		shadowPath: null,
		captureHint: { kind: 'svg', imageSrc: null },
		hasAccessibleName: false,
		hasTableFallback: false,
		supportsKeyboard: false,
		legendItems: [],
		legendSwatches: [],
		seriesLabels: [],
		colorChannels: [],
		nearbyControls: [],
		childShapeCount: 0,
		geometryAvailable: false,
		geometry: null,
		kind: 'unknown',
		classifierKind: 'unknown',
		data: null,
		analysis: null,
		analysisState: 'idle',
		analysisError: null,
		scores: null,
		tableFallbackText: null,
		capturedImageDataUrl: null,
		...partial
	};
}

test('score is low when nothing is accessible', () => {
	const s = scoreChart(mkChart());
	assert.ok(s.screenReader < 0.1);
	assert.ok(s.keyboard < 0.2);
	assert.ok(s.overall < 0.5);
});

test('score improves with accessible name + caption + table', () => {
	const s = scoreChart(
		mkChart({
			hasAccessibleName: true,
			accessibleName: 'Monthly sales',
			captionText: 'Sales by month',
			hasTableFallback: true,
			supportsKeyboard: true
		})
	);
	assert.ok(s.screenReader >= 0.7);
	assert.ok(s.keyboard >= 0.5);
});

test('overall score stays within 0..1', () => {
	const s = scoreChart(mkChart({ hasAccessibleName: true, supportsKeyboard: true }));
	assert.ok(s.overall >= 0 && s.overall <= 1);
});
