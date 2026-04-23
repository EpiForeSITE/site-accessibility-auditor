import type { AxNode, AxTreeDiff, DiffKind, DiffPair, VisualNode } from './types.ts';

function visualOrder(visual: VisualNode[]): VisualNode[] {
	return visual.slice().sort((a, b) => {
		const rowTol = 20;
		const aCy = a.rect.y + a.rect.height / 2;
		const bCy = b.rect.y + b.rect.height / 2;
		if (Math.abs(aCy - bCy) > rowTol) return aCy - bCy;
		return a.rect.x - b.rect.x;
	});
}

function canonicalRole(tag: string, role: string | null): string {
	if (role) return role;
	const map: Record<string, string> = {
		h1: 'heading',
		h2: 'heading',
		h3: 'heading',
		h4: 'heading',
		h5: 'heading',
		h6: 'heading',
		nav: 'navigation',
		main: 'main',
		aside: 'complementary',
		section: 'region',
		header: 'banner',
		footer: 'contentinfo',
		article: 'article',
		img: 'img',
		figure: 'figure',
		table: 'table',
		button: 'button',
		a: 'link',
		input: 'textbox',
		select: 'combobox',
		textarea: 'textbox',
		summary: 'button'
	};
	return map[tag] ?? tag;
}

export function diffTrees(ax: AxNode[], visual: VisualNode[]): AxTreeDiff {
	const sortedVisual = visualOrder(visual);
	const axByPath = new Map<string, AxNode>();
	for (const a of ax) axByPath.set(a.path, a);

	const pairs: DiffPair[] = [];
	const matchedAxPaths = new Set<string>();

	sortedVisual.forEach((v, visualIndex) => {
		const a = axByPath.get(v.path);
		if (!a) {
			pairs.push({
				kind: 'missing-in-ax',
				visual: v,
				ax: null,
				axIndex: null,
				visualIndex
			});
			return;
		}
		matchedAxPaths.add(a.path);
		const axIndex = ax.indexOf(a);
		const vRole = canonicalRole(v.tag, v.role);
		const aRole = a.role;

		if (vRole !== aRole) {
			pairs.push({ kind: 'role-mismatch', ax: a, visual: v, axIndex, visualIndex });
			return;
		}
		if (!a.name || a.name.length === 0) {
			pairs.push({ kind: 'name-missing', ax: a, visual: v, axIndex, visualIndex });
			return;
		}
		pairs.push({ kind: 'match', ax: a, visual: v, axIndex, visualIndex });
	});

	ax.forEach((a, axIndex) => {
		if (!matchedAxPaths.has(a.path)) {
			pairs.push({ kind: 'extra-in-ax', ax: a, visual: null, axIndex, visualIndex: null });
		}
	});

	// Order drift detection: matched pairs where axIndex order != visualIndex order
	const matched = pairs.filter((p) => p.kind === 'match' && p.axIndex !== null);
	const expectedAxOrder = matched.map((p) => p.axIndex!).sort((a, b) => a - b);
	const actualAxOrder = matched.map((p) => p.axIndex!);
	for (let i = 0; i < actualAxOrder.length; i++) {
		if (actualAxOrder[i] !== expectedAxOrder[i]) {
			matched[i].kind = 'order-drift';
		}
	}

	const summary: Record<DiffKind, number> = {
		match: 0,
		'missing-in-ax': 0,
		'extra-in-ax': 0,
		'role-mismatch': 0,
		'name-missing': 0,
		'order-drift': 0
	};
	for (const p of pairs) summary[p.kind]++;

	return { pairs, summary };
}
