<script lang="ts">
	import type { AxTreeDiff, DiffKind } from '../../ax-tree/types.ts';

	interface Props {
		diff: AxTreeDiff;
	}

	let { diff }: Props = $props();

	const entries: { key: DiffKind; label: string; color: string }[] = [
		{ key: 'match', label: 'Matches', color: 'var(--viz-ok)' },
		{ key: 'missing-in-ax', label: 'Missing in AX', color: 'var(--viz-bad)' },
		{ key: 'extra-in-ax', label: 'Extra in AX', color: 'var(--viz-warn)' },
		{ key: 'role-mismatch', label: 'Role mismatch', color: 'var(--viz-bad)' },
		{ key: 'name-missing', label: 'Name missing', color: 'var(--viz-warn)' },
		{ key: 'order-drift', label: 'Order drift', color: 'var(--viz-accent)' }
	];
</script>

<div class="grid grid-cols-3 gap-2 md:grid-cols-6">
	{#each entries as e (e.key)}
		<div
			class="rounded-md border p-2 text-center"
			style="border-color: color-mix(in srgb, {e.color} 45%, var(--panel-border)); background-color: color-mix(in srgb, {e.color} 8%, var(--panel-bg-elevated));"
		>
			<div class="text-base font-bold tabular-nums" style="color: {e.color};">
				{diff.summary[e.key]}
			</div>
			<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
				{e.label}
			</div>
		</div>
	{/each}
</div>
