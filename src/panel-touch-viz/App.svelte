<script lang="ts">
	import { extractCharts, highlightChart, clearScan } from '../lib/data-viz/chart-extractor.ts';
	import type { ChartScanResult } from '../lib/data-viz/types.ts';
	import ChartList from '../lib/components/data-viz/chart-list.svelte';

	let scanning = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ChartScanResult | null>(null);
	let selectedId = $state<number | null>(null);

	async function handleScan() {
		scanning = true;
		error = null;
		selectedId = null;

		try {
			result = await extractCharts();

			if (result.charts.length === 0) {
				error = 'No data visualization charts detected on the page.';
				result = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chart scan failed';
			result = null;
		} finally {
			scanning = false;
		}
	}

	async function handleSelect(id: number) {
		selectedId = selectedId === id ? null : id;
		await highlightChart(selectedId);
	}

	async function handleClear() {
		await clearScan();
		result = null;
		selectedId = null;
		error = null;
	}
</script>

<div class="flex h-full flex-col bg-[var(--panel-bg)] text-sm">
	<!-- Toolbar -->
	<header
		class="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] bg-[var(--panel-bg-elevated)] px-3 py-2"
	>
		<h1 class="text-sm font-semibold text-[var(--panel-text)]">Data Visualizations</h1>

		<div class="ml-auto flex items-center gap-2">
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
					Scan Page
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
				<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">
					Scanning Page
				</h2>
				<p class="max-w-xs text-xs text-[var(--panel-text-muted)]">
					Searching the DOM for data visualization charts, SVGs, canvas elements, and images...
				</p>
			</div>
		{:else if result}
			<ChartList charts={result.charts} {selectedId} onselect={handleSelect} />
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
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">
					Data Visualization Scanner
				</h2>
				<p class="mb-1 max-w-xs text-xs text-[var(--panel-text-muted)]">
					Detect charts, graphs, and data visualizations on the inspected page, including SVGs,
					Canvas elements, and chart library containers.
				</p>
				<div class="mt-5 grid grid-cols-3 gap-3 text-center">
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
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Detect</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">charts</div>
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
						<div class="text-[10px] font-medium text-[var(--panel-text)]">List</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">results</div>
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
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Inspect</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">on page</div>
					</div>
				</div>
				<p class="mt-5 text-xs text-[var(--panel-text-subtle)]">
					Click <strong>Scan Page</strong> to search the current page.
				</p>
			</div>
		{/if}
	</div>
</div>
