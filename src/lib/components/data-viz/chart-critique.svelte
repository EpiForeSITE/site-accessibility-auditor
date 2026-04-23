<script lang="ts">
	import type { AccessibilityCritique, CritiqueSeverity } from '../../data-viz/types.ts';

	interface Props {
		critique: AccessibilityCritique[];
	}

	let { critique }: Props = $props();

	const severityStyle: Record<CritiqueSeverity, { color: string; label: string }> = {
		critical: { color: 'var(--viz-bad)', label: 'Critical' },
		high: { color: 'var(--viz-bad)', label: 'High' },
		medium: { color: 'var(--viz-warn)', label: 'Medium' },
		low: { color: 'var(--viz-info)', label: 'Low' },
		info: { color: 'var(--viz-muted)', label: 'Info' }
	};
</script>

{#if critique.length === 0}
	<div
		class="rounded-md border px-3 py-2 text-[11px] text-[var(--panel-text-muted)]"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		No accessibility issues were flagged by the vision model for this chart.
	</div>
{:else}
	<ul class="flex flex-col gap-2">
		{#each critique as issue, i (i)}
			{@const style = severityStyle[issue.severity]}
			<li
				class="rounded-md border px-3 py-2 text-[11px] leading-relaxed"
				style="border-color: color-mix(in srgb, {style.color} 35%, var(--panel-border)); background-color: color-mix(in srgb, {style.color} 6%, var(--panel-bg-elevated));"
			>
				<div class="mb-1 flex items-center gap-2">
					<span
						class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
						style="background-color: color-mix(in srgb, {style.color} 18%, transparent); color: {style.color};"
					>
						{style.label}
					</span>
					{#if issue.wcag}
						<span class="text-[10px] text-[var(--panel-text-muted)]">WCAG {issue.wcag}</span>
					{/if}
					<span class="font-semibold text-[var(--panel-text)]">{issue.title}</span>
				</div>
				<p class="text-[var(--panel-text)]">{issue.summary}</p>
				{#if issue.fix_hint}
					<p class="mt-1 text-[10px] text-[var(--panel-text-muted)]">
						<span class="font-semibold">Fix:</span>
						{issue.fix_hint}
					</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
