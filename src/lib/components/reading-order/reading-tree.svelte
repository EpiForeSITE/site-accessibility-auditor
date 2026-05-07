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
	} from '../../reading-order/hierarchy-adapter.ts';
	import type { DiffKind, DiffPair, TreeNode } from '../../reading-order/types.ts';

	interface Props {
		forest: TreeNode[];
		filter: Set<DiffKind>;
		query: string;
		selectedKey: string | null;
		followSelection: boolean;
		fitVersion: number;
		showTabPath: boolean;
		onselect: (pair: DiffPair, key: string) => void;
	}

	let {
		forest,
		filter,
		query,
		selectedKey,
		followSelection,
		fitVersion,
		showTabPath,
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
		const treeLayout = tree<HierNode>().nodeSize([26, 200]);
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

	/**
	 * Precompute node-link curves that connect consecutive tab steps so the
	 * keyboard traversal is visible inside the tree context.
	 */
	const tabPathSegments = $derived.by<{ d: string; fromKey: string; toKey: string; drift: boolean }[]>(() => {
		if (!showTabPath) return [];
		const withTab = nodes
			.filter((n) => !n.data.isSynthetic && n.data.pair && n.data.pair.entry.tabIndex !== null)
			.sort(
				(a, b) =>
					(a.data.pair!.entry.tabIndex ?? 0) - (b.data.pair!.entry.tabIndex ?? 0)
			);
		const segs: { d: string; fromKey: string; toKey: string; drift: boolean }[] = [];
		for (let i = 0; i < withTab.length - 1; i++) {
			const a = withTab[i];
			const b = withTab[i + 1];
			const drift =
				a.data.pair?.kind === 'tab-break' ||
				b.data.pair?.kind === 'tab-break' ||
				a.data.pair?.kind === 'positive-tabindex' ||
				b.data.pair?.kind === 'positive-tabindex';
			const mx = (a.y + b.y) / 2;
			segs.push({
				d: `M${a.y},${a.x} C${mx},${a.x} ${mx},${b.x} ${b.y},${b.x}`,
				fromKey: a.data.key,
				toKey: b.data.key,
				drift
			});
		}
		return segs;
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
		const contentW = Math.max(1, maxY - minY + 200);
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
	aria-label="Reading order tree"
>
	{#if showTabPath}
		<div
			class="absolute top-1.5 left-1.5 z-10 flex items-center gap-2 rounded border px-1.5 py-0.5 text-[9px]"
			style="border-color: var(--panel-border); background-color: var(--panel-bg);"
			aria-label="Tab path legend"
		>
			<span class="font-semibold tracking-wide uppercase" style:color="var(--panel-text-subtle)"
				>Tab</span
			>
			<span class="flex items-center gap-1" style:color="var(--panel-text-muted)">
				<span
					class="inline-flex h-3 w-3 items-center justify-center rounded text-[7px] font-bold text-white"
					style:background-color="var(--viz-accent)">1</span
				>
				step
			</span>
			<span class="flex items-center gap-1" style:color="var(--panel-text-muted)">
				<svg width="16" height="6" aria-hidden="true"
					><line
						x1="1"
						y1="3"
						x2="15"
						y2="3"
						stroke="var(--viz-accent)"
						stroke-width="1.5"
						stroke-dasharray="3 2"
					/></svg
				>
				path
			</span>
			<span class="flex items-center gap-1" style:color="var(--panel-text-muted)">
				<svg width="16" height="6" aria-hidden="true"
					><line
						x1="1"
						y1="3"
						x2="15"
						y2="3"
						stroke="var(--viz-bad)"
						stroke-width="1.5"
						stroke-dasharray="3 2"
					/></svg
				>
				break
			</span>
		</div>
	{/if}
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
			aria-label="Zoom out">−</button
		>
		<span class="tabular-nums" style:color="var(--panel-text-muted)"
			>{Math.round(scale * 100)}%</span
		>
		<button
			type="button"
			class="rounded px-1 hover:bg-[var(--panel-hover)]"
			onclick={() => {
				smooth = true;
				scale = Math.min(3, scale * 1.18);
			}}
			aria-label="Zoom in">+</button
		>
		<button
			type="button"
			class="rounded px-1 hover:bg-[var(--panel-hover)]"
			onclick={fitToContent}
			aria-label="Fit to view"
			title="Fit visible nodes">Fit</button
		>
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

			{#if showTabPath}
				<g fill="none">
					{#each tabPathSegments as seg (seg.fromKey + '|' + seg.toKey)}
						<path
							d={seg.d}
							stroke={seg.drift ? 'var(--viz-bad)' : 'var(--viz-accent)'}
							stroke-width="1.25"
							stroke-dasharray="4 3"
							opacity="0.55"
						/>
					{/each}
				</g>
			{/if}

			<g>
				{#each nodes as n (n.data.key)}
					{#if !n.data.isSynthetic}
						{@const color = kindColor(n.data.pair?.kind)}
						{@const selected = n.data.key === selectedKey}
						{@const dimmed = isDimmed(n)}
						{@const tabIdx = n.data.pair?.entry.tabIndex ?? null}
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
							{#if tabIdx !== null}
								<g transform="translate(-14, -11)">
									<rect
										x="-8"
										y="-6"
										width="16"
										height="12"
										rx="4"
										fill="var(--viz-accent)"
										opacity="0.85"
									/>
									<text
										x="0"
										y="2.5"
										font-size="8"
										text-anchor="middle"
										fill="white"
										font-weight="700"
										font-family="ui-monospace, monospace">{tabIdx + 1}</text
									>
								</g>
							{/if}
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
		{@const entry = hovered.data.pair.entry}
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
					>{entry.ax?.role ?? entry.visual?.explicitRole ?? entry.tag}</span
				>
				<code
					class="rounded px-1 text-[9px]"
					style="background-color: var(--panel-code-bg); color: var(--panel-text-muted);"
					>&lt;{entry.tag}&gt;</code
				>
				{#if entry.tabIndex !== null}
					<span
						class="rounded px-1 text-[9px] font-bold"
						style="background-color: color-mix(in srgb, var(--viz-accent) 22%, transparent); color: var(--viz-accent);"
						>⌨ {entry.tabIndex + 1}</span
					>
				{/if}
			</div>
			<div class="mt-0.5 text-[10px]" style:color="var(--panel-text)">
				{entry.ax?.name || entry.visual?.text || '(no name)'}
			</div>
		</div>
	{/if}
</div>
