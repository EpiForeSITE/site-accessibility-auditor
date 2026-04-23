<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { StateGraph } from '../../session/types.ts';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide,
		type SimulationNodeDatum,
		type SimulationLinkDatum,
		type Simulation
	} from '../../shared/d3-registry.ts';

	interface Props {
		graph: StateGraph;
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { graph, selectedId, onselect }: Props = $props();

	interface NodeDatum extends SimulationNodeDatum {
		id: string;
		label: string;
		issues: number;
		screenshot: string | null;
		fails: number;
	}
	interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
		label: string;
	}

	// $state.raw so the array reference is reactive but contents are not proxied —
	// d3-force mutates node.x/y/vx/vy in place and the deep $state proxy would
	// interfere with its reference-based link resolution. We trigger re-renders
	// explicitly through the `tick` counter on every simulation step.
	let nodes = $state.raw<NodeDatum[]>([]);
	let links = $state.raw<LinkDatum[]>([]);
	let sim: Simulation<NodeDatum, LinkDatum> | null = null;
	let tick = $state(0);

	const width = 640;
	const height = 360;
	const cx = width / 2;
	const cy = height / 2;

	function build(): { nodes: NodeDatum[]; links: LinkDatum[] } {
		const n: NodeDatum[] = graph.states.map((s, i) => {
			// Seed each node on a ring around the center so the initial frame is
			// already a sensible layout even if the simulation has not ticked yet.
			const total = Math.max(1, graph.states.length);
			const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
			const radius = Math.min(width, height) * 0.3;
			return {
				id: s.id,
				label: s.triggerLabel,
				issues: s.result.summary.total,
				fails: s.result.summary.fail,
				screenshot: s.screenshot,
				x: cx + Math.cos(angle) * radius,
				y: cy + Math.sin(angle) * radius
			};
		});
		const l: LinkDatum[] = graph.transitions.map((t) => ({
			source: t.from,
			target: t.to,
			label: t.label
		}));
		return { nodes: n, links: l };
	}

	function startSim() {
		if (sim) {
			sim.stop();
			sim = null;
		}
		const built = build();
		nodes = built.nodes;
		links = built.links;
		tick++;
		if (nodes.length === 0) return;
		sim = forceSimulation<NodeDatum>(nodes)
			.force(
				'link',
				forceLink<NodeDatum, LinkDatum>(links)
					.id((d) => d.id)
					.distance(120)
					.strength(0.4)
			)
			.force('charge', forceManyBody<NodeDatum>().strength(-260))
			.force('center', forceCenter(cx, cy).strength(0.12))
			.force('collide', forceCollide<NodeDatum>().radius(34))
			.alpha(1)
			.alphaDecay(0.04)
			.velocityDecay(0.35)
			.on('tick', () => {
				tick++;
			});
	}

	onDestroy(() => sim?.stop());

	$effect(() => {
		// Depend on the shape of the graph so we re-run when it changes.
		void graph.states.length;
		void graph.transitions.length;
		startSim();
	});

	function nodeColor(d: NodeDatum): string {
		if (d.fails > 0) return 'var(--viz-node-bad)';
		if (d.issues > 0) return 'var(--viz-node-warn)';
		return 'var(--viz-node-ok)';
	}

	function handleKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onselect(id);
		}
	}

	function linkSourceId(link: LinkDatum): string {
		const s = link.source;
		return typeof s === 'string' ? s : (s as NodeDatum).id;
	}
	function linkTargetId(link: LinkDatum): string {
		const t = link.target;
		return typeof t === 'string' ? t : (t as NodeDatum).id;
	}
	function nodeById(id: string): NodeDatum | undefined {
		return nodes.find((n) => n.id === id);
	}
</script>

<div
	class="overflow-hidden rounded-md border"
	style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
>
	<svg
		role="img"
		aria-label="State graph showing discovered interaction states"
		viewBox="0 0 {width} {height}"
		width="100%"
		height="auto"
		preserveAspectRatio="xMidYMid meet"
	>
		<defs>
			<marker
				id="state-arrow"
				viewBox="0 0 10 10"
				refX="12"
				refY="5"
				markerWidth="5"
				markerHeight="5"
				orient="auto-start-reverse"
			>
				<path d="M0,0 L10,5 L0,10 Z" fill="var(--viz-link)" />
			</marker>
		</defs>
		{#key tick}
			<g>
				{#each links as link, li (`${linkSourceId(link)}-${linkTargetId(link)}-${li}`)}
					{@const src =
						typeof link.source === 'string' ? nodeById(link.source) : (link.source as NodeDatum)}
					{@const tgt =
						typeof link.target === 'string' ? nodeById(link.target) : (link.target as NodeDatum)}
					{#if src && tgt}
						<line
							x1={src.x ?? cx}
							y1={src.y ?? cy}
							x2={tgt.x ?? cx}
							y2={tgt.y ?? cy}
							stroke="var(--viz-link)"
							stroke-width="1.5"
							marker-end="url(#state-arrow)"
						/>
					{/if}
				{/each}
				{#each nodes as d (d.id)}
					{@const isSel = selectedId === d.id}
					<g
						role="button"
						tabindex="0"
						aria-label={d.label}
						onclick={() => onselect(d.id)}
						onkeydown={(e) => handleKey(e, d.id)}
						style="cursor: pointer;"
					>
						<circle
							cx={d.x ?? cx}
							cy={d.y ?? cy}
							r={isSel ? 22 : 18}
							fill={nodeColor(d)}
							stroke={isSel ? 'var(--panel-primary)' : 'var(--viz-surface)'}
							stroke-width="2"
						/>
						<text
							x={d.x ?? cx}
							y={(d.y ?? cy) + 3}
							fill="var(--viz-surface)"
							font-size="10"
							font-weight="700"
							text-anchor="middle"
							pointer-events="none"
						>
							{d.id === graph.rootId ? '★' : d.issues}
						</text>
						<text
							x={d.x ?? cx}
							y={(d.y ?? cy) + 34}
							fill="var(--panel-text)"
							font-size="9"
							text-anchor="middle"
							font-weight={isSel ? 700 : 500}
							pointer-events="none"
						>
							{d.label.length > 18 ? d.label.slice(0, 17) + '…' : d.label}
						</text>
					</g>
				{/each}
			</g>
		{/key}
	</svg>
	<div
		class="flex items-center gap-3 border-t px-3 py-1.5 text-[10px] text-[var(--panel-text-subtle)]"
		style="border-color: var(--panel-border);"
	>
		<span class="flex items-center gap-1"
			><span class="inline-block h-2 w-2 rounded-full" style="background-color: var(--viz-node-ok);"
			></span> no issues</span
		>
		<span class="flex items-center gap-1"
			><span
				class="inline-block h-2 w-2 rounded-full"
				style="background-color: var(--viz-node-warn);"
			></span> warnings</span
		>
		<span class="flex items-center gap-1"
			><span
				class="inline-block h-2 w-2 rounded-full"
				style="background-color: var(--viz-node-bad);"
			></span> failures</span
		>
		<span class="ml-auto">★ base state · number = total issues</span>
	</div>
</div>
