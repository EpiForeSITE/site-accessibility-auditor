<script lang="ts">
	import type { DetectedChart } from '../../data-viz/types.ts';
	import ChartCard from './chart-card.svelte';

	interface Props {
		charts: DetectedChart[];
		selectedId: number | null;
		onselect: (id: number) => void;
	}

	let { charts, selectedId, onselect }: Props = $props();

	let svgCount = $derived(charts.filter((c) => c.type === 'svg').length);
	let canvasCount = $derived(charts.filter((c) => c.type === 'canvas').length);
	let imgCount = $derived(charts.filter((c) => c.type === 'img').length);
	let containerCount = $derived(charts.filter((c) => c.type === 'container').length);
	let missingNames = $derived(charts.filter((c) => !c.hasAccessibleName).length);
</script>

<!-- Summary bar -->
<div
	class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--panel-border)] px-3 py-2 text-[11px]"
	style="background-color: var(--panel-summary-bg);"
>
	<span class="font-semibold text-[var(--panel-text)]">
		{charts.length} chart{charts.length !== 1 ? 's' : ''} found
	</span>

	{#if svgCount > 0}
		<span class="text-[var(--panel-text-muted)]">SVG: {svgCount}</span>
	{/if}
	{#if canvasCount > 0}
		<span class="text-[var(--panel-text-muted)]">Canvas: {canvasCount}</span>
	{/if}
	{#if imgCount > 0}
		<span class="text-[var(--panel-text-muted)]">Image: {imgCount}</span>
	{/if}
	{#if containerCount > 0}
		<span class="text-[var(--panel-text-muted)]">Container: {containerCount}</span>
	{/if}

	{#if missingNames > 0}
		<span class="ml-auto" style="color: var(--panel-warning-text);">
			{missingNames} missing accessible name{missingNames !== 1 ? 's' : ''}
		</span>
	{/if}
</div>

<!-- Chart list -->
<div>
	{#each charts as chart (chart.id)}
		<ChartCard {chart} selected={selectedId === chart.id} {onselect} />
	{/each}
</div>
