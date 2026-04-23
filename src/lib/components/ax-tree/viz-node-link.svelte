<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { hierarchy, tree, linkHorizontal } from '../../shared/d3-registry.ts';
	import type { HierarchyPointNode } from '../../shared/d3-registry.ts';
	import {
		toHierarchyRoot,
		kindColor,
		nodeMatchesFilter,
		nodeMatchesQuery,
		shortLabel,
		type HierNode
	} from '../../ax-tree/hierarchy-adapter.ts';
	import type { DiffKind, DiffPair, TreeNode } from '../../ax-tree/types.ts';

	interface Props {
		forest: TreeNode[];
		filter: Set<DiffKind>;
		query: string;
		selectedKey: string | null;
		followSelection: boolean;
		fitVersion: number;
		onselect: (pair: DiffPair, key: string) => void;
	}

	let {
		forest,
		filter,
		query,
		selectedKey,
		followSelection,
		fitVersion,
		onselect
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let width = $state(600);
	let height = $state(400);
	let tx = $state(40);
	let ty = $state(0);
	let scale = $state(1);
	let smooth = $state(false);
	let panning = $state(false);
	let panStart = { x: 0, y: 0, tx: 0, ty: 0 };
	let hovered = $state<HierarchyPointNode<HierNode> | null>(null);
	let hoverPos = $state({ x: 0, y: 0 });

	onMount(() => {
		if (!container) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				width = e.contentRect.width;
				height = Math.max(240, e.contentRect.height);
			}
		});
		ro.observe(container);
		return () => ro.disconnect();
	});

	const layout = $derived.by(() => {
		const root = toHierarchyRoot(forest);
		const h = hierarchy(root, (d) => d.children);
		const treeLayout = tree<HierNode>().nodeSize([24, 180]);
		return treeLayout(h);
	});

	const nodes = $derived(layout.descendants());
	const links = $derived(layout.links());

	const linkGen = linkHorizontal<unknown, { x: number; y: number }>()
		.x((d) => d.y)
		.y((d) => d.x);

	function isHighlighted(hn: HierarchyPointNode<HierNode>): boolean {
		if (hn.data.isSynthetic) return false;
		return nodeMatchesFilter(hn.data, filter) && nodeMatchesQuery(hn.data, query);
	}

	function isDimmed(hn: HierarchyPointNode<HierNode>): boolean {
		if (filter.size === 0 && !query) return false;
		if (hn.data.isSynthetic) return false;
		return !isHighlighted(hn);
	}

	const selectedAncestors = $derived.by(() => {
		const set = new Set<string>();
		if (!selectedKey) return set;
		const selected = nodes.find((n) => n.data.key === selectedKey);
		if (!selected) return set;
		let cur: HierarchyPointNode<HierNode> | null = selected;
		while (cur) {
			set.add(cur.data.key);
			cur = cur.parent ?? null;
		}
		return set;
	});

	function handleNodeClick(hn: HierarchyPointNode<HierNode>) {
		if (hn.data.isSynthetic || !hn.data.pair) return;
		onselect(hn.data.pair, hn.data.key);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		smooth = false;
		const delta = -e.deltaY * 0.001;
		const nextScale = Math.max(0.2, Math.min(3, scale * (1 + delta)));
		if (!container) {
			scale = nextScale;
			return;
		}
		const rect = container.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const ratio = nextScale / scale;
		tx = cx - (cx - tx) * ratio;
		ty = cy - (cy - ty) * ratio;
		scale = nextScale;
	}

	function handlePointerDown(e: PointerEvent) {
		if ((e.target as Element).closest('[data-node]')) return;
		panning = true;
		smooth = false;
		panStart = { x: e.clientX, y: e.clientY, tx, ty };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (panning) {
			tx = panStart.tx + (e.clientX - panStart.x);
			ty = panStart.ty + (e.clientY - panStart.y);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (panning) {
			panning = false;
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		}
	}

	function handleNodeHover(hn: HierarchyPointNode<HierNode>, e: PointerEvent) {
		if (hn.data.isSynthetic) return;
		hovered = hn;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		hoverPos = { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 };
	}

	function clearHover() {
		hovered = null;
	}

	function visibleNodes(): HierarchyPointNode<HierNode>[] {
		const hasFilter = filter.size > 0 || query.length > 0;
		if (!hasFilter) return nodes.filter((n) => !n.data.isSynthetic);
		const matching = nodes.filter((n) => !n.data.isSynthetic && isHighlighted(n));
		if (matching.length === 0) return nodes.filter((n) => !n.data.isSynthetic);
		const keep = new Set<string>();
		for (const m of matching) {
			let cur: HierarchyPointNode<HierNode> | null = m;
			while (cur) {
				keep.add(cur.data.key);
				cur = cur.parent ?? null;
			}
		}
		return nodes.filter((n) => keep.has(n.data.key) && !n.data.isSynthetic);
	}

	function fitToContent() {
		if (width <= 0 || height <= 0) return;
		const vis = visibleNodes();
		if (vis.length === 0) return;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const n of vis) {
			if (n.x < minX) minX = n.x;
			if (n.x > maxX) maxX = n.x;
			if (n.y < minY) minY = n.y;
			if (n.y > maxY) maxY = n.y;
		}
		const padX = 24;
		const padY = 32;
		const contentW = Math.max(1, maxY - minY + 160);
		const contentH = Math.max(1, maxX - minX + 16);
		const nextScale = Math.max(
			0.2,
			Math.min(1, (width - padX * 2) / contentW, (height - padY * 2) / contentH)
		);
		const cx = (minY + maxY) / 2;
		const cy = (minX + maxX) / 2;
		smooth = true;
		scale = nextScale;
		tx = width / 2 - cx * nextScale;
		ty = height / 2 - cy * nextScale;
	}

	function fitToSelection() {
		if (!selectedKey) return;
		const sel = nodes.find((n) => n.data.key === selectedKey && !n.data.isSynthetic);
		if (!sel) return;
		smooth = true;
		const nextScale = Math.max(scale, 0.9);
		scale = nextScale;
		tx = width / 2 - sel.y * nextScale;
		ty = height / 2 - sel.x * nextScale;
	}

	$effect(() => {
		void fitVersion;
		void forest;
		void filter;
		void query;
		void width;
		void height;
		untrack(() => {
			fitToContent();
		});
	});

	$effect(() => {
		void selectedKey;
		if (!followSelection) return;
		untrack(() => {
			fitToSelection();
		});
	});
</script>

<div
	bind:this={container}
	class="relative h-full w-full overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	role="application"
	aria-label="Accessibility tree node-link diagram"
>
	<div
		class="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded border px-1 py-0.5 text-[9px] font-semibold"
		style="border-color: var(--panel-border); background-color: var(--panel-bg);"
	>
		<button
			type="button"
			class="rounded px-1 hover:bg-[var(--panel-hover)]"
			onclick={() => {
				smooth = true;
				scale = Math.max(0.2, scale * 0.85);
			}}
			aria-label="Zoom out"
		>−</button>
		<span class="tabular-nums" style:color="var(--panel-text-muted)">{Math.round(scale * 100)}%</span>
		<button
			type="button"
			class="rounded px-1 hover:bg-[var(--panel-hover)]"
			onclick={() => {
				smooth = true;
				scale = Math.min(3, scale * 1.18);
			}}
			aria-label="Zoom in"
		>+</button>
		<button
			type="button"
			class="rounded px-1 hover:bg-[var(--panel-hover)]"
			onclick={fitToContent}
			aria-label="Fit to view"
			title="Fit visible nodes"
		>Fit</button>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		{width}
		{height}
		role="presentation"
		class="block h-full w-full"
		style:cursor={panning ? 'grabbing' : 'grab'}
		onwheel={handleWheel}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onpointerleave={clearHover}
	>
		<g
			transform={`translate(${tx},${ty}) scale(${scale})`}
			style:transition={smooth ? 'transform 250ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none'}
		>
			<g stroke="var(--viz-link)" fill="none">
				{#each links as link (link.target.data.key)}
					{@const onPath =
						selectedAncestors.has(link.source.data.key) &&
						selectedAncestors.has(link.target.data.key)}
					{@const d = linkGen({ source: link.source, target: link.target })}
					<path
						d={d ?? ''}
						stroke={onPath ? 'var(--panel-primary)' : 'var(--viz-link)'}
						stroke-width={onPath ? 2 : 1}
						opacity={isDimmed(link.target) ? 0.15 : 1}
						stroke-dasharray={link.target.data.isGhost ? '3 3' : '0'}
					/>
				{/each}
			</g>

			<g>
				{#each nodes as n (n.data.key)}
					{#if !n.data.isSynthetic}
						{@const color = kindColor(n.data.pair?.kind)}
						{@const selected = n.data.key === selectedKey}
						{@const dimmed = isDimmed(n)}
						<g
							data-node
							transform={`translate(${n.y},${n.x})`}
							class="cursor-pointer"
							opacity={dimmed ? 0.3 : 1}
							onclick={() => handleNodeClick(n)}
							onpointermove={(e) => handleNodeHover(n, e)}
							onpointerleave={clearHover}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleNodeClick(n);
								}
							}}
							aria-label={shortLabel(n.data)}
						>
							<circle
								r={selected ? 7 : 5}
								fill={n.data.isGhost ? 'transparent' : color}
								stroke={selected ? 'var(--panel-primary)' : color}
								stroke-width={selected ? 2.5 : 1.5}
								stroke-dasharray={n.data.isGhost ? '3 2' : '0'}
							/>
							<text
								x={10}
								y={3.5}
								font-size="10"
								fill="var(--panel-text)"
								font-weight={selected ? 600 : 400}
							>
								{shortLabel(n.data, 22)}
							</text>
						</g>
					{/if}
				{/each}
			</g>
		</g>
	</svg>

	{#if hovered && hovered.data.pair}
		{@const ax = hovered.data.pair.ax}
		{@const visual = hovered.data.pair.visual}
		<div
			class="pointer-events-none absolute z-20 max-w-xs rounded border px-2 py-1 text-[10px] shadow-md"
			style:left={`${hoverPos.x}px`}
			style:top={`${hoverPos.y}px`}
			style="border-color: var(--panel-border); background-color: var(--panel-bg); color: var(--panel-text);"
		>
			<div class="flex items-center gap-1">
				<span
					class="inline-block h-2 w-2 rounded-full"
					style:background-color={kindColor(hovered.data.pair.kind)}
				></span>
				<span
					class="rounded px-1 text-[9px] font-bold tracking-wide uppercase"
					style="background-color: color-mix(in srgb, var(--viz-accent) 14%, transparent); color: var(--viz-accent);"
				>{ax?.role ?? visual?.role ?? visual?.tag ?? '?'}</span>
				<code
					class="rounded px-1 text-[9px]"
					style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
				>&lt;{ax?.tag ?? visual?.tag ?? '?'}&gt;</code>
			</div>
			<div class="mt-0.5 text-[10px]" style:color="var(--panel-text)">
				{ax?.name || visual?.text || '(no name)'}
			</div>
		</div>
	{/if}
</div>
