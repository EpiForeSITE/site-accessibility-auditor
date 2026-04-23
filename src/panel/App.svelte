<script lang="ts">
	import { runAudit, highlightIssue, clearAudit, resetSession } from '../lib/auditor.ts';
	import IssuesPanel from '../lib/components/issues-panel.svelte';
	import type { AuditResult, WcagSC } from '../lib/types.ts';
	import { ALL_CRITERIA, CRITERION_META } from '../lib/types.ts';
	import { getRuns, saveRun, deleteRun, type AuditRunRecord } from '../lib/shared/audit-history.ts';
	import { diffAudits } from '../lib/shared/audit-diff.ts';
	import { captureTab, downscaleDataUrl } from '../lib/shared/devtools-eval.ts';
	import PanelShell from '../lib/components/ui/panel-shell.svelte';
	import ToolbarButton from '../lib/components/ui/toolbar-button.svelte';
	import EmptyState from '../lib/components/ui/empty-state.svelte';
	import RunList from '../lib/components/history/run-list.svelte';
	import DiffView from '../lib/components/history/diff-view.svelte';

	type Tab = 'current' | 'history';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<AuditResult | null>(null);
	let selectedId = $state<number | null>(null);
	let enabled = $state<Record<WcagSC, boolean>>(
		Object.fromEntries(ALL_CRITERIA.map((c) => [c, true])) as Record<WcagSC, boolean>
	);
	let showSettings = $state(false);
	let tab = $state<Tab>('current');
	let runs = $state<AuditRunRecord[]>([]);
	let baselineId = $state<string | null>(null);
	let currentId = $state<string | null>(null);

	const origin = $derived(result?.origin ?? null);
	const baseline = $derived(baselineId ? (runs.find((r) => r.id === baselineId) ?? null) : null);
	const current = $derived(currentId ? (runs.find((r) => r.id === currentId) ?? null) : null);
	const diff = $derived(current ? diffAudits(baseline?.result ?? null, current.result) : null);

	async function refreshRuns(forOrigin?: string) {
		if (!forOrigin) return;
		runs = await getRuns(forOrigin);
		if (!currentId && runs.length > 0) currentId = runs[0].id;
		if (!baselineId && runs.length > 1) baselineId = runs[1].id;
	}

	async function handleAudit() {
		loading = true;
		error = null;
		selectedId = null;
		try {
			const criteria = ALL_CRITERIA.filter((c) => enabled[c]);
			const auditResult = await runAudit({ criteria });
			result = auditResult;
			let thumbnail: string | null = null;
			try {
				const raw = await captureTab();
				if (raw) thumbnail = await downscaleDataUrl(raw, 320);
			} catch {
				thumbnail = null;
			}
			const record = await saveRun(auditResult, thumbnail);
			runs = await getRuns(auditResult.origin);
			baselineId = currentId ?? baselineId;
			currentId = record.id;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Audit failed';
			result = null;
		} finally {
			loading = false;
		}
	}

	async function handleSelect(id: number) {
		selectedId = selectedId === id ? null : id;
		await highlightIssue(selectedId);
	}

	async function handleClear() {
		await clearAudit();
		result = null;
		selectedId = null;
		error = null;
	}

	async function handleResetSession() {
		if (result) await resetSession(result.origin);
		else await resetSession();
	}

	async function handleSelectRun(id: string, role: 'baseline' | 'current') {
		if (role === 'baseline') baselineId = id;
		else currentId = id;
	}

	async function handleDeleteRun(id: string) {
		if (!origin) return;
		await deleteRun(origin, id);
		if (baselineId === id) baselineId = null;
		if (currentId === id) currentId = null;
		runs = await getRuns(origin);
	}

	$effect(() => {
		if (tab === 'history' && origin) {
			refreshRuns(origin);
		}
	});
</script>

<PanelShell title="Interaction Audits" subtitle="WCAG 2.2 · history · diff">
	{#snippet toolbar()}
		<div
			class="flex items-center rounded-md border p-0.5 text-[11px]"
			style="border-color: var(--panel-border);"
		>
			<button
				onclick={() => (tab = 'current')}
				class="rounded-md px-2 py-0.5 transition-colors"
				style:background-color={tab === 'current' ? 'var(--panel-filter-active-bg)' : 'transparent'}
				style:color={tab === 'current'
					? 'var(--panel-filter-active-text)'
					: 'var(--panel-text-muted)'}
			>
				Current
			</button>
			<button
				onclick={() => (tab = 'history')}
				class="rounded-md px-2 py-0.5 transition-colors"
				style:background-color={tab === 'history' ? 'var(--panel-filter-active-bg)' : 'transparent'}
				style:color={tab === 'history'
					? 'var(--panel-filter-active-text)'
					: 'var(--panel-text-muted)'}
			>
				History / Diff
			</button>
		</div>
		<ToolbarButton onclick={() => (showSettings = !showSettings)}>Criteria</ToolbarButton>
		<ToolbarButton
			onclick={handleResetSession}
			title="Clear stored help signatures and known field tokens for this origin"
		>
			Reset Session
		</ToolbarButton>
		{#if result}
			<ToolbarButton onclick={handleClear}>Clear</ToolbarButton>
		{/if}
		<ToolbarButton variant="primary" onclick={handleAudit} disabled={loading} {loading}>
			{loading ? 'Auditing…' : 'Audit Page'}
		</ToolbarButton>
	{/snippet}

	{#if showSettings}
		<div
			class="shrink-0 border-b px-4 py-3"
			style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
		>
			<h2 class="mb-2 text-xs font-semibold text-[var(--panel-text)]">WCAG 2.2 criteria</h2>
			<div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
				{#each ALL_CRITERIA as c (c)}
					<label class="flex items-center gap-2 text-xs text-[var(--panel-text-muted)]">
						<input
							type="checkbox"
							checked={enabled[c]}
							onchange={(e) => (enabled[c] = e.currentTarget.checked)}
							class="rounded"
						/>
						<span class="font-mono text-[var(--panel-text)]">{c}</span>
						<span>{CRITERION_META[c].title}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	{#if error}
		<div
			class="m-3 rounded-lg border px-4 py-3 text-xs"
			style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
		>
			{error}
		</div>
	{/if}

	{#if tab === 'current'}
		{#if result}
			<IssuesPanel {result} {selectedId} onselect={handleSelect} />
		{:else if !loading && !error}
			<EmptyState
				title="Interaction Audits"
				description="Deterministic in-page checks for nine WCAG 2.2 interaction-oriented success criteria. Runs are automatically saved for later diffing against future audits."
				action="Click <strong>Audit Page</strong> to scan the current page."
			>
				<ul
					class="mt-2 grid max-w-md grid-cols-1 gap-1 text-left text-[11px] text-[var(--panel-text-muted)]"
				>
					{#each ALL_CRITERIA as c (c)}
						<li class="flex items-baseline gap-2">
							<span class="font-mono text-[var(--panel-text)]">{c}</span>
							<span>{CRITERION_META[c].title}</span>
						</li>
					{/each}
				</ul>
			</EmptyState>
		{/if}
	{:else}
		<div class="flex flex-col gap-3 px-3 py-3">
			<div
				class="rounded-md border px-3 py-2 text-[11px]"
				style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
			>
				Pick any two runs from this origin to diff. The most recent run is chosen as <em>current</em
				>
				and the one before it as <em>baseline</em> by default.
			</div>

			<RunList
				{runs}
				{baselineId}
				{currentId}
				onselect={handleSelectRun}
				ondelete={handleDeleteRun}
			/>

			{#if diff}
				<DiffView {diff} />
			{:else if runs.length > 0}
				<div
					class="rounded-md border px-3 py-4 text-center text-[11px] text-[var(--panel-text-muted)]"
					style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
				>
					Select a run as "current" to compute a diff.
				</div>
			{/if}
		</div>
	{/if}
</PanelShell>
