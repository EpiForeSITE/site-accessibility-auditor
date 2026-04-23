<script lang="ts">
	import type { AuditIssue } from '../../types.ts';
	import { CRITERION_META } from '../../types.ts';
	import type { InteractionState } from '../../session/types.ts';
	import SectionCard from '../ui/section-card.svelte';

	interface Props {
		current: InteractionState;
		baseState: InteractionState | null;
	}

	let { current, baseState }: Props = $props();

	const isRoot = $derived(baseState ? current.id === baseState.id : false);

	function issueKey(issue: AuditIssue): string {
		return [issue.wcag, issue.category, issue.selector ?? issue.domPath ?? '', issue.tag].join('|');
	}

	const baseKeySet = $derived.by<Set<string>>(() => {
		if (!baseState || isRoot) return new Set<string>();
		return new Set(baseState.result.issues.map(issueKey));
	});

	const currentKeySet = $derived(new Set(current.result.issues.map(issueKey)));

	const newIssues = $derived.by<AuditIssue[]>(() => {
		if (isRoot || !baseState) return [];
		return current.result.issues.filter((i) => !baseKeySet.has(issueKey(i)));
	});

	const vanishedIssues = $derived.by<AuditIssue[]>(() => {
		if (isRoot || !baseState) return [];
		return baseState.result.issues.filter((i) => !currentKeySet.has(issueKey(i)));
	});

	const persistentIssues = $derived.by<AuditIssue[]>(() => {
		if (isRoot) return current.result.issues;
		return current.result.issues.filter((i) => baseKeySet.has(issueKey(i)));
	});

	function statusColor(s: AuditIssue['status']): string {
		if (s === 'fail') return 'var(--status-fail)';
		if (s === 'warning') return 'var(--status-warning)';
		if (s === 'pass') return 'var(--status-pass)';
		return 'var(--panel-text-muted)';
	}

	type Tab = 'new' | 'gone' | 'persistent';
	let activeTab: Tab = $state('new');

	$effect(() => {
		if (isRoot) {
			activeTab = 'persistent';
		} else if (newIssues.length > 0) {
			activeTab = 'new';
		} else if (vanishedIssues.length > 0) {
			activeTab = 'gone';
		} else {
			activeTab = 'persistent';
		}
	});

	const visibleIssues = $derived.by<AuditIssue[]>(() => {
		if (activeTab === 'new') return newIssues;
		if (activeTab === 'gone') return vanishedIssues;
		return persistentIssues;
	});
</script>

<SectionCard title="Selected state" subtitle={isRoot ? 'base · reference snapshot' : current.id}>
	<div class="flex flex-col gap-3">
		{#if current.screenshot}
			<img
				src={current.screenshot}
				alt="State screenshot"
				class="w-full rounded border object-contain"
				style="border-color: var(--panel-border); max-height: 200px; background-color: var(--panel-summary-bg);"
			/>
		{/if}

		<dl class="grid grid-cols-2 gap-2 text-[11px]">
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Trigger</dt>
				<dd class="truncate text-[var(--panel-text)]" title={current.triggerLabel}>
					{isRoot ? 'Base state' : current.triggerLabel}
				</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Depth</dt>
				<dd class="text-[var(--panel-text)]">{current.depth}</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Signature</dt>
				<dd class="truncate font-mono text-[10px] text-[var(--panel-text-muted)]" title={current.signature}>
					{current.signature}
				</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Discovered</dt>
				<dd class="text-[var(--panel-text)]">
					{new Date(current.discoveredAt).toLocaleString()}
				</dd>
			</div>
		</dl>

		<div class="grid grid-cols-3 gap-2 text-[10px]">
			<div
				class="rounded border px-2 py-1.5 text-center"
				style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
			>
				<div class="text-base font-bold tabular-nums" style:color="var(--status-fail)">
					{current.result.summary.fail}
				</div>
				<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Fail</div>
			</div>
			<div
				class="rounded border px-2 py-1.5 text-center"
				style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
			>
				<div class="text-base font-bold tabular-nums" style:color="var(--status-warning)">
					{current.result.summary.warning}
				</div>
				<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Warn</div>
			</div>
			<div
				class="rounded border px-2 py-1.5 text-center"
				style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
			>
				<div class="text-base font-bold tabular-nums" style:color="var(--status-pass)">
					{current.result.summary.pass}
				</div>
				<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Pass</div>
			</div>
		</div>

		{#if !isRoot}
			<div
				class="flex items-center gap-0.5 rounded-md border p-0.5 text-[10px]"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
				role="tablist"
				aria-label="Issue diff vs. base"
			>
				{#each [
					{ id: 'new' as const, label: `New (${newIssues.length})`, color: 'var(--viz-bad)' },
					{ id: 'gone' as const, label: `Gone (${vanishedIssues.length})`, color: 'var(--viz-ok)' },
					{ id: 'persistent' as const, label: `Persistent (${persistentIssues.length})`, color: 'var(--panel-text-muted)' }
				] as tab (tab.id)}
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === tab.id}
						class="flex-1 rounded px-2 py-1 font-semibold transition-colors"
						style:background-color={activeTab === tab.id ? 'var(--panel-bg-elevated)' : 'transparent'}
						style:color={activeTab === tab.id ? tab.color : 'var(--panel-text-muted)'}
						onclick={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>
		{/if}

		{#if visibleIssues.length > 0}
			<ul class="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
				{#each visibleIssues.slice(0, 60) as issue (issue.id)}
					<li
						class="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px]"
						style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
					>
						<span
							class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
							style:background-color={statusColor(issue.status)}
						></span>
						<span class="font-mono text-[9px] text-[var(--panel-text-muted)]">{issue.wcag}</span>
						<span class="truncate text-[var(--panel-text)]" title={CRITERION_META[issue.wcag]?.title}>
							{CRITERION_META[issue.wcag]?.title ?? issue.category}
						</span>
						<code
							class="ml-auto shrink-0 rounded px-1 text-[9px]"
							style="background-color: var(--panel-code-bg); color: var(--panel-text);"
						>&lt;{issue.tag}&gt;</code>
					</li>
				{/each}
				{#if visibleIssues.length > 60}
					<li class="px-2 py-1 text-center text-[9px] text-[var(--panel-text-subtle)]">
						…{visibleIssues.length - 60} more
					</li>
				{/if}
			</ul>
		{:else}
			<div
				class="rounded-md border px-3 py-4 text-center text-[11px] text-[var(--panel-text-muted)]"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
			>
				{#if isRoot}
					No issues in base state.
				{:else if activeTab === 'new'}
					No new issues introduced by this interaction.
				{:else if activeTab === 'gone'}
					No base issues disappear here.
				{:else}
					No persistent issues.
				{/if}
			</div>
		{/if}
	</div>
</SectionCard>
