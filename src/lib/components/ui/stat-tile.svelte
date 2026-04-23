<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		accent?: 'default' | 'ok' | 'warn' | 'bad' | 'info' | 'accent';
		sub?: string;
	}

	let { label, value, accent = 'default', sub }: Props = $props();

	const colorMap: Record<string, string> = {
		default: 'var(--panel-text)',
		ok: 'var(--viz-ok)',
		warn: 'var(--viz-warn)',
		bad: 'var(--viz-bad)',
		info: 'var(--viz-info)',
		accent: 'var(--viz-accent)'
	};
</script>

<div
	class="rounded-lg border px-3 py-2 text-center shadow-sm"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<div class="text-lg leading-none font-bold tabular-nums" style="color: {colorMap[accent]};">
		{value}
	</div>
	<div class="mt-1 text-[10px] font-medium tracking-wide text-[var(--panel-text-muted)] uppercase">
		{label}
	</div>
	{#if sub}
		<div class="mt-0.5 text-[10px] text-[var(--panel-text-subtle)]">{sub}</div>
	{/if}
</div>
