import type { AxTreeDiff, DiffPair, TreeBuildResult, TreeNode } from './types.ts';

function keyFor(pair: DiffPair, fallbackIndex: number): string {
	return pair.ax?.path ?? pair.visual?.path ?? `orphan-${fallbackIndex}`;
}

function isPrefixPath(ancestor: string, descendant: string): boolean {
	if (!ancestor) return true;
	if (ancestor === descendant) return true;
	return descendant.startsWith(ancestor + ' > ');
}

function longestPrefixAncestor(visualPath: string, candidates: TreeNode[]): TreeNode | null {
	let best: TreeNode | null = null;
	let bestLen = -1;
	for (const c of candidates) {
		const axPath = c.pair.ax?.path;
		if (axPath === undefined) continue;
		if (!isPrefixPath(axPath, visualPath)) continue;
		if (axPath.length > bestLen) {
			best = c;
			bestLen = axPath.length;
		}
	}
	return best;
}

function computeReadingOrderDelta(siblings: TreeNode[]): void {
	const withVisual = siblings
		.map((node, actual) => ({ node, actual, vi: node.pair.visualIndex }))
		.filter((entry): entry is { node: TreeNode; actual: number; vi: number } => entry.vi !== null);

	const sortedByVisual = withVisual.slice().sort((a, b) => a.vi - b.vi);
	sortedByVisual.forEach((entry, expectedPos) => {
		const delta = entry.actual - expectedPos;
		entry.node.readingOrderDelta = delta === 0 ? null : delta;
	});

	for (const sibling of siblings) {
		if (sibling.children.length > 0) computeReadingOrderDelta(sibling.children);
	}
}

export function buildDiffTree(diff: AxTreeDiff): TreeBuildResult {
	const forest: TreeNode[] = [];
	const nodesByKey = new Map<string, TreeNode>();
	const axNodesFlat: TreeNode[] = [];

	const axPairs = diff.pairs
		.filter((p) => p.ax !== null)
		.slice()
		.sort((a, b) => (a.axIndex ?? 0) - (b.axIndex ?? 0));

	const stack: TreeNode[] = [];
	axPairs.forEach((pair, i) => {
		const level = pair.ax!.level;
		const node: TreeNode = {
			key: keyFor(pair, i),
			pair,
			depth: level,
			children: [],
			readingOrderDelta: null,
			isGhost: false
		};
		nodesByKey.set(node.key, node);
		axNodesFlat.push(node);

		while (stack.length > 0 && stack[stack.length - 1].depth >= level) {
			stack.pop();
		}
		if (stack.length === 0) {
			forest.push(node);
		} else {
			stack[stack.length - 1].children.push(node);
		}
		stack.push(node);
	});

	const ghostPairs = diff.pairs.filter((p) => p.kind === 'missing-in-ax' && p.visual);
	ghostPairs.forEach((pair, i) => {
		const visual = pair.visual!;
		const ancestor = longestPrefixAncestor(visual.path, axNodesFlat);
		const ghost: TreeNode = {
			key: keyFor(pair, axPairs.length + i),
			pair,
			depth: ancestor ? ancestor.depth + 1 : 0,
			children: [],
			readingOrderDelta: null,
			isGhost: true
		};
		nodesByKey.set(ghost.key, ghost);
		if (ancestor) {
			ancestor.children.push(ghost);
		} else {
			forest.push(ghost);
		}
	});

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
