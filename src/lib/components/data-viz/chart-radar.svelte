<script lang="ts">
	import type { ChartScores } from '../../data-viz/types.ts';
	import { scaleLinear } from '../../shared/d3-registry.ts';

	interface Props {
		scores: ChartScores;
		size?: number;
		compact?: boolean;
	}

	let { scores, size = 120, compact = false }: Props = $props();

	const axes = $derived([
		{ key: 'screenReader', label: 'SR', value: scores.screenReader },
		{ key: 'keyboard', label: 'KB', value: scores.keyboard },
		{ key: 'colorSafe', label: 'CB', value: scores.colorSafe },
		{ key: 'lowVision', label: 'LV', value: scores.lowVision },
		{ key: 'cognitive', label: 'CG', value: scores.cognitive },
		{ key: 'descriptionFaithfulness', label: 'DF', value: scores.descriptionFaithfulness }
	]);

	const cx = $derived(size / 2);
	const cy = $derived(size / 2);
	const r = $derived(size / 2 - (compact ? 6 : 20));
	const n = $derived(axes.length);

	function point(i: number, v: number): [number, number] {
		const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
		const radius = r * Math.max(0, Math.min(1, v));
		return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
	}

	function axisPoint(i: number): [number, number] {
		const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
		return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
	}

	function labelPoint(i: number): [number, number] {
		const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
		const pad = compact ? 3 : 12;
		return [cx + (r + pad) * Math.cos(angle), cy + (r + pad) * Math.sin(angle)];
	}

	const polygonPoints = $derived(axes.map((a, i) => point(i, a.value).join(',')).join(' '));

	const gridLevels = [0.25, 0.5, 0.75, 1];
	const overallScale = scaleLinear().domain([0, 1]).range([0, 1]);
	void overallScale;
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	role="img"
	aria-label="Chart accessibility radar"
>
	<g>
		{#each gridLevels as lvl (lvl)}
			<polygon
				points={axes.map((_, i) => point(i, lvl).join(',')).join(' ')}
				fill="none"
				stroke="var(--viz-grid)"
				stroke-width="1"
			/>
		{/each}
		{#each axes as _, i (i)}
			{@const [ax, ay] = axisPoint(i)}
			<line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--viz-grid)" stroke-width="1" />
		{/each}
		<polygon
			points={polygonPoints}
			fill="color-mix(in srgb, var(--viz-info) 25%, transparent)"
			stroke="var(--viz-info)"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
		{#each axes as a, i (a.key)}
			{@const [px, py] = point(i, a.value)}
			<circle
				cx={px}
				cy={py}
				r={compact ? 1.5 : 2.5}
				fill="var(--viz-info)"
				stroke="var(--viz-surface)"
				stroke-width="1"
			/>
		{/each}
		{#if !compact}
			{#each axes as a, i (a.key)}
				{@const [lx, ly] = labelPoint(i)}
				<text
					x={lx}
					y={ly}
					fill="var(--panel-text-muted)"
					font-size="9"
					text-anchor="middle"
					dominant-baseline="middle"
					font-weight="600">{a.label}</text
				>
			{/each}
		{/if}
	</g>
</svg>
