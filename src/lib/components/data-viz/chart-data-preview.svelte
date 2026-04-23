<script lang="ts">
	import type { ChartAnalysis } from '../../data-viz/types.ts';
	import { rowsToCsv } from '../../data-viz/analysis-tree.ts';
	import ChartReconstructedSvg from './chart-reconstructed-svg.svelte';

	interface Props {
		analysis: ChartAnalysis;
	}

	let { analysis }: Props = $props();

	let copied = $state<string | null>(null);

	const hasSeries = $derived(analysis.rows.some((r) => r.series));
	const hasZ = $derived(analysis.rows.some((r) => typeof r.z === 'number'));

	function flash(msg: string) {
		copied = msg;
		setTimeout(() => (copied = null), 1600);
	}

	async function copyCsv() {
		try {
			await navigator.clipboard.writeText(rowsToCsv(analysis.rows));
			flash('CSV copied');
		} catch {
			flash('Clipboard unavailable');
		}
	}

	function downloadCsv() {
		const csv = rowsToCsv(analysis.rows);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(analysis.title ?? 'chart').replace(/[^a-z0-9]+/gi, '-')}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const preview = $derived(analysis.rows.slice(0, 50));
</script>

<div class="flex flex-col gap-3">
	<div
		class="flex flex-wrap items-center gap-3 rounded-md border p-2"
		style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	>
		<div class="w-full sm:w-auto sm:flex-1">
			<ChartReconstructedSvg {analysis} />
		</div>
		<dl class="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-[var(--panel-text-muted)]">
			<div>
				<dt class="font-semibold text-[var(--panel-text)]">Type</dt>
				<dd class="font-mono">{analysis.chartType}</dd>
			</div>
			<div>
				<dt class="font-semibold text-[var(--panel-text)]">Rows</dt>
				<dd class="tabular-nums">{analysis.rows.length}</dd>
			</div>
			{#if analysis.xAxis.label}
				<div>
					<dt class="font-semibold text-[var(--panel-text)]">X axis</dt>
					<dd>{analysis.xAxis.label} ({analysis.xAxis.scaleType})</dd>
				</div>
			{/if}
			{#if analysis.yAxis.label}
				<div>
					<dt class="font-semibold text-[var(--panel-text)]">Y axis</dt>
					<dd>{analysis.yAxis.label} ({analysis.yAxis.scaleType})</dd>
				</div>
			{/if}
			{#if analysis.series.length > 0}
				<div class="col-span-2">
					<dt class="font-semibold text-[var(--panel-text)]">Series</dt>
					<dd class="flex flex-wrap gap-1">
						{#each analysis.series as s (s.name)}
							<span class="inline-flex items-center gap-1">
								{#if s.color}
									<span
										class="inline-block h-2 w-2 rounded-full"
										style="background: {s.color};"
									></span>
								{/if}
								{s.name}
							</span>
						{/each}
					</dd>
				</div>
			{/if}
		</dl>
	</div>

	<div class="flex items-center gap-2 text-[10px]">
		<span class="text-[var(--panel-text-muted)]">
			Showing {Math.min(50, analysis.rows.length)} of {analysis.rows.length} rows
		</span>
		<div class="ml-auto flex items-center gap-2">
			{#if copied}<span class="text-[var(--viz-ok)]">{copied}</span>{/if}
			<button
				type="button"
				onclick={copyCsv}
				class="rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border);"
			>
				Copy CSV
			</button>
			<button
				type="button"
				onclick={downloadCsv}
				class="rounded border px-2 py-0.5 hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border);"
			>
				Download CSV
			</button>
		</div>
	</div>

	{#if analysis.rows.length === 0}
		<div
			class="rounded-md border px-3 py-2 text-[11px] text-[var(--panel-text-muted)]"
			style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
		>
			No rows were extracted. Check the confidence score and notes.
		</div>
	{:else}
		<div class="max-h-72 overflow-auto rounded border" style="border-color: var(--panel-border);">
			<table class="w-full text-left text-[11px]">
				<thead
					class="sticky top-0 border-b text-[10px] tracking-wide text-[var(--panel-text-muted)] uppercase"
					style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
				>
					<tr>
						<th class="px-2 py-1.5 font-semibold">#</th>
						{#if hasSeries}
							<th class="px-2 py-1.5 font-semibold">Series</th>
						{/if}
						<th class="px-2 py-1.5 font-semibold">Category</th>
						<th class="px-2 py-1.5 font-semibold">X</th>
						<th class="px-2 py-1.5 font-semibold">Y</th>
						{#if hasZ}
							<th class="px-2 py-1.5 font-semibold">Z</th>
						{/if}
						<th class="px-2 py-1.5 font-semibold">Value</th>
						<th class="px-2 py-1.5 font-semibold">Color</th>
					</tr>
				</thead>
				<tbody>
					{#each preview as row, i (i)}
						<tr
							class="border-b"
							style="border-color: color-mix(in srgb, var(--panel-border) 60%, transparent);"
						>
							<td class="px-2 py-1 text-[var(--panel-text-subtle)] tabular-nums">{i + 1}</td>
							{#if hasSeries}
								<td class="px-2 py-1 text-[var(--panel-text-muted)]">{row.series ?? '—'}</td>
							{/if}
							<td class="px-2 py-1 text-[var(--panel-text)]">{row.category ?? '—'}</td>
							<td class="px-2 py-1 text-[var(--panel-text)]">{row.x ?? '—'}</td>
							<td class="px-2 py-1 text-[var(--panel-text)] tabular-nums">
								{row.y ?? '—'}
							</td>
							{#if hasZ}
								<td class="px-2 py-1 text-[var(--panel-text)] tabular-nums">
									{row.z ?? '—'}
								</td>
							{/if}
							<td class="px-2 py-1 text-[var(--panel-text)] tabular-nums">
								{typeof row.value === 'number' ? row.value.toFixed(2) : '—'}
							</td>
							<td class="px-2 py-1">
								{#if row.color}
									<span class="flex items-center gap-1.5">
										<span
											class="inline-block h-3 w-3 rounded"
											style="background: {row.color}; border: 1px solid var(--panel-border);"
										></span>
										<span class="font-mono text-[10px] text-[var(--panel-text-subtle)]"
											>{row.color}</span
										>
									</span>
								{:else}
									<span class="text-[var(--panel-text-subtle)]">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2 text-[10px]">
		<span
			class="rounded-sm px-2 py-0.5"
			style="background-color: color-mix(in srgb, var(--viz-info) 15%, transparent); color: var(--viz-info);"
		>
			Confidence: data {(analysis.confidence.dataExtraction * 100).toFixed(0)}% · type {(analysis.confidence.typeDetection * 100).toFixed(0)}%
		</span>
		{#if analysis.notes.length > 0}
			<span class="text-[var(--panel-text-muted)]">
				{analysis.notes.length} note{analysis.notes.length === 1 ? '' : 's'}
			</span>
		{/if}
	</div>

	{#if analysis.notes.length > 0}
		<ul
			class="rounded-md border px-3 py-2 text-[11px] leading-relaxed"
			style="border-color: var(--panel-warning-border); background-color: var(--panel-warning-bg); color: var(--panel-warning-text);"
		>
			{#each analysis.notes as note, i (i)}
				<li class="flex gap-1.5">
					<span aria-hidden="true">•</span>
					<span>{note}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>
