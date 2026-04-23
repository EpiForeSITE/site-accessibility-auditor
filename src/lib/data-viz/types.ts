export type ChartKind =
	| 'bar'
	| 'grouped_bar'
	| 'stacked_bar'
	| 'line'
	| 'multi_line'
	| 'area'
	| 'stacked_area'
	| 'scatter'
	| 'bubble'
	| 'pie'
	| 'donut'
	| 'heatmap'
	| 'choropleth'
	| 'treemap'
	| 'sankey'
	| 'chord'
	| 'radar'
	| 'parallel_coords'
	| 'boxplot'
	| 'histogram'
	| 'sparkline'
	| 'gauge'
	| 'funnel'
	| 'waterfall'
	| 'combo'
	| 'unknown';

export interface AxisTick {
	label: string;
	position: number;
	numeric: number | null;
}

export interface MarkGeometry {
	tag: string;
	role: 'rect' | 'circle' | 'line' | 'path' | 'polygon' | 'other';
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string | null;
	stroke: string | null;
	title: string | null;
	dataLabel: string | null;
}

export interface LegendSwatch {
	label: string;
	color: string | null;
}

export interface ChartGeometry {
	viewBox: { x: number; y: number; width: number; height: number } | null;
	xAxisTicks: AxisTick[];
	yAxisTicks: AxisTick[];
	xAxisLabel: string | null;
	yAxisLabel: string | null;
	title: string | null;
	marks: MarkGeometry[];
	legend: LegendSwatch[];
	markTypes: Record<string, number>;
}

export interface DataRow {
	series: string | null;
	category: string | null;
	value: number | null;
	color: string | null;
}

export interface ChartData {
	kind: ChartKind;
	rows: DataRow[];
	confidence: {
		overall: number;
		axisParse: number;
		tickRegularity: number;
		markCount: number;
	};
	notes: string[];
}

export type CaptureKind = 'canvas' | 'svg' | 'img' | 'viewport';

export interface CaptureHint {
	kind: CaptureKind;
	imageSrc: string | null;
}

export interface LegendSwatchInfo {
	label: string;
	color: string | null;
}

export type ChartAnalysisState = 'idle' | 'queued' | 'capturing' | 'analyzing' | 'done' | 'error';

export type VerificationVerdict = 'supported' | 'contradicted' | 'unsupported' | 'out_of_scope';

export interface VerificationClaim {
	text: string;
	verdict: VerificationVerdict;
	evidence: string | null;
}

export type InsightKind =
	| 'extremum'
	| 'trend'
	| 'outlier'
	| 'comparison'
	| 'correlation'
	| 'distribution'
	| 'summary';

export interface ChartInsight {
	kind: InsightKind;
	text: string;
	evidence: string | null;
}

export type CritiqueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AccessibilityCritique {
	title: string;
	severity: CritiqueSeverity;
	wcag: string;
	summary: string;
	fix_hint: string;
}

export interface AxisInfo {
	label: string | null;
	scaleType: 'categorical' | 'numeric' | 'temporal' | 'log' | 'ordinal' | 'unknown';
	unit: string | null;
}

export interface SeriesInfo {
	name: string;
	color: string | null;
	role: string | null;
}

export interface NarrativeLevels {
	l1: string;
	l2: string;
	l3: string;
	l4: string;
}

export interface AnalysisRow {
	series: string | null;
	category: string | null;
	x: string | number | null;
	y: number | null;
	z: number | null;
	value: number | null;
	color: string | null;
}

export interface AnalysisConfidence {
	overall: number;
	dataExtraction: number;
	typeDetection: number;
	description: number;
}

export interface ChartAnalysis {
	chartType: ChartKind;
	title: string | null;
	subtitle: string | null;
	caption: string | null;
	xAxis: AxisInfo;
	yAxis: AxisInfo;
	zAxis: AxisInfo | null;
	series: SeriesInfo[];
	rows: AnalysisRow[];
	insights: ChartInsight[];
	narrative: NarrativeLevels;
	verificationClaims: VerificationClaim[];
	accessibilityCritique: AccessibilityCritique[];
	confidence: AnalysisConfidence;
	notes: string[];
	modelVersion: string;
	timestamp: string;
}

export interface ChartScores {
	screenReader: number;
	keyboard: number;
	colorSafe: number;
	lowVision: number;
	cognitive: number;
	descriptionFaithfulness: number;
	overall: number;
}

export interface DetectedChart {
	id: number;
	type: 'svg' | 'canvas' | 'img' | 'container';
	library: string | null;
	label: string;
	accessibleName: string | null;
	captionText: string | null;
	longDescription: string | null;
	dimensions: { width: number; height: number };
	rect: { x: number; y: number; width: number; height: number };
	path: string;
	nearestHeading: string | null;
	domSnippet: string | null;
	frameOrigin: 'main' | 'iframe' | 'shadow';
	shadowPath: string | null;
	captureHint: CaptureHint;
	hasAccessibleName: boolean;
	hasTableFallback: boolean;
	supportsKeyboard: boolean;
	legendItems: string[];
	legendSwatches: LegendSwatchInfo[];
	seriesLabels: string[];
	colorChannels: string[];
	nearbyControls: string[];
	childShapeCount: number;
	geometryAvailable: boolean;
	geometry: ChartGeometry | null;
	kind: ChartKind;
	classifierKind: ChartKind;
	data: ChartData | null;
	analysis: ChartAnalysis | null;
	analysisState: ChartAnalysisState;
	analysisError: string | null;
	scores: ChartScores | null;
	tableFallbackText: string | null;
	capturedImageDataUrl: string | null;
}

export interface ChartScanResult {
	charts: DetectedChart[];
	pageTitle: string;
	url: string;
	timestamp: string;
}

export interface OlliNode {
	id: string;
	label: string;
	role: 'root' | 'axis' | 'category' | 'series' | 'mark' | 'summary';
	description: string;
	children: OlliNode[];
	value?: number | null;
}
