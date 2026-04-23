import type { AuditIssue, AuditResult } from '../types.ts';

export type CandidateKind =
	| 'disclosure'
	| 'tab'
	| 'dialog-opener'
	| 'menu-opener'
	| 'summary'
	| 'in-page-link'
	| 'button';

export interface InteractionCandidate {
	id: number;
	kind: CandidateKind;
	selector: string;
	label: string;
	rect: { x: number; y: number; width: number; height: number };
}

export interface InteractionState {
	id: string;
	depth: number;
	triggerCandidateId: number | null;
	triggerLabel: string;
	signature: string;
	screenshot: string | null;
	result: AuditResult;
	issuesByCategory: Record<string, number>;
	discoveredAt: string;
}

export interface StateTransition {
	from: string;
	to: string;
	candidateId: number;
	label: string;
}

export interface StateGraph {
	states: InteractionState[];
	transitions: StateTransition[];
	rootId: string;
	budget: {
		max: number;
		used: number;
	};
	timestamp: string;
	origin: string;
	url: string;
}

export interface CategoryDebt {
	category: string;
	base: number;
	discovered: number;
	debt: number;
}

export interface StateDebtMetric {
	total: number;
	statesExplored: number;
	averagePerState: number;
	byCategory: CategoryDebt[];
	worstStates: { stateId: string; label: string; newIssues: number; severityWeighted: number }[];
}

export interface ExplorerProgress {
	phase: 'idle' | 'collecting' | 'base' | 'exploring' | 'done' | 'error';
	message: string;
	statesFound: number;
	candidatesProcessed: number;
	candidatesTotal: number;
}

export type { AuditIssue };
