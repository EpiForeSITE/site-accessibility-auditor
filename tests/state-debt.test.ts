import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStateDebt } from '../src/lib/session/state-debt.ts';
import type { InteractionState, StateGraph } from '../src/lib/session/types.ts';
import type { AuditIssue, AuditResult } from '../src/lib/types.ts';

function mkIssue(partial: Partial<AuditIssue> = {}): AuditIssue {
	return {
		id: 0,
		wcag: '2.5.8',
		category: 'target-size',
		status: 'fail',
		tag: 'button',
		text: '',
		rect: null,
		selector: 'button.foo',
		domPath: 'body > button',
		attributes: {},
		evidence: {},
		suggestion: '',
		...partial
	};
}

function mkResult(issues: AuditIssue[]): AuditResult {
	return {
		issues,
		summary: { total: issues.length, pass: 0, warning: 0, fail: issues.length, exempt: 0 },
		perCriterion: {},
		timestamp: new Date().toISOString(),
		origin: 'https://x',
		url: 'https://x/'
	};
}

function mkState(id: string, depth: number, issues: AuditIssue[]): InteractionState {
	return {
		id,
		depth,
		triggerCandidateId: null,
		triggerLabel: id,
		signature: id,
		screenshot: null,
		result: mkResult(issues),
		issuesByCategory: issues.reduce<Record<string, number>>((acc, i) => {
			acc[i.category] = (acc[i.category] ?? 0) + 1;
			return acc;
		}, {}),
		discoveredAt: new Date().toISOString()
	};
}

test('base state with no issues produces zero debt', () => {
	const graph: StateGraph = {
		states: [mkState('state-0', 0, [])],
		transitions: [],
		rootId: 'state-0',
		budget: { max: 4, used: 0 },
		timestamp: new Date().toISOString(),
		origin: 'https://x',
		url: 'https://x/'
	};
	const d = computeStateDebt(graph);
	assert.equal(d.total, 0);
	assert.equal(d.statesExplored, 0);
});

test('new issues in child states contribute to debt', () => {
	const base = mkState('state-0', 0, []);
	const child = mkState('state-1', 1, [mkIssue({ selector: 'button.new-fail' })]);
	const graph: StateGraph = {
		states: [base, child],
		transitions: [{ from: 'state-0', to: 'state-1', candidateId: 0, label: 'Open' }],
		rootId: 'state-0',
		budget: { max: 4, used: 1 },
		timestamp: new Date().toISOString(),
		origin: 'https://x',
		url: 'https://x/'
	};
	const d = computeStateDebt(graph);
	assert.ok(d.total > 0);
	assert.equal(d.statesExplored, 1);
	assert.equal(d.worstStates[0].stateId, 'state-1');
});

test('issues present in base are not counted as state-dependent', () => {
	const sharedIssue = mkIssue({ selector: 'button.shared' });
	const base = mkState('state-0', 0, [sharedIssue]);
	const child = mkState('state-1', 1, [sharedIssue]);
	const graph: StateGraph = {
		states: [base, child],
		transitions: [{ from: 'state-0', to: 'state-1', candidateId: 0, label: 't' }],
		rootId: 'state-0',
		budget: { max: 4, used: 1 },
		timestamp: new Date().toISOString(),
		origin: 'https://x',
		url: 'https://x/'
	};
	const d = computeStateDebt(graph);
	assert.equal(d.total, 0);
});
