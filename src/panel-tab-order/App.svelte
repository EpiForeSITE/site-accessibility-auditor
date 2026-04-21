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
	import TabOrderList from '../lib/components/tab-order/tab-order-list.svelte';

	let scanning = $state(false);
	let error = $state<string | null>(null);
	let result = $state<TabOrderResult | null>(null);
	let selectedId = $state<number | null>(null);
	let hoveredId = $state<number | null>(null);
	let annotationColor = $state('#2563eb');
	let recalcTimer: ReturnType<typeof setInterval> | null = null;
	let hoverTimer: ReturnType<typeof setInterval> | null = null;
	let panelIsHovering = false;

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

<div class="flex h-full flex-col bg-[var(--panel-bg)] text-sm">
	<!-- Toolbar -->
	<header
		class="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] bg-[var(--panel-bg-elevated)] px-3 py-2"
	>
		<h1 class="text-sm font-semibold text-[var(--panel-text)]">Tab Order</h1>

		<div class="ml-auto flex items-center gap-2">
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
				<button
					onclick={handleClear}
					class="rounded border border-[var(--panel-border)] px-3 py-1 text-xs font-medium text-[var(--panel-text-muted)] transition-colors hover:bg-[var(--panel-hover)]"
				>
					Clear
				</button>
			{/if}
			<button
				onclick={handleScan}
				disabled={scanning}
				class="inline-flex items-center gap-1.5 rounded bg-[var(--panel-primary)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)] disabled:opacity-60"
			>
				{#if scanning}
					<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					Scanning...
				{:else}
					Scan Tab Order
				{/if}
			</button>
		</div>
	</header>

	<!-- Content -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if error}
			<div
				class="m-3 rounded-lg border px-4 py-3 text-xs"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		{#if scanning}
			<div class="flex flex-col items-center justify-center px-6 py-20 text-center">
				<div class="mb-4">
					<svg
						class="h-10 w-10 animate-spin text-[var(--panel-primary)]"
						viewBox="0 0 24 24"
						fill="none"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				</div>
				<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">Scanning Tab Order</h2>
				<p class="max-w-xs text-xs text-[var(--panel-text-muted)]">
					Walking the DOM to identify all tabbable elements and their focus sequence...
				</p>
			</div>
		{:else if result}
			<TabOrderList
				elements={result.elements}
				summary={result.summary}
				{selectedId}
				{hoveredId}
				onselect={handleSelect}
				onhover={handleHover}
				color={annotationColor}
			/>
		{:else if !error}
			<!-- Empty state -->
			<div class="flex flex-col items-center justify-center px-6 py-16 text-center">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-[var(--panel-primary)]"
					style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 17h6M9 13h6M9 9h2"
						/>
					</svg>
				</div>
				<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">Tab Order Visualizer</h2>
				<p class="mb-1 max-w-xs text-xs text-[var(--panel-text-muted)]">
					Visualize the keyboard tab order of the inspected page. See numbered overlays on elements
					and follow the focus sequence.
				</p>
				<div class="mt-5 grid grid-cols-3 gap-3 text-center">
					<div
						class="rounded-lg border p-2.5"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
							style="background-color: var(--panel-primary);"
						>
							1
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Numbered</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">overlays</div>
					</div>
					<div
						class="rounded-lg border p-2.5"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
						>
							<svg
								class="h-3 w-3 text-[var(--panel-primary)]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 5l7 7-7 7M5 5l7 7-7 7"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Flow</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">connectors</div>
					</div>
					<div
						class="rounded-lg border p-2.5"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
						>
							<svg
								class="h-3 w-3 text-[var(--panel-primary)]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 10h16M4 14h16M4 18h16"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Linear</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">sequence</div>
					</div>
				</div>
				<p class="mt-5 text-xs text-[var(--panel-text-subtle)]">
					Click <strong>Scan Tab Order</strong> to map the current page.
				</p>
			</div>
		{/if}
	</div>
</div>
