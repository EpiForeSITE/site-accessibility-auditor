<script lang="ts">
	import type { ColorAuditResult } from '../../color-audit/types.ts';
	import {
		type ColorblindMode,
		type ColorWarning,
		COLORBLIND_MODES,
		simulateColorblind,
		checkSectionWarnings
	} from '../../color-audit/colorblind.ts';
	import ColorCard from './color-card.svelte';
	import ColorblindWarnings from './colorblind-warnings.svelte';

	interface Props {
		result: ColorAuditResult;
	}

	let { result }: Props = $props();

	let collapsedSections = $state<Set<number>>(new Set());
	let selectedMode = $state<ColorblindMode>('normal');

	function toggleSection(index: number) {
		const next = new Set(collapsedSections);
		if (next.has(index)) {
			next.delete(index);
		} else {
			next.add(index);
		}
		collapsedSections = next;
	}

	let totalColors = $derived(result.sections.reduce((sum, s) => sum + s.colors.length, 0));

	let isSimulating = $derived(selectedMode !== 'normal');

	let currentModeName = $derived(
		COLORBLIND_MODES.find((m) => m.key === selectedMode)?.name ?? 'Normal Vision'
	);

	let sectionWarnings = $derived<ColorWarning[][]>(
		result.sections.map((s) => checkSectionWarnings(s.colors, selectedMode))
	);

	let totalWarnings = $derived(sectionWarnings.reduce((sum, w) => sum + w.length, 0));
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Summary bar -->
	<div
		class="border-b px-4 py-3"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg"
					style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
				>
					<svg
						class="h-4 w-4"
						style="color: var(--panel-primary);"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
						/>
					</svg>
				</div>
				<div>
					<div class="text-sm font-semibold text-[var(--panel-text)]">
						{totalColors} colors
					</div>
					<div class="text-[10px] text-[var(--panel-text-subtle)]">
						in {result.sections.length} sections
					</div>
				</div>
			</div>

			<!-- Colorblind mode selector -->
			<div class="ml-auto flex items-center gap-2">
				{#if isSimulating && totalWarnings > 0}
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
						style="background-color: var(--panel-warning-bg); color: var(--panel-warning-text); border: 1px solid var(--panel-warning-border);"
					>
						{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
					</span>
				{/if}
				<label class="flex items-center gap-1.5" for="colorblind-mode-select">
					<svg
						class="h-3.5 w-3.5 shrink-0 text-[var(--panel-text-subtle)]"
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
					<select
						id="colorblind-mode-select"
						bind:value={selectedMode}
						class="rounded border px-2 py-1 text-[11px] outline-none"
						style="
							border-color: var(--panel-border);
							background-color: var(--panel-bg);
							color: var(--panel-text);
						"
					>
						{#each COLORBLIND_MODES as mode (mode.key)}
							<option value={mode.key}>
								{mode.name}{mode.description ? ` — ${mode.description}` : ''}
							</option>
						{/each}
					</select>
				</label>
			</div>
		</div>
	</div>

	<!-- Section list -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#each result.sections as section, i (i)}
			{@const warnings = sectionWarnings[i]}
			<div class="border-b" style="border-color: var(--panel-border);">
				<!-- Section header -->
				<button
					onclick={() => toggleSection(i)}
					class="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--panel-hover)]"
				>
					<svg
						class="h-3.5 w-3.5 shrink-0 transition-transform text-[var(--panel-text-subtle)]"
						class:rotate-90={!collapsedSections.has(i)}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="text-xs font-semibold text-[var(--panel-text)]">{section.name}</span>
							<span
								class="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
								style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
							>
								{section.colors.length}
							</span>
							{#if warnings.length > 0}
								<span
									class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
									style="background-color: var(--panel-warning-bg); color: var(--panel-warning-text); border: 1px solid var(--panel-warning-border);"
								>
									{warnings.length} warning{warnings.length !== 1 ? 's' : ''}
								</span>
							{/if}
						</div>
						<p class="mt-0.5 truncate text-[10px] text-[var(--panel-text-subtle)]">
							{section.description}
						</p>
					</div>
					<!-- Section color preview dots -->
					<div class="flex shrink-0 gap-0.5">
						{#each section.colors.slice(0, 8) as c (c.hex + c.usage + c.element)}
							<span
								class="h-3.5 w-3.5 rounded-full border"
								style="background-color: {isSimulating
									? simulateColorblind(c.hex, selectedMode)
									: c.hex}; border-color: var(--panel-border);"
							></span>
						{/each}
						{#if section.colors.length > 8}
							<span class="flex h-3.5 items-center text-[9px] text-[var(--panel-text-subtle)]">
								+{section.colors.length - 8}
							</span>
						{/if}
					</div>
				</button>

				<!-- Section content (warnings + colors grid) -->
				{#if !collapsedSections.has(i)}
					<!-- Warnings -->
					{#if warnings.length > 0}
						<div class="pt-2">
							<ColorblindWarnings {warnings} modeName={currentModeName} />
						</div>
					{/if}

					<!-- Colors grid -->
					<div
						class="border-t px-4 pb-4 pt-3"
						style="border-color: var(--panel-border); background-color: var(--panel-bg);"
					>
						<div
							class="grid gap-2.5"
							style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"
						>
							{#each section.colors as color (color.hex + color.usage + color.element)}
								<ColorCard
									{color}
									simulatedHex={isSimulating
										? simulateColorblind(color.hex, selectedMode)
										: null}
								/>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
