import type { AuditResult } from '../types.ts';

export interface AuditRunRecord {
	id: string;
	origin: string;
	url: string;
	timestamp: string;
	thumbnail: string | null;
	result: AuditResult;
}

const STORAGE_KEY = 'audit-history-v1';
const MAX_RUNS_PER_ORIGIN = 10;

type HistoryBucket = Record<string, AuditRunRecord[]>;

async function readAll(): Promise<HistoryBucket> {
	try {
		const out = await chrome.storage.local.get(STORAGE_KEY);
		const bucket = out[STORAGE_KEY];
		return typeof bucket === 'object' && bucket !== null ? (bucket as HistoryBucket) : {};
	} catch {
		return {};
	}
}

async function writeAll(bucket: HistoryBucket): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEY]: bucket });
}

export async function getRuns(origin: string): Promise<AuditRunRecord[]> {
	const bucket = await readAll();
	return bucket[origin] ?? [];
}

export async function saveRun(
	result: AuditResult,
	thumbnail: string | null
): Promise<AuditRunRecord> {
	const record: AuditRunRecord = {
		id: `${result.origin}-${result.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
		origin: result.origin,
		url: result.url,
		timestamp: result.timestamp,
		thumbnail,
		result
	};
	const bucket = await readAll();
	const runs = bucket[result.origin] ?? [];
	runs.unshift(record);
	bucket[result.origin] = runs.slice(0, MAX_RUNS_PER_ORIGIN);
	await writeAll(bucket);
	return record;
}

export async function deleteRun(origin: string, id: string): Promise<void> {
	const bucket = await readAll();
	const runs = bucket[origin] ?? [];
	bucket[origin] = runs.filter((r) => r.id !== id);
	await writeAll(bucket);
}

export async function clearOrigin(origin: string): Promise<void> {
	const bucket = await readAll();
	delete bucket[origin];
	await writeAll(bucket);
}
