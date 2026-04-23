<script lang="ts">
	import {
		getApiKey,
		setApiKey,
		clearApiKey,
		maskApiKey
	} from '../../shared/openai-key.ts';

	interface Props {
		onback: () => void;
		oncleared: () => void;
		description?: string;
	}

	let {
		onback,
		oncleared,
		description = 'Used by the Color Audit and Data Visualization panels to analyze pages with GPT-5.2-pro.'
	}: Props = $props();

	let maskedKey = $state('');
	let newKey = $state('');
	let showNewKey = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	async function loadKey() {
		const key = await getApiKey();
		maskedKey = key ? maskApiKey(key) : 'Not set';
	}

	loadKey();

	async function handleUpdate() {
		const trimmed = newKey.trim();
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
			newKey = '';
			editing = false;
			success = 'API key updated successfully';
			await loadKey();
			setTimeout(() => (success = null), 3000);
		} catch {
			error = 'Failed to save API key';
		} finally {
			saving = false;
		}
	}

	async function handleClear() {
		await clearApiKey();
		oncleared();
	}
</script>

<div class="flex h-full flex-col bg-[var(--panel-bg)] text-sm">
	<header
		class="flex shrink-0 items-center gap-2 border-b border-[var(--panel-border)] bg-[var(--panel-bg-elevated)] px-3 py-2"
	>
		<button
			onclick={onback}
			class="rounded p-1 text-[var(--panel-text-muted)] transition-colors hover:bg-[var(--panel-hover)] hover:text-[var(--panel-text)]"
			aria-label="Back"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="text-sm font-semibold text-[var(--panel-text)]">Settings</h1>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto p-4">
		{#if success}
			<div
				class="mb-4 rounded-lg border px-3 py-2 text-xs"
				style="border-color: var(--panel-success-border); background-color: var(--panel-success-bg); color: var(--panel-success-text);"
			>
				{success}
			</div>
		{/if}

		{#if error}
			<div
				class="mb-4 rounded-lg border px-3 py-2 text-xs"
				style="border-color: var(--panel-error-border); background-color: var(--panel-error-bg); color: var(--panel-error-text);"
			>
				{error}
			</div>
		{/if}

		<div
			class="rounded-xl border p-5"
			style="border-color: var(--panel-border); background-color: var(--panel-bg-elevated);"
		>
			<h2 class="mb-1 text-sm font-semibold text-[var(--panel-text)]">OpenAI API Key</h2>
			<p class="mb-4 text-xs text-[var(--panel-text-muted)]">
				{description}
			</p>

			<div class="mb-4">
				<div class="mb-1 text-xs font-medium text-[var(--panel-text-subtle)]">Current Key</div>
				<div
					class="rounded-lg border px-3 py-2 font-mono text-xs"
					style="border-color: var(--panel-border); background-color: var(--panel-bg); color: var(--panel-text-muted);"
				>
					{maskedKey}
				</div>
			</div>

			{#if editing}
				<div class="mb-4">
					<label
						class="mb-1 block text-xs font-medium text-[var(--panel-text-subtle)]"
						for="new-api-key"
					>
						New API Key
					</label>
					<div class="relative">
						<input
							id="new-api-key"
							type={showNewKey ? 'text' : 'password'}
							bind:value={newKey}
							placeholder="sk-..."
							class="w-full rounded-lg border px-3 py-2.5 pr-10 text-xs outline-none"
							style="
								border-color: var(--panel-border);
								background-color: var(--panel-bg);
								color: var(--panel-text);
							"
							onkeydown={(e) => {
								if (e.key === 'Enter') handleUpdate();
							}}
						/>
						<button
							type="button"
							onclick={() => (showNewKey = !showNewKey)}
							class="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--panel-text-subtle)] hover:text-[var(--panel-text-muted)]"
							aria-label={showNewKey ? 'Hide key' : 'Show key'}
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{#if showNewKey}
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
									/>
								{:else}
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
								{/if}
							</svg>
						</button>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						onclick={handleUpdate}
						disabled={saving || !newKey.trim()}
						class="rounded-lg bg-[var(--panel-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)] disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Update Key'}
					</button>
					<button
						onclick={() => {
							editing = false;
							newKey = '';
							error = null;
						}}
						class="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-medium text-[var(--panel-text-muted)] transition-colors hover:bg-[var(--panel-hover)]"
					>
						Cancel
					</button>
				</div>
			{:else}
				<div class="flex gap-2">
					<button
						onclick={() => (editing = true)}
						class="rounded-lg bg-[var(--panel-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--panel-primary-hover)]"
					>
						Change Key
					</button>
					<button
						onclick={handleClear}
						class="rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--panel-hover)]"
						style="border-color: var(--panel-error-border); color: var(--panel-error-text);"
					>
						Remove Key
					</button>
				</div>
			{/if}
		</div>

		<div class="mt-4 px-1">
			<p class="text-[10px] leading-relaxed text-[var(--panel-text-subtle)]">
				Your API key is stored locally using <code
					class="rounded px-1 py-0.5"
					style="background-color: var(--panel-code-bg);">chrome.storage.local</code
				>
				and is only sent to OpenAI's API. It is never shared with any other service.
			</p>
		</div>
	</div>
</div>
