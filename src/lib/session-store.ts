export interface HelpMechanism {
	kind: 'contact' | 'help' | 'chat' | 'phone' | 'email' | 'faq';
	region: 'header' | 'footer' | 'sticky' | 'body';
	text: string;
	href: string | null;
}

export interface HelpSignature {
	url: string;
	timestamp: string;
	mechanisms: HelpMechanism[];
}

export interface SessionStore {
	getHelpSignatures(origin: string): Promise<HelpSignature[]>;
	appendHelpSignature(origin: string, sig: HelpSignature): Promise<void>;
	getKnownFieldTokens(origin: string): Promise<string[]>;
	recordFieldTokens(origin: string, tokens: string[]): Promise<void>;
	reset(origin: string): Promise<void>;
}

const NS = 'wcag22_audit';

function helpKey(origin: string): string {
	return `${NS}:help:${origin}`;
}

function tokenKey(origin: string): string {
	return `${NS}:tokens:${origin}`;
}

function hasChromeStorage(): boolean {
	return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
}

async function read<T>(key: string, fallback: T): Promise<T> {
	if (!hasChromeStorage()) {
		try {
			const raw = globalThis.localStorage?.getItem(key);
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}
	return new Promise((resolve) => {
		chrome.storage.local.get([key], (items) => {
			const v = items?.[key];
			resolve(v === undefined ? fallback : (v as T));
		});
	});
}

async function write<T>(key: string, value: T): Promise<void> {
	if (!hasChromeStorage()) {
		try {
			globalThis.localStorage?.setItem(key, JSON.stringify(value));
		} catch {
			// ignore
		}
		return;
	}
	return new Promise((resolve) => {
		chrome.storage.local.set({ [key]: value }, () => resolve());
	});
}

async function remove(key: string): Promise<void> {
	if (!hasChromeStorage()) {
		try {
			globalThis.localStorage?.removeItem(key);
		} catch {
			// ignore
		}
		return;
	}
	return new Promise((resolve) => {
		chrome.storage.local.remove([key], () => resolve());
	});
}

export const chromeStorageSession: SessionStore = {
	async getHelpSignatures(origin) {
		return read<HelpSignature[]>(helpKey(origin), []);
	},
	async appendHelpSignature(origin, sig) {
		const existing = await read<HelpSignature[]>(helpKey(origin), []);
		existing.push(sig);
		const trimmed = existing.slice(-20);
		await write(helpKey(origin), trimmed);
	},
	async getKnownFieldTokens(origin) {
		return read<string[]>(tokenKey(origin), []);
	},
	async recordFieldTokens(origin, tokens) {
		const existing = await read<string[]>(tokenKey(origin), []);
		const merged = Array.from(new Set([...existing, ...tokens]));
		await write(tokenKey(origin), merged);
	},
	async reset(origin) {
		await remove(helpKey(origin));
		await remove(tokenKey(origin));
	}
};

export function createMemorySessionStore(): SessionStore {
	const help = new Map<string, HelpSignature[]>();
	const tokens = new Map<string, Set<string>>();
	return {
		async getHelpSignatures(origin) {
			return [...(help.get(origin) ?? [])];
		},
		async appendHelpSignature(origin, sig) {
			const arr = help.get(origin) ?? [];
			arr.push(sig);
			help.set(origin, arr.slice(-20));
		},
		async getKnownFieldTokens(origin) {
			return [...(tokens.get(origin) ?? new Set<string>())];
		},
		async recordFieldTokens(origin, ts) {
			const set = tokens.get(origin) ?? new Set<string>();
			for (const t of ts) set.add(t);
			tokens.set(origin, set);
		},
		async reset(origin) {
			help.delete(origin);
			tokens.delete(origin);
		}
	};
}
