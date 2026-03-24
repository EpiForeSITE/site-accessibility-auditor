<script lang="ts">
	import type { AuditElement, AuditSummary } from '../types.ts';

	type FilterType = 'all' | 'fail' | 'warning' | 'pass';

	interface Props {
		elements: AuditElement[];
		summary: AuditSummary;
		selectedId?: number | null;
		onselect?: (id: number) => void;
	}

	let { elements, summary, selectedId = null, onselect }: Props = $props();

	let filter = $state<FilterType>('all');

	let filteredElements = $derived(
		filter === 'all' ? elements : elements.filter((e) => e.status === filter)
	);

	function statusColor(status: AuditElement['status']): string {
		switch (status) {
			case 'fail':
				return 'var(--status-fail)';
			case 'warning':
				return 'var(--status-warning)';
			case 'pass':
				return 'var(--status-pass)';
		}
	}

	function elementLabel(el: AuditElement): string {
		if (el.text) return el.text;
		if (el.attributes['aria-label']) return el.attributes['aria-label'];
		if (el.attributes.placeholder) return el.attributes.placeholder;
		if (el.attributes.name) return el.attributes.name;
		if (el.attributes.id) return `#${el.attributes.id}`;
		if (el.attributes.type) return `[type="${el.attributes.type}"]`;
		return `<${el.tag}>`;
	}

	function handleSelect(id: number) {
		onselect?.(id);
	}
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-xl border shadow-sm"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<!-- Summary bar -->
	<div
		class="border-b px-4 py-3"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		<h2 class="mb-3 text-sm font-semibold text-[var(--panel-text)]">Audit Summary</h2>
		<div class="grid grid-cols-4 gap-2">
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold text-[var(--panel-text)]">{summary.total}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Total</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-pass);">{summary.pass}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Pass</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-warning);">{summary.warning}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Warning</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-fail);">{summary.fail}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Fail</div>
			</div>
		</div>
	</div>

	<!-- Filter buttons -->
	<div class="flex gap-1 border-b px-4 py-2" style="border-color: var(--panel-border);">
		{#each [
			{ key: 'all', label: 'All', count: summary.total },
			{ key: 'fail', label: 'Fail', count: summary.fail },
			{ key: 'warning', label: 'Warn', count: summary.warning },
			{ key: 'pass', label: 'Pass', count: summary.pass }
		] as btn (btn.key)}
			<button
				onclick={() => (filter = btn.key as FilterType)}
				class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {filter === btn.key
					? 'text-white'
					: 'hover:bg-[var(--panel-hover)]'}"
				style="background-color: {filter === btn.key ? 'var(--panel-filter-active-bg)' : 'transparent'}; color: {filter === btn.key ? 'var(--panel-filter-active-text)' : 'var(--panel-text-muted)'};"
			>
				{btn.label}
				<span
					class="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
					style="background-color: {filter === btn.key ? 'rgba(255,255,255,0.2)' : 'var(--panel-filter-inactive-bg)'};"
				>
					{btn.count}
				</span>
			</button>
		{/each}
	</div>

	<!-- Issues list -->
	<div class="flex-1 overflow-y-auto">
		{#if filteredElements.length === 0}
			<div class="px-4 py-8 text-center text-sm text-[var(--panel-text-subtle)]">
				No elements match this filter.
			</div>
		{:else}
			<ul class="divide-y divide-[var(--panel-border)]">
				{#each filteredElements as element (element.id)}
					<li>
						<button
							onclick={() => handleSelect(element.id)}
							class="w-full border-l-3 px-4 py-3 text-left transition-colors hover:bg-[var(--panel-hover)]"
							style="border-left-color: {selectedId === element.id ? 'var(--panel-primary)' : statusColor(element.status)}; background-color: {selectedId === element.id ? 'var(--panel-selected)' : 'transparent'};"
						>
							<div class="flex items-start gap-2">
								<span
									class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
									style="background-color: {statusColor(element.status)}"
								></span>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<code
											class="rounded px-1.5 py-0.5 text-xs"
											style="background-color: var(--panel-code-bg); color: var(--panel-text);"
										>
											&lt;{element.tag}&gt;
										</code>
										<span class="text-xs text-[var(--panel-text-subtle)]">
											{element.touchWidth}x{element.touchHeight}px
										</span>
									</div>
									<div class="mt-0.5 truncate text-xs text-[var(--panel-text-muted)]">
										{elementLabel(element)}
									</div>
									<p class="mt-1 text-xs leading-relaxed text-[var(--panel-text-muted)]">
										{element.suggestion}
									</p>
								</div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		</div>
</div>
