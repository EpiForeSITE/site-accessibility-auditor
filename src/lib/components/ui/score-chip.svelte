<script lang="ts">
	interface Props {
		label: string;
		value: number;
		title?: string;
	}

	let { label, value, title }: Props = $props();

	const pct = $derived(Math.round(Math.max(0, Math.min(1, value)) * 100));

	function band(v: number): string {
		if (v >= 0.8) return 'var(--viz-ok)';
		if (v >= 0.5) return 'var(--viz-warn)';
		return 'var(--viz-bad)';
	}

	const color = $derived(band(value));
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
	style="border-color: color-mix(in srgb, {color} 45%, transparent); background-color: color-mix(in srgb, {color} 10%, transparent); color: {color};"
	{title}
>
	<span
		class="inline-block h-1.5 w-1.5 rounded-full"
		style="background-color: {color};"
		aria-hidden="true"
	></span>
	<span class="tracking-wide text-[var(--panel-text-muted)] uppercase">{label}</span>
	<span class="tabular-nums" style="color: {color};">{pct}</span>
</span>
