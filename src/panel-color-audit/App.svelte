<script lang="ts">
	import { getApiKey } from '../lib/color-audit/api-key.ts';
	import { extractDomColors } from '../lib/color-audit/dom-extractor.ts';
	import { extractColorSections } from '../lib/color-audit/openai.ts';
	import type { ColorAuditResult } from '../lib/color-audit/types.ts';
	import ApiKeyForm from '../lib/components/color-audit/api-key-form.svelte';
	import ColorSections from '../lib/components/color-audit/color-sections.svelte';
	import SettingsView from '../lib/components/color-audit/settings-view.svelte';

	type View = 'loading' | 'key-form' | 'main' | 'settings';

	let view = $state<View>('loading');
	let auditing = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ColorAuditResult | null>(null);

	async function checkApiKey() {
		const key = await getApiKey();
		view = key ? 'main' : 'key-form';
	}

	checkApiKey();

	async function handleAudit() {
		auditing = true;
		error = null;

		try {
			const apiKey = await getApiKey();
			if (!apiKey) {
				view = 'key-form';
				return;
			}

			const domData = await extractDomColors();

			if (domData.elements.length === 0) {
				error = 'No color data found on the page. Make sure the page has loaded.';
				return;
			}

			result = await extractColorSections(apiKey, domData);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Color audit failed';
		} finally {
			auditing = false;
		}
	}

	function handleClear() {
		result = null;
		error = null;
	}
</script>

{#if view === 'loading'}
	<div class="flex h-full items-center justify-center">
		<div class="text-xs text-[var(--panel-text-subtle)]">Loading...</div>
	</div>
{:else if view === 'key-form'}
	<ApiKeyForm
		onsaved={() => {
			view = 'main';
		}}
	/>
{:else if view === 'settings'}
	<SettingsView
		onback={() => {
			view = 'main';
		}}
		oncleared={() => {
			view = 'key-form';
			result = null;
		}}
	/>
{:else}
	<div class="flex h-full flex-col bg-[var(--panel-bg)] text-sm">
		<!-- Toolbar -->
		<header
			class="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] bg-[var(--panel-bg-elevated)] px-3 py-2"
		>
			<h1 class="text-sm font-semibold text-[var(--panel-text)]">Color Audit</h1>

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
					disabled={auditing}
					class="inline-flex items-center gap-1.5 rounded bg-[var(--panel-primary)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)] disabled:opacity-60"
				>
					{#if auditing}
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
						Analyzing...
					{:else}
						Audit Colors
					{/if}
				</button>
				<!-- Settings gear -->
				<button
					onclick={() => (view = 'settings')}
					class="rounded p-1 text-[var(--panel-text-muted)] transition-colors hover:bg-[var(--panel-hover)] hover:text-[var(--panel-text)]"
					aria-label="Settings"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
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

			{#if auditing}
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
						Analyzing Page Colors
					</h2>
					<p class="max-w-xs text-xs text-[var(--panel-text-muted)]">
						Extracting colors from the DOM and using GPT-5.2-pro to identify and group them by
						section...
					</p>
				</div>
			{:else if result}
				<ColorSections {result} />
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
								d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
							/>
						</svg>
					</div>
					<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">
						AI-Powered Color Audit
					</h2>
					<p class="mb-1 max-w-xs text-xs text-[var(--panel-text-muted)]">
						Extract and visualize all colors from the inspected page, intelligently grouped into
						semantic sections by AI.
					</p>
					<div
						class="mt-5 grid grid-cols-3 gap-3 text-center"
					>
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
							<div class="text-[10px] font-medium text-[var(--panel-text)]">Extract</div>
							<div class="text-[10px] text-[var(--panel-text-subtle)]">DOM colors</div>
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
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							</div>
							<div class="text-[10px] font-medium text-[var(--panel-text)]">Analyze</div>
							<div class="text-[10px] text-[var(--panel-text-subtle)]">with AI</div>
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
										d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
									/>
								</svg>
							</div>
							<div class="text-[10px] font-medium text-[var(--panel-text)]">Visualize</div>
							<div class="text-[10px] text-[var(--panel-text-subtle)]">by section</div>
						</div>
					</div>
					<p class="mt-5 text-xs text-[var(--panel-text-subtle)]">
						Click <strong>Audit Colors</strong> to scan the current page.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
