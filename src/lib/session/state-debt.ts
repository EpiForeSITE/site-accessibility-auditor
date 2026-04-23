import type { AuditIssue } from '../types.ts';
import type { CategoryDebt, StateDebtMetric, StateGraph } from './types.ts';

const severityWeight: Record<AuditIssue['status'], number> = {
	fail: 1,
	warning: 0.5,
	pass: 0,
	exempt: 0
};

function issueKey(issue: AuditIssue): string {
	return [issue.wcag, issue.category, issue.selector ?? issue.domPath ?? '', issue.tag].join('|');
}

export function computeStateDebt(graph: StateGraph): StateDebtMetric {
	if (graph.states.length === 0) {
		return {
			total: 0,
			statesExplored: 0,
			averagePerState: 0,
			byCategory: [],
			worstStates: []
		};
	}

	const baseState = graph.states[0];
	const baseKeys = new Set(baseState.result.issues.map(issueKey));
	const baseCategory: Record<string, number> = {};
	for (const issue of baseState.result.issues) {
		baseCategory[issue.category] = (baseCategory[issue.category] ?? 0) + 1;
	}

	let total = 0;
	const byCategoryMap = new Map<string, CategoryDebt>();
	for (const [category, base] of Object.entries(baseCategory)) {
		byCategoryMap.set(category, { category, base, discovered: 0, debt: 0 });
	}

	const worstStates: StateDebtMetric['worstStates'] = [];

	for (let i = 1; i < graph.states.length; i++) {
		const state = graph.states[i];
		const depthDecay = Math.pow(0.85, state.depth);
		let stateNewIssues = 0;
		let stateSeverityWeighted = 0;
		for (const issue of state.result.issues) {
			if (!baseKeys.has(issueKey(issue))) {
				stateNewIssues++;
				const weight = severityWeight[issue.status] ?? 0;
				stateSeverityWeighted += weight * depthDecay;
				const bucket = byCategoryMap.get(issue.category) ?? {
					category: issue.category,
					base: 0,
					discovered: 0,
					debt: 0
				};
				bucket.discovered++;
				bucket.debt += weight * depthDecay;
				byCategoryMap.set(issue.category, bucket);
			}
		}
		total += stateSeverityWeighted;
		worstStates.push({
			stateId: state.id,
			label: state.triggerLabel,
			newIssues: stateNewIssues,
			severityWeighted: stateSeverityWeighted
		});
	}

	worstStates.sort((a, b) => b.severityWeighted - a.severityWeighted);

	const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.debt - a.debt);

	return {
		total,
		statesExplored: graph.states.length - 1,
		averagePerState: graph.states.length > 1 ? total / (graph.states.length - 1) : 0,
		byCategory,
		worstStates: worstStates.slice(0, 5)
	};
}
