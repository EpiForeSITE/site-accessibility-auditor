<script lang="ts">
	import { runAudit, highlightElement, clearAudit } from '../lib/auditor.ts';
	import IssuesPanel from '../lib/components/issues-panel.svelte';
	import type { AuditResult } from '../lib/types.ts';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<AuditResult | null>(null);
	let selectedId = $state<number | null>(null);

	async function handleAudit() {
		loading = true;
		error = null;
		selectedId = null;

		try {
			result = await runAudit();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Audit failed';
			result = null;
		} finally {
			loading = false;
		}
	}

	async function handleSelect(id: number) {
		selectedId = selectedId === id ? null : id;
		await highlightElement(selectedId);
	}

	async function handleClear() {
		await clearAudit();
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
		<h1 class="text-sm font-semibold text-[var(--panel-text)]">Touch Targets</h1>

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
				onclick={handleAudit}
				disabled={loading}
				class="inline-flex items-center gap-1.5 rounded bg-[var(--panel-primary)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)] disabled:opacity-60"
			>
				{#if loading}
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
					Auditing...
				{:else}
					Audit Page
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

		{#if result}
			<IssuesPanel
				elements={result.elements}
				summary={result.summary}
				{selectedId}
				onselect={handleSelect}
			/>
		{:else if !loading && !error}
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
							d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
						/>
					</svg>
				</div>
				<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">Touch Target Auditor</h2>
				<p class="mb-1 max-w-xs text-xs text-[var(--panel-text-muted)]">
					Check if interactive elements meet WCAG touch target size guidelines.
				</p>
				<div class="mt-4 grid grid-cols-3 gap-3 text-center">
					<div
						class="rounded-lg border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--status-fail) 20%, transparent);"
						>
							<svg
								class="h-3 w-3"
								style="color: var(--status-fail);"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Fail</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">&lt; 24px</div>
					</div>
					<div
						class="rounded-lg border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--status-warning) 20%, transparent);"
						>
							<svg
								class="h-3 w-3"
								style="color: var(--status-warning);"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Warning</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">24-44px</div>
					</div>
					<div
						class="rounded-lg border p-2"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<div
							class="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--status-pass) 20%, transparent);"
						>
							<svg
								class="h-3 w-3"
								style="color: var(--status-pass);"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="text-[10px] font-medium text-[var(--panel-text)]">Pass</div>
						<div class="text-[10px] text-[var(--panel-text-subtle)]">&ge; 44px</div>
					</div>
				</div>
				<p class="mt-5 text-xs text-[var(--panel-text-subtle)]">
					Click <strong>Audit Page</strong> to scan the current page.
				</p>
			</div>
		{/if}
	</div>
</div>
