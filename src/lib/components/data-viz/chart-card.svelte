<script lang="ts">
	import type { ChartAnalysisState, DetectedChart } from '../../data-viz/types.ts';
	import { buildAnalysisTree } from '../../data-viz/analysis-tree.ts';
	import ChartRadar from './chart-radar.svelte';
	import ChartDataPreview from './chart-data-preview.svelte';
	import ChartNarrative from './chart-narrative.svelte';
	import ChartInsights from './chart-insights.svelte';
	import VerificationReport from './verification-report.svelte';
	import ChartCritique from './chart-critique.svelte';
	import OlliTree from './olli-tree.svelte';

	interface Props {
		chart: DetectedChart;
		selected: boolean;
		onselect: (id: number) => void;
		onanalyze: (id: number) => void;
	}

	let { chart, selected, onselect, onanalyze }: Props = $props();

	type Tab =
		| 'evidence'
		| 'data'
		| 'narrative'
		| 'insights'
		| 'tree'
		| 'verification'
		| 'critique';
	let tab = $state<Tab>('evidence');

	const typeLabels: Record<DetectedChart['type'], string> = {
		svg: 'SVG',
		canvas: 'Canvas',
		img: 'Image',
		container: 'Container'
	};

	const typeColors: Record<DetectedChart['type'], string> = {
		svg: 'var(--viz-info)',
		canvas: 'var(--viz-accent)',
		img: 'var(--viz-warn)',
		container: 'var(--viz-ok)'
	};

	const stateStyle: Record<ChartAnalysisState, { color: string; label: string }> = {
		idle: { color: 'var(--panel-text-subtle)', label: 'idle' },
		queued: { color: 'var(--viz-muted)', label: 'queued' },
		capturing: { color: 'var(--viz-info)', label: 'capturing' },
		analyzing: { color: 'var(--viz-accent)', label: 'analyzing' },
		done: { color: 'var(--viz-ok)', label: 'analyzed' },
		error: { color: 'var(--viz-bad)', label: 'error' }
	};

	const structuralWarnings = $derived(
		[
			chart.hasAccessibleName ? null : 'No accessible name',
			chart.captionText || chart.hasTableFallback ? null : 'No caption or table fallback',
			chart.supportsKeyboard ? null : 'No keyboard affordance',
			chart.colorChannels.length >= 3 && chart.legendItems.length === 0
				? 'Multiple colors without legend'
				: null
		].filter((s): s is string => Boolean(s))
	);

	const contradictedCount = $derived(
		chart.analysis?.verificationClaims.filter((v) => v.verdict === 'contradicted').length ?? 0
	);

	const faithfulBadge = $derived.by(() => {
		if (!chart.analysis) return null;
		const claims = chart.analysis.verificationClaims;
		if (claims.length === 0) return null;
		if (contradictedCount > 0) return { label: 'contradicted', color: 'var(--viz-bad)' };
		if (claims.some((c) => c.verdict === 'supported'))
			return { label: 'verified', color: 'var(--viz-ok)' };
		return { label: 'unverified', color: 'var(--viz-warn)' };
	});

	const analysisTree = $derived(chart.analysis ? buildAnalysisTree(chart.analysis) : null);

	const tabs: { id: Tab; label: string; available: boolean }[] = $derived([
		{ id: 'evidence', label: 'Evidence', available: true },
		{ id: 'data', label: 'Data', available: chart.analysisState === 'done' },
		{ id: 'narrative', label: 'Narrative', available: chart.analysisState === 'done' },
		{ id: 'insights', label: 'Insights', available: chart.analysisState === 'done' },
		{ id: 'tree', label: 'Tree', available: chart.analysisState === 'done' },
		{ id: 'verification', label: 'Verification', available: chart.analysisState === 'done' },
		{ id: 'critique', label: 'Critique', available: chart.analysisState === 'done' }
	]);
</script>

<article
	class="border-b transition-colors"
	style="border-color: var(--panel-border); background-color: {selected
		? 'var(--panel-selected)'
		: 'transparent'};"
>
	<div class="flex items-start gap-3 px-3 py-2.5">
		<button
			type="button"
			onclick={() => onselect(chart.id)}
			class="flex min-w-0 flex-1 items-start gap-3 text-left"
		>
			<div
				class="mt-0.5 flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
				style:background-color={typeColors[chart.type]}
			>
				{typeLabels[chart.type]}
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="truncate text-xs font-medium text-[var(--panel-text)]">
						{chart.label}
					</span>
					<span
						class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase"
						style="background-color: var(--viz-accent);"
					>
						{chart.kind}
					</span>
					{#if chart.library}
						<span
							class="rounded-sm px-1 py-px text-[10px]"
							style="background-color: var(--panel-code-bg); color: var(--panel-text);"
						>
							{chart.library}
						</span>
					{/if}
					{#if chart.frameOrigin !== 'main'}
						<span
							class="rounded-sm px-1 py-px text-[10px]"
							style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
						>
							{chart.frameOrigin}
						</span>
					{/if}
					<span
						class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
						style="background-color: color-mix(in srgb, {stateStyle[chart.analysisState]
							.color} 15%, transparent); color: {stateStyle[chart.analysisState].color};"
					>
						{stateStyle[chart.analysisState].label}
					</span>
					{#if faithfulBadge}
						<span
							class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
							style="background-color: color-mix(in srgb, {faithfulBadge.color} 15%, transparent); color: {faithfulBadge.color};"
						>
							{faithfulBadge.label}
						</span>
					{/if}
				</div>

				<div
					class="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--panel-text-subtle)]"
				>
					<span>{chart.dimensions.width}&times;{chart.dimensions.height}px</span>
					{#if chart.childShapeCount > 0}
						<span>{chart.childShapeCount} shapes</span>
					{/if}
					{#if chart.analysis}
						<span>{chart.analysis.rows.length} rows</span>
						<span>{chart.analysis.series.length} series</span>
					{/if}
					{#if chart.captionText}
						<span class="rounded-sm px-1 py-px" style="background-color: var(--panel-code-bg);"
							>caption</span
						>
					{/if}
					{#if chart.hasTableFallback}
						<span class="rounded-sm px-1 py-px" style="background-color: var(--panel-code-bg);"
							>table</span
						>
					{/if}
				</div>

				<div class="mt-1 truncate text-[10px] text-[var(--panel-text-subtle)]">
					{chart.path}
				</div>

				{#if structuralWarnings.length > 0}
					<div class="mt-1 flex flex-wrap gap-1">
						{#each structuralWarnings as w (w)}
							<span
								class="rounded px-1.5 py-px text-[9px]"
								style="background-color: var(--panel-warning-bg); color: var(--panel-warning-text); border: 1px solid var(--panel-warning-border);"
							>
								{w}
							</span>
						{/each}
					</div>
				{/if}

				{#if chart.analysisError}
					<div
						class="mt-1 rounded border px-2 py-1 text-[10px]"
						style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
					>
						{chart.analysisError}
					</div>
				{/if}
			</div>
		</button>

		<div class="flex shrink-0 flex-col items-end gap-1">
			{#if chart.scores}
				<ChartRadar scores={chart.scores} size={64} compact />
				<span
					class="text-[10px] font-bold tabular-nums"
					style:color={chart.scores.overall >= 0.8
						? 'var(--viz-ok)'
						: chart.scores.overall >= 0.5
							? 'var(--viz-warn)'
							: 'var(--viz-bad)'}
				>
					{Math.round(chart.scores.overall * 100)}
				</span>
			{/if}
			{#if chart.analysisState !== 'done' && chart.analysisState !== 'capturing' && chart.analysisState !== 'analyzing' && chart.analysisState !== 'queued'}
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						onanalyze(chart.id);
					}}
					class="rounded border px-2 py-0.5 text-[10px] font-semibold hover:bg-[var(--panel-hover)]"
					style="border-color: var(--panel-border);"
				>
					Analyze
				</button>
			{/if}
		</div>
	</div>

	{#if selected}
		<div class="border-t px-3 py-3" style="border-color: var(--panel-border);">
			<div
				class="mb-3 flex flex-wrap items-center gap-1 border-b pb-2"
				style="border-color: var(--panel-border);"
			>
				{#each tabs as t (t.id)}
					<button
						type="button"
						disabled={!t.available}
						onclick={() => (tab = t.id)}
						class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						style:background-color={tab === t.id ? 'var(--panel-filter-active-bg)' : 'transparent'}
						style:color={tab === t.id
							? 'var(--panel-filter-active-text)'
							: 'var(--panel-text-muted)'}
					>
						{t.label}
					</button>
				{/each}
			</div>

			{#if tab === 'evidence'}
				<div class="flex flex-col gap-3">
					{#if chart.capturedImageDataUrl}
						<div
							class="overflow-hidden rounded-md border"
							style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
						>
							<img
								src={chart.capturedImageDataUrl}
								alt={`Captured rendering of ${chart.label}`}
								class="max-h-64 w-full object-contain"
							/>
						</div>
					{/if}

					{#if chart.scores}
						<div
							class="flex items-center gap-3 rounded-md border p-2"
							style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
						>
							<ChartRadar scores={chart.scores} size={140} />
							<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
								<div>
									<span class="font-bold">SR</span> · Screen reader · {Math.round(
										chart.scores.screenReader * 100
									)}
								</div>
								<div>
									<span class="font-bold">KB</span> · Keyboard · {Math.round(
										chart.scores.keyboard * 100
									)}
								</div>
								<div>
									<span class="font-bold">CB</span> · Color-safe · {Math.round(
										chart.scores.colorSafe * 100
									)}
								</div>
								<div>
									<span class="font-bold">LV</span> · Low vision · {Math.round(
										chart.scores.lowVision * 100
									)}
								</div>
								<div>
									<span class="font-bold">CG</span> · Cognitive · {Math.round(
										chart.scores.cognitive * 100
									)}
								</div>
								<div>
									<span class="font-bold">DF</span> · Description faithfulness · {Math.round(
										chart.scores.descriptionFaithfulness * 100
									)}
								</div>
							</div>
						</div>
					{/if}

					<dl class="grid grid-cols-1 gap-1.5 text-[11px] md:grid-cols-2">
						{#if chart.accessibleName}
							<div>
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Accessible name
								</dt>
								<dd class="text-[var(--panel-text)]">{chart.accessibleName}</dd>
							</div>
						{/if}
						{#if chart.captionText}
							<div>
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Caption
								</dt>
								<dd class="text-[var(--panel-text)]">{chart.captionText}</dd>
							</div>
						{/if}
						{#if chart.longDescription}
							<div class="col-span-full">
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Long description
								</dt>
								<dd class="text-[var(--panel-text)]">{chart.longDescription}</dd>
							</div>
						{/if}
						{#if chart.nearestHeading}
							<div>
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Nearest heading
								</dt>
								<dd class="text-[var(--panel-text)]">{chart.nearestHeading}</dd>
							</div>
						{/if}
						{#if chart.legendItems.length > 0}
							<div>
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Legend
								</dt>
								<dd class="text-[var(--panel-text)]">{chart.legendItems.slice(0, 6).join(', ')}</dd>
							</div>
						{/if}
						{#if chart.nearbyControls.length > 0}
							<div>
								<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
									Nearby controls
								</dt>
								<dd class="text-[var(--panel-text)]">
									{chart.nearbyControls.slice(0, 6).join(', ')}
								</dd>
							</div>
						{/if}
					</dl>
				</div>
			{:else if tab === 'data' && chart.analysis}
				<ChartDataPreview analysis={chart.analysis} />
			{:else if tab === 'narrative' && chart.analysis}
				<ChartNarrative narrative={chart.analysis.narrative} />
			{:else if tab === 'insights' && chart.analysis}
				<ChartInsights insights={chart.analysis.insights} />
			{:else if tab === 'tree' && analysisTree}
				<div
					class="rounded-md border px-2 py-2"
					style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
				>
					<OlliTree root={analysisTree} />
				</div>
			{:else if tab === 'verification' && chart.analysis}
				<VerificationReport claims={chart.analysis.verificationClaims} />
			{:else if tab === 'critique' && chart.analysis}
				<ChartCritique critique={chart.analysis.accessibilityCritique} />
			{/if}
		</div>
	{/if}
</article>
