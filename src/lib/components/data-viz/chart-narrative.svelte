<script lang="ts">
	import type { NarrativeLevels } from '../../data-viz/types.ts';

	interface Props {
		narrative: NarrativeLevels;
	}

	let { narrative }: Props = $props();

	let copied = $state<string | null>(null);

	async function copyAll() {
		const text = [narrative.l1, narrative.l2, narrative.l3, narrative.l4]
			.filter(Boolean)
			.join('\n\n');
		try {
			await navigator.clipboard.writeText(text);
			copied = 'Narrative copied';
			setTimeout(() => (copied = null), 1600);
		} catch {
			copied = 'Clipboard unavailable';
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-end gap-2 text-[10px]">
		{#if copied}<span class="text-[var(--viz-ok)]">{copied}</span>{/if}
		<button
			type="button"
			onclick={copyAll}
			class="rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
			style="border-color: var(--panel-border);"
		>
			Copy all L1–L4
		</button>
	</div>

	{#each [['L1 · Structure', narrative.l1, 'var(--viz-info)'], ['L2 · Statistics', narrative.l2, 'var(--viz-accent)'], ['L3 · Trends', narrative.l3, 'var(--viz-ok)'], ['L4 · Context', narrative.l4, 'var(--viz-cat-3)']] as [label, text, color] (label)}
		{#if text}
			<article
				class="rounded-md border px-3 py-2 text-[11px] leading-relaxed"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
			>
				<header class="mb-1 text-[9px] font-bold tracking-wide uppercase" style="color: {color};">
					{label}
				</header>
				<p class="text-[var(--panel-text)]">{text}</p>
			</article>
		{/if}
	{/each}
</div>
