<script lang="ts">
	import type { StateGraph } from '../../session/types.ts';

	interface Props {
		graph: StateGraph;
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { graph, selectedId, onselect }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	{#each graph.states as state, i (state.id)}
		<button
			onclick={() => onselect(state.id)}
			class="flex items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-[var(--panel-hover)]"
			style:border-color={selectedId === state.id ? 'var(--panel-primary)' : 'var(--panel-border)'}
			style:background-color={selectedId === state.id
				? 'var(--panel-selected)'
				: 'var(--panel-bg-elevated)'}
		>
			{#if state.screenshot}
				<img
					src={state.screenshot}
					alt="Screenshot of {state.triggerLabel}"
					class="h-12 w-16 shrink-0 rounded border object-cover"
					style="border-color: var(--panel-border);"
				/>
			{:else}
				<div
					class="flex h-12 w-16 shrink-0 items-center justify-center rounded border text-[9px] text-[var(--panel-text-subtle)]"
					style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
				>
					no shot
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span
						class="rounded px-1 font-mono text-[9px]"
						style="background-color: var(--panel-code-bg); color: var(--panel-text);"
						>{state.id}</span
					>
					<span class="truncate text-[11px] font-medium text-[var(--panel-text)]">
						{i === 0 ? 'Base state' : state.triggerLabel}
					</span>
				</div>
				<div
					class="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--panel-text-muted)]"
				>
					<span style="color: var(--status-fail);">{state.result.summary.fail} fail</span>
					<span style="color: var(--status-warning);">{state.result.summary.warning} warn</span>
					<span style="color: var(--status-pass);">{state.result.summary.pass} pass</span>
					<span class="ml-auto text-[9px] text-[var(--panel-text-subtle)]">
						{new Date(state.discoveredAt).toLocaleTimeString()}
					</span>
				</div>
			</div>
		</button>
	{/each}
</div>
