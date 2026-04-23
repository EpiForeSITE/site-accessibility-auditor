<script lang="ts">
	import type { OrderFlow } from '../../tab-order/order-flow.ts';

	interface Props {
		flow: OrderFlow;
		selectedId?: number | null;
		hoveredId?: number | null;
		onselect?: (id: number) => void;
		onhover?: (id: number | null) => void;
	}

	let { flow, selectedId = null, hoveredId = null, onselect, onhover }: Props = $props();

	const columns = ['DOM', 'Visual', 'Tab'] as const;
	const columnX = [0.12, 0.5, 0.88];
	const rowHeight = 22;
	const padding = 18;
	const labelWidth = 140;

	const width = 640;
	const rowCount = $derived(flow.elements.length);
	const height = $derived(Math.max(200, rowCount * rowHeight + padding * 2));

	function orderIndex(order: number[], id: number): number {
		return order.indexOf(id);
	}

	function bandY(i: number): number {
		return padding + i * rowHeight + rowHeight / 2;
	}

	function nodeX(colIdx: number): number {
		return columnX[colIdx] * width;
	}

	function elementById(id: number) {
		return flow.elements.find((e) => e.id === id)!;
	}

	function ribbonPath(x1: number, y1: number, x2: number, y2: number): string {
		const mx = (x1 + x2) / 2;
		return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
	}

	function ribbonColor(id: number, orderA: number[], orderB: number[]): string {
		const iA = orderIndex(orderA, id);
		const iB = orderIndex(orderB, id);
		if (iA === iB) return 'var(--viz-link)';
		return 'color-mix(in srgb, var(--viz-bad) 45%, transparent)';
	}

	function truncate(s: string, n: number): string {
		if (s.length <= n) return s;
		return s.slice(0, n - 1) + '…';
	}

	function onEnter(id: number) {
		onhover?.(id);
	}
	function onLeave() {
		onhover?.(null);
	}
</script>

<div class="flex flex-col gap-2 p-3">
	<div
		class="flex items-center gap-2 rounded-md border px-3 py-2 text-[11px]"
		style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
	>
		<span class="font-semibold tracking-wide text-[var(--panel-text)] uppercase">Order drift</span>
		<span>DOM ↔ Visual: <strong>{flow.mismatches.domVsVisual}</strong></span>
		<span>Visual ↔ Tab: <strong>{flow.mismatches.visualVsTab}</strong></span>
		<span>DOM ↔ Tab: <strong>{flow.mismatches.domVsTab}</strong></span>
		<span class="ml-auto text-[10px] text-[var(--panel-text-subtle)]"
			>Red ribbons mark a position change between columns.</span
		>
	</div>

	<div
		class="overflow-hidden rounded-md border"
		style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	>
		<svg
			role="img"
			aria-label="Tab order flow diagram linking DOM, visual and tab orders"
			viewBox="0 0 {width} {height}"
			width="100%"
			{height}
			preserveAspectRatio="xMidYMid meet"
		>
			<g>
				{#each columns as col, ci (col)}
					<text
						x={nodeX(ci)}
						y={padding / 2 + 4}
						fill="var(--panel-text-muted)"
						font-size="10"
						font-weight="700"
						text-anchor="middle"
						letter-spacing="1"
					>
						{col.toUpperCase()}
					</text>
				{/each}
			</g>
			<g>
				{#each flow.elements as el, i (el.id)}
					{@const domI = orderIndex(flow.domOrder, el.id)}
					{@const visI = orderIndex(flow.visualOrder, el.id)}
					{@const tabI = orderIndex(flow.tabOrder, el.id)}
					{@const xDom = nodeX(0)}
					{@const xVis = nodeX(1)}
					{@const xTab = nodeX(2)}
					{@const yDom = bandY(domI)}
					{@const yVis = bandY(visI)}
					{@const yTab = bandY(tabI)}
					{@const isActive = selectedId === el.id || hoveredId === el.id}
					<g
						role="button"
						tabindex="0"
						aria-label="Tab stop {el.id} ribbon"
						onmouseenter={() => onEnter(el.id)}
						onmouseleave={onLeave}
						onclick={() => onselect?.(el.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onselect?.(el.id);
							}
						}}
						style="cursor: pointer;"
					>
						<path
							d={ribbonPath(xDom + 4, yDom, xVis - 4, yVis)}
							fill="none"
							stroke={ribbonColor(el.id, flow.domOrder, flow.visualOrder)}
							stroke-width={isActive ? 3.5 : 1.5}
							opacity={isActive ? 1 : 0.7}
						/>
						<path
							d={ribbonPath(xVis + 4, yVis, xTab - 4, yTab)}
							fill="none"
							stroke={ribbonColor(el.id, flow.visualOrder, flow.tabOrder)}
							stroke-width={isActive ? 3.5 : 1.5}
							opacity={isActive ? 1 : 0.7}
						/>
					</g>
					{#each [0, 1, 2] as col (col)}
						{@const xs = [xDom, xVis, xTab]}
						{@const ys = [yDom, yVis, yTab]}
						{@const idx = [domI, visI, tabI][col]}
						<g
							role="button"
							tabindex="0"
							aria-label="Tab stop {el.id} node"
							onmouseenter={() => onEnter(el.id)}
							onmouseleave={onLeave}
							onclick={() => onselect?.(el.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onselect?.(el.id);
								}
							}}
							style="cursor: pointer;"
						>
							<circle
								cx={xs[col]}
								cy={ys[col]}
								r={isActive ? 7 : 5}
								fill={isActive ? 'var(--panel-primary)' : 'var(--viz-node)'}
								stroke="var(--viz-surface)"
								stroke-width="1.5"
							/>
							<text
								x={col === 0 ? xs[col] - 10 : col === 2 ? xs[col] + 10 : xs[col]}
								y={ys[col] + 3}
								fill="var(--panel-text)"
								font-size="9"
								text-anchor={col === 0 ? 'end' : col === 2 ? 'start' : 'middle'}
								font-weight={isActive ? 700 : 500}
							>
								{idx + 1}
							</text>
						</g>
					{/each}
					{#if hoveredId === el.id || selectedId === el.id}
						<g>
							<rect
								x={xVis - labelWidth / 2}
								y={yVis - rowHeight / 2 + 1}
								width={labelWidth}
								height={rowHeight - 2}
								rx={4}
								fill="var(--panel-bg-elevated)"
								stroke="var(--panel-primary)"
								stroke-width="1"
								opacity="0.92"
							/>
							<text
								x={xVis}
								y={yVis + 3}
								fill="var(--panel-text)"
								font-size="10"
								text-anchor="middle"
								font-weight="600"
							>
								&lt;{el.tag}&gt;
								{truncate(el.text || el.attributes['aria-label'] || '', 20)}
							</text>
						</g>
					{/if}
				{/each}
			</g>
		</svg>
	</div>
</div>
