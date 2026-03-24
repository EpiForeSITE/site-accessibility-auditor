<script lang="ts">
	import type { TabOrderElement, TabOrderResult } from '../../tab-order/types.ts';

	interface Props {
		elements: TabOrderElement[];
		summary: TabOrderResult['summary'];
		selectedId?: number | null;
		hoveredId?: number | null;
		onselect?: (id: number) => void;
		onhover?: (id: number | null) => void;
		color?: string;
	}

	let {
		elements,
		summary,
		selectedId = null,
		hoveredId = null,
		onselect,
		onhover,
		color = '#2563eb'
	}: Props = $props();

	function elementLabel(el: TabOrderElement): string {
		if (el.text) return el.text;
		if (el.attributes['aria-label']) return el.attributes['aria-label'];
		if (el.attributes.placeholder) return el.attributes.placeholder;
		if (el.attributes.name) return el.attributes.name;
		if (el.attributes.id) return `#${el.attributes.id}`;
		if (el.attributes.type) return `[type="${el.attributes.type}"]`;
		return `<${el.tag}>`;
	}

	function tagIcon(tag: string, role: string | null): string {
		if (role === 'button' || tag === 'button') return '⏺';
		if (tag === 'a') return '🔗';
		if (tag === 'input' || tag === 'textarea') return '✏️';
		if (tag === 'select') return '📋';
		if (tag === 'summary' || tag === 'details') return '📂';
		return '◉';
	}

	const MAX_W = 4;
	const MIN_W = 0.4;
	const BASE_W = 1;
	const DECAY_K = 1.5;
	const MAX_OPACITY = 0.9;
	const MIN_OPACITY = 0.08;
	const BASE_OPACITY = 0.3;

	function lineWidth(lineIdx: number): number {
		if (hoveredId === null) return BASE_W;
		const dist = Math.min(Math.abs(lineIdx - hoveredId), Math.abs(lineIdx + 1 - hoveredId));
		const w = MAX_W / (1 + DECAY_K * Math.log(1 + dist));
		return Math.max(w, MIN_W);
	}

	function lineOpacity(lineIdx: number): number {
		if (hoveredId === null) return BASE_OPACITY;
		const dist = Math.min(Math.abs(lineIdx - hoveredId), Math.abs(lineIdx + 1 - hoveredId));
		const o = MAX_OPACITY / (1 + DECAY_K * Math.log(1 + dist));
		return Math.max(o, MIN_OPACITY);
	}

	function handleSelect(id: number) {
		onselect?.(id);
	}

	$effect(() => {
		if (hoveredId !== null) {
			const el = document.querySelector(`[data-tab-list-id="${hoveredId}"]`);
			if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	});
</script>

<div
	class="flex h-full flex-col overflow-hidden"
	style="background-color: var(--panel-bg-elevated);"
>
	<!-- Summary bar -->
	<div
		class="border-b px-4 py-3"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		<h2 class="mb-3 text-sm font-semibold text-[var(--panel-text)]">Tab Order Summary</h2>
		<div class="grid grid-cols-3 gap-2">
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: {color};">{summary.total}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Tab Stops</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-pass);">{summary.natural}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Natural</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--tab-order-programmatic);">
					{summary.programmatic}
				</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Programmatic</div>
			</div>
		</div>

		{#if summary.hasPositiveTabindex}
			<div
				class="mt-3 rounded-lg border px-3 py-2 text-xs"
				style="border-color: var(--panel-warning-border); background-color: var(--panel-warning-bg); color: var(--panel-warning-text);"
			>
				<strong>Warning:</strong> Positive tabindex values detected. This overrides natural DOM order
				and can confuse keyboard users.
			</div>
		{/if}
	</div>

	<!-- Tab sequence -->
	<div class="flex-1 overflow-y-auto px-3 py-2">
		{#if elements.length === 0}
			<div class="px-4 py-8 text-center text-sm text-[var(--panel-text-subtle)]">
				No tabbable elements found.
			</div>
		{:else}
			<ol class="relative">
				{#each elements as element, i (element.id)}
					<li class="relative flex">
						<!-- Connector line -->
						{#if i < elements.length - 1}
							<div
								class="absolute top-[34px]"
								style="left: {15 - lineWidth(i) / 2}px; width: {lineWidth(i)}px; background-color: {color}; opacity: {lineOpacity(i)}; height: calc(100% - 12px); transition: width 0.15s ease, opacity 0.15s ease, left 0.15s ease; border-radius: {lineWidth(i) / 2}px;"
							></div>
						{/if}

						<button
							data-tab-list-id={element.id}
							onclick={() => handleSelect(element.id)}
							onmouseenter={() => onhover?.(element.id)}
							onmouseleave={() => onhover?.(null)}
							class="group mb-1 flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors"
							style="background-color: {selectedId === element.id
								? 'var(--panel-selected)'
								: hoveredId === element.id
									? 'var(--panel-hover)'
									: 'transparent'}; {hoveredId === element.id && selectedId !== element.id
								? `outline: 2px solid ${color}; outline-offset: -2px; border-radius: 8px;`
								: ''}"
						>
							<!-- Order badge -->
							<span
								class="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
								style="background-color: {color};"
							>
								{i + 1}
							</span>

							<div class="min-w-0 flex-1 pt-0.5">
								<div class="truncate text-xs font-medium text-[var(--panel-text)]">
									{elementLabel(element)}
								</div>
								<div class="mt-0.5 flex items-center gap-2">
									<span class="text-xs">{tagIcon(element.tag, element.role)}</span>
									<code
										class="rounded px-1.5 py-0.5 text-xs"
										style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
									>
										&lt;{element.tag}&gt;
									</code>
									{#if element.role}
										<span
											class="rounded px-1.5 py-0.5 text-[10px] font-medium"
											style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent); color: var(--panel-primary);"
										>
											role="{element.role}"
										</span>
									{/if}
									{#if element.tabindex !== null && element.tabindex > 0}
										<span
											class="rounded px-1.5 py-0.5 text-[10px] font-medium"
											style="background-color: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning);"
										>
											tabindex={element.tabindex}
										</span>
									{/if}
									{#if element.focusable === 'programmatic'}
										<span
											class="rounded px-1.5 py-0.5 text-[10px] font-medium"
											style="background-color: color-mix(in srgb, var(--tab-order-programmatic) 15%, transparent); color: var(--tab-order-programmatic);"
										>
											tabindex=0
										</span>
									{/if}
								</div>
							</div>

							<!-- Position indicator -->
							<span class="shrink-0 pt-1 text-[10px] text-[var(--panel-text-subtle)]">
								{Math.round(element.rect.x)},{Math.round(element.rect.y)}
							</span>
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
