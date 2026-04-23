import type { ChartGeometry, ChartKind } from './types.ts';

export function classifyChartKind(geometry: ChartGeometry | null): ChartKind {
	if (!geometry) return 'unknown';
	const { marks, markTypes } = geometry;
	if (!marks || marks.length === 0) return 'unknown';

	const rectCount = markTypes['rect'] ?? 0;
	const circleCount = (markTypes['circle'] ?? 0) + (markTypes['ellipse'] ?? 0);
	const lineCount = markTypes['line'] ?? 0;
	const pathCount = markTypes['path'] ?? 0;
	const polyCount = markTypes['polygon'] ?? 0;

	// Pie / donut: paths with similar centroid, large surface fraction, no clear axis
	if (
		pathCount >= 2 &&
		geometry.xAxisTicks.length < 2 &&
		geometry.yAxisTicks.length < 2 &&
		rectCount < 3
	) {
		const paths = marks.filter((m) => m.role === 'path');
		if (paths.length >= 2) {
			const xs = paths.map((m) => m.x + m.width / 2);
			const ys = paths.map((m) => m.y + m.height / 2);
			const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
			const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
			const variance =
				(xs.reduce((a, x) => a + (x - avgX) ** 2, 0) +
					ys.reduce((a, y) => a + (y - avgY) ** 2, 0)) /
				(xs.length * 2);
			const avgSize = paths.reduce((a, m) => a + Math.max(m.width, m.height), 0) / paths.length;
			if (variance < avgSize * avgSize * 0.2) return 'pie';
		}
	}

	// Bar chart: many rects stacked vertically or horizontally
	if (rectCount >= 3 && rectCount > pathCount && rectCount > circleCount) {
		return 'bar';
	}

	// Scatter: many circles, few rects
	if (circleCount >= 5 && rectCount < circleCount / 2) {
		return 'scatter';
	}

	// Line or area: dominated by paths
	if (pathCount >= 1 && rectCount < 3) {
		// Area: polygon-like closed paths
		if (polyCount >= 1 && polyCount >= pathCount * 0.5) return 'area';
		if (lineCount >= 2 || pathCount >= 1) return 'line';
	}

	return 'unknown';
}
