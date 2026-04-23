<script lang="ts">
	import type { AuditDiff, DiffEntry, DiffStatus } from '../../shared/audit-diff.ts';
	import { CRITERION_META } from '../../types.ts';
	import StatTile from '../ui/stat-tile.svelte';

	interface Props {
		diff: AuditDiff;
	}

	let { diff }: Props = $props();

	const statusMeta: Record<DiffStatus, { label: string; color: string }> = {
		new: { label: 'New', color: 'var(--viz-bad)' },
		resolved: { label: 'Resolved', color: 'var(--viz-ok)' },
		unchanged: { label: 'Unchanged', color: 'var(--viz-muted)' },
		modified: { label: 'Modified', color: 'var(--viz-warn)' }
	};

	const columns: DiffStatus[] = ['resolved', 'unchanged', 'new'];

	const maxDelta = $derived.by(() => {
		let m = 0;
		for (const c of diff.perCriterion) m = Math.max(m, Math.abs(c.delta));
		return Math.max(1, m);
	});

	function entriesFor(status: DiffStatus): DiffEntry[] {
		return diff.entries.filter(
			(e) => e.status === status || (status === 'new' && e.status === 'modified')
		);
	}

	function labelFor(e: DiffEntry): string {
		const issue = e.current ?? e.previous;
		if (!issue) return '';
		return (
			issue.text ||
			issue.attributes['aria-label'] ||
			issue.attributes.placeholder ||
			issue.attributes.name ||
			`#${issue.attributes.id ?? ''}` ||
			`<${issue.tag}>`
		);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="grid grid-cols-4 gap-2">
		<StatTile label="Resolved" value={diff.totals.resolved} accent="ok" />
		<StatTile label="New" value={diff.totals.new} accent="bad" />
		<StatTile label="Modified" value={diff.totals.modified} accent="warn" />
		<StatTile label="Unchanged" value={diff.totals.unchanged} accent="default" />
	</div>

	{#if diff.perCriterion.length > 0}
		<div
			class="rounded-md border px-3 py-2"
			style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
		>
			<div
				class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
			>
				Per-criterion delta
			</div>
			<ul class="flex flex-col gap-1">
				{#each diff.perCriterion as c (c.wcag)}
					<li class="flex items-center gap-2 text-[11px]">
						<span
							class="w-16 rounded px-1 font-mono text-[9px]"
							style="background-color: var(--panel-code-bg); color: var(--panel-text);"
							>{c.wcag}</span
						>
						<span class="w-32 truncate text-[var(--panel-text)]">
							{CRITERION_META[c.wcag]?.title ?? c.wcag}
						</span>
						<div class="relative flex h-3 flex-1 items-center" aria-hidden="true">
							<div
								class="absolute top-0 left-1/2 h-full w-px"
								style="background-color: var(--panel-border);"
							></div>
							{#if c.delta < 0}
								<span
									class="absolute right-1/2 h-full rounded-l"
									style="background-color: var(--viz-ok); width: {(Math.abs(c.delta) / maxDelta) *
										50}%;"
								></span>
							{:else if c.delta > 0}
								<span
									class="absolute left-1/2 h-full rounded-r"
									style="background-color: var(--viz-bad); width: {(c.delta / maxDelta) * 50}%;"
								></span>
							{/if}
						</div>
						<span
							class="w-16 text-right text-[10px] tabular-nums"
							style:color={c.delta > 0
								? 'var(--viz-bad)'
								: c.delta < 0
									? 'var(--viz-ok)'
									: 'var(--panel-text-muted)'}
						>
							{c.previous} → {c.current}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
		{#each columns as status (status)}
			{@const items = entriesFor(status)}
			<div
				class="flex flex-col rounded-md border"
				style="border-color: color-mix(in srgb, {statusMeta[status]
					.color} 45%, var(--panel-border)); background-color: color-mix(in srgb, {statusMeta[
					status
				].color} 4%, var(--panel-bg-elevated));"
			>
				<div
					class="flex items-center gap-2 border-b px-3 py-2"
					style="border-color: var(--panel-border);"
				>
					<span
						class="inline-block h-2 w-2 rounded-full"
						style="background-color: {statusMeta[status].color};"
					></span>
					<span
						class="text-[9px] font-bold tracking-wide uppercase"
						style="color: {statusMeta[status].color};"
					>
						{statusMeta[status].label}
					</span>
					<span class="ml-auto text-[10px] text-[var(--panel-text-muted)] tabular-nums">
						{items.length}
					</span>
				</div>
				<ul class="flex max-h-96 flex-col overflow-y-auto">
					{#each items as entry, i (i)}
						{@const issue = entry.current ?? entry.previous}
						<li
							class="border-b px-3 py-1.5 text-[10px]"
							style="border-color: color-mix(in srgb, var(--panel-border) 60%, transparent);"
						>
							<div class="flex items-center gap-1.5">
								<span
									class="rounded px-1 font-mono text-[9px]"
									style="background-color: var(--panel-code-bg); color: var(--panel-text);"
									>{issue?.wcag}</span
								>
								<code
									class="rounded px-1 text-[9px]"
									style="background-color: var(--panel-code-bg); color: var(--panel-text);"
									>&lt;{issue?.tag}&gt;</code
								>
								{#if entry.status === 'modified' && entry.previous && entry.current}
									<span
										class="rounded px-1 text-[9px]"
										style="background-color: color-mix(in srgb, var(--viz-warn) 15%, transparent); color: var(--viz-warn);"
									>
										{entry.previous.status} → {entry.current.status}
									</span>
								{/if}
							</div>
							<p class="mt-0.5 truncate text-[var(--panel-text)]">{labelFor(entry)}</p>
						</li>
					{/each}
					{#if items.length === 0}
						<li class="px-3 py-3 text-center text-[10px] text-[var(--panel-text-subtle)]">None</li>
					{/if}
				</ul>
			</div>
		{/each}
	</div>
</div>
