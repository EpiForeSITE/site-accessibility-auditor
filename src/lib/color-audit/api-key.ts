const STORAGE_KEY = 'colorAudit_openaiApiKey';

export async function getApiKey(): Promise<string | null> {
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
