<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { kindColor, shortLabel } from '../../ax-tree/hierarchy-adapter.ts';
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
	let width = $state(400);
	let height = $state(400);
	let hoveredKey = $state<string | null>(null);
	let hoverPos = $state({ x: 0, y: 0 });

	interface Box {
		x: number;
		y: number;
		w: number;
		h: number;
	}

	let viewBox = $state<Box>({ x: 0, y: 0, w: 1280, h: 800 });
	let animHandle: number | null = null;

	onMount(() => {
		if (!container) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				width = e.contentRect.width;
				height = Math.max(220, e.contentRect.height);
			}
		});
		ro.observe(container);
		return () => {
			ro.disconnect();
			if (animHandle !== null) cancelAnimationFrame(animHandle);
		};
	});

	interface Cell {
		key: string;
		pair: DiffPair;
		x: number;
		y: number;
		w: number;
		h: number;
		depth: number;
		isGhost: boolean;
	}

	const cells = $derived.by<Cell[]>(() => {
		const out: Cell[] = [];
		function walk(node: TreeNode, depth: number) {
			const rect = node.pair.ax?.rect ?? node.pair.visual?.rect ?? null;
			if (rect) {
				out.push({
					key: node.key,
					pair: node.pair,
					x: rect.x,
					y: rect.y,
					w: Math.max(4, rect.width),
					h: Math.max(4, rect.height),
					depth,
					isGhost: node.isGhost
				});
			}
			for (const c of node.children) walk(c, depth + 1);
		}
		for (const root of forest) walk(root, 0);
		return out;
	});

	const fullBounds = $derived.by<Box>(() => {
		let minX = 0;
		let minY = 0;
		let maxX = 1280;
		let maxY = 800;
		for (const c of cells) {
			if (c.x < minX) minX = c.x;
			if (c.y < minY) minY = c.y;
			if (c.x + c.w > maxX) maxX = c.x + c.w;
			if (c.y + c.h > maxY) maxY = c.y + c.h;
		}
		return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
	});

	// Clamp width/height to avoid transient negative values during chained
	// animations that would make the browser reject the viewBox attribute.
	const viewBoxStr = $derived(
		`${viewBox.x} ${viewBox.y} ${Math.max(1, viewBox.w)} ${Math.max(1, viewBox.h)}`
	);

	const sortedCells = $derived(
		cells.slice().sort((a, b) => {
			const sizeA = a.w * a.h;
			const sizeB = b.w * b.h;
			return sizeB - sizeA;
		})
	);

	function nodeMatches(pair: DiffPair): boolean {
		if (filter.size > 0 && !filter.has(pair.kind)) return false;
		if (!query) return true;
		const lower = query.toLowerCase();
		const ax = pair.ax;
		const visual = pair.visual;
		const haystack = [ax?.role, ax?.name, ax?.tag, visual?.tag, visual?.text, visual?.role]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return haystack.includes(lower);
	}

	function handleClick(cell: Cell) {
		onselect(cell.pair, cell.key);
	}

	function handleHover(cell: Cell, e: PointerEvent) {
		hoveredKey = cell.key;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		hoverPos = { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 };
	}

	function clearHover() {
		hoveredKey = null;
	}

	const hoveredCell = $derived(cells.find((c) => c.key === hoveredKey) ?? null);

	function animateTo(target: Box, duration = 260) {
		if (animHandle !== null) cancelAnimationFrame(animHandle);
		const start = { ...viewBox };
		const t0 = performance.now();
		const ease = (t: number) => 1 - Math.pow(1 - t, 3);
		const step = (now: number) => {
			const t = Math.min(1, (now - t0) / duration);
			const e = ease(t);
			viewBox = {
				x: start.x + (target.x - start.x) * e,
				y: start.y + (target.y - start.y) * e,
				w: start.w + (target.w - start.w) * e,
				h: start.h + (target.h - start.h) * e
			};
			if (t < 1) {
				animHandle = requestAnimationFrame(step);
			} else {
				animHandle = null;
			}
		};
		animHandle = requestAnimationFrame(step);
	}

	function padBox(b: Box, padPct: number, minPad = 0): Box {
		const padX = Math.max(minPad, b.w * padPct);
		const padY = Math.max(minPad, b.h * padPct);
		return { x: b.x - padX, y: b.y - padY, w: b.w + padX * 2, h: b.h + padY * 2 };
	}

	function fitToVisible() {
		const visible = cells.filter((c) => nodeMatches(c.pair));
		const source = visible.length > 0 ? visible : cells;
		if (source.length === 0) {
			animateTo(fullBounds);
			return;
		}
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const c of source) {
			if (c.x < minX) minX = c.x;
			if (c.y < minY) minY = c.y;
			if (c.x + c.w > maxX) maxX = c.x + c.w;
			if (c.y + c.h > maxY) maxY = c.y + c.h;
		}
		animateTo(
			padBox(
				{ x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) },
				0.04,
				8
			)
		);
	}

	function fitToActualBounds() {
		animateTo(fullBounds);
	}

	function fitToSelection() {
		if (!selectedKey) return;
		const sel = cells.find((c) => c.key === selectedKey);
		if (!sel) return;
		const padding = Math.max(sel.w, sel.h, 120);
		animateTo({
			x: sel.x - padding,
			y: sel.y - padding,
			w: sel.w + padding * 2,
			h: sel.h + padding * 2
		});
	}

	$effect(() => {
		void fitVersion;
		void forest;
		void filter;
		void query;
		untrack(() => {
			fitToVisible();
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
	class="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	role="application"
	aria-label="Page wireframe"
>
	<div
		class="flex shrink-0 items-center justify-between border-b px-2 py-1 text-[9px] font-bold tracking-wide uppercase"
		style="border-color: var(--panel-border); color: var(--panel-text-muted);"
	>
		<span>Page layout</span>
		<div class="flex items-center gap-1 normal-case">
			<span class="tabular-nums" style:color="var(--panel-text-muted)">{cells.length} rects</span>
			<button
				type="button"
				class="ml-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border); color: var(--panel-text);"
				onclick={fitToVisible}
				title="Fit visible cells"
			>Fit</button>
			<button
				type="button"
				class="rounded border px-1.5 py-0.5 text-[9px] font-semibold hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border); color: var(--panel-text);"
				onclick={fitToActualBounds}
				title="Show entire page"
			>1:1</button>
		</div>
	</div>

	<div class="relative min-h-0 flex-1 overflow-hidden">
		<svg
			viewBox={viewBoxStr}
			preserveAspectRatio="xMidYMid meet"
			class="block h-full w-full"
			style="background-color: var(--panel-bg);"
		>
			<rect
				x={fullBounds.x}
				y={fullBounds.y}
				width={fullBounds.w}
				height={fullBounds.h}
				fill="transparent"
				stroke="var(--viz-grid)"
				stroke-width="2"
			/>

			{#each sortedCells as cell (cell.key)}
				{@const color = kindColor(cell.pair.kind)}
				{@const selected = cell.key === selectedKey}
				{@const highlight = nodeMatches(cell.pair)}
				{@const dimmed = (filter.size > 0 || query.length > 0) && !highlight}
				<g
					class="cursor-pointer"
					opacity={dimmed ? 0.12 : 1}
					onclick={() => handleClick(cell)}
					onpointermove={(e) => handleHover(cell, e)}
					onpointerleave={clearHover}
					role="button"
					tabindex="0"
					aria-label={shortLabel({
						key: cell.key,
						pair: cell.pair,
						children: [],
						depth: cell.depth,
						isSynthetic: false,
						isGhost: cell.isGhost
					})}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleClick(cell);
						}
					}}
				>
					<rect
						x={cell.x}
						y={cell.y}
						width={cell.w}
						height={cell.h}
						fill={cell.isGhost ? 'transparent' : `color-mix(in srgb, ${color} 22%, transparent)`}
						stroke={selected ? 'var(--panel-primary)' : color}
						stroke-width={selected ? 3 : 1.2}
						stroke-dasharray={cell.isGhost ? '4 3' : '0'}
						vector-effect="non-scaling-stroke"
					/>
				</g>
			{/each}
		</svg>

		{#if hoveredCell}
			{@const ax = hoveredCell.pair.ax}
			{@const visual = hoveredCell.pair.visual}
			<div
				class="pointer-events-none absolute z-20 max-w-xs rounded border px-2 py-1 text-[10px] shadow-md"
				style:left={`${hoverPos.x}px`}
				style:top={`${hoverPos.y}px`}
				style="border-color: var(--panel-border); background-color: var(--panel-bg); color: var(--panel-text);"
			>
				<div class="flex items-center gap-1">
					<span
						class="inline-block h-2 w-2 rounded-full"
						style:background-color={kindColor(hoveredCell.pair.kind)}
					></span>
					<span
						class="rounded px-1 text-[9px] font-bold tracking-wide uppercase"
						style="background-color: color-mix(in srgb, var(--viz-accent) 14%, transparent); color: var(--viz-accent);"
					>{ax?.role ?? visual?.role ?? visual?.tag ?? '?'}</span>
				</div>
				<div class="mt-0.5" style:color="var(--panel-text)">
					{ax?.name || visual?.text || '(no name)'}
				</div>
				<div class="mt-0.5 font-mono text-[9px]" style:color="var(--panel-text-muted)">
					{Math.round(hoveredCell.x)},{Math.round(hoveredCell.y)} ·
					{Math.round(hoveredCell.w)}×{Math.round(hoveredCell.h)}
				</div>
			</div>
		{/if}
	</div>
</div>
