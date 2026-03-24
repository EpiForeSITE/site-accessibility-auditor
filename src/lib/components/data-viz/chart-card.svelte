<script lang="ts">
	import type { DetectedChart } from '../../data-viz/types.ts';

	interface Props {
		chart: DetectedChart;
		selected: boolean;
		onselect: (id: number) => void;
	}

	let { chart, selected, onselect }: Props = $props();

	const typeLabels: Record<DetectedChart['type'], string> = {
		svg: 'SVG',
		canvas: 'Canvas',
		img: 'Image',
		container: 'Container'
	};

	const typeColors: Record<DetectedChart['type'], string> = {
		svg: 'var(--panel-primary)',
		canvas: '#8b5cf6',
		img: '#f59e0b',
		container: '#10b981'
	};
</script>

<button
	class="flex w-full items-start gap-3 border-b border-[var(--panel-border)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--panel-hover)]"
	style:background-color={selected ? 'var(--panel-selected)' : undefined}
	onclick={() => onselect(chart.id)}
>
	<!-- Type badge -->
	<div
		class="mt-0.5 flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
		style:background-color={typeColors[chart.type]}
	>
		{typeLabels[chart.type]}
	</div>

	<!-- Info -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5">
			<span class="truncate text-xs font-medium text-[var(--panel-text)]">
				{chart.label}
			</span>
		</div>

		<div class="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--panel-text-subtle)]">
			<span>{chart.dimensions.width}&times;{chart.dimensions.height}px</span>

			{#if chart.library}
				<span
					class="rounded-sm px-1 py-px"
					style="background-color: var(--panel-code-bg);"
				>
					{chart.library}
				</span>
			{/if}

			{#if chart.type === 'svg' && chart.childShapeCount > 0}
				<span>{chart.childShapeCount} shapes</span>
			{/if}
		</div>

		<div class="mt-1 truncate text-[10px] text-[var(--panel-text-subtle)]">
			{chart.path}
		</div>
	</div>

	<!-- Accessibility indicator -->
	<div class="mt-0.5 shrink-0" title={chart.hasAccessibleName ? 'Has accessible name' : 'Missing accessible name'}>
		{#if chart.hasAccessibleName}
			<svg class="h-4 w-4" style="color: var(--panel-success-text);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		{:else}
			<svg class="h-4 w-4" style="color: var(--panel-warning-text);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
			</svg>
		{/if}
	</div>
</button>
