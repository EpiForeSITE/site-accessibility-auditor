<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, untrack } from 'svelte';

	interface Props {
		left: Snippet;
		right: Snippet;
		initialRatio?: number;
		minRatio?: number;
		maxRatio?: number;
		stackBelowPx?: number;
	}

	let {
		left,
		right,
		initialRatio = 0.58,
		minRatio = 0.25,
		maxRatio = 0.8,
		stackBelowPx = 720
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let ratio = $state(untrack(() => initialRatio));
	let width = $state(0);
	let dragging = $state(false);

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

	function handlePointerDown(e: PointerEvent) {
		if (stacked) return;
		dragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging || !container) return;
		const rect = container.getBoundingClientRect();
		const next = (e.clientX - rect.left) / rect.width;
		ratio = Math.max(minRatio, Math.min(maxRatio, next));
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (stacked) return;
		const step = 0.03;
		if (e.key === 'ArrowLeft') {
			ratio = Math.max(minRatio, ratio - step);
			e.preventDefault();
		} else if (e.key === 'ArrowRight') {
			ratio = Math.min(maxRatio, ratio + step);
			e.preventDefault();
		}
	}
</script>

<div
	bind:this={container}
	class="flex h-full min-h-0 w-full"
	class:flex-col={stacked}
	style:display={stacked ? 'flex' : 'grid'}
	style:grid-template-columns={stacked
		? undefined
		: `${ratio}fr 6px ${1 - ratio}fr`}
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
			aria-label="Resize panes"
			aria-valuenow={Math.round(ratio * 100)}
			aria-valuemin={Math.round(minRatio * 100)}
			aria-valuemax={Math.round(maxRatio * 100)}
			tabindex="0"
			class="group relative flex cursor-col-resize items-center justify-center"
			class:bg-[var(--panel-hover)]={dragging}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onkeydown={handleKeyDown}
		>
			<div
				class="h-full w-px transition-colors group-hover:w-0.5"
				style:background-color={dragging ? 'var(--panel-primary)' : 'var(--panel-border)'}
			></div>
		</div>
	{/if}

	<div class="min-h-0 min-w-0 overflow-hidden" class:w-full={stacked}>
		{@render right()}
	</div>
</div>
