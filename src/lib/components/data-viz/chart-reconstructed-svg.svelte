<script lang="ts">
	import type { AnalysisRow, ChartAnalysis, ChartKind, SeriesInfo } from '../../data-viz/types.ts';

	interface Props {
		analysis: ChartAnalysis;
		width?: number;
		height?: number;
	}

	let { analysis, width = 360, height = 220 }: Props = $props();

	const padding = { top: 18, right: 10, bottom: 30, left: 40 };

	type ChartKindGroup = 'bar' | 'line' | 'scatter' | 'pie' | 'other';

	function kindGroup(kind: ChartKind): ChartKindGroup {
		if (
			kind === 'bar' ||
			kind === 'grouped_bar' ||
			kind === 'stacked_bar' ||
			kind === 'histogram' ||
			kind === 'waterfall' ||
			kind === 'funnel'
		)
			return 'bar';
		if (
			kind === 'line' ||
			kind === 'multi_line' ||
			kind === 'area' ||
			kind === 'stacked_area' ||
			kind === 'sparkline'
		)
			return 'line';
		if (kind === 'scatter' || kind === 'bubble') return 'scatter';
		if (kind === 'pie' || kind === 'donut' || kind === 'gauge') return 'pie';
		return 'other';
	}

	function seriesColor(series: SeriesInfo | undefined, i: number): string {
		if (series?.color) return series.color;
		const palette = [
			'var(--viz-cat-1)',
			'var(--viz-cat-2)',
			'var(--viz-cat-3)',
			'var(--viz-cat-4)',
			'var(--viz-cat-5)',
			'var(--viz-cat-6)'
		];
		return palette[i % palette.length];
	}

	function valueOf(row: AnalysisRow): number | null {
		const v = row.value ?? row.y ?? null;
		return typeof v === 'number' && isFinite(v) ? v : null;
	}

	const group = $derived(kindGroup(analysis.chartType));

	const view = $derived.by(() => {
		const rows = analysis.rows.filter((r) => valueOf(r) !== null).slice(0, 150);
		if (rows.length === 0) return null;

		if (group === 'pie') {
			const total = rows.reduce((a, r) => a + (valueOf(r) ?? 0), 0);
			if (total <= 0) return null;
			const cx = width / 2;
			const cy = height / 2;
			const radius = Math.min(width, height) / 2 - 10;
			let start = -Math.PI / 2;
			const slices = rows.map((row, i) => {
				const v = valueOf(row)!;
				const angle = (v / total) * Math.PI * 2;
				const end = start + angle;
				const x1 = cx + Math.cos(start) * radius;
				const y1 = cy + Math.sin(start) * radius;
				const x2 = cx + Math.cos(end) * radius;
				const y2 = cy + Math.sin(end) * radius;
				const large = angle > Math.PI ? 1 : 0;
				const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`;
				start = end;
				return {
					path,
					color: row.color ?? seriesColor(analysis.series[i], i),
					label: row.category ?? row.x ?? '',
					value: v
				};
			});
			return { group: 'pie' as const, slices };
		}

		const bySeries = new Map<string, AnalysisRow[]>();
		for (const row of rows) {
			const key = row.series ?? '';
			if (!bySeries.has(key)) bySeries.set(key, []);
			bySeries.get(key)!.push(row);
		}

		const allXs: (string | number)[] = [];
		for (const row of rows) {
			const x = row.category ?? row.x ?? '';
			if (x !== '' && !allXs.includes(x as string | number)) allXs.push(x as string | number);
		}

		const numericX = allXs.every((x) => typeof x === 'number' || !isNaN(Number(x)));
		const innerW = width - padding.left - padding.right;
		const innerH = height - padding.top - padding.bottom;

		const valsAll = rows.map((r) => valueOf(r)!);
		const minY = Math.min(0, ...valsAll);
		const maxY = Math.max(...valsAll);
		const range = maxY - minY || 1;

		const xScale = (x: string | number, i: number): number => {
			if (group === 'bar') {
				const idx = allXs.indexOf(x);
				return padding.left + ((idx + 0.5) / allXs.length) * innerW;
			}
			if (numericX) {
				const nums = allXs.map((v) => Number(v));
				const mn = Math.min(...nums);
				const mx = Math.max(...nums);
				const span = mx - mn || 1;
				return padding.left + ((Number(x) - mn) / span) * innerW;
			}
			const idx = allXs.indexOf(x);
			return padding.left + (allXs.length === 1 ? innerW / 2 : (idx / (allXs.length - 1)) * innerW);
		};

		const yScale = (v: number): number =>
			padding.top + innerH - ((v - minY) / range) * innerH;

		const seriesList: { name: string; color: string; rows: AnalysisRow[] }[] = [];
		let i = 0;
		for (const [name, rs] of bySeries) {
			seriesList.push({
				name,
				color:
					rs.find((r) => r.color)?.color ??
					seriesColor(analysis.series.find((s) => s.name === name), i),
				rows: rs
			});
			i++;
		}

		return {
			group,
			innerW,
			innerH,
			allXs,
			minY,
			maxY,
			xScale,
			yScale,
			seriesList
		};
	});
</script>

<figure class="flex flex-col gap-2">
	<svg
		width="100%"
		viewBox="0 0 {width} {height}"
		role="img"
		aria-label={`Reconstructed ${analysis.chartType} chart of ${analysis.title ?? 'chart data'}`}
	>
		{#if !view}
			<text
				x={width / 2}
				y={height / 2}
				text-anchor="middle"
				font-size="11"
				fill="var(--panel-text-muted)"
			>
				No numeric values to plot
			</text>
		{:else if view.group === 'pie'}
			{#each view.slices as slice, i (i)}
				<path d={slice.path} fill={slice.color} stroke="var(--panel-bg)" stroke-width="1">
					<title>{slice.label}: {slice.value.toFixed(2)}</title>
				</path>
			{/each}
		{:else}
			<line
				x1={padding.left}
				x2={width - padding.right}
				y1={view.yScale(0)}
				y2={view.yScale(0)}
				stroke="var(--viz-grid)"
				stroke-dasharray="2 2"
			/>
			<text x={padding.left - 4} y={view.yScale(view.maxY)} text-anchor="end" font-size="9" fill="var(--panel-text-muted)" dominant-baseline="central">
				{view.maxY.toFixed(1)}
			</text>
			<text x={padding.left - 4} y={view.yScale(view.minY)} text-anchor="end" font-size="9" fill="var(--panel-text-muted)" dominant-baseline="central">
				{view.minY.toFixed(1)}
			</text>

			{#if view.group === 'bar'}
				{@const barWidth = Math.max(2, (view.innerW / view.allXs.length) * 0.7 / Math.max(1, view.seriesList.length))}
				{#each view.seriesList as series, si (series.name)}
					{#each series.rows as row, ri (`${series.name}-${ri}`)}
						{@const v = row.value ?? row.y ?? 0}
						{@const x0 = view.xScale(row.category ?? row.x ?? '', ri)}
						{@const xOffset = (si - (view.seriesList.length - 1) / 2) * barWidth}
						{@const yTop = view.yScale(Math.max(v, 0))}
						{@const yBot = view.yScale(Math.min(v, 0))}
						<rect
							x={x0 + xOffset - barWidth / 2}
							y={yTop}
							width={barWidth}
							height={Math.max(1, yBot - yTop)}
							fill={series.color}
						>
							<title>{row.category ?? row.x}: {v}</title>
						</rect>
					{/each}
				{/each}
			{:else if view.group === 'scatter'}
				{#each view.seriesList as series, si (series.name)}
					{#each series.rows as row, ri (`${series.name}-${ri}`)}
						{@const v = row.value ?? row.y ?? 0}
						<circle
							cx={view.xScale(row.x ?? row.category ?? '', ri)}
							cy={view.yScale(v)}
							r="3"
							fill={series.color}
							fill-opacity="0.7"
						>
							<title>{row.x ?? row.category}: {v}</title>
						</circle>
					{/each}
				{/each}
			{:else if view.group === 'line'}
				{#each view.seriesList as series, si (series.name)}
					{@const sorted = series.rows.slice().sort((a, b) => {
						const ax = Number(a.x ?? a.category ?? 0);
						const bx = Number(b.x ?? b.category ?? 0);
						return ax - bx;
					})}
					{@const pts = sorted
						.map((row, ri) => `${view.xScale(row.x ?? row.category ?? '', ri)},${view.yScale(row.value ?? row.y ?? 0)}`)
						.join(' ')}
					<polyline points={pts} fill="none" stroke={series.color} stroke-width="1.5" />
					{#each sorted as row, ri (`${series.name}-${ri}`)}
						<circle
							cx={view.xScale(row.x ?? row.category ?? '', ri)}
							cy={view.yScale(row.value ?? row.y ?? 0)}
							r="2"
							fill={series.color}
						>
							<title>{row.x ?? row.category}: {row.value ?? row.y}</title>
						</circle>
					{/each}
				{/each}
			{:else}
				{#each view.seriesList as series, si (series.name)}
					{#each series.rows as row, ri (`${series.name}-${ri}`)}
						<circle
							cx={view.xScale(row.x ?? row.category ?? '', ri)}
							cy={view.yScale(row.value ?? row.y ?? 0)}
							r="2"
							fill={series.color}
						/>
					{/each}
				{/each}
			{/if}
		{/if}
	</svg>
	<figcaption class="text-[10px] text-[var(--panel-text-subtle)]">
		Reconstructed from extracted data · {analysis.rows.length} rows · {analysis.chartType}
	</figcaption>
</figure>
