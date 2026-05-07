<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { kindColor, shortLabel } from '../../reading-order/hierarchy-adapter.ts';
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
	let svgEl = $state<SVGSVGElement | null>(null);
	let width = $state(400);
	let height = $state(400);
	let hoveredKey = $state<string | null>(null);
	let hoverPos = $state({ x: 0, y: 0 });
	let panning = $state(false);
	let panStart = { x: 0, y: 0, vbX: 0, vbY: 0 };

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
			const r = node.pair.entry.rect;
			out.push({
				key: node.key,
				pair: node.pair,
				x: r.x,
				y: r.y,
				w: Math.max(4, r.width),
				h: Math.max(4, r.height),
				depth,
				isGhost: node.isGhost
			});
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

	/**
	 * Tabbable cells in tab-order for drawing the focus polyline and badges.
	 */
	const tabPath = $derived.by(() => {
		return cells
			.filter((c) => c.pair.entry.tabIndex !== null)
			.slice()
			.sort(
				(a, b) =>
					(a.pair.entry.tabIndex ?? 0) - (b.pair.entry.tabIndex ?? 0)
			);
	});

	function nodeMatches(pair: DiffPair): boolean {
		if (filter.size > 0 && !filter.has(pair.kind)) return false;
		if (!query) return true;
		const lower = query.toLowerCase();
		const entry = pair.entry;
		const haystack = [
			entry.ax?.role,
			entry.ax?.name,
			entry.tag,
			entry.visual?.text,
			entry.visual?.explicitRole
		]
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
			if (t < 1) animHandle = requestAnimationFrame(step);
			else animHandle = null;
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

	const stroke1 = $derived(Math.max(fullBounds.w, fullBounds.h) / 400);

	const zoomLevel = $derived.by(() => {
		if (fullBounds.w <= 0 || viewBox.w <= 0) return 1;
		return fullBounds.w / viewBox.w;
	});

	function clientToSvg(clientX: number, clientY: number): { x: number; y: number } | null {
		if (!svgEl) return null;
		const pt = svgEl.createSVGPoint();
		pt.x = clientX;
		pt.y = clientY;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return null;
		const inv = ctm.inverse();
		const svgPoint = pt.matrixTransform(inv);
		return { x: svgPoint.x, y: svgPoint.y };
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (animHandle !== null) cancelAnimationFrame(animHandle);
		animHandle = null;
		const factor = Math.exp(e.deltaY * 0.0015);
		const anchor = clientToSvg(e.clientX, e.clientY);
		if (!anchor) return;
		// Clamp zoom-out so the viewBox never exceeds ~20x the content.
		const maxW = Math.max(fullBounds.w, 4000) * 20;
		const minW = Math.min(fullBounds.w, 200) / 40;
		const newW = Math.min(maxW, Math.max(minW, viewBox.w * factor));
		const newH = viewBox.h * (newW / viewBox.w);
		const nx = anchor.x - ((anchor.x - viewBox.x) * newW) / viewBox.w;
		const ny = anchor.y - ((anchor.y - viewBox.y) * newH) / viewBox.h;
		viewBox = { x: nx, y: ny, w: newW, h: newH };
	}

	function handlePointerDown(e: PointerEvent) {
		if ((e.target as Element).closest('[data-cell]')) return;
		if (animHandle !== null) cancelAnimationFrame(animHandle);
		animHandle = null;
		panning = true;
		panStart = { x: e.clientX, y: e.clientY, vbX: viewBox.x, vbY: viewBox.y };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function handlePointerMovePan(e: PointerEvent) {
		if (!panning || !svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const dx = ((e.clientX - panStart.x) * viewBox.w) / rect.width;
		const dy = ((e.clientY - panStart.y) * viewBox.h) / rect.height;
		viewBox = { ...viewBox, x: panStart.vbX - dx, y: panStart.vbY - dy };
	}

	function handlePointerUp(e: PointerEvent) {
		if (!panning) return;
		panning = false;
		try {
			(e.currentTarget as Element).releasePointerCapture(e.pointerId);
		} catch {}
	}
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
			<span class="tabular-nums" style:color="var(--panel-text-muted)"
				>{cells.length} rects · {tabPath.length} tabbable</span
			>
			<span
				class="ml-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
				style="border-color: var(--panel-border); color: var(--panel-text-muted);"
				title="Zoom relative to full page bounds">{Math.round(zoomLevel * 100)}%</span
			>
			<button
				type="button"
				class="rounded border px-1.5 py-0.5 text-[9px] font-semibold hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border); color: var(--panel-text);"
				onclick={fitToVisible}
				title="Fit visible cells">Fit</button
			>
			<button
				type="button"
				class="rounded border px-1.5 py-0.5 text-[9px] font-semibold hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border); color: var(--panel-text);"
				onclick={fitToActualBounds}
				title="Show entire page">1:1</button
			>
		</div>
	</div>

	<div class="relative min-h-0 flex-1 overflow-hidden">
		{#if showTabPath && tabPath.length > 0}
			<div
				class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex items-center gap-2 rounded border px-1.5 py-0.5 text-[9px]"
				style="border-color: var(--panel-border); background-color: var(--panel-bg);"
				aria-label="Tab path legend"
			>
				<span class="font-semibold tracking-wide uppercase" style:color="var(--panel-text-subtle)"
					>Tab</span
				>
				<span class="flex items-center gap-1" style:color="var(--panel-text-muted)">
					<span
						class="inline-flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold text-white"
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
							opacity="0.6"
						/></svg
					>
					path
				</span>
			</div>
		{/if}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg
			bind:this={svgEl}
			role="application"
			aria-label="Page wireframe viewport"
			viewBox={viewBoxStr}
			preserveAspectRatio="xMidYMid meet"
			class="block h-full w-full touch-none select-none"
			style:background-color="var(--panel-bg)"
			style:cursor={panning ? 'grabbing' : 'grab'}
			onwheel={handleWheel}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMovePan}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
		>
			<rect
				x={fullBounds.x}
				y={fullBounds.y}
				width={fullBounds.w}
				height={fullBounds.h}
				fill="transparent"
				stroke="var(--viz-grid)"
				stroke-width={stroke1 * 2}
			/>

			{#each sortedCells as cell (cell.key)}
				{@const color = kindColor(cell.pair.kind)}
				{@const selected = cell.key === selectedKey}
				{@const highlight = nodeMatches(cell.pair)}
				{@const dimmed = (filter.size > 0 || query.length > 0) && !highlight}
				<g
					data-cell
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

			{#if showTabPath && tabPath.length > 1}
				<g fill="none" stroke="var(--viz-accent)" stroke-dasharray="8 5" opacity="0.6">
					{#each tabPath as cell, i (cell.key)}
						{#if i < tabPath.length - 1}
							{@const next = tabPath[i + 1]}
							{@const cx1 = cell.pair.entry.rect.x + cell.pair.entry.rect.width / 2}
							{@const cy1 = cell.pair.entry.rect.y + cell.pair.entry.rect.height / 2}
							{@const cx2 = next.pair.entry.rect.x + next.pair.entry.rect.width / 2}
							{@const cy2 = next.pair.entry.rect.y + next.pair.entry.rect.height / 2}
							<line
								x1={cx1}
								y1={cy1}
								x2={cx2}
								y2={cy2}
								stroke-width={stroke1 * 2}
								vector-effect="non-scaling-stroke"
							/>
						{/if}
					{/each}
				</g>
				<g>
					{#each tabPath as cell, i (cell.key)}
						{@const cx = cell.pair.entry.rect.x + cell.pair.entry.rect.width / 2}
						{@const cy = cell.pair.entry.rect.y + cell.pair.entry.rect.height / 2}
						{@const r = Math.max(8, Math.min(18, Math.min(cell.w, cell.h) / 2.2))}
						<circle
							{cx}
							{cy}
							{r}
							fill="var(--viz-accent)"
							stroke="white"
							stroke-width={stroke1}
							vector-effect="non-scaling-stroke"
							opacity="0.95"
						/>
						<text
							x={cx}
							y={cy + r / 3}
							font-size={r}
							font-family="ui-monospace, monospace"
							font-weight="700"
							fill="white"
							text-anchor="middle">{i + 1}</text
						>
					{/each}
				</g>
			{/if}
		</svg>

		{#if hoveredCell}
			{@const entry = hoveredCell.pair.entry}
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
						>{entry.ax?.role ?? entry.visual?.explicitRole ?? entry.tag}</span
					>
					{#if entry.tabIndex !== null}
						<span
							class="rounded px-1 text-[9px] font-bold"
							style="background-color: color-mix(in srgb, var(--viz-accent) 22%, transparent); color: var(--viz-accent);"
							>⌨ {entry.tabIndex + 1}</span
						>
					{/if}
				</div>
				<div class="mt-0.5" style:color="var(--panel-text)">
					{entry.ax?.name || entry.visual?.text || '(no name)'}
				</div>
				<div
					class="mt-0.5 font-mono text-[9px]"
					style:color="var(--panel-text-muted)"
				>
					{Math.round(hoveredCell.x)},{Math.round(hoveredCell.y)} ·
					{Math.round(hoveredCell.w)}×{Math.round(hoveredCell.h)}
				</div>
			</div>
		{/if}
	</div>
</div>
