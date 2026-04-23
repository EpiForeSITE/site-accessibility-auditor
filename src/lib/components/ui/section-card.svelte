<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		accent?: 'default' | 'ok' | 'warn' | 'bad' | 'info';
		actions?: Snippet;
		children: Snippet;
		class?: string;
	}

	let {
		title,
		subtitle,
		accent = 'default',
		actions,
		children,
		class: extraClass = ''
	}: Props = $props();

	const accentColor: Record<string, string> = {
		default: 'var(--panel-border)',
		ok: 'var(--viz-ok)',
		warn: 'var(--viz-warn)',
		bad: 'var(--viz-bad)',
		info: 'var(--viz-info)'
	};
</script>

<section
	class="overflow-hidden rounded-xl border shadow-sm {extraClass}"
	style="border-color: {accentColor[accent]}; background-color: var(--panel-bg-elevated);"
>
	{#if title || subtitle || actions}
		<header
			class="flex items-start gap-2 border-b px-4 py-2.5"
			style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
		>
			<div class="min-w-0 flex-1">
				{#if title}
					<h3 class="text-xs font-semibold tracking-wide text-[var(--panel-text)] uppercase">
						{title}
					</h3>
				{/if}
				{#if subtitle}
					<p class="mt-0.5 text-[11px] text-[var(--panel-text-muted)]">{subtitle}</p>
				{/if}
			</div>
			{#if actions}
				<div class="flex shrink-0 items-center gap-1.5">{@render actions()}</div>
			{/if}
		</header>
	{/if}
	<div class="px-4 py-3">{@render children()}</div>
</section>
