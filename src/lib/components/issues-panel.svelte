<script lang="ts">
	import type { AuditIssue, AuditResult, WcagSC } from '../types.ts';
	import { CRITERION_META } from '../types.ts';

	type StatusFilter = 'all' | 'fail' | 'warning' | 'pass' | 'exempt';
	type CategoryFilter = 'all' | 'Targets' | 'Focus' | 'Drag' | 'Forms' | 'Help';

	interface Props {
		result: AuditResult;
		selectedId?: number | null;
		onselect?: (id: number) => void;
	}

	let { result, selectedId = null, onselect }: Props = $props();

	let statusFilter = $state<StatusFilter>('all');
	let categoryFilter = $state<CategoryFilter>('all');
	let expandedId = $state<number | null>(null);

	let categories: CategoryFilter[] = ['all', 'Targets', 'Focus', 'Drag', 'Forms', 'Help'];

	function categoryOfIssue(i: AuditIssue): CategoryFilter {
		return CRITERION_META[i.wcag]?.shortLabel as CategoryFilter;
	}

	let filteredIssues = $derived(
		result.issues.filter((i) => {
			if (statusFilter !== 'all' && i.status !== statusFilter) return false;
			if (categoryFilter !== 'all' && categoryOfIssue(i) !== categoryFilter) return false;
			return true;
		})
	);

	function statusColor(status: AuditIssue['status']): string {
		switch (status) {
			case 'fail':
				return 'var(--status-fail)';
			case 'warning':
				return 'var(--status-warning)';
			case 'pass':
				return 'var(--status-pass)';
			case 'exempt':
				return 'var(--panel-text-muted)';
		}
	}

	function issueLabel(i: AuditIssue): string {
		if (i.text) return i.text;
		if (i.attributes['aria-label']) return i.attributes['aria-label']!;
		if (i.attributes.placeholder) return i.attributes.placeholder!;
		if (i.attributes.name) return i.attributes.name!;
		if (i.attributes.id) return `#${i.attributes.id}`;
		if (i.attributes.type) return `[type="${i.attributes.type}"]`;
		return `<${i.tag}>`;
	}

	function handleSelect(i: AuditIssue) {
		onselect?.(i.id);
		expandedId = expandedId === i.id ? null : i.id;
	}

	function statusCount(s: StatusFilter): number {
		if (s === 'all') return result.summary.total;
		return result.summary[s];
	}

	function criterionList(): {
		wcag: WcagSC;
		summary: { fail: number; warning: number; pass: number; exempt: number; total: number };
	}[] {
		return Object.keys(result.perCriterion).map((w) => ({
			wcag: w as WcagSC,
			summary: result.perCriterion[w as WcagSC]!
		}));
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
		<div class="grid grid-cols-5 gap-2">
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold text-[var(--panel-text)]">{result.summary.total}</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Total</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-pass);">
					{result.summary.pass}
				</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Pass</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-warning);">
					{result.summary.warning}
				</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Warn</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--status-fail);">
					{result.summary.fail}
				</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Fail</div>
			</div>
			<div
				class="rounded-lg p-2 text-center shadow-sm"
				style="background-color: var(--panel-bg-elevated);"
			>
				<div class="text-lg font-bold" style="color: var(--panel-text-muted);">
					{result.summary.exempt}
				</div>
				<div class="text-xs text-[var(--panel-text-muted)]">Exempt</div>
			</div>
		</div>

		<!-- Per-criterion chips -->
		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each criterionList() as c (c.wcag)}
				<span
					class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
					style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated); color: var(--panel-text);"
					title={CRITERION_META[c.wcag]?.title}
				>
					<span class="font-mono">{c.wcag}</span>
					{#if c.summary.fail}<span style="color: var(--status-fail);">{c.summary.fail}F</span>{/if}
					{#if c.summary.warning}<span style="color: var(--status-warning);"
							>{c.summary.warning}W</span
						>{/if}
					{#if c.summary.pass}<span style="color: var(--status-pass);">{c.summary.pass}P</span>{/if}
				</span>
			{/each}
		</div>
	</div>

	<!-- Category filter -->
	<div class="flex gap-1 border-b px-4 py-2" style="border-color: var(--panel-border);">
		{#each categories as cat (cat)}
			<button
				onclick={() => (categoryFilter = cat)}
				class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
				style="background-color: {categoryFilter === cat
					? 'var(--panel-filter-active-bg)'
					: 'transparent'}; color: {categoryFilter === cat
					? 'var(--panel-filter-active-text)'
					: 'var(--panel-text-muted)'};"
			>
				{cat === 'all' ? 'All Categories' : cat}
			</button>
		{/each}
	</div>

	<!-- Status filter -->
	<div class="flex gap-1 border-b px-4 py-2" style="border-color: var(--panel-border);">
		{#each ['all', 'fail', 'warning', 'pass', 'exempt'] as key (key)}
			<button
				onclick={() => (statusFilter = key as StatusFilter)}
				class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {statusFilter === key
					? 'text-white'
					: 'hover:bg-[var(--panel-hover)]'}"
				style="background-color: {statusFilter === key
					? 'var(--panel-filter-active-bg)'
					: 'transparent'}; color: {statusFilter === key
					? 'var(--panel-filter-active-text)'
					: 'var(--panel-text-muted)'};"
			>
				{key === 'all' ? 'All' : key[0].toUpperCase() + key.slice(1)}
				<span
					class="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
					style="background-color: {statusFilter === key
						? 'rgba(255,255,255,0.2)'
						: 'var(--panel-filter-inactive-bg)'};"
				>
					{statusCount(key as StatusFilter)}
				</span>
			</button>
		{/each}
	</div>

	<!-- Issues list -->
	<div class="flex-1 overflow-y-auto">
		{#if filteredIssues.length === 0}
			<div class="px-4 py-8 text-center text-sm text-[var(--panel-text-subtle)]">
				No findings match this filter.
			</div>
		{:else}
			<ul class="divide-y divide-[var(--panel-border)]">
				{#each filteredIssues as issue (issue.id)}
					<li>
						<button
							onclick={() => handleSelect(issue)}
							class="w-full border-l-3 px-4 py-3 text-left transition-colors hover:bg-[var(--panel-hover)]"
							style="border-left-color: {selectedId === issue.id
								? 'var(--panel-primary)'
								: statusColor(issue.status)}; background-color: {selectedId === issue.id
								? 'var(--panel-selected)'
								: 'transparent'};"
						>
							<div class="flex items-start gap-2">
								<span
									class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
									style="background-color: {statusColor(issue.status)}"
								></span>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span
											class="rounded px-1.5 py-0.5 font-mono text-[10px]"
											style="background-color: var(--panel-code-bg); color: var(--panel-text);"
											title={CRITERION_META[issue.wcag]?.title}
										>
											WCAG {issue.wcag}
										</span>
										<code
											class="rounded px-1.5 py-0.5 text-xs"
											style="background-color: var(--panel-code-bg); color: var(--panel-text);"
										>
											&lt;{issue.tag}&gt;
										</code>
										{#if issue.rect}
											<span class="text-xs text-[var(--panel-text-subtle)]">
												{Math.round(issue.rect.width)}×{Math.round(issue.rect.height)}px
											</span>
										{/if}
										<span
											class="ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
											style="color: {statusColor(
												issue.status
											)}; background-color: color-mix(in srgb, {statusColor(
												issue.status
											)} 15%, transparent);"
										>
											{issue.status}
										</span>
									</div>
									<div class="mt-0.5 truncate text-xs text-[var(--panel-text-muted)]">
										{issueLabel(issue)}
									</div>
									<p class="mt-1 text-xs leading-relaxed text-[var(--panel-text-muted)]">
										{issue.suggestion}
									</p>
									{#if expandedId === issue.id}
										<pre
											class="mt-2 overflow-x-auto rounded px-2 py-1.5 text-[10px] leading-snug"
											style="background-color: var(--panel-code-bg); color: var(--panel-text);">{JSON.stringify(
												issue.evidence,
												null,
												2
											)}</pre>
										{#if issue.selector}
											<div
												class="mt-1 truncate font-mono text-[10px] text-[var(--panel-text-subtle)]"
											>
												{issue.selector}
											</div>
										{/if}
									{/if}
								</div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
