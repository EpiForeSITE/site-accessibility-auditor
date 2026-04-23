<script lang="ts">
	import { exploreStates } from '../lib/session/dynamic-explorer.ts';
	import { computeStateDebt } from '../lib/session/state-debt.ts';
	import type { ExplorerProgress, StateGraph } from '../lib/session/types.ts';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import StateGraphView from '../lib/components/states/state-graph.svelte';
	import StateIssueMatrix from '../lib/components/states/state-issue-matrix.svelte';
	import StateTimeline from '../lib/components/states/state-timeline.svelte';
	import StateDetail from '../lib/components/states/state-detail.svelte';
	import DebtCard from '../lib/components/states/debt-card.svelte';

	let graph = $state<StateGraph | null>(null);
	let running = $state(false);
	let error = $state<string | null>(null);
	let budget = $state(6);
	let selectedId = $state<string | null>(null);
	let progress = $state<ExplorerProgress | null>(null);
	let controller: AbortController | null = null;

	const debt = $derived(graph ? computeStateDebt(graph) : null);
	const selectedState = $derived(
		graph && selectedId ? (graph.states.find((s) => s.id === selectedId) ?? null) : null
	);

	async function handleRun() {
		if (running) return;
		running = true;
		error = null;
		progress = null;
		controller = new AbortController();
		try {
			graph = await exploreStates({
				budget,
				signal: controller.signal,
				onProgress: (p) => (progress = p)
			});
			if (graph.states.length > 0) selectedId = graph.states[0].id;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Exploration failed';
			graph = null;
		} finally {
			running = false;
		}
	}

	function handleStop() {
		controller?.abort();
	}

	function handleClear() {
		graph = null;
		selectedId = null;
		error = null;
		progress = null;
	}

	function handleSelect(id: string) {
		selectedId = id;
	}
</script>

<PanelShell title="Dynamic States" subtitle="state-aware audit · debt metric">
	{#snippet toolbar()}
		<label class="flex items-center gap-1.5 text-[11px] text-[var(--panel-text-muted)]">
			<span>Budget</span>
			<input type="range" min="2" max="16" bind:value={budget} class="w-24" disabled={running} />
			<span class="w-6 text-right font-mono text-[var(--panel-text)]">{budget}</span>
		</label>
		{#if running}
			<ToolbarButton onclick={handleStop}>Stop</ToolbarButton>
		{:else if graph}
			<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
		{/if}
		<ToolbarButton variant="primary" onclick={handleRun} disabled={running} loading={running}>
			{running ? 'Exploring…' : 'Explore States'}
		</ToolbarButton>
	{/snippet}

	<div class="flex flex-col gap-3 px-3 py-3">
		{#if running && progress}
			<div
				class="rounded-md border px-3 py-2 text-[11px]"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
			>
				<div class="flex items-center justify-between">
					<span class="font-semibold text-[var(--panel-text)]">{progress.phase}</span>
					<span class="text-[var(--panel-text-muted)]"
						>{progress.candidatesProcessed}/{progress.candidatesTotal}</span
					>
				</div>
				<div
					class="mt-1.5 h-1 overflow-hidden rounded-full"
					style="background-color: var(--panel-hover);"
				>
					<span
						class="block h-full transition-all"
						style="background-color: var(--panel-primary); width: {Math.round(
							(progress.candidatesProcessed / Math.max(1, progress.candidatesTotal)) * 100
						)}%;"
					></span>
				</div>
				<div class="mt-1 text-[10px] text-[var(--panel-text-muted)]">{progress.message}</div>
			</div>
		{/if}

		{#if error}
			<div
				class="rounded-md border px-3 py-2 text-[11px]"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		{#if graph && debt}
			<DebtCard {debt} />

			<div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
				<div class="flex flex-col gap-3">
					<StateGraphView {graph} {selectedId} onselect={handleSelect} />
					<StateIssueMatrix {graph} {selectedId} onselect={handleSelect} />
				</div>
				<div class="flex flex-col gap-3">
					<StateTimeline {graph} {selectedId} onselect={handleSelect} />
					{#if selectedState}
						<StateDetail state={selectedState} />
					{/if}
				</div>
			</div>
		{:else if !running && !error}
			<EmptyState
				title="Dynamic state explorer"
				description="Performs a bounded BFS over safe interactions (disclosures, tabs, dialogs, in-page links), screenshots each discovered state, and reruns the audit. Emits a state graph, a state-by-category issue matrix, and a state-conditional accessibility debt metric."
				action="Tune the budget slider, then click <strong>Explore States</strong>."
			>
				<div class="mt-5 grid w-full max-w-md grid-cols-2 gap-2 text-left text-[11px]">
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-info)] uppercase">
							State graph
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">
							d3-force layout · nodes colored by severity
						</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-bad)] uppercase">
							Debt metric
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">
							severity × depth decay · per-category breakdown
						</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-warn)] uppercase">
							Issue matrix
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">state × issue class heatmap</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-accent)] uppercase">
							Timeline
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">
							chronological state discovery with screenshots
						</p>
					</div>
				</div>
			</EmptyState>
		{/if}
	</div>
</PanelShell>
