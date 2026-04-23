<script lang="ts">
	import type { StateDebtMetric } from '../../session/types.ts';
	import SectionCard from '../ui/section-card.svelte';
	import StatTile from '../ui/stat-tile.svelte';

	interface Props {
		debt: StateDebtMetric;
	}

	let { debt }: Props = $props();

	const maxBar = $derived(Math.max(1, ...debt.byCategory.map((c) => c.base + c.discovered)));
</script>

<SectionCard
	title="State-dependent accessibility debt"
	subtitle="Feature C · severity-weighted, depth-decayed"
	accent={debt.total > 3 ? 'bad' : debt.total > 1 ? 'warn' : 'ok'}
>
	<div class="grid grid-cols-3 gap-2">
		<StatTile
			label="Total debt"
			value={debt.total.toFixed(2)}
			accent={debt.total > 3 ? 'bad' : debt.total > 1 ? 'warn' : 'ok'}
		/>
		<StatTile label="States explored" value={debt.statesExplored} accent="info" />
		<StatTile label="Avg / state" value={debt.averagePerState.toFixed(2)} accent="accent" />
	</div>

	{#if debt.byCategory.length > 0}
		<div class="mt-4">
			<div
				class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
			>
				Base vs. state-dependent issues
			</div>
			<ul class="flex flex-col gap-1.5">
				{#each debt.byCategory as c (c.category)}
					<li class="flex items-center gap-2 text-[11px]">
						<span class="w-32 truncate text-[var(--panel-text)]">{c.category}</span>
						<div
							class="flex h-3 flex-1 overflow-hidden rounded-full"
							style="background-color: var(--panel-hover);"
						>
							<span style="background-color: var(--viz-muted); width: {(c.base / maxBar) * 100}%;"
							></span>
							<span
								style="background-color: var(--viz-bad); width: {(c.discovered / maxBar) * 100}%;"
							></span>
						</div>
						<span class="w-20 text-right text-[10px] text-[var(--panel-text-subtle)] tabular-nums">
							<span style="color: var(--viz-muted);">{c.base}</span>
							·
							<span style="color: var(--viz-bad);">+{c.discovered}</span>
						</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-[10px] text-[var(--panel-text-subtle)]">
				<span style="color: var(--viz-muted);">■</span> base-state issues
				<span class="ml-3" style="color: var(--viz-bad);">■</span> new issues reachable only via interaction
			</p>
		</div>
	{/if}

	{#if debt.worstStates.length > 0}
		<div class="mt-4">
			<div
				class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
			>
				Highest-debt states
			</div>
			<ul class="flex flex-col gap-1">
				{#each debt.worstStates as s (s.stateId)}
					<li class="flex items-center gap-2 text-[11px]">
						<span
							class="rounded px-1 font-mono text-[9px]"
							style="background-color: var(--panel-code-bg); color: var(--panel-text);"
							>{s.stateId}</span
						>
						<span class="flex-1 truncate text-[var(--panel-text)]">{s.label}</span>
						<span class="text-[10px] text-[var(--panel-text-muted)] tabular-nums"
							>+{s.newIssues} new · {s.severityWeighted.toFixed(2)}</span
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</SectionCard>
