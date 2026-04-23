<script lang="ts">
	import type { DiffKind, DiffPair, ViewportInfo } from '../../ax-tree/types.ts';

	interface Props {
		pair: DiffPair | null;
		viewport: ViewportInfo | null;
	}

	let { pair, viewport }: Props = $props();

	const kindMeta: Record<DiffKind, { color: string; label: string; description: string }> = {
		match: {
			color: 'var(--viz-ok)',
			label: 'Match',
			description: 'Visual and AX representations agree.'
		},
		'missing-in-ax': {
			color: 'var(--viz-bad)',
			label: 'Missing in AX',
			description: 'Screen readers will skip this element.'
		},
		'extra-in-ax': {
			color: 'var(--viz-warn)',
			label: 'Extra in AX',
			description: 'Exposed to assistive tech but not rendered visually.'
		},
		'role-mismatch': {
			color: 'var(--viz-bad)',
			label: 'Role mismatch',
			description: 'Implicit and explicit roles disagree.'
		},
		'name-missing': {
			color: 'var(--viz-warn)',
			label: 'Name missing',
			description: 'Element needs an accessible name.'
		},
		'order-drift': {
			color: 'var(--viz-accent)',
			label: 'Order drift',
			description: 'Visual reading order differs from DOM/AX order.'
		}
	};

	const meta = $derived(pair ? kindMeta[pair.kind] : null);
	const ax = $derived(pair?.ax ?? null);
	const visual = $derived(pair?.visual ?? null);
	const ariaEntries = $derived(ax ? Object.entries(ax.ariaProps) : []);
	const rect = $derived(ax?.rect ?? visual?.rect ?? null);

	// Compose a viewBox that always contains the viewport AND the node rect,
	// so nodes that extend above/below the fold are visible.
	const frame = $derived.by(() => {
		if (!viewport) return null;
		const vpW = Math.max(viewport.width, 1);
		const vpH = Math.max(viewport.height, 1);
		if (!rect) {
			return { x: 0, y: 0, w: vpW, h: vpH, vpX: 0, vpY: 0, vpW, vpH };
		}
		const padX = vpW * 0.04;
		const padY = vpH * 0.04;
		const minX = Math.min(0, rect.x) - padX;
		const minY = Math.min(0, rect.y) - padY;
		const maxX = Math.max(vpW, rect.x + rect.width) + padX;
		const maxY = Math.max(vpH, rect.y + rect.height) + padY;
		return {
			x: minX,
			y: minY,
			w: Math.max(1, maxX - minX),
			h: Math.max(1, maxY - minY),
			vpX: 0,
			vpY: 0,
			vpW,
			vpH
		};
	});

	const rectOutOfViewport = $derived.by(() => {
		if (!rect || !viewport) return false;
		return (
			rect.x < 0 ||
			rect.y < 0 ||
			rect.x + rect.width > viewport.width ||
			rect.y + rect.height > viewport.height
		);
	});
</script>

<div
	class="flex h-full min-h-0 flex-col overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<div
		class="flex shrink-0 items-center justify-between border-b px-2 py-1.5 text-[9px] font-bold tracking-wide uppercase"
		style="border-color: var(--panel-border); color: var(--panel-text-muted);"
	>
		<span>Inspector</span>
		{#if meta}
			<span
				class="rounded-full px-1.5 py-0.5 text-[9px] tracking-wide uppercase"
				style:background-color={`color-mix(in srgb, ${meta.color} 16%, transparent)`}
				style:color={meta.color}
			>
				{meta.label}
			</span>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto p-3 text-[11px]">
		{#if !pair || !meta}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<p class="text-[var(--panel-text-subtle)]">
					Select a node in the tree to inspect its accessibility properties.
				</p>
			</div>
		{:else}
			<p class="mb-3 text-[var(--panel-text-muted)]">{meta.description}</p>

			<section class="mb-3">
				<h3 class="mb-1 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase">
					Identity
				</h3>
				<dl class="grid grid-cols-[80px_1fr] gap-y-1 gap-x-2">
					<dt class="text-[var(--panel-text-subtle)]">Role</dt>
					<dd class="text-[var(--panel-text)]">
						{#if ax}
							<span
								class="rounded px-1 text-[9px] font-bold tracking-wide uppercase"
								style="background-color: color-mix(in srgb, var(--viz-accent) 14%, transparent); color: var(--viz-accent);"
							>{ax.role}</span>
						{:else}
							<span class="italic text-[var(--panel-text-subtle)]">—</span>
						{/if}
						{#if visual?.role && visual.role !== ax?.role}
							<span class="ml-1 text-[var(--panel-text-muted)]">visual: {visual.role}</span>
						{/if}
					</dd>
					<dt class="text-[var(--panel-text-subtle)]">Tag</dt>
					<dd class="text-[var(--panel-text)]">
						<code
							class="rounded px-1 text-[9px]"
							style="background-color: var(--panel-code-bg);"
						>&lt;{ax?.tag ?? visual?.tag ?? '?'}&gt;</code>
					</dd>
					<dt class="text-[var(--panel-text-subtle)]">Name</dt>
					<dd class="text-[var(--panel-text)]">
						{#if ax?.name}
							{ax.name}
						{:else if visual?.text}
							<span class="text-[var(--panel-text-muted)]">{visual.text}</span>
							<span class="ml-1 text-[9px] text-[var(--panel-text-subtle)]">(visual text)</span>
						{:else}
							<span class="italic text-[var(--panel-text-subtle)]">(no accessible name)</span>
						{/if}
					</dd>
				</dl>
			</section>

			<section class="mb-3">
				<h3 class="mb-1 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase">
					DOM path
				</h3>
				<code
					class="block overflow-x-auto rounded px-2 py-1 font-mono text-[10px] whitespace-nowrap"
					style="background-color: var(--panel-code-bg); color: var(--panel-text);"
				>{ax?.path ?? visual?.path ?? '—'}</code>
			</section>

			{#if ariaEntries.length > 0}
				<section class="mb-3">
					<h3
						class="mb-1 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>
						ARIA attributes
					</h3>
					<table class="w-full border-collapse text-[10px]">
						<tbody>
							{#each ariaEntries as [name, value] (name)}
								<tr class="border-b" style="border-color: var(--panel-border);">
									<td
										class="py-0.5 pr-2 font-mono text-[var(--viz-accent)]"
										style="vertical-align: top;"
									>{name}</td>
									<td class="py-0.5 break-all text-[var(--panel-text)]">{value}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/if}

			{#if rect && frame}
				<section class="mb-3">
					<h3
						class="mb-1 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>
						Position on page
					</h3>
					<div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-[var(--panel-text-muted)]">
						<span>x: {Math.round(rect.x)}</span>
						<span>y: {Math.round(rect.y)}</span>
						<span>{Math.round(rect.width)}×{Math.round(rect.height)}</span>
						{#if viewport}
							<span class="text-[var(--panel-text-subtle)]">
								viewport {viewport.width}×{viewport.height}
							</span>
						{/if}
					</div>
					{#if rectOutOfViewport}
						<div
							class="mb-1.5 rounded px-1.5 py-0.5 text-[10px]"
							style="background-color: color-mix(in srgb, var(--viz-warn) 14%, transparent); color: var(--viz-warn);"
						>
							Element extends outside the viewport fold.
						</div>
					{/if}
					<svg
						role="img"
						aria-label="Viewport wireframe showing node position"
						viewBox="{frame.x} {frame.y} {frame.w} {frame.h}"
						preserveAspectRatio="xMidYMid meet"
						class="block w-full rounded border"
						style="border-color: var(--panel-border); background-color: var(--panel-bg); aspect-ratio: {frame.w} / {frame.h}; max-height: 240px;"
					>
						<rect
							x={frame.vpX}
							y={frame.vpY}
							width={frame.vpW}
							height={frame.vpH}
							fill="color-mix(in srgb, var(--panel-text-muted) 6%, transparent)"
							stroke="var(--viz-axis)"
							stroke-width={Math.max(frame.w, frame.h) / 400}
							stroke-dasharray={`${Math.max(frame.w, frame.h) / 120} ${Math.max(frame.w, frame.h) / 200}`}
						/>
						<rect
							x={rect.x}
							y={rect.y}
							width={Math.max(rect.width, Math.max(frame.w, frame.h) / 200)}
							height={Math.max(rect.height, Math.max(frame.w, frame.h) / 200)}
							fill={`color-mix(in srgb, ${meta.color} 38%, transparent)`}
							stroke={meta.color}
							stroke-width={Math.max(frame.w, frame.h) / 300}
						/>
						{#if viewport}
							<text
								x={frame.vpX + 4}
								y={frame.vpY + Math.max(frame.w, frame.h) / 60}
								font-size={Math.max(frame.w, frame.h) / 70}
								fill="var(--panel-text-subtle)"
								font-family="ui-monospace, monospace"
							>
								viewport {viewport.width}×{viewport.height}
							</text>
						{/if}
					</svg>
				</section>
			{/if}

			{#if pair.visualIndex !== null || pair.axIndex !== null}
				<section>
					<h3
						class="mb-1 text-[9px] font-bold tracking-wide text-[var(--panel-text-muted)] uppercase"
					>
						Ordering
					</h3>
					<dl class="grid grid-cols-[120px_1fr] gap-y-1 gap-x-2 text-[10px]">
						<dt class="text-[var(--panel-text-subtle)]">AX index</dt>
						<dd class="tabular-nums text-[var(--panel-text)]">
							{pair.axIndex ?? '—'}
						</dd>
						<dt class="text-[var(--panel-text-subtle)]">Visual index</dt>
						<dd class="tabular-nums text-[var(--panel-text)]">
							{pair.visualIndex ?? '—'}
						</dd>
					</dl>
				</section>
			{/if}
		{/if}
	</div>
</div>
