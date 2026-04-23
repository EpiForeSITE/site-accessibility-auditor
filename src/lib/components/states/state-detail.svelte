<script lang="ts">
	import type { InteractionState } from '../../session/types.ts';
	import { CRITERION_META } from '../../types.ts';
	import SectionCard from '../ui/section-card.svelte';

	interface Props {
		state: InteractionState;
	}

	let { state }: Props = $props();
</script>

<SectionCard title="Selected state" subtitle={state.id}>
	<div class="flex flex-col gap-3">
		{#if state.screenshot}
			<img
				src={state.screenshot}
				alt="State screenshot"
				class="w-full rounded border object-contain"
				style="border-color: var(--panel-border); max-height: 180px;"
			/>
		{/if}

		<dl class="grid grid-cols-2 gap-1.5 text-[11px]">
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Trigger</dt>
				<dd class="text-[var(--panel-text)]">{state.triggerLabel}</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Depth</dt>
				<dd class="text-[var(--panel-text)]">{state.depth}</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Signature</dt>
				<dd class="font-mono text-[10px] text-[var(--panel-text-muted)]">{state.signature}</dd>
			</div>
			<div>
				<dt class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
					Discovered
				</dt>
				<dd class="text-[var(--panel-text)]">{new Date(state.discoveredAt).toLocaleString()}</dd>
			</div>
		</dl>

		{#if state.result.issues.length > 0}
			<div>
				<div
					class="mb-1.5 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
				>
					Issues
				</div>
				<ul class="flex max-h-48 flex-col gap-1 overflow-y-auto">
					{#each state.result.issues.slice(0, 40) as issue (issue.id)}
						<li
							class="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px]"
							style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
						>
							<span
								class="inline-block h-1.5 w-1.5 rounded-full"
								style="background-color: {issue.status === 'fail'
									? 'var(--status-fail)'
									: issue.status === 'warning'
										? 'var(--status-warning)'
										: 'var(--status-pass)'};"
							></span>
							<span class="font-mono text-[9px] text-[var(--panel-text-muted)]">{issue.wcag}</span>
							<span class="truncate text-[var(--panel-text)]"
								>{CRITERION_META[issue.wcag]?.title}</span
							>
							<code
								class="ml-auto rounded px-1 text-[9px]"
								style="background-color: var(--panel-code-bg); color: var(--panel-text);"
							>
								&lt;{issue.tag}&gt;
							</code>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</SectionCard>
