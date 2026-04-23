import type { DiffKind, DiffPair, TreeNode } from './types.ts';

export interface HierNode {
	key: string;
	pair: DiffPair | null;
	children: HierNode[];
	depth: number;
	isSynthetic: boolean;
	isGhost: boolean;
}

const SYNTHETIC_ROOT_KEY = '__synthetic_root__';

function fromTreeNode(node: TreeNode, depth: number): HierNode {
	return {
		key: node.key,
		pair: node.pair,
		depth,
		isSynthetic: false,
		isGhost: node.isGhost,
		children: node.children.map((c) => fromTreeNode(c, depth + 1))
	};
}

export function toHierarchyRoot(forest: TreeNode[]): HierNode {
	if (forest.length === 1) {
		return fromTreeNode(forest[0], 0);
	}
	return {
		key: SYNTHETIC_ROOT_KEY,
		pair: null,
		depth: 0,
		isSynthetic: true,
		isGhost: false,
		children: forest.map((n) => fromTreeNode(n, 1))
	};
}

export function isSyntheticKey(key: string): boolean {
	return key === SYNTHETIC_ROOT_KEY;
}

const KIND_COLOR: Record<DiffKind, string> = {
	match: 'var(--viz-ok)',
	'missing-in-ax': 'var(--viz-bad)',
	'extra-in-ax': 'var(--viz-warn)',
	'role-mismatch': 'var(--viz-bad)',
	'name-missing': 'var(--viz-warn)',
	'order-drift': 'var(--viz-accent)'
};

export function kindColor(kind: DiffKind | null | undefined): string {
	if (!kind) return 'var(--viz-muted)';
	return KIND_COLOR[kind];
}

const KIND_LABEL: Record<DiffKind, string> = {
	match: 'match',
	'missing-in-ax': 'missing in AX',
	'extra-in-ax': 'extra in AX',
	'role-mismatch': 'role mismatch',
	'name-missing': 'name missing',
	'order-drift': 'order drift'
};

export function kindLabel(kind: DiffKind): string {
	return KIND_LABEL[kind];
}

export function nodeMatchesQuery(node: HierNode, q: string): boolean {
	if (!q) return true;
	if (node.isSynthetic) return false;
	const lower = q.toLowerCase();
	const ax = node.pair?.ax;
	const visual = node.pair?.visual;
	const haystack = [
		ax?.role,
		ax?.name,
		ax?.tag,
		ax?.path,
		visual?.tag,
		visual?.text,
		visual?.role,
		visual?.path
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return haystack.includes(lower);
}

export function nodeMatchesFilter(node: HierNode, filter: Set<DiffKind>): boolean {
	if (filter.size === 0) return true;
	if (node.isSynthetic) return false;
	const kind = node.pair?.kind;
	return kind ? filter.has(kind) : false;
}

export function shortLabel(node: HierNode, max = 28): string {
	if (node.isSynthetic) return 'root';
	const ax = node.pair?.ax;
	const visual = node.pair?.visual;
	const name = (ax?.name || visual?.text || '').trim();
	const role = ax?.role || visual?.role || visual?.tag || '?';
	const text = name ? `${role} · ${name}` : role;
	return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
