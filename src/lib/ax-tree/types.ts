export interface AxNode {
	id: string;
	role: string;
	name: string;
	path: string;
	level: number;
	tag: string;
	rect: { x: number; y: number; width: number; height: number } | null;
	ariaProps: Record<string, string>;
}

export interface VisualNode {
	id: string;
	tag: string;
	text: string;
	path: string;
	rect: { x: number; y: number; width: number; height: number };
	role: string | null;
}

export interface ViewportInfo {
	width: number;
	height: number;
	scrollX: number;
	scrollY: number;
	documentWidth: number;
	documentHeight: number;
}

export interface AxTreeResult {
	axNodes: AxNode[];
	visualNodes: VisualNode[];
	viewport: ViewportInfo;
	timestamp: string;
}

export type DiffKind =
	| 'match'
	| 'missing-in-ax'
	| 'extra-in-ax'
	| 'role-mismatch'
	| 'name-missing'
	| 'order-drift';

export interface DiffPair {
	kind: DiffKind;
	ax: AxNode | null;
	visual: VisualNode | null;
	axIndex: number | null;
	visualIndex: number | null;
}

export interface AxTreeDiff {
	pairs: DiffPair[];
	summary: Record<DiffKind, number>;
}

export interface TreeNode {
	key: string;
	pair: DiffPair;
	depth: number;
	children: TreeNode[];
	readingOrderDelta: number | null;
	isGhost: boolean;
}

export interface TreeBuildResult {
	forest: TreeNode[];
	nodesByKey: Map<string, TreeNode>;
}
