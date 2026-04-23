<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'ghost';
		disabled?: boolean;
		loading?: boolean;
		onclick?: (e: MouseEvent) => void;
		title?: string;
		children: Snippet;
	}

	let {
		variant = 'ghost',
		disabled = false,
		loading = false,
		onclick,
		title,
		children
	}: Props = $props();

	const base =
		'inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60';
	const variantClass = $derived(
		variant === 'primary'
			? 'bg-[var(--panel-primary)] text-white hover:bg-[var(--panel-primary-hover)] font-semibold'
			: 'border border-[var(--panel-border)] text-[var(--panel-text-muted)] hover:bg-[var(--panel-hover)]'
	);
</script>

<button {onclick} {disabled} {title} class="{base} {variantClass}">
	{#if loading}
		<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	{/if}
	{@render children()}
</button>
