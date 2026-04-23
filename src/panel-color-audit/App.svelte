<script lang="ts">
	import { getApiKey } from '../lib/shared/openai-key.ts';
	import { extractDomColors } from '../lib/color-audit/dom-extractor.ts';
	import { extractColorSections } from '../lib/color-audit/openai.ts';
	import type { ColorAuditResult } from '../lib/color-audit/types.ts';
	import ApiKeyForm from '../lib/components/shared/api-key-form.svelte';
	import ColorSections from '../lib/components/color-audit/color-sections.svelte';
	import SettingsView from '../lib/components/shared/settings-view.svelte';
	import PerceptualSection from '../lib/components/color-audit/perceptual-section.svelte';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import LoadingSkeleton from '../lib/components/ui/loading-skeleton.svelte';

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
		<div class="text-xs text-[var(--panel-text-subtle)]">Loading…</div>
	</div>
{:else if view === 'key-form'}
	<ApiKeyForm
		title="OpenAI API Key Required"
		description="The Color Audit panel uses GPT-5.2-pro to intelligently identify and group colors from the inspected page. Your key is stored locally in the extension and never sent elsewhere."
		onsaved={() => (view = 'main')}
	/>
{:else if view === 'settings'}
	<SettingsView
		description="Used by the Color Audit and Data Visualization panels to analyze pages with GPT-5.2-pro."
		onback={() => (view = 'main')}
		oncleared={() => {
			view = 'key-form';
			result = null;
		}}
	/>
{:else}
	<PanelShell title="Color Audit" subtitle="AI sections · colorblind · perception">
		{#snippet toolbar()}
			{#if result}
				<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
			{/if}
			<ToolbarButton variant="primary" onclick={handleAudit} disabled={auditing} loading={auditing}>
				{auditing ? 'Analyzing…' : 'Audit Colors'}
			</ToolbarButton>
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
		{/snippet}

		<div class="flex flex-col gap-3 px-3 py-3">
			<PerceptualSection />

			{#if error}
				<div
					class="rounded-lg border px-4 py-3 text-xs"
					style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
				>
					{error}
				</div>
			{/if}

			{#if auditing}
				<LoadingSkeleton rows={4} label="Extracting DOM colors and grouping into sections…" />
			{:else if result}
				<ColorSections {result} />
			{:else if !error}
				<EmptyState
					title="AI-powered color audit"
					description="Extracts every DOM color, groups them into semantic sections with GPT, and simulates eight colorblindness types plus a palette of low-vision conditions."
					action="Click <strong>Audit Colors</strong> to scan the current page."
				/>
			{/if}
		</div>
	</PanelShell>
{/if}
