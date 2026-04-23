import { extractCharts, clearScan } from './chart-extractor.ts';
import { captureChartImage } from './chart-capture.ts';
import { analyzeChartWithVision } from './openai-chart.ts';
import { classifyChartKind } from './chart-type-classifier.ts';
import { reconstructChartData } from './svg-data-reconstructor.ts';
import { scoreChart } from './chart-scorer.ts';
import type {
	ChartAnalysis,
	ChartKind,
	ChartScanResult,
	DetectedChart
} from './types.ts';

export async function scanCharts(): Promise<ChartScanResult> {
	const raw = await extractCharts();
	const charts: DetectedChart[] = raw.charts.map((base) => {
		const geometry = base.geometry ?? null;
		const classifierKind = classifyChartKind(geometry);
		const data = reconstructChartData(geometry, classifierKind);
		const full: DetectedChart = {
			...base,
			kind: classifierKind,
			classifierKind,
			data,
			analysis: null,
			analysisState: 'idle',
			analysisError: null,
			scores: null,
			capturedImageDataUrl: null
		};
		full.scores = scoreChart(full);
		return full;
	});

	return {
		charts,
		pageTitle: raw.pageTitle,
		url: raw.url,
		timestamp: raw.timestamp
	};
}

export async function cancelScan(): Promise<void> {
	try {
		await clearScan();
	} catch {
		// ignore
	}
}

function mergeKind(
	analysis: ChartAnalysis | null,
	classifierKind: ChartKind
): ChartKind {
	if (!analysis) return classifierKind;
	if (analysis.chartType && analysis.chartType !== 'unknown') return analysis.chartType;
	return classifierKind;
}

function appendDivergenceNotes(
	chart: DetectedChart,
	analysis: ChartAnalysis
): void {
	const notes = [...analysis.notes];
	if (
		chart.classifierKind !== 'unknown' &&
		analysis.chartType !== 'unknown' &&
		chart.classifierKind !== analysis.chartType
	) {
		notes.push(
			`Chart type disagreement: classifier=${chart.classifierKind}, vision=${analysis.chartType}. Trusting vision.`
		);
		analysis.confidence.typeDetection = Math.min(
			analysis.confidence.typeDetection,
			0.7
		);
	}

	if (
		chart.data &&
		chart.data.rows.length >= 20 &&
		chart.data.confidence.axisParse >= 0.8 &&
		analysis.rows.length >= 20
	) {
		const pairs = Math.min(chart.data.rows.length, analysis.rows.length);
		let divergences = 0;
		for (let i = 0; i < pairs; i++) {
			const det = chart.data.rows[i].value;
			const vis = analysis.rows[i].value;
			if (det == null || vis == null) continue;
			const denom = Math.max(Math.abs(det), Math.abs(vis), 1);
			if (Math.abs(det - vis) / denom > 0.15) divergences++;
		}
		if (divergences / pairs > 0.25) {
			notes.push(
				`Deterministic SVG reconstruction and vision data disagree on ${divergences}/${pairs} rows (>15% value drift).`
			);
			analysis.confidence.dataExtraction = Math.min(
				analysis.confidence.dataExtraction,
				0.7
			);
		}
	}
	analysis.notes = notes;
}

export async function analyzeChart(
	apiKey: string,
	chart: DetectedChart,
	onState?: (state: DetectedChart['analysisState']) => void
): Promise<void> {
	try {
		chart.analysisState = 'capturing';
		chart.analysisError = null;
		onState?.('capturing');

		const capture = await captureChartImage(chart);
		if (!capture) {
			chart.analysisState = 'error';
			chart.analysisError = 'Unable to capture chart image';
			onState?.('error');
			return;
		}
		chart.capturedImageDataUrl = capture.dataUrl;

		chart.analysisState = 'analyzing';
		onState?.('analyzing');

		const analysis = await analyzeChartWithVision(apiKey, {
			chart,
			geometry: chart.geometry,
			imageDataUrl: capture.dataUrl
		});

		appendDivergenceNotes(chart, analysis);
		chart.analysis = analysis;
		chart.kind = mergeKind(analysis, chart.classifierKind);
		chart.scores = scoreChart(chart);
		chart.analysisState = 'done';
		onState?.('done');
	} catch (err) {
		chart.analysisState = 'error';
		chart.analysisError = err instanceof Error ? err.message : String(err);
		onState?.('error');
	}
}

export interface AnalyzeAllProgress {
	chartId: number;
	state: DetectedChart['analysisState'];
	completed: number;
	total: number;
	error?: string;
}

export async function analyzeAll(
	apiKey: string,
	charts: DetectedChart[],
	onProgress?: (p: AnalyzeAllProgress) => void,
	concurrency = 3
): Promise<void> {
	const queue = charts.filter((c) => c.analysisState !== 'done');
	for (const c of queue) c.analysisState = 'queued';
	const total = queue.length;
	let completed = 0;

	let index = 0;
	const worker = async () => {
		while (index < queue.length) {
			const i = index++;
			const chart = queue[i];
			await analyzeChart(apiKey, chart, (state) => {
				onProgress?.({
					chartId: chart.id,
					state,
					completed,
					total,
					error: chart.analysisError ?? undefined
				});
			});
			completed++;
			onProgress?.({
				chartId: chart.id,
				state: chart.analysisState,
				completed,
				total,
				error: chart.analysisError ?? undefined
			});
		}
	};

	const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
	await Promise.all(workers);
}
