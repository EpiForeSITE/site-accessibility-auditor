const STORAGE_KEY = 'openai_api_key';
const LEGACY_STORAGE_KEY = 'colorAudit_openaiApiKey';

let migrationAttempted = false;

async function migrateLegacyKey(): Promise<void> {
	if (migrationAttempted) return;
	migrationAttempted = true;
	const both = await chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
	const current = both[STORAGE_KEY] as string | undefined;
	const legacy = both[LEGACY_STORAGE_KEY] as string | undefined;
	if (!current && legacy) {
		await chrome.storage.local.set({ [STORAGE_KEY]: legacy });
	}
	if (legacy) {
		await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
	}
}

export async function getApiKey(): Promise<string | null> {
	await migrateLegacyKey();
	const result = await chrome.storage.local.get(STORAGE_KEY);
	return (result[STORAGE_KEY] as string) ?? null;
}

export async function setApiKey(key: string): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEY]: key });
}

export async function clearApiKey(): Promise<void> {
	await chrome.storage.local.remove(STORAGE_KEY);
}

export function maskApiKey(key: string): string {
	if (key.length <= 8) return '••••••••';
	return key.slice(0, 4) + '••••••••' + key.slice(-4);
}
