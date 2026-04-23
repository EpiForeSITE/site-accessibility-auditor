import type {
	AccessibilityCritique,
	AnalysisConfidence,
	AnalysisRow,
	AxisInfo,
	ChartAnalysis,
	ChartGeometry,
	ChartInsight,
	ChartKind,
	CritiqueSeverity,
	DetectedChart,
	InsightKind,
	NarrativeLevels,
	SeriesInfo,
	VerificationClaim,
	VerificationVerdict
} from './types.ts';
import { callResponsesJson, OPENAI_MODEL } from '../shared/openai-client.ts';

const CHART_TYPE_VALUES = [
	'bar',
	'grouped_bar',
	'stacked_bar',
	'line',
	'multi_line',
	'area',
	'stacked_area',
	'scatter',
	'bubble',
	'pie',
	'donut',
	'heatmap',
	'choropleth',
	'treemap',
	'sankey',
	'chord',
	'radar',
	'parallel_coords',
	'boxplot',
	'histogram',
	'sparkline',
	'gauge',
	'funnel',
	'waterfall',
	'combo',
	'unknown'
] as const;

const SCALE_TYPE_VALUES = [
	'categorical',
	'numeric',
	'temporal',
	'log',
	'ordinal',
	'unknown'
] as const;

const INSIGHT_KIND_VALUES = [
	'extremum',
	'trend',
	'outlier',
	'comparison',
	'correlation',
	'distribution',
	'summary'
] as const;

const VERDICT_VALUES = ['supported', 'contradicted', 'unsupported', 'out_of_scope'] as const;

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low', 'info'] as const;

const AXIS_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['label', 'scaleType', 'unit'],
	properties: {
		label: { type: ['string', 'null'] },
		scaleType: { type: 'string', enum: SCALE_TYPE_VALUES as unknown as string[] },
		unit: { type: ['string', 'null'] }
	}
} as const;

const CHART_ANALYSIS_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: [
		'chartType',
		'title',
		'subtitle',
		'caption',
		'xAxis',
		'yAxis',
		'zAxis',
		'series',
		'rows',
		'insights',
		'narrative',
		'verificationClaims',
		'accessibilityCritique',
		'confidence',
		'notes'
	],
	properties: {
		chartType: { type: 'string', enum: CHART_TYPE_VALUES as unknown as string[] },
		title: { type: ['string', 'null'] },
		subtitle: { type: ['string', 'null'] },
		caption: { type: ['string', 'null'] },
		xAxis: AXIS_SCHEMA,
		yAxis: AXIS_SCHEMA,
		zAxis: {
			anyOf: [AXIS_SCHEMA, { type: 'null' }]
		},
		series: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'color', 'role'],
				properties: {
					name: { type: 'string' },
					color: { type: ['string', 'null'] },
					role: { type: ['string', 'null'] }
				}
			}
		},
		rows: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['series', 'category', 'x', 'y', 'z', 'value', 'color'],
				properties: {
					series: { type: ['string', 'null'] },
					category: { type: ['string', 'null'] },
					x: { type: ['string', 'number', 'null'] },
					y: { type: ['number', 'null'] },
					z: { type: ['number', 'null'] },
					value: { type: ['number', 'null'] },
					color: { type: ['string', 'null'] }
				}
			}
		},
		insights: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['kind', 'text', 'evidence'],
				properties: {
					kind: { type: 'string', enum: INSIGHT_KIND_VALUES as unknown as string[] },
					text: { type: 'string' },
					evidence: { type: ['string', 'null'] }
				}
			}
		},
		narrative: {
			type: 'object',
			additionalProperties: false,
			required: ['l1', 'l2', 'l3', 'l4'],
			properties: {
				l1: { type: 'string' },
				l2: { type: 'string' },
				l3: { type: 'string' },
				l4: { type: 'string' }
			}
		},
		verificationClaims: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['text', 'verdict', 'evidence'],
				properties: {
					text: { type: 'string' },
					verdict: { type: 'string', enum: VERDICT_VALUES as unknown as string[] },
					evidence: { type: ['string', 'null'] }
				}
			}
		},
		accessibilityCritique: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'severity', 'wcag', 'summary', 'fix_hint'],
				properties: {
					title: { type: 'string' },
					severity: { type: 'string', enum: SEVERITY_VALUES as unknown as string[] },
					wcag: { type: 'string' },
					summary: { type: 'string' },
					fix_hint: { type: 'string' }
				}
			}
		},
		confidence: {
			type: 'object',
			additionalProperties: false,
			required: ['overall', 'dataExtraction', 'typeDetection', 'description'],
			properties: {
				overall: { type: 'number' },
				dataExtraction: { type: 'number' },
				typeDetection: { type: 'number' },
				description: { type: 'number' }
			}
		},
		notes: {
			type: 'array',
			items: { type: 'string' }
		}
	}
} as const;

export interface VisionAnalyzeInput {
	chart: DetectedChart;
	geometry: ChartGeometry | null;
	imageDataUrl: string;
	extraImages?: string[];
}

const INSTRUCTIONS = `You are an expert data visualization analyst and WCAG accessibility auditor.

You receive one rendered chart image and structured metadata collected from the page (accessible name, caption, long description, table fallback, legend items, library, optional deterministic SVG geometry). Your job is to produce a precise, auditable analysis of the chart.

ABSOLUTE RULES:
- Base every numeric claim on what is actually visible in the image. Never invent data.
- Use the deterministic geometry hints when present as a grounding reference, but the image is the source of truth.
- If a value cannot be read from the image, set it to null rather than guessing.
- Prefer the most specific chart subtype (e.g. stacked_bar vs bar, donut vs pie, multi_line vs line).
- Return data in long format. One row per mark. For pie/donut, one row per slice. For heatmaps, one row per cell. For sankey, one row per flow with series=source, category=target, value=flow.

Fields:
- chartType: one of the enum values.
- title/subtitle/caption: exact text if visible in the chart; else null.
- xAxis/yAxis/zAxis: label (human text or null), scaleType, unit (e.g. "%", "USD", "days", null).
- series: one entry per distinct series. color should be hex or CSS color if visible, else null. role is a short human role tag ("primary", "comparison", "forecast", null).
- rows: the full reconstructed long-format data. x is the category label or numeric/date value. value is the primary measure (equal to y for most charts). Omit duplicates. Aim for complete coverage when legible; if the chart is too dense (heatmaps, hundreds of points), return a representative subset and add a note.
- insights: 3-8 bullet-style observations. kind is the pattern category. evidence cites a concrete number or category from the image.
- narrative: Lundgard & Satyanarayan accessible levels.
  - l1 Structure: chart type, title, axes, series count. 1-2 sentences.
  - l2 Statistics: min/max/range/mean as relevant. Concrete numbers.
  - l3 Trends: directional and comparative language grounded in the data.
  - l4 Context: domain meaning, library, confidence caveats, what readers should take away. Do not invent context outside what metadata provides.
- verificationClaims: split the provided existing description (label + caption + long description + table fallback) into sentences and emit one claim per non-trivial sentence. verdict:
  - "supported" if the chart data directly supports the sentence.
  - "contradicted" if the data directly contradicts it.
  - "unsupported" if the sentence makes a factual claim we cannot confirm from the data.
  - "out_of_scope" for meta-commentary or non-data statements.
  Evidence should cite the specific data observation.
- accessibilityCritique: WCAG-tagged issues specific to this chart (no generic advice). Include missing accessible name, no text alternative, color-only encoding, low contrast between series, unlabeled axes, keyboard inaccessibility, missing data table fallback. severity and wcag must be specific.
- confidence: 0..1 floats.
  - overall: holistic.
  - dataExtraction: how confident you are in the rows values.
  - typeDetection: confidence in chartType.
  - description: confidence in narrative/insights.
- notes: any caveats, ambiguities, or explanations of trade-offs (e.g. "truncated to 50 of ~200 points", "legend swatches partially occluded").

Do not include markdown. Return only the JSON object matching the schema.`;

function buildUserText(input: VisionAnalyzeInput): string {
	const { chart, geometry } = input;
	const lines: string[] = [];
	lines.push(`Library hint: ${chart.library ?? 'unknown'}`);
	lines.push(`Container tag: ${chart.type}`);
	if (chart.accessibleName) lines.push(`Accessible name: ${chart.accessibleName}`);
	if (chart.captionText) lines.push(`Caption: ${chart.captionText}`);
	if (chart.longDescription) lines.push(`Long description: ${chart.longDescription}`);
	if (chart.tableFallbackText) lines.push(`Table fallback text: ${chart.tableFallbackText}`);
	if (chart.nearestHeading) lines.push(`Nearest heading: ${chart.nearestHeading}`);
	if (chart.legendItems.length) lines.push(`Legend item texts: ${chart.legendItems.join(' | ')}`);
	if (chart.legendSwatches.length) {
		lines.push(
			`Legend swatches: ${chart.legendSwatches
				.slice(0, 12)
				.map((s) => `${s.label}${s.color ? ` (${s.color})` : ''}`)
				.join(' | ')}`
		);
	}
	if (chart.colorChannels.length) lines.push(`Computed colors: ${chart.colorChannels.join(' | ')}`);
	if (chart.nearbyControls.length)
		lines.push(`Nearby controls: ${chart.nearbyControls.join(' | ')}`);
	if (chart.seriesLabels.length)
		lines.push(`Series label candidates: ${chart.seriesLabels.slice(0, 12).join(' | ')}`);
	lines.push(
		`Rendered dimensions: ${chart.dimensions.width} x ${chart.dimensions.height}px`
	);
	if (geometry) {
		const xTicks = geometry.xAxisTicks.slice(0, 20).map((t) => t.label);
		const yTicks = geometry.yAxisTicks.slice(0, 20).map((t) => t.label);
		lines.push('--- Deterministic SVG geometry hints ---');
		if (geometry.title) lines.push(`Detected title: ${geometry.title}`);
		if (geometry.xAxisLabel) lines.push(`Detected x-axis label: ${geometry.xAxisLabel}`);
		if (geometry.yAxisLabel) lines.push(`Detected y-axis label: ${geometry.yAxisLabel}`);
		if (xTicks.length) lines.push(`X ticks: ${xTicks.join(' | ')}`);
		if (yTicks.length) lines.push(`Y ticks: ${yTicks.join(' | ')}`);
		lines.push(`Mark counts by tag: ${JSON.stringify(geometry.markTypes)}`);
		if (geometry.legend.length)
			lines.push(`SVG legend: ${geometry.legend.map((l) => l.label).join(' | ')}`);
	}
	if (chart.domSnippet) lines.push(`DOM snippet (truncated): ${chart.domSnippet}`);
	return lines.join('\n');
}

function clamp01(n: unknown): number {
	const v = typeof n === 'number' && isFinite(n) ? n : 0;
	return Math.max(0, Math.min(1, v));
}

function normalizeAxis(input: Partial<AxisInfo> | null | undefined): AxisInfo {
	if (!input) return { label: null, scaleType: 'unknown', unit: null };
	return {
		label: input.label ?? null,
		scaleType: (SCALE_TYPE_VALUES as readonly string[]).includes(
			String(input.scaleType)
		)
			? (input.scaleType as AxisInfo['scaleType'])
			: 'unknown',
		unit: input.unit ?? null
	};
}

function normalizeInsight(raw: Partial<ChartInsight>): ChartInsight | null {
	if (!raw.text) return null;
	const kind: InsightKind = (INSIGHT_KIND_VALUES as readonly string[]).includes(
		String(raw.kind)
	)
		? (raw.kind as InsightKind)
		: 'summary';
	return { kind, text: raw.text, evidence: raw.evidence ?? null };
}

function normalizeClaim(raw: Partial<VerificationClaim>): VerificationClaim | null {
	if (!raw.text) return null;
	const verdict: VerificationVerdict = (VERDICT_VALUES as readonly string[]).includes(
		String(raw.verdict)
	)
		? (raw.verdict as VerificationVerdict)
		: 'unsupported';
	return { text: raw.text, verdict, evidence: raw.evidence ?? null };
}

function normalizeCritique(
	raw: Partial<AccessibilityCritique>
): AccessibilityCritique | null {
	if (!raw.title || !raw.summary) return null;
	const severity: CritiqueSeverity = (SEVERITY_VALUES as readonly string[]).includes(
		String(raw.severity)
	)
		? (raw.severity as CritiqueSeverity)
		: 'medium';
	return {
		title: raw.title,
		severity,
		wcag: raw.wcag ?? '',
		summary: raw.summary,
		fix_hint: raw.fix_hint ?? ''
	};
}

function normalizeSeries(raw: Partial<SeriesInfo>): SeriesInfo | null {
	if (!raw.name) return null;
	return { name: raw.name, color: raw.color ?? null, role: raw.role ?? null };
}

function normalizeRow(raw: Partial<AnalysisRow>): AnalysisRow {
	return {
		series: raw.series ?? null,
		category: raw.category ?? null,
		x: raw.x ?? null,
		y: typeof raw.y === 'number' ? raw.y : null,
		z: typeof raw.z === 'number' ? raw.z : null,
		value:
			typeof raw.value === 'number'
				? raw.value
				: typeof raw.y === 'number'
					? raw.y
					: null,
		color: raw.color ?? null
	};
}

function normalizeConfidence(
	raw: Partial<AnalysisConfidence> | null | undefined
): AnalysisConfidence {
	return {
		overall: clamp01(raw?.overall),
		dataExtraction: clamp01(raw?.dataExtraction),
		typeDetection: clamp01(raw?.typeDetection),
		description: clamp01(raw?.description)
	};
}

function normalizeNarrative(raw: Partial<NarrativeLevels> | undefined): NarrativeLevels {
	return {
		l1: raw?.l1 ?? '',
		l2: raw?.l2 ?? '',
		l3: raw?.l3 ?? '',
		l4: raw?.l4 ?? ''
	};
}

function normalizeChartType(raw: unknown): ChartKind {
	return (CHART_TYPE_VALUES as readonly string[]).includes(String(raw))
		? (raw as ChartKind)
		: 'unknown';
}

export async function analyzeChartWithVision(
	apiKey: string,
	input: VisionAnalyzeInput
): Promise<ChartAnalysis> {
	const userText = buildUserText(input);
	const images = [input.imageDataUrl];
	if (input.extraImages) images.push(...input.extraImages);

	const parsed = await callResponsesJson<Partial<ChartAnalysis>>(apiKey, {
		instructions: INSTRUCTIONS,
		text: userText,
		schemaName: 'chart_analysis',
		schema: CHART_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
		images,
		reasoningEffort: 'medium'
	});

	return {
		chartType: normalizeChartType(parsed.chartType),
		title: parsed.title ?? null,
		subtitle: parsed.subtitle ?? null,
		caption: parsed.caption ?? null,
		xAxis: normalizeAxis(parsed.xAxis as Partial<AxisInfo>),
		yAxis: normalizeAxis(parsed.yAxis as Partial<AxisInfo>),
		zAxis: parsed.zAxis ? normalizeAxis(parsed.zAxis as Partial<AxisInfo>) : null,
		series: Array.isArray(parsed.series)
			? (parsed.series
					.map((s) => normalizeSeries(s as Partial<SeriesInfo>))
					.filter(Boolean) as SeriesInfo[])
			: [],
		rows: Array.isArray(parsed.rows)
			? parsed.rows.map((r) => normalizeRow(r as Partial<AnalysisRow>))
			: [],
		insights: Array.isArray(parsed.insights)
			? (parsed.insights
					.map((i) => normalizeInsight(i as Partial<ChartInsight>))
					.filter(Boolean) as ChartInsight[])
			: [],
		narrative: normalizeNarrative(parsed.narrative),
		verificationClaims: Array.isArray(parsed.verificationClaims)
			? (parsed.verificationClaims
					.map((c) => normalizeClaim(c as Partial<VerificationClaim>))
					.filter(Boolean) as VerificationClaim[])
			: [],
		accessibilityCritique: Array.isArray(parsed.accessibilityCritique)
			? (parsed.accessibilityCritique
					.map((c) => normalizeCritique(c as Partial<AccessibilityCritique>))
					.filter(Boolean) as AccessibilityCritique[])
			: [],
		confidence: normalizeConfidence(parsed.confidence as Partial<AnalysisConfidence>),
		notes: Array.isArray(parsed.notes) ? parsed.notes.filter((n) => typeof n === 'string') : [],
		modelVersion: OPENAI_MODEL,
		timestamp: new Date().toISOString()
	};
}
