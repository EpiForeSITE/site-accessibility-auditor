<script lang="ts">
	import type { ColorWarning } from '../../color-audit/colorblind.ts';

	interface Props {
		warnings: ColorWarning[];
		modeName: string;
	}

	let { warnings, modeName }: Props = $props();

	let expanded = $state(false);

	let visibleWarnings = $derived(expanded ? warnings : warnings.slice(0, 3));
	let hasMore = $derived(warnings.length > 3);

	const usageLabels: Record<string, string> = {
		background: 'BG',
		text: 'Text',
		border: 'Border',
		fill: 'Fill',
		stroke: 'Stroke',
		outline: 'Outline',
		other: 'Other'
	};
</script>

{#if warnings.length > 0}
	<div
		class="mx-4 mb-3 rounded-lg border"
		style="border-color: var(--panel-warning-border); background-color: var(--panel-warning-bg);"
	>
		<!-- Header -->
		<div class="flex items-center gap-2 px-3 py-2">
			<svg
				class="h-3.5 w-3.5 shrink-0"
				style="color: var(--panel-warning-text);"
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
			<span class="text-[11px] font-semibold" style="color: var(--panel-warning-text);">
				{warnings.length} confusable color pair{warnings.length !== 1 ? 's' : ''} under {modeName}
			</span>
		</div>

		<!-- Warning items -->
		<div class="border-t px-3 pb-2 pt-1" style="border-color: var(--panel-warning-border);">
			{#each visibleWarnings as w, idx (w.color1.hex + w.color2.hex + idx)}
				<div class="flex items-center gap-2 py-1.5 {idx > 0 ? 'border-t' : ''}" style="{idx > 0 ? 'border-color: var(--panel-warning-border);' : ''} opacity: 0.95;">
					<!-- Original pair -->
					<span
						class="h-4 w-4 shrink-0 rounded-full border"
						style="background-color: {w.color1.hex}; border-color: var(--panel-warning-border);"
						title="{w.color1.hex}"
					></span>
					<span
						class="h-4 w-4 shrink-0 rounded-full border"
						style="background-color: {w.color2.hex}; border-color: var(--panel-warning-border);"
						title="{w.color2.hex}"
					></span>
					<!-- Arrow -->
					<svg
						class="h-3 w-3 shrink-0"
						style="color: var(--panel-warning-text);"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 7l5 5m0 0l-5 5m5-5H6"
						/>
					</svg>
					<!-- Simulated pair -->
					<span
						class="h-4 w-4 shrink-0 rounded-full border"
						style="background-color: {w.simulatedHex1}; border-color: var(--panel-warning-border);"
						title="{w.simulatedHex1}"
					></span>
					<span
						class="h-4 w-4 shrink-0 rounded-full border"
						style="background-color: {w.simulatedHex2}; border-color: var(--panel-warning-border);"
						title="{w.simulatedHex2}"
					></span>
					<!-- Description -->
					<span class="min-w-0 flex-1 text-[10px] leading-snug" style="color: var(--panel-warning-text);">
						<strong class="font-mono">{w.color1.hex}</strong>
						<span class="opacity-70">({usageLabels[w.color1.usage] ?? w.color1.usage})</span>
						and
						<strong class="font-mono">{w.color2.hex}</strong>
						<span class="opacity-70">({usageLabels[w.color2.usage] ?? w.color2.usage})</span>
						<span class="opacity-70">&mdash; &Delta;E {w.deltaE.toFixed(1)}</span>
					</span>
				</div>
			{/each}

			{#if hasMore}
				<button
					onclick={() => (expanded = !expanded)}
					class="mt-1 w-full rounded px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-80"
					style="color: var(--panel-warning-text);"
				>
					{expanded ? 'Show fewer' : `Show all ${warnings.length} warnings`}
				</button>
			{/if}
		</div>
	</div>
{/if}
