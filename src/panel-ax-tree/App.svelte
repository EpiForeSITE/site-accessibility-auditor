<script lang="ts">
	import {
		extractAxTree,
		highlightAxNode,
		clearAxHighlight
	} from '../lib/ax-tree/ax-tree-extractor.ts';
	import { diffTrees } from '../lib/ax-tree/tree-differ.ts';
	import type { AxTreeResult, DiffPair } from '../lib/ax-tree/types.ts';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import LoadingSkeleton from '../lib/components/ui/loading-skeleton.svelte';
	import TreeDiffView from '../lib/components/ax-tree/tree-diff-view.svelte';
	import TreeDiffSummary from '../lib/components/ax-tree/tree-diff-summary.svelte';

	let scanning = $state(false);
	let error = $state<string | null>(null);
	let tree = $state<AxTreeResult | null>(null);
	let selectedIndex = $state<number | null>(null);

	const diff = $derived(tree ? diffTrees(tree.axNodes, tree.visualNodes) : null);
	const selectedPair = $derived(
		diff && selectedIndex !== null ? (diff.pairs[selectedIndex] ?? null) : null
	);

	async function handleScan() {
		scanning = true;
		error = null;
		selectedIndex = null;
		try {
			tree = await extractAxTree();
			if (tree.axNodes.length === 0 && tree.visualNodes.length === 0) {
				error = 'No semantic structure detected.';
				tree = null;
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
		selectedIndex = null;
		error = null;
	}

	async function handleSelect(pair: DiffPair, index: number) {
		selectedIndex = index;
		const path = pair.visual?.path ?? pair.ax?.path ?? null;
		await highlightAxNode(path);
	}
</script>

<PanelShell title="Semantic Tree" subtitle="AX ↔ visual tree diff">
	{#snippet toolbar()}
		{#if tree}
			<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
		{/if}
		<ToolbarButton variant="primary" onclick={handleScan} disabled={scanning} loading={scanning}>
			{scanning ? 'Scanning…' : 'Scan Tree'}
		</ToolbarButton>
	{/snippet}

	<div class="flex flex-col gap-3 px-3 py-3">
		{#if error}
			<div
				class="rounded-md border px-3 py-2 text-[11px]"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		{#if scanning}
			<LoadingSkeleton rows={5} label="Walking the accessibility and visual trees…" />
		{:else if tree && diff}
			<TreeDiffSummary {diff} />
			<TreeDiffView {diff} {selectedIndex} onselect={handleSelect} />
			{#if selectedPair}
				<div
					class="rounded-md border p-3 text-[11px]"
					style="border-color: var(--panel-primary); background-color: var(--panel-selected);"
				>
					<div
						class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>
						Pair inspector · {selectedPair.kind}
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
								Visual
							</div>
							{#if selectedPair.visual}
								<div class="text-[var(--panel-text)]">
									<code
										class="rounded px-1 text-[10px]"
										style="background-color: var(--panel-code-bg); color: var(--panel-text);"
										>&lt;{selectedPair.visual.tag}&gt;</code
									>
									<span class="ml-1">{selectedPair.visual.text || '(no text)'}</span>
								</div>
								<p class="mt-1 font-mono text-[10px] text-[var(--panel-text-subtle)]">
									{selectedPair.visual.path}
								</p>
							{:else}
								<p class="text-[var(--panel-text-subtle)]">Not present in visual order.</p>
							{/if}
						</div>
						<div>
							<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
								AX tree
							</div>
							{#if selectedPair.ax}
								<div class="text-[var(--panel-text)]">
									<span
										class="rounded px-1 text-[9px] font-bold tracking-wide uppercase"
										style="background-color: color-mix(in srgb, var(--viz-accent) 12%, transparent); color: var(--viz-accent);"
										>{selectedPair.ax.role}</span
									>
									<span class="ml-1">{selectedPair.ax.name || '(no accessible name)'}</span>
								</div>
								<p class="mt-1 font-mono text-[10px] text-[var(--panel-text-subtle)]">
									{selectedPair.ax.path}
								</p>
							{:else}
								<p class="text-[var(--panel-text-subtle)]">Not present in accessibility tree.</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
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
