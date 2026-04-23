import type {
	ChartAnalysis,
	ChartScores,
	DetectedChart,
	VerificationClaim
} from './types.ts';

function clamp01(v: number): number {
	return Math.max(0, Math.min(1, v));
}

function faithfulnessScore(claims: VerificationClaim[] | undefined): number {
	if (!claims || claims.length === 0) return 0.5;
	let supported = 0;
	let contradicted = 0;
	let unsupported = 0;
	for (const c of claims) {
		if (c.verdict === 'supported') supported++;
		else if (c.verdict === 'contradicted') contradicted++;
		else if (c.verdict === 'unsupported') unsupported++;
	}
	const inScope = supported + contradicted + unsupported;
	if (inScope === 0) return 0.5;
	return clamp01((supported - contradicted * 2 - unsupported * 0.25) / Math.max(1, inScope));
}

function colorSafeScore(chart: DetectedChart): number {
	const palette = chart.colorChannels;
	if (palette.length === 0) return 0.5;
	if (palette.length === 1) return 1;
	const parsed: [number, number, number][] = [];
	for (const c of palette) {
		const rgb = parseCssColor(c);
		if (rgb) parsed.push(rgb);
	}
	if (parsed.length < 2) return 0.7;
	let minDist = Infinity;
	for (let i = 0; i < parsed.length; i++) {
		for (let j = i + 1; j < parsed.length; j++) {
			const d = luminanceDist(parsed[i], parsed[j]);
			if (d < minDist) minDist = d;
		}
	}
	return clamp01(minDist * 2);
}

function parseCssColor(text: string): [number, number, number] | null {
	const trim = text.trim();
	const rgba = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(trim);
	if (rgba) return [parseFloat(rgba[1]), parseFloat(rgba[2]), parseFloat(rgba[3])];
	const hex = /^#([0-9a-f]{3,8})$/i.exec(trim);
	if (hex) {
		const h = hex[1];
		if (h.length === 3) {
			return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
		}
		if (h.length === 6 || h.length === 8) {
			return [
				parseInt(h.slice(0, 2), 16),
				parseInt(h.slice(2, 4), 16),
				parseInt(h.slice(4, 6), 16)
			];
		}
	}
	return null;
}

function luminance([r, g, b]: [number, number, number]): number {
	const norm = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function luminanceDist(a: [number, number, number], b: [number, number, number]): number {
	return Math.abs(luminance(a) - luminance(b));
}

function screenReaderScore(chart: DetectedChart): number {
	let score = 0;
	if (chart.hasAccessibleName) score += 0.35;
	if (chart.captionText) score += 0.2;
	if (chart.longDescription) score += 0.25;
	if (chart.hasTableFallback) score += 0.15;
	if (chart.analysis && chart.analysis.narrative.l1) score += 0.05;
	return clamp01(score);
}

function keyboardScore(chart: DetectedChart): number {
	if (chart.supportsKeyboard) {
		if (chart.nearbyControls.length > 0) return 1;
		return 0.7;
	}
	return chart.nearbyControls.length > 0 ? 0.4 : 0.1;
}

function lowVisionScore(chart: DetectedChart): number {
	const pxArea = chart.dimensions.width * chart.dimensions.height;
	const areaScore = clamp01(pxArea / 200000);
	const fallbackBonus = chart.hasTableFallback ? 0.3 : 0;
	const longDescBonus = chart.longDescription || chart.analysis?.narrative.l2 ? 0.2 : 0;
	return clamp01(areaScore * 0.5 + fallbackBonus + longDescBonus);
}

function cognitiveScore(chart: DetectedChart): number {
	const analysis: ChartAnalysis | null = chart.analysis;
	const hasTitle = Boolean(
		analysis?.title || chart.geometry?.title || chart.accessibleName
	);
	const hasXAxis =
		Boolean(analysis?.xAxis.label) ||
		Boolean(chart.geometry?.xAxisLabel) ||
		(chart.geometry?.xAxisTicks.length ?? 0) > 0;
	const hasYAxis =
		Boolean(analysis?.yAxis.label) ||
		Boolean(chart.geometry?.yAxisLabel) ||
		(chart.geometry?.yAxisTicks.length ?? 0) > 0;
	const hasAxes = hasXAxis && hasYAxis;
	const hasLegend =
		(chart.geometry?.legend.length ?? 0) > 0 ||
		(analysis?.series.length ?? 0) > 0 ||
		chart.legendSwatches.length > 0;
	let s = 0.15;
	if (hasTitle) s += 0.3;
	if (hasAxes) s += 0.3;
	if (hasLegend) s += 0.2;
	if (analysis && analysis.confidence.typeDetection > 0.6) s += 0.05;
	return clamp01(s);
}

export function scoreChart(chart: DetectedChart): ChartScores {
	const screenReader = screenReaderScore(chart);
	const keyboard = keyboardScore(chart);
	const colorSafe = colorSafeScore(chart);
	const lowVision = lowVisionScore(chart);
	const cognitive = cognitiveScore(chart);
	const descriptionFaithfulness = faithfulnessScore(chart.analysis?.verificationClaims);
	const overall =
		screenReader * 0.22 +
		keyboard * 0.14 +
		colorSafe * 0.14 +
		lowVision * 0.14 +
		cognitive * 0.16 +
		descriptionFaithfulness * 0.2;
	return {
		screenReader,
		keyboard,
		colorSafe,
		lowVision,
		cognitive,
		descriptionFaithfulness,
		overall: clamp01(overall)
	};
}
