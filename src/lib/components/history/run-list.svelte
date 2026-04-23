<script lang="ts">
	import type { AuditRunRecord } from '../../shared/audit-history.ts';

	interface Props {
		runs: AuditRunRecord[];
		baselineId: string | null;
		currentId: string | null;
		onselect: (id: string, role: 'baseline' | 'current') => void;
		ondelete: (id: string) => void;
	}

	let { runs, baselineId, currentId, onselect, ondelete }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	{#if runs.length === 0}
		<div
			class="rounded-md border px-3 py-4 text-center text-[11px] text-[var(--panel-text-muted)]"
			style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
		>
			No previous runs for this origin. Run an audit to record one.
		</div>
	{:else}
		<ul class="flex flex-col gap-1.5">
			{#each runs as run (run.id)}
				{@const isBaseline = run.id === baselineId}
				{@const isCurrent = run.id === currentId}
				<li
					class="rounded-md border"
					style:border-color={isCurrent || isBaseline
						? 'var(--panel-primary)'
						: 'var(--panel-border)'}
					style:background-color={isCurrent || isBaseline
						? 'var(--panel-selected)'
						: 'var(--panel-bg-elevated)'}
				>
					<div class="flex items-start gap-3 p-2">
						{#if run.thumbnail}
							<img
								src={run.thumbnail}
								alt="Audit thumbnail"
								class="h-16 w-24 shrink-0 rounded border object-cover"
								style="border-color: var(--panel-border);"
							/>
						{:else}
							<div
								class="flex h-16 w-24 shrink-0 items-center justify-center rounded border text-[9px] text-[var(--panel-text-subtle)]"
								style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
							>
								no shot
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate text-[11px] font-semibold text-[var(--panel-text)]">
									{new Date(run.timestamp).toLocaleString()}
								</span>
								{#if isBaseline}
									<span
										class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
										style="background-color: var(--viz-info); color: #fff;">baseline</span
									>
								{/if}
								{#if isCurrent}
									<span
										class="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
										style="background-color: var(--viz-accent); color: #fff;">current</span
									>
								{/if}
							</div>
							<p class="mt-0.5 truncate text-[10px] text-[var(--panel-text-muted)]">
								{run.url}
							</p>
							<div class="mt-1 flex items-center gap-2 text-[10px]">
								<span style="color: var(--status-fail);">{run.result.summary.fail} fail</span>
								<span style="color: var(--status-warning);">{run.result.summary.warning} warn</span>
								<span style="color: var(--status-pass);">{run.result.summary.pass} pass</span>
							</div>
							<div class="mt-1.5 flex gap-1 text-[10px]">
								<button
									onclick={() => onselect(run.id, 'baseline')}
									class="rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
									style="border-color: var(--panel-border); color: var(--panel-text-muted);"
								>
									Use as baseline
								</button>
								<button
									onclick={() => onselect(run.id, 'current')}
									class="rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
									style="border-color: var(--panel-border); color: var(--panel-text-muted);"
								>
									Use as current
								</button>
								<button
									onclick={() => ondelete(run.id)}
									class="ml-auto rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
									style="border-color: var(--panel-border); color: var(--viz-bad);"
								>
									Delete
								</button>
							</div>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
