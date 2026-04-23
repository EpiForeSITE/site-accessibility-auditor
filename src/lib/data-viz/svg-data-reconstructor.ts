import type { AxisTick, ChartData, ChartGeometry, ChartKind, DataRow } from './types.ts';

function sortedNumericTicks(ticks: AxisTick[]): AxisTick[] {
	return ticks
		.filter((t) => t.numeric !== null)
		.slice()
		.sort((a, b) => a.position - b.position);
}

function tickRegularity(ticks: AxisTick[]): number {
	const numeric = sortedNumericTicks(ticks);
	if (numeric.length < 2) return 0;
	const intervals: number[] = [];
	for (let i = 1; i < numeric.length; i++) {
		const dp = numeric[i].position - numeric[i - 1].position;
		if (dp > 0) intervals.push(dp);
	}
	if (intervals.length === 0) return 0;
	const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
	const variance = intervals.reduce((a, v) => a + (v - mean) ** 2, 0) / intervals.length;
	const cv = Math.sqrt(variance) / Math.max(mean, 1e-6);
	return Math.max(0, 1 - Math.min(1, cv));
}

function buildYScale(
	ticks: AxisTick[]
): { invert: (pixel: number) => number | null; domain: [number, number] } | null {
	const numeric = sortedNumericTicks(ticks);
	if (numeric.length < 2) return null;
	const first = numeric[0];
	const last = numeric[numeric.length - 1];
	if (first.numeric === null || last.numeric === null) return null;
	const dy = last.position - first.position;
	const dv = last.numeric - first.numeric;
	if (dy === 0) return null;
	const slope = dv / dy;
	return {
		invert(pixel: number) {
			return first.numeric! + slope * (pixel - first.position);
		},
		domain: [Math.min(first.numeric, last.numeric), Math.max(first.numeric, last.numeric)]
	};
}

function buildXScale(
	ticks: AxisTick[]
): { invert: (pixel: number) => number | null; domain: [number, number] } | null {
	return buildYScale(ticks);
}

function nearestCategoricalTick(
	ticks: AxisTick[],
	pixel: number,
	axis: 'x' | 'y'
): AxisTick | null {
	if (ticks.length === 0) return null;
	let best: AxisTick | null = null;
	let bestDist = Infinity;
	for (const t of ticks) {
		const d = Math.abs(t.position - pixel);
		if (d < bestDist) {
			bestDist = d;
			best = t;
		}
	}
	return best;
	void axis;
}

function reconstructBar(geometry: ChartGeometry): { rows: DataRow[]; axisParse: number } {
	const rects = geometry.marks.filter((m) => m.role === 'rect');
	if (rects.length === 0) return { rows: [], axisParse: 0 };

	// Detect orientation: vertical bars have height > width; horizontal bars reverse.
	const avgW = rects.reduce((a, r) => a + r.width, 0) / rects.length;
	const avgH = rects.reduce((a, r) => a + r.height, 0) / rects.length;
	const vertical = avgH >= avgW;

	const yScale = buildYScale(geometry.yAxisTicks);
	const xScale = buildXScale(geometry.xAxisTicks);
	let axisParse = 0;
	if (vertical) {
		if (yScale) axisParse += 0.5;
		if (geometry.xAxisTicks.length > 0) axisParse += 0.5;
	} else {
		if (xScale) axisParse += 0.5;
		if (geometry.yAxisTicks.length > 0) axisParse += 0.5;
	}

	const rows: DataRow[] = [];
	for (const r of rects) {
		let category: string | null = null;
		let value: number | null = null;
		if (vertical) {
			const center = r.x + r.width / 2;
			const tick = nearestCategoricalTick(geometry.xAxisTicks, center, 'x');
			category = tick ? tick.label : null;
			if (yScale) {
				const topValue = yScale.invert(r.y);
				const baseValue = yScale.invert(r.y + r.height);
				if (topValue !== null && baseValue !== null) {
					value = Math.abs(topValue - baseValue);
				}
			}
		} else {
			const center = r.y + r.height / 2;
			const tick = nearestCategoricalTick(geometry.yAxisTicks, center, 'y');
			category = tick ? tick.label : null;
			if (xScale) {
				const rightValue = xScale.invert(r.x + r.width);
				const leftValue = xScale.invert(r.x);
				if (rightValue !== null && leftValue !== null) {
					value = Math.abs(rightValue - leftValue);
				}
			}
		}
		const label = r.dataLabel ?? r.title ?? null;
		const dataVal = label ? parseFloatSafe(label) : null;
		if (value === null && dataVal !== null) value = dataVal;

		rows.push({
			series: null,
			category: category ?? label,
			value,
			color: r.fill
		});
	}

	// Group by color to assign series when legend is available
	if (geometry.legend.length > 1) {
		const legendByColor = new Map<string, string>();
		for (const l of geometry.legend) {
			if (l.color) legendByColor.set(normalizeColor(l.color), l.label);
		}
		for (const row of rows) {
			if (row.color) {
				const nm = legendByColor.get(normalizeColor(row.color));
				if (nm) row.series = nm;
			}
		}
	}

	return { rows, axisParse: Math.min(1, axisParse) };
}

function reconstructLineOrScatter(
	geometry: ChartGeometry,
	kind: 'line' | 'scatter' | 'area'
): { rows: DataRow[]; axisParse: number } {
	const xScale = buildXScale(geometry.xAxisTicks);
	const yScale = buildYScale(geometry.yAxisTicks);
	if (!xScale || !yScale) return { rows: [], axisParse: 0 };

	const marks =
		kind === 'scatter'
			? geometry.marks.filter((m) => m.role === 'circle')
			: geometry.marks.filter((m) => m.role === 'circle' || m.role === 'path');

	const rows: DataRow[] = [];
	for (const m of marks) {
		const cx = m.x + m.width / 2;
		const cy = m.y + m.height / 2;
		const x = xScale.invert(cx);
		const y = yScale.invert(cy);
		if (x === null || y === null) continue;
		rows.push({
			series: null,
			category: x.toFixed(2),
			value: y,
			color: m.fill ?? m.stroke
		});
	}

	if (geometry.legend.length > 0) {
		const legendByColor = new Map<string, string>();
		for (const l of geometry.legend) {
			if (l.color) legendByColor.set(normalizeColor(l.color), l.label);
		}
		for (const row of rows) {
			if (row.color) {
				const nm = legendByColor.get(normalizeColor(row.color));
				if (nm) row.series = nm;
			}
		}
	}

	return { rows, axisParse: 1 };
}

function reconstructPie(geometry: ChartGeometry): { rows: DataRow[]; axisParse: number } {
	const paths = geometry.marks.filter((m) => m.role === 'path');
	if (paths.length === 0) return { rows: [], axisParse: 0 };
	// We can't easily derive exact values from arcs without path parsing; emit rows keyed by color with null values.
	const rows: DataRow[] = [];
	for (const p of paths) {
		const label = p.dataLabel ?? p.title ?? null;
		rows.push({
			series: null,
			category: label,
			value: parseFloatSafe(label ?? ''),
			color: p.fill
		});
	}
	if (geometry.legend.length > 0) {
		const legendByColor = new Map<string, string>();
		for (const l of geometry.legend) {
			if (l.color) legendByColor.set(normalizeColor(l.color), l.label);
		}
		for (const row of rows) {
			if (row.color) {
				const nm = legendByColor.get(normalizeColor(row.color));
				if (nm && !row.category) row.category = nm;
			}
		}
	}
	return { rows, axisParse: 0 };
}

function parseFloatSafe(text: string): number | null {
	if (!text) return null;
	const cleaned = text.replace(/[,$%\s]/g, '');
	const m = cleaned.match(/-?\d+(?:\.\d+)?/);
	if (!m) return null;
	const n = parseFloat(m[0]);
	return isNaN(n) ? null : n;
}

function normalizeColor(color: string): string {
	return color.replace(/\s+/g, '').toLowerCase();
}

export function reconstructChartData(geometry: ChartGeometry | null, kind: ChartKind): ChartData {
	const notes: string[] = [];
	if (!geometry) {
		return {
			kind,
			rows: [],
			confidence: { overall: 0, axisParse: 0, tickRegularity: 0, markCount: 0 },
			notes: ['No geometry available (non-SVG chart).']
		};
	}

	let rows: DataRow[] = [];
	let axisParse = 0;
	if (kind === 'bar') {
		const out = reconstructBar(geometry);
		rows = out.rows;
		axisParse = out.axisParse;
	} else if (kind === 'line' || kind === 'area' || kind === 'scatter') {
		const out = reconstructLineOrScatter(geometry, kind);
		rows = out.rows;
		axisParse = out.axisParse;
	} else if (kind === 'pie') {
		const out = reconstructPie(geometry);
		rows = out.rows;
		axisParse = out.axisParse;
	}

	const regularityX = tickRegularity(geometry.xAxisTicks);
	const regularityY = tickRegularity(geometry.yAxisTicks);
	const tickReg = Math.max(regularityX, regularityY);

	const markCountScore = Math.min(1, rows.length / 20);
	const overall = axisParse * 0.5 + tickReg * 0.25 + markCountScore * 0.25;

	if (rows.length === 0) notes.push('Could not extract individual data rows.');
	if (axisParse < 0.5) notes.push('Axis tick labels were incomplete or non-numeric.');
	if (rows.length > 0 && rows.every((r) => r.value === null))
		notes.push('Mark geometry found but values could not be inferred.');

	return {
		kind,
		rows,
		confidence: {
			overall,
			axisParse,
			tickRegularity: tickReg,
			markCount: markCountScore
		},
		notes
	};
}
