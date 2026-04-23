<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		scanTabOrder,
		highlightTabElement,
		hoverTabElement,
		clearTabOrder,
		updateAnnotationColor,
		checkRecalcRequested,
		pollHoveredId
	} from '../lib/tab-order/tab-order-extractor.ts';
	import type { TabOrderResult } from '../lib/tab-order/types.ts';
	import { computeOrderFlow } from '../lib/tab-order/order-flow.ts';
	import TabOrderList from '../lib/components/tab-order/tab-order-list.svelte';
	import TabOrderSankey from '../lib/components/tab-order/tab-order-sankey.svelte';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import LoadingSkeleton from '../lib/components/ui/loading-skeleton.svelte';

	let scanning = $state(false);
	let error = $state<string | null>(null);
	let result = $state<TabOrderResult | null>(null);
	let selectedId = $state<number | null>(null);
	let hoveredId = $state<number | null>(null);
	let annotationColor = $state('#2563eb');
	let view = $state<'list' | 'flow'>('list');
	let recalcTimer: ReturnType<typeof setInterval> | null = null;
	let hoverTimer: ReturnType<typeof setInterval> | null = null;
	let panelIsHovering = false;

	const flow = $derived(result ? computeOrderFlow(result) : null);

	function startPolling() {
		stopPolling();
		recalcTimer = setInterval(async () => {
			if (scanning) return;
			try {
				const requested = await checkRecalcRequested();
				if (requested) await handleScan();
			} catch {
				stopPolling();
			}
		}, 500);
		hoverTimer = setInterval(async () => {
			if (scanning || panelIsHovering) return;
			try {
				const id = await pollHoveredId();
				hoveredId = id >= 0 ? id : null;
			} catch {
				// ignore
			}
		}, 120);
	}

	function stopPolling() {
		if (recalcTimer !== null) {
			clearInterval(recalcTimer);
			recalcTimer = null;
		}
		if (hoverTimer !== null) {
			clearInterval(hoverTimer);
			hoverTimer = null;
		}
	}

	onDestroy(stopPolling);

	async function handleScan() {
		scanning = true;
		error = null;
		selectedId = null;
		hoveredId = null;
		try {
			result = await scanTabOrder(annotationColor);
			if (result.elements.length === 0) {
				error = 'No tabbable elements found on the page.';
				result = null;
				stopPolling();
			} else {
				startPolling();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Tab order scan failed';
			result = null;
			stopPolling();
		} finally {
			scanning = false;
		}
	}

	async function handleSelect(id: number) {
		selectedId = selectedId === id ? null : id;
		await highlightTabElement(selectedId);
	}

	async function handleHover(id: number | null) {
		panelIsHovering = id !== null;
		hoveredId = id;
		await hoverTabElement(id);
	}

	async function handleClear() {
		stopPolling();
		await clearTabOrder();
		result = null;
		selectedId = null;
		hoveredId = null;
		error = null;
	}

	async function handleColorChange(e: Event) {
		const input = e.target as HTMLInputElement;
		annotationColor = input.value;
		if (result) {
			await updateAnnotationColor(annotationColor);
		}
	}
</script>

<PanelShell title="Tab Order" subtitle="keyboard · DOM · visual">
	{#snippet toolbar()}
		{#if result}
			<div
				class="flex items-center rounded-md border p-0.5 text-[11px]"
				style="border-color: var(--panel-border);"
			>
				<button
					onclick={() => (view = 'list')}
					class="rounded-md px-2 py-0.5 transition-colors"
					style:background-color={view === 'list' ? 'var(--panel-filter-active-bg)' : 'transparent'}
					style:color={view === 'list'
						? 'var(--panel-filter-active-text)'
						: 'var(--panel-text-muted)'}
				>
					List
				</button>
				<button
					onclick={() => (view = 'flow')}
					class="rounded-md px-2 py-0.5 transition-colors"
					style:background-color={view === 'flow' ? 'var(--panel-filter-active-bg)' : 'transparent'}
					style:color={view === 'flow'
						? 'var(--panel-filter-active-text)'
						: 'var(--panel-text-muted)'}
				>
					Flow
				</button>
			</div>
		{/if}
		<label class="flex items-center gap-1.5 text-xs text-[var(--panel-text-muted)]">
			<input
				type="color"
				value={annotationColor}
				oninput={handleColorChange}
				class="h-6 w-6 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent p-0.5"
			/>
			Color
		</label>
		{#if result}
			<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
		{/if}
		<ToolbarButton variant="primary" onclick={handleScan} disabled={scanning} loading={scanning}>
			{scanning ? 'Scanning…' : 'Scan Tab Order'}
		</ToolbarButton>
	{/snippet}

	{#if error}
		<div
			class="m-3 rounded-lg border px-4 py-3 text-xs"
			style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
		>
			{error}
		</div>
	{/if}

	{#if scanning}
		<LoadingSkeleton rows={4} label="Walking the DOM for tabbable elements…" />
	{:else if result}
		{#if view === 'list'}
			<TabOrderList
				elements={result.elements}
				summary={result.summary}
				{selectedId}
				{hoveredId}
				onselect={handleSelect}
				onhover={handleHover}
				color={annotationColor}
			/>
		{:else if flow}
			<TabOrderSankey
				{flow}
				{selectedId}
				{hoveredId}
				onselect={handleSelect}
				onhover={handleHover}
			/>
		{/if}
	{:else if !error}
		<EmptyState
			title="Tab Order Visualizer"
			description="Visualise keyboard focus sequence. The Flow view links DOM order, visual reading order, and tab order so mismatches become instantly visible."
			action="Click <strong>Scan Tab Order</strong> to map the current page."
		/>
	{/if}
</PanelShell>
