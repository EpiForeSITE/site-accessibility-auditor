import { evalInPage, captureTab } from '../shared/devtools-eval.ts';
import { runAudit } from '../auditor.ts';
import type { AuditResult } from '../types.ts';
import { collectCandidates } from './candidate-collector.ts';
import { computeStateSignature } from './state-signature.ts';
import type {
	ExplorerProgress,
	InteractionCandidate,
	InteractionState,
	StateGraph,
	StateTransition
} from './types.ts';

async function clickCandidate(selector: string): Promise<boolean> {
	const expr = `(function() {
		try {
			var el = document.querySelector(${JSON.stringify(selector)});
			if (!el) return false;
			el.scrollIntoView({ block: 'center' });
			el.click();
			return true;
		} catch (e) { return false; }
	})()`;
	return evalInPage<boolean>(expr);
}

async function tryRollback(selector: string, kind: string): Promise<void> {
	const expr = `(function() {
		try {
			var esc = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 });
			document.dispatchEvent(esc);
			if (${JSON.stringify(kind)} === 'disclosure' || ${JSON.stringify(kind)} === 'tab' || ${JSON.stringify(kind)} === 'menu-opener' || ${JSON.stringify(kind)} === 'summary') {
				var el = document.querySelector(${JSON.stringify(selector)});
				if (el) el.click();
			}
			if (${JSON.stringify(kind)} === 'in-page-link') {
				window.history.back();
			}
		} catch (e) {}
	})()`;
	await evalInPage(expr);
}

async function waitMs(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

function issuesByCategory(result: AuditResult): Record<string, number> {
	const out: Record<string, number> = {};
	for (const issue of result.issues) {
		out[issue.category] = (out[issue.category] ?? 0) + 1;
	}
	return out;
}

export interface ExploreOptions {
	budget?: number;
	onProgress?: (p: ExplorerProgress) => void;
	signal?: AbortSignal;
}

export async function exploreStates(options: ExploreOptions = {}): Promise<StateGraph> {
	const budget = options.budget ?? 8;
	const report = (p: ExplorerProgress) => options.onProgress?.(p);

	report({
		phase: 'collecting',
		message: 'Collecting candidate interactions…',
		statesFound: 0,
		candidatesProcessed: 0,
		candidatesTotal: 0
	});

	const candidates = await collectCandidates(Math.max(budget * 2, 24));

	report({
		phase: 'base',
		message: 'Auditing base state…',
		statesFound: 0,
		candidatesProcessed: 0,
		candidatesTotal: candidates.length
	});

	const baseResult = await runAudit();
	const baseSignature = await computeStateSignature();
	const baseShot = await captureTab();

	const baseState: InteractionState = {
		id: 'state-0',
		depth: 0,
		triggerCandidateId: null,
		triggerLabel: 'base',
		signature: baseSignature,
		screenshot: baseShot,
		result: baseResult,
		issuesByCategory: issuesByCategory(baseResult),
		discoveredAt: new Date().toISOString()
	};

	const states: InteractionState[] = [baseState];
	const transitions: StateTransition[] = [];
	const seenSignatures = new Map<string, string>([[baseSignature, baseState.id]]);

	const toProcess = candidates.slice(0, budget);
	let processed = 0;

	for (const candidate of toProcess) {
		if (options.signal?.aborted) break;
		processed++;
		report({
			phase: 'exploring',
			message: `Trying "${candidate.label.slice(0, 40)}"…`,
			statesFound: states.length,
			candidatesProcessed: processed,
			candidatesTotal: toProcess.length
		});

		try {
			await captureAndStep(candidate, states, transitions, seenSignatures, baseState.id);
		} catch {
			// best-effort exploration, continue
		}

		try {
			await tryRollback(candidate.selector, candidate.kind);
			await waitMs(180);
		} catch {
			// ignore
		}
	}

	report({
		phase: 'done',
		message: `Explored ${toProcess.length} candidates, ${states.length - 1} new state(s).`,
		statesFound: states.length,
		candidatesProcessed: processed,
		candidatesTotal: toProcess.length
	});

	return {
		states,
		transitions,
		rootId: baseState.id,
		budget: { max: budget, used: processed },
		timestamp: new Date().toISOString(),
		origin: baseResult.origin,
		url: baseResult.url
	};
}

async function captureAndStep(
	candidate: InteractionCandidate,
	states: InteractionState[],
	transitions: StateTransition[],
	seenSignatures: Map<string, string>,
	baseId: string
): Promise<void> {
	const clicked = await clickCandidate(candidate.selector);
	if (!clicked) return;
	await waitMs(350);
	const sig = await computeStateSignature();
	const existing = seenSignatures.get(sig);
	if (existing) {
		transitions.push({
			from: baseId,
			to: existing,
			candidateId: candidate.id,
			label: candidate.label
		});
		return;
	}
	const newResult = await runAudit();
	const screenshot = await captureTab();
	const newId = `state-${states.length}`;
	const newState: InteractionState = {
		id: newId,
		depth: 1,
		triggerCandidateId: candidate.id,
		triggerLabel: candidate.label || candidate.kind,
		signature: sig,
		screenshot,
		result: newResult,
		issuesByCategory: issuesByCategory(newResult),
		discoveredAt: new Date().toISOString()
	};
	states.push(newState);
	transitions.push({
		from: baseId,
		to: newId,
		candidateId: candidate.id,
		label: candidate.label
	});
	seenSignatures.set(sig, newId);
}
