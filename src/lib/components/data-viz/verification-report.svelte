<script lang="ts">
	import type { VerificationClaim, VerificationVerdict } from '../../data-viz/types.ts';

	interface Props {
		claims: VerificationClaim[];
	}

	let { claims }: Props = $props();

	const verdictStyle: Record<VerificationVerdict, { color: string; label: string }> = {
		supported: { color: 'var(--viz-ok)', label: 'Supported' },
		contradicted: { color: 'var(--viz-bad)', label: 'Contradicted' },
		unsupported: { color: 'var(--viz-warn)', label: 'Unsupported' },
		out_of_scope: { color: 'var(--viz-muted)', label: 'Out of scope' }
	};

	const summary = $derived.by(() => {
		const s = { supported: 0, contradicted: 0, unsupported: 0, out_of_scope: 0 };
		for (const c of claims) s[c.verdict]++;
		return s;
	});
</script>

<div class="flex flex-col gap-3">
	<div class="grid grid-cols-4 gap-2">
		<div
			class="rounded-md border p-2 text-center"
			style="border-color: var(--viz-ok); background-color: color-mix(in srgb, var(--viz-ok) 10%, transparent);"
		>
			<div class="text-base font-bold tabular-nums" style="color: var(--viz-ok);">
				{summary.supported}
			</div>
			<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">Supported</div>
		</div>
		<div
			class="rounded-md border p-2 text-center"
			style="border-color: var(--viz-bad); background-color: color-mix(in srgb, var(--viz-bad) 10%, transparent);"
		>
			<div class="text-base font-bold tabular-nums" style="color: var(--viz-bad);">
				{summary.contradicted}
			</div>
			<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
				Contradicted
			</div>
		</div>
		<div
			class="rounded-md border p-2 text-center"
			style="border-color: var(--viz-warn); background-color: color-mix(in srgb, var(--viz-warn) 10%, transparent);"
		>
			<div class="text-base font-bold tabular-nums" style="color: var(--viz-warn);">
				{summary.unsupported}
			</div>
			<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
				Unsupported
			</div>
		</div>
		<div
			class="rounded-md border p-2 text-center"
			style="border-color: var(--viz-muted); background-color: color-mix(in srgb, var(--viz-muted) 10%, transparent);"
		>
			<div class="text-base font-bold tabular-nums" style="color: var(--viz-muted);">
				{summary.out_of_scope}
			</div>
			<div class="text-[9px] tracking-wide text-[var(--panel-text-muted)] uppercase">
				Out-of-scope
			</div>
		</div>
	</div>

	{#if claims.length === 0}
		<div
			class="rounded-md border px-3 py-2 text-[11px] text-[var(--panel-text-muted)]"
			style="border-color: var(--panel-border); background-color: var(--panel-summary-bg);"
		>
			No textual description was available to verify. Add an <code>aria-label</code>, caption, or
			long description to enable grounded verification.
		</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each claims as claim, i (i)}
				<li
					class="rounded-md border px-3 py-2 text-[11px] leading-relaxed"
					style="border-color: color-mix(in srgb, {verdictStyle[claim.verdict]
						.color} 35%, var(--panel-border)); background-color: color-mix(in srgb, {verdictStyle[
						claim.verdict
					].color} 6%, var(--panel-bg-elevated));"
				>
					<div class="mb-1 flex items-center gap-1.5">
						<span
							class="inline-block h-2 w-2 rounded-full"
							style="background-color: {verdictStyle[claim.verdict].color};"
							aria-hidden="true"
						></span>
						<span
							class="text-[9px] font-bold tracking-wide uppercase"
							style="color: {verdictStyle[claim.verdict].color};"
						>
							{verdictStyle[claim.verdict].label}
						</span>
					</div>
					<p class="text-[var(--panel-text)]">"{claim.text}"</p>
					{#if claim.evidence}
						<p class="mt-1 text-[10px] text-[var(--panel-text-muted)]">
							<span class="font-semibold">Evidence:</span>
							{claim.evidence}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
