<script lang="ts">
	import type { StateGraph } from '../../session/types.ts';

	interface Props {
		graph: StateGraph;
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { graph, selectedId, onselect }: Props = $props();

	const categories = $derived.by<string[]>(() => {
		const s = new Set<string>();
		for (const state of graph.states) {
			for (const cat of Object.keys(state.issuesByCategory)) s.add(cat);
		}
		return Array.from(s).sort();
	});

	interface Row {
		id: string;
		label: string;
		isRoot: boolean;
		counts: number[];
		total: number;
	}

	const rows = $derived.by<Row[]>(() =>
		graph.states.map((state) => {
			const counts = categories.map((cat) => state.issuesByCategory[cat] ?? 0);
			return {
				id: state.id,
				label: state.triggerLabel,
				isRoot: state.id === graph.rootId,
				counts,
				total: counts.reduce((a, b) => a + b, 0)
			};
		})
	);

	const maxCount = $derived.by(() => {
		let m = 0;
		for (const r of rows) for (const v of r.counts) if (v > m) m = v;
		return Math.max(1, m);
	});

	// Diff the non-root rows against the root row to surface state-introduced
	// regressions — the primary signal users care about.
	const rootCounts = $derived.by<number[]>(() => {
		const root = rows.find((r) => r.isRoot);
		if (!root) return categories.map(() => 0);
		return root.counts;
	});

	function cellBg(v: number): string {
		if (v === 0) return 'transparent';
		const t = v / maxCount;
		if (t >= 0.66) return 'color-mix(in srgb, var(--viz-bad) 80%, transparent)';
		if (t >= 0.33) return 'color-mix(in srgb, var(--viz-warn) 80%, transparent)';
		return 'color-mix(in srgb, var(--viz-info) 80%, transparent)';
	}

	function cellOpacity(v: number): number {
		if (v === 0) return 0;
		return 0.35 + (v / maxCount) * 0.65;
	}

	function deltaFromBase(row: Row, catIdx: number): number {
		if (row.isRoot) return 0;
		return row.counts[catIdx] - rootCounts[catIdx];
	}
</script>

<div
	class="overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<div
		class="flex items-center justify-between border-b px-3 py-1.5 text-[9px] font-bold tracking-wide uppercase"
		style="border-color: var(--panel-border); color: var(--panel-text-muted);"
	>
		<span>State × category matrix</span>
		<span class="normal-case text-[10px]" style:color="var(--panel-text-muted)">
			color = volume · ▲/▼ vs. base
		</span>
	</div>

	{#if categories.length === 0}
		<div class="px-3 py-4 text-[11px] text-[var(--panel-text-muted)]">
			No categorized issues in any state.
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-[11px]">
				<thead>
					<tr
						class="border-b"
						style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
					>
						<th
							class="sticky left-0 z-10 bg-[var(--panel-summary-bg)] px-3 py-2 text-left text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
							>State</th
						>
						{#each categories as cat (cat)}
							<th
								class="px-2 py-2 text-center text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
							>
								<span class="whitespace-nowrap">{cat}</span>
							</th>
						{/each}
						<th
							class="px-3 py-2 text-right text-[9px] font-semibold tracking-wide text-[var(--panel-text-muted)] uppercase"
							>Total</th
						>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.id)}
						{@const isSel = selectedId === row.id}
						<tr
							class="border-b transition-colors hover:bg-[var(--panel-hover)]"
							style="border-color: color-mix(in srgb, var(--panel-border) 60%, transparent);"
							style:background-color={isSel ? 'var(--panel-selected)' : 'transparent'}
						>
							<td class="sticky left-0 z-10 bg-inherit px-3 py-1.5">
								<button
									type="button"
									class="flex items-center gap-2 text-left text-[11px] hover:underline"
									onclick={() => onselect(row.id)}
								>
									<span
										class="rounded px-1 font-mono text-[9px]"
										style="background-color: var(--panel-code-bg); color: var(--panel-text);"
										>{row.id}</span
									>
									<span class="truncate max-w-[14ch] text-[var(--panel-text)]" title={row.label}
										>{row.isRoot ? 'Base' : row.label}</span
									>
								</button>
							</td>
							{#each row.counts as count, ci (ci)}
								{@const d = deltaFromBase(row, ci)}
								<td class="px-1 py-1 text-center">
									<div
										class="relative mx-auto flex h-6 w-14 items-center justify-center rounded text-[10px] font-bold tabular-nums"
										style="background-color: {cellBg(count)}; opacity: {cellOpacity(count) + (count === 0 ? 0.12 : 0)}; color: var(--viz-surface);"
									>
										<span style:opacity={count === 0 ? 0.4 : 1}>{count || '·'}</span>
										{#if d !== 0 && !row.isRoot}
											<span
												class="absolute -top-1 -right-1 rounded px-0.5 text-[8px] font-bold leading-none"
												style:color={d > 0 ? 'var(--viz-bad)' : 'var(--viz-ok)'}
												style:background-color="var(--panel-bg-elevated)"
												title={d > 0 ? `${d} more than base` : `${-d} fewer than base`}
											>
												{d > 0 ? `▲${d}` : `▼${-d}`}
											</span>
										{/if}
									</div>
								</td>
							{/each}
							<td class="px-3 py-1 text-right text-[var(--panel-text)] tabular-nums">{row.total}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
