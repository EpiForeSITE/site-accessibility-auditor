import type { DiffPair, ReadingOrderDiff, TreeBuildResult, TreeNode } from './types.ts';

function isPrefixPath(ancestor: string, descendant: string): boolean {
	if (!ancestor) return true;
	if (ancestor === descendant) return true;
	return descendant.startsWith(ancestor + ' > ');
}

function longestPrefixAncestor(path: string, candidates: TreeNode[]): TreeNode | null {
	let best: TreeNode | null = null;
	let bestLen = -1;
	for (const c of candidates) {
		const p = c.pair.entry.path;
		if (!isPrefixPath(p, path)) continue;
		if (p.length > bestLen) {
			best = c;
			bestLen = p.length;
		}
	}
	return best;
}

function computeReadingOrderDelta(siblings: TreeNode[]): void {
	const withVisual = siblings.map((node, actual) => ({
		node,
		actual,
		vi: node.pair.entry.visualIndex
	}));
	const sortedByVisual = withVisual.slice().sort((a, b) => a.vi - b.vi);
	sortedByVisual.forEach((entry, expectedPos) => {
		const delta = entry.actual - expectedPos;
		entry.node.readingOrderDelta = delta === 0 ? null : delta;
	});
	for (const sibling of siblings) {
		if (sibling.children.length > 0) computeReadingOrderDelta(sibling.children);
	}
}

/**
 * Build a forest keyed by AX `level`. Entries outside AX that still have
 * a visible rect are attached under the longest path-prefix ancestor as
 * ghost nodes, matching the previous ax-tree behaviour.
 */
export function buildTree(diff: ReadingOrderDiff): TreeBuildResult {
	const forest: TreeNode[] = [];
	const nodesByKey = new Map<string, TreeNode>();
	const axNodesFlat: TreeNode[] = [];

	const axPairs = diff.pairs
		.filter((p) => p.entry.axIndex !== null)
		.slice()
		.sort((a, b) => (a.axIndex ?? 0) - (b.axIndex ?? 0));

	const stack: TreeNode[] = [];
	for (const pair of axPairs) {
		const level = pair.entry.ax?.level ?? 0;
		const node: TreeNode = {
			key: pair.entry.key,
			pair,
			depth: level,
			children: [],
			readingOrderDelta: null,
			isGhost: false
		};
		nodesByKey.set(node.key, node);
		axNodesFlat.push(node);

		while (stack.length > 0 && stack[stack.length - 1].depth >= level) stack.pop();
		if (stack.length === 0) forest.push(node);
		else stack[stack.length - 1].children.push(node);
		stack.push(node);
	}

	// Ghost-attach entries that are visually present but not in AX. Entries
	// already placed as real AX nodes are skipped so keys stay unique across
	// the forest (Svelte {#each} invariant).
	const ghostPairs: DiffPair[] = diff.pairs.filter(
		(p) => p.entry.axIndex === null && (p.kind === 'missing-in-ax' || p.kind === 'tab-unreachable')
	);
	for (const pair of ghostPairs) {
		if (nodesByKey.has(pair.entry.key)) continue;
		const ancestor = longestPrefixAncestor(pair.entry.path, axNodesFlat);
		const ghost: TreeNode = {
			key: pair.entry.key,
			pair,
			depth: ancestor ? ancestor.depth + 1 : 0,
			children: [],
			readingOrderDelta: null,
			isGhost: true
		};
		nodesByKey.set(ghost.key, ghost);
		if (ancestor) ancestor.children.push(ghost);
		else forest.push(ghost);
	}

	computeReadingOrderDelta(forest);

	return { forest, nodesByKey };
}

export function treeContainsNonMatch(node: TreeNode): boolean {
	if (node.pair.kind !== 'match') return true;
	for (const child of node.children) {
		if (treeContainsNonMatch(child)) return true;
	}
	return false;
}
