<script lang="ts">
	import type { AxTreeDiff, DiffKind } from '../../ax-tree/types.ts';

	interface Props {
		diff: AxTreeDiff;
		filter: Set<DiffKind>;
		query: string;
		onfilterchange: (next: Set<DiffKind>) => void;
		onquerychange: (next: string) => void;
	}

	let { diff, filter, query, onfilterchange, onquerychange }: Props = $props();

	const entries: { key: DiffKind; label: string; glyph: string; color: string }[] = [
		{ key: 'match', label: 'Match', glyph: '✓', color: 'var(--viz-ok)' },
		{ key: 'missing-in-ax', label: 'Missing in AX', glyph: '−', color: 'var(--viz-bad)' },
		{ key: 'extra-in-ax', label: 'Extra in AX', glyph: '+', color: 'var(--viz-warn)' },
		{ key: 'role-mismatch', label: 'Role mismatch', glyph: '≠', color: 'var(--viz-bad)' },
		{ key: 'name-missing', label: 'Name missing', glyph: '!', color: 'var(--viz-warn)' },
		{ key: 'order-drift', label: 'Order drift', glyph: '⇅', color: 'var(--viz-accent)' }
	];

	function toggle(kind: DiffKind) {
		const next = new Set(filter);
		if (next.has(kind)) next.delete(kind);
		else next.add(kind);
		onfilterchange(next);
	}

	function clearFilter() {
		onfilterchange(new Set());
		onquerychange('');
	}

	const activeCount = $derived(filter.size);
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-1.5">
		{#each entries as e (e.key)}
			{@const active = filter.has(e.key)}
			{@const count = diff.summary[e.key]}
			<button
				type="button"
				onclick={() => toggle(e.key)}
				disabled={count === 0}
				class="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
				style:border-color={active
					? e.color
					: `color-mix(in srgb, ${e.color} 35%, var(--panel-border))`}
				style:background-color={active
					? `color-mix(in srgb, ${e.color} 18%, var(--panel-bg-elevated))`
					: 'var(--panel-bg-elevated)'}
				style:color={active ? e.color : 'var(--panel-text)'}
				aria-pressed={active}
				title="{e.label}: {count}"
			>
				<span
					class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold"
					style:background-color={e.color}
					style:color="white"
				>{e.glyph}</span>
				<span class="tracking-wide uppercase">{e.label}</span>
				<span class="tabular-nums" style:color={active ? e.color : 'var(--panel-text-muted)'}>
					{count}
				</span>
			</button>
		{/each}
		{#if activeCount > 0 || query.length > 0}
			<button
				type="button"
				onclick={clearFilter}
				class="ml-auto rounded px-2 py-0.5 text-[10px] text-[var(--panel-text-muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--panel-text)]"
			>
				Clear
			</button>
		{/if}
	</div>

	<div class="relative">
		<input
			type="search"
			placeholder="Search role, name, tag, path…"
			value={query}
			oninput={(e) => onquerychange((e.currentTarget as HTMLInputElement).value)}
			class="w-full rounded-md border px-2.5 py-1 text-[11px] outline-none transition-colors focus:border-[var(--panel-primary)]"
			style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated); color: var(--panel-text);"
		/>
	</div>
</div>
