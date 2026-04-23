<script lang="ts">
	import {
		extractAxTree,
		highlightAxNode,
		clearAxHighlight
	} from '../lib/ax-tree/ax-tree-extractor.ts';
	import { diffTrees } from '../lib/ax-tree/tree-differ.ts';
	import { buildDiffTree } from '../lib/ax-tree/tree-builder.ts';
	import type { AxTreeResult, DiffKind, DiffPair } from '../lib/ax-tree/types.ts';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import LoadingSkeleton from '../lib/components/ui/loading-skeleton.svelte';
	import SplitPane3 from '../lib/components/ui/split-pane-3.svelte';
	import TreeFilterBar from '../lib/components/ax-tree/tree-filter-bar.svelte';
	import TreeInspector from '../lib/components/ax-tree/tree-inspector.svelte';
	import VizNodeLink from '../lib/components/ax-tree/viz-node-link.svelte';
	import VizPageWireframe from '../lib/components/ax-tree/viz-page-wireframe.svelte';

	let scanning = $state(false);
	let error = $state<string | null>(null);
	let tree = $state<AxTreeResult | null>(null);
	let selectedKey = $state<string | null>(null);
	let selectedPair = $state<DiffPair | null>(null);
	let filter = $state<Set<DiffKind>>(new Set());
	let query = $state('');
	let followSelection = $state(true);
	let fitVersion = $state(0);

	const diff = $derived(tree ? diffTrees(tree.axNodes, tree.visualNodes) : null);
	const built = $derived(diff ? buildDiffTree(diff) : null);

	function bumpFit() {
		fitVersion += 1;
	}

	async function handleScan() {
		scanning = true;
		error = null;
		selectedKey = null;
		selectedPair = null;
		try {
			tree = await extractAxTree();
			if (tree.axNodes.length === 0 && tree.visualNodes.length === 0) {
				error = 'No semantic structure detected.';
				tree = null;
			} else {
				bumpFit();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Semantic tree scan failed';
			tree = null;
		} finally {
			scanning = false;
		}
	}

	async function handleClear() {
		await clearAxHighlight();
		tree = null;
		selectedKey = null;
		selectedPair = null;
		error = null;
		filter = new Set();
		query = '';
	}

	async function handleSelect(pair: DiffPair, key: string) {
		selectedKey = key;
		selectedPair = pair;
		const path = pair.visual?.path ?? pair.ax?.path ?? null;
		await highlightAxNode(path);
	}

	function handleFilterChange(next: Set<DiffKind>) {
		filter = next;
		bumpFit();
	}

	function handleQueryChange(next: string) {
		query = next;
		bumpFit();
	}
</script>

<PanelShell title="Semantic Tree" subtitle="Tree + page layout">
	{#snippet toolbar()}
		{#if tree}
			<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
		{/if}
		<ToolbarButton variant="primary" onclick={handleScan} disabled={scanning} loading={scanning}>
			{scanning ? 'Scanning…' : 'Scan Tree'}
		</ToolbarButton>
	{/snippet}

	<div class="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
		{#if error}
			<div
				class="shrink-0 rounded-md border px-3 py-2 text-[11px]"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		{#if scanning}
			<LoadingSkeleton rows={5} label="Walking the accessibility and visual trees…" />
		{:else if tree && diff && built}
			<div class="shrink-0">
				<TreeFilterBar
					{diff}
					{filter}
					{query}
					{followSelection}
					onfilterchange={handleFilterChange}
					onquerychange={handleQueryChange}
					onfollowchange={(next) => (followSelection = next)}
				/>
			</div>
			<div class="min-h-0 flex-1">
				<SplitPane3 initialRatios={[0.38, 0.34, 0.28]}>
					{#snippet left()}
						<VizNodeLink
							forest={built.forest}
							{filter}
							{query}
							{selectedKey}
							{followSelection}
							{fitVersion}
							onselect={handleSelect}
						/>
					{/snippet}
					{#snippet middle()}
						<VizPageWireframe
							forest={built.forest}
							{filter}
							{query}
							{selectedKey}
							{followSelection}
							{fitVersion}
							onselect={handleSelect}
						/>
					{/snippet}
					{#snippet right()}
						<TreeInspector pair={selectedPair} viewport={tree?.viewport ?? null} />
					{/snippet}
				</SplitPane3>
			</div>
		{:else if !error}
			<EmptyState
				title="Semantic tree diff"
				description="Reconstructs the page's accessibility tree from ARIA + implicit roles and aligns it with the visual reading order to surface missing names, role mismatches, and order drift."
				action="Click <strong>Scan Tree</strong> to diff the current page."
			>
				<div class="mt-5 grid w-full max-w-md grid-cols-2 gap-2 text-left text-[11px]">
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-bad)] uppercase">
							Missing in AX
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">
							Visual elements a screen reader will skip.
						</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-warn)] uppercase">
							Name missing
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">
							Elements that need an accessible name.
						</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-bad)] uppercase">
							Role mismatch
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">Implicit vs. explicit role disagrees.</p>
					</div>
					<div
						class="rounded-md border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div class="text-[9px] font-bold tracking-wide text-[var(--viz-accent)] uppercase">
							Order drift
						</div>
						<p class="mt-1 text-[var(--panel-text-muted)]">Visual order differs from DOM order.</p>
					</div>
				</div>
			</EmptyState>
		{/if}
	</div>
</PanelShell>
