<script lang="ts">
	import type { DiffKind, TreeNode } from '../../ax-tree/types.ts';

	interface Props {
		node: TreeNode;
		selected: boolean;
		hasChildren: boolean;
		expanded: boolean;
		indent: number;
		ontoggle: () => void;
		onselect: () => void;
	}

	let { node, selected, hasChildren, expanded, indent, ontoggle, onselect }: Props = $props();

	const kindMeta: Record<DiffKind, { color: string; glyph: string; label: string }> = {
		match: { color: 'var(--viz-ok)', glyph: '✓', label: 'match' },
		'missing-in-ax': { color: 'var(--viz-bad)', glyph: '−', label: 'missing in AX' },
		'extra-in-ax': { color: 'var(--viz-warn)', glyph: '+', label: 'extra in AX' },
		'role-mismatch': { color: 'var(--viz-bad)', glyph: '≠', label: 'role mismatch' },
		'name-missing': { color: 'var(--viz-warn)', glyph: '!', label: 'name missing' },
		'order-drift': { color: 'var(--viz-accent)', glyph: '⇅', label: 'order drift' }
	};

	const meta = $derived(kindMeta[node.pair.kind]);
	const ax = $derived(node.pair.ax);
	const visual = $derived(node.pair.visual);
	const role = $derived(ax?.role ?? visual?.role ?? visual?.tag ?? '?');
	const tag = $derived(ax?.tag ?? visual?.tag ?? '');
	const nameText = $derived(
		(ax?.name && ax.name.length > 0 ? ax.name : visual?.text) || ''
	);
	const delta = $derived(node.readingOrderDelta);
</script>

<div
	class="group flex items-stretch text-[11px] transition-colors"
	class:opacity-80={node.isGhost}
	style:background-color={selected ? 'var(--panel-selected)' : 'transparent'}
>
	<button
		type="button"
		onclick={onselect}
		class="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-1 text-left hover:bg-[var(--panel-hover)]"
		style:padding-left={`${indent}px`}
	>
		<span
			class="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-sm text-[9px] text-[var(--panel-text-muted)]"
			onclick={(e) => {
				e.stopPropagation();
				if (hasChildren) ontoggle();
			}}
			role="button"
			tabindex="-1"
			aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : ''}
			style:cursor={hasChildren ? 'pointer' : 'default'}
			style:visibility={hasChildren ? 'visible' : 'hidden'}
			onkeydown={(e) => {
				if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
					e.preventDefault();
					e.stopPropagation();
					ontoggle();
				}
			}}
		>
			{expanded ? '▾' : '▸'}
		</span>

		<span
			class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
			style:background-color={meta.color}
			title={meta.label}
			aria-label={meta.label}
		>
			{meta.glyph}
		</span>

		{#if node.isGhost}
			<code
				class="rounded border border-dashed px-1 text-[9px]"
				style="border-color: var(--viz-bad); color: var(--viz-bad); background-color: transparent;"
			>&lt;{tag}&gt;</code>
		{:else}
			<span
				class="shrink-0 rounded px-1 text-[9px] font-bold tracking-wide uppercase"
				style="background-color: color-mix(in srgb, var(--viz-accent) 14%, transparent); color: var(--viz-accent);"
			>
				{role}
			</span>
			{#if tag}
				<code
					class="shrink-0 rounded px-1 text-[9px]"
					style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
				>&lt;{tag}&gt;</code>
			{/if}
		{/if}

		<span class="truncate" style:color="var(--panel-text)">
			{#if nameText}
				{nameText}
			{:else}
				<span class="italic" style:color="var(--panel-text-subtle)">
					{node.isGhost ? '(not in accessibility tree)' : '(no name)'}
				</span>
			{/if}
		</span>

		{#if delta !== null && delta !== 0}
			<span
				class="ml-auto shrink-0 rounded px-1 text-[9px] font-semibold tabular-nums"
				style="background-color: color-mix(in srgb, var(--viz-accent) 16%, transparent); color: var(--viz-accent);"
				title="Visual reading order differs from AX order by {delta}"
			>
				{delta > 0 ? '↓' : '↑'}{Math.abs(delta)}
			</span>
		{/if}
	</button>
</div>
