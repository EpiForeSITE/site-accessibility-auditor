<script lang="ts">
	import type { AxTreeDiff, DiffKind, DiffPair } from '../../ax-tree/types.ts';

	interface Props {
		diff: AxTreeDiff;
		selectedIndex: number | null;
		onselect: (pair: DiffPair, index: number) => void;
	}

	let { diff, selectedIndex, onselect }: Props = $props();

	const kindColor: Record<DiffKind, string> = {
		match: 'var(--viz-ok)',
		'missing-in-ax': 'var(--viz-bad)',
		'extra-in-ax': 'var(--viz-warn)',
		'role-mismatch': 'var(--viz-bad)',
		'name-missing': 'var(--viz-warn)',
		'order-drift': 'var(--viz-accent)'
	};

	const kindLabel: Record<DiffKind, string> = {
		match: 'match',
		'missing-in-ax': 'missing in AX',
		'extra-in-ax': 'extra in AX',
		'role-mismatch': 'role mismatch',
		'name-missing': 'name missing',
		'order-drift': 'order drift'
	};

	const visualLaneX = 20;
	const axLaneX = 300;
	const laneWidth = 240;
	const rowHeight = 22;
	const height = $derived(Math.max(180, diff.pairs.length * rowHeight + 40));
	const totalWidth = 560;

	function ribbonPath(y1: number, y2: number): string {
		const x1 = visualLaneX + laneWidth;
		const x2 = axLaneX;
		const mx = (x1 + x2) / 2;
		return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
	}
</script>

<div class="grid grid-cols-6 gap-2">
	<div
		class="col-span-3 rounded-md border p-2 md:col-span-3"
		style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	>
		<div class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase">
			Visual / reading order
		</div>
		<ul class="flex flex-col">
			{#each diff.pairs as pair, i (i)}
				{#if pair.visual}
					<li>
						<button
							onclick={() => onselect(pair, i)}
							class="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] transition-colors hover:bg-[var(--panel-hover)]"
							style:background-color={selectedIndex === i ? 'var(--panel-selected)' : 'transparent'}
						>
							<span
								class="inline-block h-2 w-2 rounded-full"
								style="background-color: {kindColor[pair.kind]};"
							></span>
							<code
								class="rounded px-1 text-[9px]"
								style="background-color: var(--panel-code-bg); color: var(--panel-text);"
								>&lt;{pair.visual.tag}&gt;</code
							>
							<span class="truncate text-[var(--panel-text)]">
								{pair.visual.text || '(no text)'}
							</span>
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	</div>

	<div
		class="col-span-3 rounded-md border p-2 md:col-span-3"
		style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	>
		<div class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase">
			Accessibility tree
		</div>
		<ul class="flex flex-col">
			{#each diff.pairs as pair, i (i)}
				{#if pair.ax}
					<li>
						<button
							onclick={() => onselect(pair, i)}
							class="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] transition-colors hover:bg-[var(--panel-hover)]"
							style:background-color={selectedIndex === i ? 'var(--panel-selected)' : 'transparent'}
						>
							<span
								class="inline-block h-2 w-2 rounded-full"
								style="background-color: {kindColor[pair.kind]};"
							></span>
							<span
								class="rounded px-1 text-[9px] font-bold tracking-wide uppercase"
								style="background-color: color-mix(in srgb, var(--viz-accent) 12%, transparent); color: var(--viz-accent);"
							>
								{pair.ax.role}
							</span>
							<span class="truncate text-[var(--panel-text)]">
								{pair.ax.name || '(no accessible name)'}
							</span>
						</button>
					</li>
				{:else if pair.kind === 'missing-in-ax'}
					<li>
						<span
							class="flex items-center gap-1.5 rounded border border-dashed px-1 py-0.5 text-[10px] text-[var(--panel-text-subtle)] italic"
							style="border-color: var(--viz-bad);"
						>
							missing · {kindLabel[pair.kind]}
						</span>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
</div>

<div
	class="mt-3 rounded-md border p-2"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<div class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase">
		Pair connectors
	</div>
	<svg
		role="img"
		aria-label="Connector diagram between visual and AX trees"
		viewBox="0 0 {totalWidth} {height}"
		width="100%"
		preserveAspectRatio="xMidYMid meet"
	>
		<g>
			{#each diff.pairs as pair, i (i)}
				{@const y = 20 + i * rowHeight + rowHeight / 2}
				{#if pair.visual && pair.ax}
					<path
						d={ribbonPath(y, y)}
						fill="none"
						stroke={kindColor[pair.kind]}
						stroke-width={selectedIndex === i ? 3 : 1.5}
						opacity={selectedIndex === i ? 1 : 0.6}
					/>
				{:else if pair.visual}
					<line
						x1={visualLaneX + laneWidth}
						y1={y}
						x2={(visualLaneX + laneWidth + axLaneX) / 2}
						y2={y}
						stroke={kindColor[pair.kind]}
						stroke-width="1.5"
						stroke-dasharray="4 3"
					/>
				{:else if pair.ax}
					<line
						x1={(visualLaneX + laneWidth + axLaneX) / 2}
						y1={y}
						x2={axLaneX}
						y2={y}
						stroke={kindColor[pair.kind]}
						stroke-width="1.5"
						stroke-dasharray="4 3"
					/>
				{/if}
				<circle
					cx={visualLaneX + laneWidth}
					cy={y}
					r="3"
					fill={pair.visual ? kindColor[pair.kind] : 'transparent'}
					stroke={kindColor[pair.kind]}
				/>
				<circle
					cx={axLaneX}
					cy={y}
					r="3"
					fill={pair.ax ? kindColor[pair.kind] : 'transparent'}
					stroke={kindColor[pair.kind]}
				/>
			{/each}
		</g>
	</svg>
</div>
