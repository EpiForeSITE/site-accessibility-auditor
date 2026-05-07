import type { DiffKind, DiffPair, ReadingEntry, ReadingOrderDiff } from './types.ts';

function canonicalRole(tag: string, explicitRole: string | null): string {
	if (explicitRole) return explicitRole;
	const map: Record<string, string> = {
		h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
		nav: 'navigation', main: 'main', aside: 'complementary', section: 'region',
		header: 'banner', footer: 'contentinfo', article: 'article', img: 'img',
		figure: 'figure', table: 'table', button: 'button', a: 'link', input: 'textbox',
		select: 'combobox', textarea: 'textbox', summary: 'button'
	};
	return map[tag] ?? tag;
}

function classifyKind(entry: ReadingEntry): DiffKind {
	// Positive tabindex is reported as an authoring smell separately from
	// drift, even when it happens to coincide with visual order.
	if (entry.tab?.tabindex !== null && (entry.tab?.tabindex ?? 0) > 0) {
		return 'positive-tabindex';
	}
	// Visually present & interactive but not keyboard reachable.
	if (entry.visual?.isInteractive && entry.tabIndex === null) {
		return 'tab-unreachable';
	}
	// Entry exists visually/interactive but AX skipped it.
	if (entry.axIndex === null && entry.visual && (entry.visual.isInteractive || entry.visual.isSemantic)) {
		return 'missing-in-ax';
	}
	// Extra-in-ax: AX surfaces something with no interactive/semantic
	// visual footprint (rare with our current walker; used for generic
	// aria-only nodes).
	if (entry.axIndex !== null && entry.visual === null) {
		return 'extra-in-ax';
	}
	if (entry.axIndex !== null && entry.ax) {
		const canonical = canonicalRole(entry.tag, entry.visual?.explicitRole ?? null);
		if (entry.visual && canonical !== entry.ax.role) return 'role-mismatch';
		if (entry.ax.name.length === 0) return 'name-missing';
	}
	return 'match';
}

function countMismatches(a: Map<string, number>, b: Map<string, number>): number {
	let c = 0;
	a.forEach((ai, key) => {
		const bi = b.get(key);
		if (bi !== undefined && bi !== ai) c++;
	});
	return c;
}

export function diffReadingOrder(entries: ReadingEntry[]): ReadingOrderDiff {
	const pairs: DiffPair[] = [];
	const pairsByKey = new Map<string, DiffPair>();

	// Tab break detection: reorder tabbables by visual index; any position
	// where the rank disagrees with its tabIndex is a break. We overlay
	// this onto the base classification so a tab-break trumps match.
	const tabEntries = entries.filter((e) => e.tabIndex !== null);
	const visualRank = tabEntries
		.slice()
		.sort((a, b) => a.visualIndex - b.visualIndex)
		.reduce((acc, e, i) => acc.set(e.key, i), new Map<string, number>());
	const tabBreaks = new Set<string>();
	for (const e of tabEntries) {
		const vr = visualRank.get(e.key);
		if (vr !== undefined && vr !== e.tabIndex) tabBreaks.add(e.key);
	}

	// Order drift: visual-vs-DOM drift on AX-visible entries. Keeps the
	// semantics of the old tree-differ for tree/wireframe highlighting.
	const axByKey = entries.filter((e) => e.axIndex !== null);
	const visualOfAx = axByKey
		.slice()
		.sort((a, b) => a.visualIndex - b.visualIndex)
		.reduce((acc, e, i) => acc.set(e.key, i), new Map<string, number>());
	const orderDrift = new Set<string>();
	for (const e of axByKey) {
		const expected = visualOfAx.get(e.key);
		if (expected !== undefined && expected !== e.axIndex) orderDrift.add(e.key);
	}

	for (const entry of entries) {
		let kind = classifyKind(entry);
		// Overlay keyboard / drift findings on top of the identity check.
		if (kind === 'match' || kind === 'name-missing') {
			if (tabBreaks.has(entry.key)) kind = 'tab-break';
			else if (orderDrift.has(entry.key)) kind = 'order-drift';
		}
		const pair: DiffPair = {
			kind,
			entry,
			axIndex: entry.axIndex,
			visualIndex: entry.visualIndex,
			tabIndex: entry.tabIndex,
			domIndex: entry.domIndex
		};
		pairs.push(pair);
		pairsByKey.set(entry.key, pair);
	}

	const summary: Record<DiffKind, number> = {
		match: 0,
		'missing-in-ax': 0,
		'extra-in-ax': 0,
		'role-mismatch': 0,
		'name-missing': 0,
		'order-drift': 0,
		'tab-break': 0,
		'tab-unreachable': 0,
		'positive-tabindex': 0
	};
	for (const p of pairs) summary[p.kind]++;

	// Pairwise mismatches:
	//  - domVsVisual / axVsVisual consider every entry that has both indices.
	//  - domVsTab / visualVsTab consider tabbables; "position" is the entry's
	//    rank among tabbables under each order.
	const allDom = new Map<string, number>();
	const allVisual = new Map<string, number>();
	entries.forEach((e) => {
		allDom.set(e.key, e.domIndex);
		allVisual.set(e.key, e.visualIndex);
	});
	const domVsVisualRanked = (() => {
		const keys = entries.slice().sort((a, b) => a.domIndex - b.domIndex);
		const dRank = new Map<string, number>();
		const vRank = new Map<string, number>();
		keys.forEach((e, i) => dRank.set(e.key, i));
		keys
			.slice()
			.sort((a, b) => a.visualIndex - b.visualIndex)
			.forEach((e, i) => vRank.set(e.key, i));
		return countMismatches(dRank, vRank);
	})();

	const axVsVisualRanked = (() => {
		const axOnly = entries.filter((e) => e.axIndex !== null);
		const aRank = new Map<string, number>();
		const vRank = new Map<string, number>();
		axOnly
			.slice()
			.sort((a, b) => (a.axIndex ?? 0) - (b.axIndex ?? 0))
			.forEach((e, i) => aRank.set(e.key, i));
		axOnly
			.slice()
			.sort((a, b) => a.visualIndex - b.visualIndex)
			.forEach((e, i) => vRank.set(e.key, i));
		return countMismatches(aRank, vRank);
	})();

	const tabVsDomRanked = (() => {
		const tabOnly = entries.filter((e) => e.tabIndex !== null);
		const tRank = new Map<string, number>();
		const dRank = new Map<string, number>();
		tabOnly
			.slice()
			.sort((a, b) => (a.tabIndex ?? 0) - (b.tabIndex ?? 0))
			.forEach((e, i) => tRank.set(e.key, i));
		tabOnly
			.slice()
			.sort((a, b) => a.domIndex - b.domIndex)
			.forEach((e, i) => dRank.set(e.key, i));
		return countMismatches(tRank, dRank);
	})();

	const tabVsVisualRanked = (() => {
		const tabOnly = entries.filter((e) => e.tabIndex !== null);
		const tRank = new Map<string, number>();
		const vRank = new Map<string, number>();
		tabOnly
			.slice()
			.sort((a, b) => (a.tabIndex ?? 0) - (b.tabIndex ?? 0))
			.forEach((e, i) => tRank.set(e.key, i));
		tabOnly
			.slice()
			.sort((a, b) => a.visualIndex - b.visualIndex)
			.forEach((e, i) => vRank.set(e.key, i));
		return countMismatches(tRank, vRank);
	})();

	return {
		pairs,
		pairsByKey,
		summary,
		mismatches: {
			domVsVisual: domVsVisualRanked,
			domVsTab: tabVsDomRanked,
			visualVsTab: tabVsVisualRanked,
			axVsVisual: axVsVisualRanked
		}
	};
}
