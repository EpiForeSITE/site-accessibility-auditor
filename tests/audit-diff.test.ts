import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffAudits, issueSignature } from '../src/lib/shared/audit-diff.ts';
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
		selector: 'button.a',
		domPath: 'body > button.a',
		attributes: {},
		evidence: { size: 10 },
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
		origin: 'x',
		url: 'x/'
	};
}

test('new issues are classified as new', () => {
	const diff = diffAudits(mkResult([]), mkResult([mkIssue()]));
	assert.equal(diff.totals.new, 1);
});

test('resolved issues appear when previous had them but current does not', () => {
	const diff = diffAudits(mkResult([mkIssue()]), mkResult([]));
	assert.equal(diff.totals.resolved, 1);
});

test('unchanged issues keep the same signature across runs', () => {
	const a = mkIssue();
	const b = mkIssue();
	const diff = diffAudits(mkResult([a]), mkResult([b]));
	assert.equal(diff.totals.unchanged, 1);
});

test('status changes are flagged as modified', () => {
	const before = mkIssue({ status: 'warning' });
	const after = mkIssue({ status: 'fail' });
	const diff = diffAudits(mkResult([before]), mkResult([after]));
	assert.equal(diff.totals.modified, 1);
});

test('signature stays stable when evidence keys are reordered', () => {
	const a = mkIssue({ evidence: { a: 1, b: 2 } });
	const b = mkIssue({ evidence: { b: 2, a: 1 } });
	assert.equal(issueSignature(a), issueSignature(b));
});
