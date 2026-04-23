<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		action?: string;
		icon?: Snippet;
		children?: Snippet;
	}

	let { title, description, action, icon, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center px-6 py-16 text-center">
	<div
		class="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-[var(--panel-primary)]"
		style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
	>
		{#if icon}{@render icon()}{:else}
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
				/>
			</svg>
		{/if}
	</div>
	<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">{title}</h2>
	{#if description}
		<p class="mb-3 max-w-sm text-xs text-[var(--panel-text-muted)]">{description}</p>
	{/if}
	{#if children}{@render children()}{/if}
	{#if action}
		<p class="mt-5 text-xs text-[var(--panel-text-subtle)]">{@html action}</p>
	{/if}
</div>
