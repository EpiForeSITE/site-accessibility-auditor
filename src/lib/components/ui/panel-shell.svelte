<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		toolbar?: Snippet;
		children: Snippet;
	}

	let { title, subtitle, toolbar, children }: Props = $props();
</script>

<div class="flex h-full flex-col bg-[var(--panel-bg)] text-sm">
	<header
		class="flex shrink-0 items-center gap-3 border-b border-[var(--panel-border)] bg-[var(--panel-bg-elevated)] px-3 py-2"
	>
		<div class="flex items-baseline gap-2">
			<h1 class="text-sm font-semibold text-[var(--panel-text)]">{title}</h1>
			{#if subtitle}
				<span class="text-[10px] tracking-wide text-[var(--panel-text-subtle)] uppercase"
					>{subtitle}</span
				>
			{/if}
		</div>
		<div class="ml-auto flex items-center gap-2">
			{#if toolbar}{@render toolbar()}{/if}
		</div>
	</header>
	<div class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</div>
</div>
