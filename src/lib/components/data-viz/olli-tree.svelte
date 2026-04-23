<script lang="ts">
	import type { OlliNode } from '../../data-viz/types.ts';

	interface Props {
		root: OlliNode;
	}

	let { root }: Props = $props();

	interface FlatItem {
		id: string;
		node: OlliNode;
		depth: number;
		parentId: string | null;
		posinset: number;
		setsize: number;
	}

	const expandedIds = $state<Set<string>>(new Set());
	let focusedId = $state<string>('');
	let treeEl: HTMLUListElement | undefined = $state();

	$effect(() => {
		if (!expandedIds.has(root.id)) expandedIds.add(root.id);
		if (!focusedId) focusedId = root.id;
	});

	function flatten(root: OlliNode): FlatItem[] {
		const out: FlatItem[] = [];
		function walk(
			node: OlliNode,
			depth: number,
			parentId: string | null,
			pos: number,
			size: number
		): void {
			out.push({ id: node.id, node, depth, parentId, posinset: pos, setsize: size });
			if (expandedIds.has(node.id) && node.children.length > 0) {
				node.children.forEach((child, i) => {
					walk(child, depth + 1, node.id, i + 1, node.children.length);
				});
			}
		}
		walk(root, 0, null, 1, 1);
		return out;
	}

	const visible = $derived(flatten(root));

	function focusId(id: string) {
		focusedId = id;
		requestAnimationFrame(() => {
			const el = treeEl?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`);
			el?.focus();
		});
	}

	function toggleExpanded(id: string, node: OlliNode) {
		if (node.children.length === 0) return;
		if (expandedIds.has(id)) expandedIds.delete(id);
		else expandedIds.add(id);
	}

	function onKey(e: KeyboardEvent, item: FlatItem) {
		const list = visible;
		const idx = list.findIndex((i) => i.id === item.id);
		if (idx < 0) return;

		switch (e.key) {
			case 'ArrowDown': {
				e.preventDefault();
				const next = list[idx + 1];
				if (next) focusId(next.id);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				const prev = list[idx - 1];
				if (prev) focusId(prev.id);
				break;
			}
			case 'ArrowRight': {
				e.preventDefault();
				if (item.node.children.length > 0) {
					if (!expandedIds.has(item.id)) {
						expandedIds.add(item.id);
					} else {
						const firstChild = item.node.children[0];
						if (firstChild) focusId(firstChild.id);
					}
				}
				break;
			}
			case 'ArrowLeft': {
				e.preventDefault();
				if (item.node.children.length > 0 && expandedIds.has(item.id)) {
					expandedIds.delete(item.id);
				} else if (item.parentId) {
					focusId(item.parentId);
				}
				break;
			}
			case 'Home': {
				e.preventDefault();
				if (list[0]) focusId(list[0].id);
				break;
			}
			case 'End': {
				e.preventDefault();
				const last = list[list.length - 1];
				if (last) focusId(last.id);
				break;
			}
			case 'Enter':
			case ' ': {
				e.preventDefault();
				toggleExpanded(item.id, item.node);
				break;
			}
		}
	}

	const roleColor: Record<OlliNode['role'], string> = {
		root: 'var(--viz-info)',
		axis: 'var(--viz-accent)',
		category: 'var(--viz-cat-3)',
		series: 'var(--viz-cat-2)',
		mark: 'var(--viz-muted)',
		summary: 'var(--viz-ok)'
	};
</script>

<ul
	bind:this={treeEl}
	role="tree"
	aria-label="Chart structure"
	class="flex flex-col"
>
	{#each visible as item (item.id)}
		{@const isExpanded = expandedIds.has(item.id)}
		{@const isFocused = focusedId === item.id}
		<li
			role="treeitem"
			tabindex={isFocused ? 0 : -1}
			aria-level={item.depth + 1}
			aria-posinset={item.posinset}
			aria-setsize={item.setsize}
			aria-selected={isFocused}
			aria-expanded={item.node.children.length > 0 ? isExpanded : undefined}
			aria-label={`${item.node.role}: ${item.node.label}${item.node.description ? ' — ' + item.node.description : ''}`}
			data-node-id={item.id}
			onkeydown={(e) => onKey(e, item)}
			onfocus={() => (focusedId = item.id)}
			onclick={(e) => {
				e.stopPropagation();
				focusedId = item.id;
				toggleExpanded(item.id, item.node);
			}}
			class="flex cursor-pointer items-start gap-1.5 rounded px-1.5 py-0.5 text-[11px] outline-none hover:bg-[var(--panel-hover)] focus:bg-[var(--panel-selected)]"
			style:padding-left="{item.depth * 14 + 6}px"
		>
			<span class="mt-0.5 inline-block w-2 text-[var(--panel-text-subtle)]" aria-hidden="true">
				{item.node.children.length > 0 ? (isExpanded ? '▾' : '▸') : ''}
			</span>
			<span
				class="mt-0.5 rounded px-1 text-[9px] font-bold tracking-wide uppercase"
				style="background-color: color-mix(in srgb, {roleColor[
					item.node.role
				]} 15%, transparent); color: {roleColor[item.node.role]};"
			>
				{item.node.role}
			</span>
			<span class="min-w-0 flex-1">
				<span class="font-medium text-[var(--panel-text)]">{item.node.label}</span>
				{#if item.node.description}
					<span class="ml-1 text-[10px] text-[var(--panel-text-muted)]"
						>{item.node.description}</span
					>
				{/if}
			</span>
		</li>
	{/each}
</ul>
