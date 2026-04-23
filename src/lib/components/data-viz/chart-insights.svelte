<script lang="ts">
	import type { ChartInsight, InsightKind } from '../../data-viz/types.ts';

	interface Props {
		insights: ChartInsight[];
	}

	let { insights }: Props = $props();

	const kindMeta: Record<InsightKind, { color: string; icon: string }> = {
		extremum: { color: 'var(--viz-bad)', icon: '▲' },
		trend: { color: 'var(--viz-info)', icon: '↗' },
		outlier: { color: 'var(--viz-warn)', icon: '◆' },
		comparison: { color: 'var(--viz-accent)', icon: '⇄' },
		correlation: { color: 'var(--viz-cat-3)', icon: '∿' },
		distribution: { color: 'var(--viz-cat-2)', icon: '▬' },
		summary: { color: 'var(--viz-muted)', icon: '•' }
	};
</script>

{#if insights.length === 0}
	<div
		class="rounded-md border px-3 py-2 text-[11px] text-[var(--panel-text-muted)]"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		No insights generated.
	</div>
{:else}
	<ul class="flex flex-col gap-2">
		{#each insights as insight, i (i)}
			{@const meta = kindMeta[insight.kind]}
			<li
				class="rounded-md border px-3 py-2 text-[11px] leading-relaxed"
				style="border-color: color-mix(in srgb, {meta.color} 30%, var(--panel-border)); background-color: color-mix(in srgb, {meta.color} 5%, var(--panel-bg-elevated));"
			>
				<div class="mb-1 flex items-center gap-1.5">
					<span
						class="inline-flex h-4 w-4 items-center justify-center rounded font-bold"
						style="color: {meta.color};"
						aria-hidden="true"
					>
						{meta.icon}
					</span>
					<span
						class="text-[9px] font-bold tracking-wide uppercase"
						style="color: {meta.color};"
					>
						{insight.kind}
					</span>
				</div>
				<p class="text-[var(--panel-text)]">{insight.text}</p>
				{#if insight.evidence}
					<p class="mt-1 text-[10px] text-[var(--panel-text-muted)]">
						<span class="font-semibold">Evidence:</span>
						{insight.evidence}
					</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
