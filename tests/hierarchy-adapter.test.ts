import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiffTree } from '../src/lib/ax-tree/tree-builder.ts';
import { diffTrees } from '../src/lib/ax-tree/tree-differ.ts';
import { toHierarchyRoot, isSyntheticKey } from '../src/lib/ax-tree/hierarchy-adapter.ts';
import type { AxNode, VisualNode } from '../src/lib/ax-tree/types.ts';

function mkAx(path: string, level: number): AxNode {
	return {
		id: path,
		role: 'button',
		name: 'OK',
		path,
		level,
		tag: 'button',
		rect: { x: 0, y: 0, width: 40, height: 20 },
		ariaProps: {}
	};
}

function mkVis(path: string): VisualNode {
	return {
		id: path,
		tag: 'button',
		text: 'OK',
		path,
		rect: { x: 0, y: 0, width: 40, height: 20 },
		role: null
	};
}

test('single-root forest returns the root directly (non-synthetic)', () => {
	const ax = [mkAx('main', 0), mkAx('main > button', 1)];
	const vis = ax.map((a) => mkVis(a.path));
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);
	const root = toHierarchyRoot(forest);

	assert.equal(root.isSynthetic, false);
	assert.equal(isSyntheticKey(root.key), false);
	assert.equal(root.children.length, 1);
});

test('multi-root forest is collapsed under a synthetic root', () => {
	const ax = [mkAx('main', 0), mkAx('aside', 0)];
	const vis = ax.map((a) => mkVis(a.path));
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);
	assert.equal(forest.length, 2);

	const root = toHierarchyRoot(forest);
	assert.equal(root.isSynthetic, true);
	assert.equal(isSyntheticKey(root.key), true);
	assert.equal(root.children.length, 2);
	assert.equal(root.depth, 0);
	for (const c of root.children) {
		assert.equal(c.depth, 1);
	}
});

test('preserves ghost flag on descendants', () => {
	const ax = [mkAx('main', 0)];
	const vis = [mkVis('main'), mkVis('main > span')];
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);
	const root = toHierarchyRoot(forest);

	const ghost = root.children.find((c) => c.isGhost);
	assert.ok(ghost, 'expected a ghost child');
});
