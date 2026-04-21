<script lang="ts">
	import type { ColorEntry } from '../../color-audit/types.ts';

	interface Props {
		color: ColorEntry;
		simulatedHex?: string | null;
	}

	let { color, simulatedHex = null }: Props = $props();

	let copied = $state(false);

	let isSimulated = $derived(simulatedHex != null && simulatedHex !== color.hex);

	function luminance(hex: string): number {
		const rgb = hex
			.replace('#', '')
			.match(/.{2}/g)!
			.map((c) => {
				const v = parseInt(c, 16) / 255;
				return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
			});
		return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
	}

	let textOnOriginal = $derived(luminance(color.hex) > 0.4 ? '#000000' : '#ffffff');
	let textOnSimulated = $derived(
		simulatedHex ? (luminance(simulatedHex) > 0.4 ? '#000000' : '#ffffff') : textOnOriginal
	);

	async function copyHex() {
		try {
			await navigator.clipboard.writeText(color.hex);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// clipboard not available in some contexts
		}
	}

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

<button
	onclick={copyHex}
	class="group flex flex-col overflow-hidden rounded-lg border text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	title="Click to copy {color.hex}"
>
	<!-- Color swatch -->
	{#if isSimulated}
		<!-- Split swatch: original left, simulated right -->
		<div class="relative flex h-16">
			<div class="flex flex-1 items-center justify-center" style="background-color: {color.hex};">
				<span
					class="font-mono text-[9px] font-bold"
					style="color: {textOnOriginal}; opacity: 0.85;"
				>
					{color.hex}
				</span>
			</div>
			<div
				class="absolute top-0 bottom-0 left-1/2 w-px"
				style="background-color: rgba(255,255,255,0.4);"
			></div>
			<div
				class="flex flex-1 items-center justify-center"
				style="background-color: {simulatedHex};"
			>
				<span
					class="font-mono text-[9px] font-bold"
					style="color: {textOnSimulated}; opacity: 0.85;"
				>
					{simulatedHex}
				</span>
			</div>
			{#if copied}
				<span
					class="absolute inset-0 flex items-center justify-center bg-black/30 font-mono text-xs font-bold text-white"
				>
					Copied!
				</span>
			{/if}
			<!-- Usage badge -->
			<span
				class="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
				style="background-color: rgba(0,0,0,0.45); color: #fff;"
			>
				{usageLabels[color.usage] ?? color.usage}
			</span>
			<!-- Sim label -->
			<span
				class="absolute bottom-1 left-1 rounded px-1 py-0.5 text-[8px] font-medium"
				style="background-color: rgba(0,0,0,0.45); color: #fff;"
			>
				Original / Simulated
			</span>
		</div>
	{:else}
		<!-- Normal single-color swatch -->
		<div
			class="relative flex h-16 items-center justify-center"
			style="background-color: {color.hex};"
		>
			<span
				class="font-mono text-xs font-bold transition-opacity"
				style="color: {textOnOriginal}; opacity: {copied ? 0 : 0.9};"
			>
				{color.hex}
			</span>
			{#if copied}
				<span
					class="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold"
					style="color: {textOnOriginal};"
				>
					Copied!
				</span>
			{/if}
			<!-- Usage badge -->
			<span
				class="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
				style="background-color: rgba(0,0,0,0.45); color: #fff;"
			>
				{usageLabels[color.usage] ?? color.usage}
			</span>
		</div>
	{/if}

	<!-- Info -->
	<div class="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
		<span class="line-clamp-1 text-[11px] font-medium text-[var(--panel-text)]">
			{color.context}
		</span>
		<span class="line-clamp-1 text-[10px] text-[var(--panel-text-subtle)]">
			{color.element}
		</span>
	</div>
</button>
