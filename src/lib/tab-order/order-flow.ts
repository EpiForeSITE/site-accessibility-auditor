import type { TabOrderElement, TabOrderResult } from './types.ts';

export interface OrderFlow {
	domOrder: number[];
	visualOrder: number[];
	tabOrder: number[];
	elements: TabOrderElement[];
	mismatches: {
		domVsTab: number;
		visualVsTab: number;
		domVsVisual: number;
	};
}

function compareVisual(a: TabOrderElement, b: TabOrderElement): number {
	const rowTolerance = 20;
	const aCy = a.rect.y + a.rect.height / 2;
	const bCy = b.rect.y + b.rect.height / 2;
	if (Math.abs(aCy - bCy) > rowTolerance) return aCy - bCy;
	return a.rect.x - b.rect.x;
}

function comparePath(a: TabOrderElement, b: TabOrderElement): number {
	const pa = a.path ?? '';
	const pb = b.path ?? '';
	return pa < pb ? -1 : pa > pb ? 1 : 0;
}

export function computeOrderFlow(result: TabOrderResult): OrderFlow {
	const elements = result.elements.slice();

	const domOrder = elements
		.slice()
		.sort(comparePath)
		.map((e) => e.id);
	const visualOrder = elements
		.slice()
		.sort(compareVisual)
		.map((e) => e.id);
	const tabOrder = elements.map((e) => e.id);

	const mismatches = {
		domVsTab: countMismatches(domOrder, tabOrder),
		visualVsTab: countMismatches(visualOrder, tabOrder),
		domVsVisual: countMismatches(domOrder, visualOrder)
	};

	return {
		domOrder,
		visualOrder,
		tabOrder,
		elements,
		mismatches
	};
}

function countMismatches(a: number[], b: number[]): number {
	const bPos = new Map<number, number>();
	b.forEach((id, idx) => bPos.set(id, idx));
	let count = 0;
	for (let i = 0; i < a.length; i++) {
		if (bPos.get(a[i]) !== i) count++;
	}
	return count;
}
