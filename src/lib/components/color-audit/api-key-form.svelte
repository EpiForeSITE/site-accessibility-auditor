<script lang="ts">
	import { setApiKey } from '../../color-audit/api-key.ts';

	interface Props {
		onsaved: () => void;
	}

	let { onsaved }: Props = $props();

	let apiKey = $state('');
	let showKey = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleSave() {
		const trimmed = apiKey.trim();
		if (!trimmed) {
			error = 'Please enter an API key';
			return;
		}
		if (!trimmed.startsWith('sk-')) {
			error = 'OpenAI API keys start with "sk-"';
			return;
		}

		saving = true;
		error = null;
		try {
			await setApiKey(trimmed);
			onsaved();
		} catch {
			error = 'Failed to save API key';
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex h-full items-center justify-center px-6">
	<div
		class="w-full max-w-md rounded-xl border p-8 shadow-sm"
		style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
	>
		<!-- Icon -->
		<div class="mb-6 flex justify-center">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-full"
				style="background-color: color-mix(in srgb, var(--panel-primary) 15%, transparent);"
			>
				<svg
					class="h-7 w-7"
					style="color: var(--panel-primary);"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
					/>
				</svg>
			</div>
		</div>

		<h2 class="mb-2 text-center text-base font-semibold text-[var(--panel-text)]">
			OpenAI API Key Required
		</h2>
		<p class="mb-6 text-center text-xs leading-relaxed text-[var(--panel-text-muted)]">
			The Color Audit panel uses GPT-5.2-pro to intelligently identify and group colors from the
			inspected page. Your key is stored locally in the extension and never sent elsewhere.
		</p>

		{#if error}
			<div
				class="mb-4 rounded-lg border px-3 py-2 text-xs"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		<div class="mb-4">
			<label class="mb-1.5 block text-xs font-medium text-[var(--panel-text-muted)]" for="api-key">
				API Key
			</label>
			<div class="relative">
				<input
					id="api-key"
					type={showKey ? 'text' : 'password'}
					bind:value={apiKey}
					placeholder="sk-..."
					class="w-full rounded-lg border px-3 py-2.5 pr-10 text-xs transition-colors outline-none"
					style="
						border-color: var(--panel-border);
						background-color: var(--panel-bg);
						color: var(--panel-text);
					"
					onfocus={(e) => {
						(e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-primary)';
					}}
					onblur={(e) => {
						(e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-border)';
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') handleSave();
					}}
				/>
				<button
					type="button"
					onclick={() => (showKey = !showKey)}
					class="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--panel-text-subtle)] hover:text-[var(--panel-text-muted)]"
					aria-label={showKey ? 'Hide key' : 'Show key'}
				>
					{#if showKey}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
							/>
						</svg>
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<button
			onclick={handleSave}
			disabled={saving || !apiKey.trim()}
			class="w-full rounded-lg bg-[var(--panel-primary)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)] disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save & Continue'}
		</button>

		<p class="mt-4 text-center text-[10px] leading-relaxed text-[var(--panel-text-subtle)]">
			Get your API key from
			<a
				href="https://platform.openai.com/api-keys"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-[var(--panel-primary)]"
			>
				platform.openai.com
			</a>
		</p>
	</div>
</div>
