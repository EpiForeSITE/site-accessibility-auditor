<script lang="ts">
	interface Props {
		rows?: number;
		label?: string;
	}

	let { rows = 5, label }: Props = $props();
</script>

<div class="space-y-2 p-4">
	{#if label}
		<div class="mb-3 text-xs text-[var(--panel-text-muted)]">{label}</div>
	{/if}
	{#each Array(rows) as _, i (i)}
		<div
			class="animate-pulse rounded-lg border"
			style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
		>
			<div class="flex items-center gap-3 p-3">
				<div
					class="h-8 w-8 shrink-0 rounded-full"
					style="background-color: color-mix(in srgb, var(--panel-text-subtle) 20%, transparent);"
				></div>
				<div class="flex-1 space-y-1.5">
					<div
						class="h-2.5 rounded"
						style="background-color: color-mix(in srgb, var(--panel-text-subtle) 25%, transparent); width: {40 +
							i * 10}%;"
					></div>
					<div
						class="h-2 rounded"
						style="background-color: color-mix(in srgb, var(--panel-text-subtle) 15%, transparent); width: {60 -
							i * 5}%;"
					></div>
				</div>
			</div>
		</div>
	{/each}
</div>
