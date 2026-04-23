<script lang="ts">
	import type { StateGraph } from '../../session/types.ts';

	interface Props {
		graph: StateGraph;
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { graph, selectedId, onselect }: Props = $props();

	const categoriesSet = $derived.by(() => {
		const s = new Set<string>();
		for (const state of graph.states) {
			for (const cat of Object.keys(state.issuesByCategory)) s.add(cat);
		}
		return Array.from(s).sort();
	});

	const matrix = $derived(
		graph.states.map((state) => ({
			state,
			counts: categoriesSet.map((cat) => state.issuesByCategory[cat] ?? 0)
		}))
	);

	const maxCount = $derived.by(() => {
		let m = 0;
		for (const row of matrix) for (const v of row.counts) if (v > m) m = v;
		return Math.max(1, m);
	});

	function cellColor(v: number): string {
		if (v === 0) return 'transparent';
		const t = v / maxCount;
		if (t >= 0.66) return 'var(--viz-bad)';
		if (t >= 0.33) return 'var(--viz-warn)';
		return 'var(--viz-info)';
	}

	function cellOpacity(v: number): number {
		if (v === 0) return 0;
		return 0.3 + (v / maxCount) * 0.7;
	}
</script>

<div
	class="overflow-x-auto rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<table class="w-full text-[11px]">
		<thead>
			<tr
				class="border-b"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
			>
				<th
					class="sticky left-0 bg-inherit px-2 py-2 text-left text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>State</th
				>
				{#each categoriesSet as cat (cat)}
					<th
						class="px-2 py-2 text-center text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>
						<span class="whitespace-nowrap">{cat}</span>
					</th>
				{/each}
				<th
					class="px-2 py-2 text-right text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>Total</th
				>
			</tr>
		</thead>
		<tbody>
			{#each matrix as row (row.state.id)}
				{@const total = row.counts.reduce((a, b) => a + b, 0)}
				<tr
					class="border-b transition-colors"
					style="border-color: color-mix(in srgb, var(--panel-border) 60%, transparent); background-color: {selectedId ===
					row.state.id
						? 'var(--panel-selected)'
						: 'transparent'};"
				>
					<td class="sticky left-0 bg-inherit px-2 py-1.5">
						<button
							class="flex items-center gap-2 text-left text-[11px] hover:underline"
							onclick={() => onselect(row.state.id)}
						>
							<span
								class="rounded px-1 font-mono text-[9px]"
								style="background-color: var(--panel-code-bg); color: var(--panel-text);"
								>{row.state.id}</span
							>
							<span class="truncate text-[var(--panel-text)]">{row.state.triggerLabel}</span>
						</button>
					</td>
					{#each row.counts as count, ci (ci)}
						<td class="px-1 py-1 text-center">
							<div
								class="mx-auto h-5 w-12 rounded text-[10px] leading-5 font-bold tabular-nums"
								style="background-color: {cellColor(count)}; opacity: {cellOpacity(
									count
								)}; color: var(--viz-surface);"
							>
								{count || ''}
							</div>
						</td>
					{/each}
					<td class="px-2 py-1 text-right text-[var(--panel-text)] tabular-nums">{total}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
