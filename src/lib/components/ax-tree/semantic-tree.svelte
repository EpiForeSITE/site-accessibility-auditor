<script lang="ts">
	import type { DiffKind, DiffPair, TreeNode } from '../../ax-tree/types.ts';
	import { treeContainsNonMatch } from '../../ax-tree/tree-builder.ts';
	import TreeNodeRow from './tree-node-row.svelte';

	interface Props {
		forest: TreeNode[];
		filter: Set<DiffKind>;
		query: string;
		selectedKey: string | null;
		onselect: (pair: DiffPair, key: string) => void;
	}

	let { forest, filter, query, selectedKey, onselect }: Props = $props();

	const defaultExpanded = $derived.by(() => {
		const keys = new Set<string>();
		function walk(node: TreeNode) {
			if (node.children.length === 0) return;
			if (treeContainsNonMatch(node)) keys.add(node.key);
			for (const child of node.children) walk(child);
		}
		for (const n of forest) walk(n);
		return keys;
	});

	let expandOverrides = $state(new Map<string, boolean>());

	function isExpanded(key: string): boolean {
		const override = expandOverrides.get(key);
		if (override !== undefined) return override;
		return defaultExpanded.has(key);
	}

	function toggle(key: string) {
		const next = new Map(expandOverrides);
		next.set(key, !isExpanded(key));
		expandOverrides = next;
	}

	function nodeMatchesQuery(node: TreeNode, q: string): boolean {
		if (!q) return true;
		const lower = q.toLowerCase();
		const ax = node.pair.ax;
		const visual = node.pair.visual;
		const haystack = [
			ax?.role,
			ax?.name,
			ax?.tag,
			ax?.path,
			visual?.tag,
			visual?.text,
			visual?.role,
			visual?.path
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return haystack.includes(lower);
	}

	function nodeMatchesFilter(node: TreeNode): boolean {
		if (filter.size === 0) return true;
		return filter.has(node.pair.kind);
	}

	function computeVisibleSet(): Set<string> {
		const visible = new Set<string>();
		function walk(node: TreeNode, ancestors: TreeNode[]): boolean {
			let hasMatch = false;
			for (const child of node.children) {
				if (walk(child, [...ancestors, node])) hasMatch = true;
			}
			const selfMatches = nodeMatchesFilter(node) && nodeMatchesQuery(node, query);
			if (selfMatches || hasMatch) {
				visible.add(node.key);
				for (const a of ancestors) visible.add(a.key);
				return true;
			}
			return false;
		}
		for (const root of forest) walk(root, []);
		return visible;
	}

	const visibleSet = $derived(computeVisibleSet());

	interface FlatRow {
		node: TreeNode;
		depth: number;
		expanded: boolean;
		hasChildren: boolean;
	}

	function flatten(): FlatRow[] {
		const rows: FlatRow[] = [];
		function walk(node: TreeNode, depth: number) {
			if (!visibleSet.has(node.key)) return;
			const visibleChildren = node.children.filter((c) => visibleSet.has(c.key));
			const hasChildren = visibleChildren.length > 0;
			const expanded = isExpanded(node.key);
			rows.push({ node, depth, expanded, hasChildren });
			if (hasChildren && expanded) {
				for (const child of visibleChildren) walk(child, depth + 1);
			}
		}
		for (const root of forest) walk(root, 0);
		return rows;
	}

	const rows = $derived(flatten());
</script>

<div
	class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<div
		class="flex shrink-0 items-center justify-between border-b px-2 py-1.5 text-[9px] font-bold tracking-wide uppercase"
		style="border-color: var(--panel-border); color: var(--panel-text-muted);"
	>
		<span>Accessibility tree</span>
		<span class="tabular-nums normal-case">
			{rows.length}
			{rows.length === 1 ? 'node' : 'nodes'}
		</span>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if rows.length === 0}
			<div class="px-3 py-6 text-center text-[11px] text-[var(--panel-text-subtle)]">
				No nodes match the current filter.
			</div>
		{:else}
			{#each rows as row (row.node.key)}
				<TreeNodeRow
					node={row.node}
					selected={selectedKey === row.node.key}
					hasChildren={row.hasChildren}
					expanded={row.expanded}
					indent={row.depth * 14 + 4}
					ontoggle={() => toggle(row.node.key)}
					onselect={() => onselect(row.node.pair, row.node.key)}
				/>
			{/each}
		{/if}
	</div>
</div>
