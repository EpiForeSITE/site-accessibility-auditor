<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, untrack } from 'svelte';

	interface Props {
		left: Snippet;
		middle: Snippet;
		right: Snippet;
		initialRatios?: [number, number, number];
		minRatio?: number;
		stackBelowPx?: number;
	}

	let {
		left,
		middle,
		right,
		initialRatios = [0.38, 0.34, 0.28],
		minRatio = 0.15,
		stackBelowPx = 900
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let ratios = $state<[number, number, number]>(
		untrack(() => [...initialRatios] as [number, number, number])
	);
	let width = $state(0);
	let dragging = $state<0 | 1 | 2>(0);

	const stacked = $derived(width > 0 && width < stackBelowPx);

	onMount(() => {
		if (!container) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				width = entry.contentRect.width;
			}
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	function normalize(next: [number, number, number]): [number, number, number] {
		const clamped: [number, number, number] = [
			Math.max(minRatio, next[0]),
			Math.max(minRatio, next[1]),
			Math.max(minRatio, next[2])
		];
		const total = clamped[0] + clamped[1] + clamped[2];
		return [clamped[0] / total, clamped[1] / total, clamped[2] / total];
	}

	function handlePointerDown(which: 1 | 2, e: PointerEvent) {
		if (stacked) return;
		dragging = which;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging || !container) return;
		const rect = container.getBoundingClientRect();
		const rel = (e.clientX - rect.left) / rect.width;
		const [a, b, c] = ratios;
		if (dragging === 1) {
			const boundary = Math.max(minRatio, Math.min(a + b - minRatio, rel));
			ratios = normalize([boundary, a + b - boundary, c]);
		} else if (dragging === 2) {
			const firstTwo = a + b;
			const boundary = Math.max(firstTwo + minRatio, Math.min(1 - minRatio, rel));
			const newC = 1 - boundary;
			const proportionA = a / firstTwo;
			const scaled = boundary;
			ratios = normalize([proportionA * scaled, (1 - proportionA) * scaled, newC]);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = 0;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleKeyDown(which: 1 | 2, e: KeyboardEvent) {
		if (stacked) return;
		const step = 0.025;
		const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
		if (!delta) return;
		e.preventDefault();
		const [a, b, c] = ratios;
		if (which === 1) {
			const newA = Math.max(minRatio, Math.min(a + b - minRatio, a + delta));
			ratios = normalize([newA, a + b - newA, c]);
		} else {
			const newC = Math.max(minRatio, Math.min(a + b + c - minRatio * 2, c - delta));
			const remaining = 1 - newC;
			const proportionA = a / (a + b);
			ratios = normalize([proportionA * remaining, (1 - proportionA) * remaining, newC]);
		}
	}

	const gridTemplate = $derived(
		stacked ? undefined : `${ratios[0]}fr 6px ${ratios[1]}fr 6px ${ratios[2]}fr`
	);
</script>

<div
	bind:this={container}
	class="flex h-full min-h-0 w-full"
	class:flex-col={stacked}
	style:display={stacked ? 'flex' : 'grid'}
	style:grid-template-columns={gridTemplate}
>
	<div class="min-h-0 min-w-0 overflow-hidden" class:w-full={stacked}>
		{@render left()}
	</div>

	{#if stacked}
		<div
			class="h-px w-full"
			style="background-color: var(--panel-border);"
			aria-hidden="true"
		></div>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize left/middle"
			aria-valuenow={Math.round(ratios[0] * 100)}
			tabindex="0"
			class="group relative flex cursor-col-resize items-center justify-center"
			onpointerdown={(e) => handlePointerDown(1, e)}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onkeydown={(e) => handleKeyDown(1, e)}
		>
			<div
				class="h-full w-px transition-colors"
				style:background-color={dragging === 1 ? 'var(--panel-primary)' : 'var(--panel-border)'}
			></div>
		</div>
	{/if}

	<div class="min-h-0 min-w-0 overflow-hidden" class:w-full={stacked}>
		{@render middle()}
	</div>

	{#if stacked}
		<div
			class="h-px w-full"
			style="background-color: var(--panel-border);"
			aria-hidden="true"
		></div>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize middle/right"
			aria-valuenow={Math.round((ratios[0] + ratios[1]) * 100)}
			tabindex="0"
			class="group relative flex cursor-col-resize items-center justify-center"
			onpointerdown={(e) => handlePointerDown(2, e)}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onkeydown={(e) => handleKeyDown(2, e)}
		>
			<div
				class="h-full w-px transition-colors"
				style:background-color={dragging === 2 ? 'var(--panel-primary)' : 'var(--panel-border)'}
			></div>
		</div>
	{/if}

	<div class="min-h-0 min-w-0 overflow-hidden" class:w-full={stacked}>
		{@render right()}
	</div>
</div>
