<script lang="ts">
	import type { DetectedChart } from '../../data-viz/types.ts';
	import ChartCard from './chart-card.svelte';
	import StatTile from '../ui/stat-tile.svelte';

	interface Props {
		charts: DetectedChart[];
		selectedId: number | null;
		onselect: (id: number) => void;
		onanalyze: (id: number) => void;
	}

	let { charts, selectedId, onselect, onanalyze }: Props = $props();

	const missingNames = $derived(charts.filter((c) => !c.hasAccessibleName).length);
	const missingFallbacks = $derived(
		charts.filter((c) => !c.captionText && !c.hasTableFallback).length
	);
	const keyboardRisks = $derived(charts.filter((c) => !c.supportsKeyboard).length);
	const contradicted = $derived(
		charts.filter(
			(c) =>
				(c.analysis?.verificationClaims.filter((v) => v.verdict === 'contradicted').length ?? 0) >
				0
		).length
	);
	const analyzed = $derived(charts.filter((c) => c.analysisState === 'done').length);
	const scoreDist = $derived.by(() => {
		const bands = { low: 0, mid: 0, high: 0 };
		for (const c of charts) {
			const s = c.scores?.overall ?? 0;
			if (s >= 0.8) bands.high++;
			else if (s >= 0.5) bands.mid++;
			else bands.low++;
		}
		return bands;
	});
</script>

<div
	class="grid grid-cols-2 gap-2 border-b px-3 py-3 md:grid-cols-5"
	style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
>
	<StatTile label="Charts" value={charts.length} />
	<StatTile
		label="Analyzed"
		value={analyzed}
		accent={analyzed === charts.length ? 'ok' : 'default'}
	/>
	<StatTile label="Missing names" value={missingNames} accent={missingNames ? 'warn' : 'default'} />
	<StatTile
		label="No fallback"
		value={missingFallbacks}
		accent={missingFallbacks ? 'warn' : 'default'}
	/>
	<StatTile label="Contradicted" value={contradicted} accent={contradicted ? 'bad' : 'default'} />
</div>

<div
	class="flex items-center gap-2 border-b px-3 py-2 text-[10px] text-[var(--panel-text-muted)]"
	style="border-color: var(--panel-border);"
>
	<span class="font-semibold tracking-wide text-[var(--panel-text)] uppercase">Overall score</span>
	<div
		class="flex h-1.5 flex-1 overflow-hidden rounded-full"
		style="background-color: var(--panel-hover);"
	>
		<span
			style="background-color: var(--viz-bad); width: {(scoreDist.low /
				Math.max(1, charts.length)) *
				100}%;"
		></span>
		<span
			style="background-color: var(--viz-warn); width: {(scoreDist.mid /
				Math.max(1, charts.length)) *
				100}%;"
		></span>
		<span
			style="background-color: var(--viz-ok); width: {(scoreDist.high /
				Math.max(1, charts.length)) *
				100}%;"
		></span>
	</div>
	<span class="tabular-nums">
		<span style="color: var(--viz-bad);">{scoreDist.low}</span>
		·
		<span style="color: var(--viz-warn);">{scoreDist.mid}</span>
		·
		<span style="color: var(--viz-ok);">{scoreDist.high}</span>
	</span>

	<span class="ml-2 text-[10px] text-[var(--panel-text-subtle)]">
		Keyboard risks: {keyboardRisks}
	</span>
</div>

<div>
	{#each charts as chart (chart.id)}
		<ChartCard {chart} selected={selectedId === chart.id} {onselect} {onanalyze} />
	{/each}
</div>
