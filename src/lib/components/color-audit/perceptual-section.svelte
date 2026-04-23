<script lang="ts">
	import { applyPerceptualMode, clearPerceptualMode } from '../../perceptual/simulators.ts';
	import type { PerceptualLevel, PerceptualMode } from '../../perceptual/types.ts';
	import SectionCard from '../ui/section-card.svelte';

	let mode = $state<PerceptualMode>('none');
	let level = $state<PerceptualLevel>('moderate');
	let busy = $state(false);
	let error = $state<string | null>(null);

	const modes: { id: PerceptualMode; label: string; description: string }[] = [
		{ id: 'none', label: 'Off', description: 'No simulation.' },
		{
			id: 'low-vision',
			label: 'Low vision',
			description: 'Blur + reduced contrast + reduced brightness (20/40 · 20/60 · 20/200).'
		},
		{
			id: 'cataract',
			label: 'Cataract',
			description: 'Diffuse blur with yellow tint and peripheral haze.'
		},
		{
			id: 'reduced-contrast',
			label: 'Contrast loss',
			description: 'Grayscale + contrast reduction, simulating low-contrast vision.'
		},
		{
			id: 'focus-only',
			label: 'Keyboard-only',
			description: 'Dims all content except the currently focused element chain.'
		},
		{
			id: 'reduced-motion',
			label: 'Reduced motion',
			description: 'Disables animations and transitions in the inspected page.'
		}
	];

	const levels: { id: PerceptualLevel; label: string }[] = [
		{ id: 'mild', label: 'Mild' },
		{ id: 'moderate', label: 'Moderate' },
		{ id: 'severe', label: 'Severe' }
	];

	async function apply(nextMode: PerceptualMode) {
		if (busy) return;
		busy = true;
		error = null;
		try {
			mode = nextMode;
			await applyPerceptualMode(mode, level);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not apply simulation.';
		} finally {
			busy = false;
		}
	}

	async function changeLevel(nextLevel: PerceptualLevel) {
		level = nextLevel;
		if (mode !== 'none') {
			await apply(mode);
		}
	}

	async function handleClear() {
		mode = 'none';
		await clearPerceptualMode();
	}
</script>

<SectionCard title="Perceptual simulation" subtitle="Feature G · page-level preview">
	{#snippet actions()}
		{#if mode !== 'none'}
			<button
				onclick={handleClear}
				class="rounded border px-2 py-0.5 text-[10px] text-[var(--panel-text-muted)] hover:bg-[var(--panel-hover)]"
				style="border-color: var(--panel-border);"
			>
				Clear
			</button>
		{/if}
	{/snippet}

	<div class="flex flex-col gap-2">
		<div
			class="flex items-center gap-1 rounded-md border p-0.5"
			style="border-color: var(--panel-border);"
			role="group"
			aria-label="Intensity"
		>
			{#each levels as l (l.id)}
				<button
					onclick={() => changeLevel(l.id)}
					class="flex-1 rounded-sm px-2 py-0.5 text-[11px] transition-colors"
					style:background-color={level === l.id ? 'var(--panel-filter-active-bg)' : 'transparent'}
					style:color={level === l.id
						? 'var(--panel-filter-active-text)'
						: 'var(--panel-text-muted)'}
				>
					{l.label}
				</button>
			{/each}
		</div>

		<ul class="grid grid-cols-1 gap-1.5 md:grid-cols-2">
			{#each modes as m (m.id)}
				<li>
					<button
						onclick={() => apply(m.id)}
						class="flex w-full flex-col items-start gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--panel-hover)]"
						style:border-color={mode === m.id ? 'var(--panel-primary)' : 'var(--panel-border)'}
						style:background-color={mode === m.id
							? 'color-mix(in srgb, var(--panel-primary) 8%, transparent)'
							: 'transparent'}
					>
						<span class="text-[11px] font-semibold text-[var(--panel-text)]">{m.label}</span>
						<span class="text-[10px] text-[var(--panel-text-muted)]">{m.description}</span>
					</button>
				</li>
			{/each}
		</ul>

		{#if error}
			<div
				class="rounded-md border px-2 py-1 text-[10px]"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}
	</div>
</SectionCard>
