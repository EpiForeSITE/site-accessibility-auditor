import type { AuditIssue, AuditResult, WcagSC } from '../types.ts';

export type DiffStatus = 'new' | 'resolved' | 'unchanged' | 'modified';

export interface DiffEntry {
	status: DiffStatus;
	signature: string;
	current: AuditIssue | null;
	previous: AuditIssue | null;
}

export interface CriterionDelta {
	wcag: WcagSC;
	previous: number;
	current: number;
	delta: number;
}

export interface AuditDiff {
	entries: DiffEntry[];
	totals: Record<DiffStatus, number>;
	perCriterion: CriterionDelta[];
}

export function issueSignature(issue: AuditIssue): string {
	const path = issue.selector ?? issue.domPath ?? '';
	const evidenceHash = hashEvidence(issue.evidence);
	return [issue.wcag, issue.category, issue.tag, path, evidenceHash].join('|');
}

function hashEvidence(evidence: Record<string, unknown>): string {
	const keys = Object.keys(evidence).sort();
	const parts: string[] = [];
	for (const k of keys.slice(0, 5)) {
		const v = evidence[k];
		if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
			parts.push(`${k}=${String(v).slice(0, 40)}`);
		}
	}
	return parts.join(';');
}

export function diffAudits(previous: AuditResult | null, current: AuditResult): AuditDiff {
	const prevMap = new Map<string, AuditIssue>();
	if (previous) {
		for (const issue of previous.issues) {
			prevMap.set(issueSignature(issue), issue);
		}
	}

	const entries: DiffEntry[] = [];
	const seen = new Set<string>();

	for (const issue of current.issues) {
		const sig = issueSignature(issue);
		seen.add(sig);
		const prev = prevMap.get(sig);
		if (!prev) {
			entries.push({ status: 'new', signature: sig, current: issue, previous: null });
		} else if (prev.status !== issue.status) {
			entries.push({ status: 'modified', signature: sig, current: issue, previous: prev });
		} else {
			entries.push({ status: 'unchanged', signature: sig, current: issue, previous: prev });
		}
	}

	if (previous) {
		for (const issue of previous.issues) {
			const sig = issueSignature(issue);
			if (!seen.has(sig)) {
				entries.push({ status: 'resolved', signature: sig, current: null, previous: issue });
			}
		}
	}

	const totals: Record<DiffStatus, number> = {
		new: 0,
		resolved: 0,
		unchanged: 0,
		modified: 0
	};
	for (const e of entries) totals[e.status]++;

	const criterionKeys = new Set<WcagSC>();
	for (const e of entries) {
		const w = (e.current?.wcag ?? e.previous?.wcag) as WcagSC | undefined;
		if (w) criterionKeys.add(w);
	}
	const perCriterion: CriterionDelta[] = [];
	for (const wcag of criterionKeys) {
		const prevCount = previous?.perCriterion[wcag]?.total ?? 0;
		const curCount = current.perCriterion[wcag]?.total ?? 0;
		perCriterion.push({
			wcag,
			previous: prevCount,
			current: curCount,
			delta: curCount - prevCount
		});
	}
	perCriterion.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

	return { entries, totals, perCriterion };
}
