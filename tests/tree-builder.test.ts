import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiffTree } from '../src/lib/ax-tree/tree-builder.ts';
import { diffTrees } from '../src/lib/ax-tree/tree-differ.ts';
import type { AxNode, AxTreeDiff, DiffPair, VisualNode } from '../src/lib/ax-tree/types.ts';

function mkAx(path: string, level: number, role = 'button', name = 'OK'): AxNode {
	return {
		id: path,
		role,
		name,
		path,
		level,
		tag: 'button',
		rect: { x: 0, y: 0, width: 40, height: 20 },
		ariaProps: {}
	};
}

function mkVis(path: string, tag = 'button', x = 0, y = 0): VisualNode {
	return {
		id: path,
		tag,
		text: 'OK',
		path,
		rect: { x, y, width: 40, height: 20 },
		role: null
	};
}

test('nests pairs via AxNode.level', () => {
	const ax = [
		mkAx('main', 0, 'main', 'Main'),
		mkAx('main > section', 1, 'region', 'Section'),
		mkAx('main > section > button:nth-of-type(1)', 2, 'button', 'Click'),
		mkAx('main > section > button:nth-of-type(2)', 2, 'button', 'Cancel')
	];
	const vis = ax.map((a, i) => mkVis(a.path, 'button', i * 50, 0));
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);

	assert.equal(forest.length, 1);
	const root = forest[0];
	assert.equal(root.pair.ax?.path, 'main');
	assert.equal(root.children.length, 1);
	const section = root.children[0];
	assert.equal(section.pair.ax?.path, 'main > section');
	assert.equal(section.children.length, 2);
});

test('places missing-in-ax ghosts under longest path-prefix ancestor', () => {
	const ax = [
		mkAx('main', 0, 'main', 'Main'),
		mkAx('main > section', 1, 'region', 'Section')
	];
	const vis = [
		mkVis('main'),
		mkVis('main > section'),
		mkVis('main > section > div:nth-of-type(1)', 'div')
	];
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);

	const section = forest[0].children[0];
	assert.equal(section.children.length, 1);
	const ghost = section.children[0];
	assert.equal(ghost.isGhost, true);
	assert.equal(ghost.pair.kind, 'missing-in-ax');
	assert.equal(ghost.pair.visual?.path, 'main > section > div:nth-of-type(1)');
	assert.equal(ghost.depth, section.depth + 1);
});

test('puts ghosts at root when no AX ancestor matches', () => {
	const ax = [mkAx('aside', 0, 'complementary', 'Sidebar')];
	const vis = [mkVis('aside'), mkVis('main > div:nth-of-type(1)', 'div', 100)];
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);

	const rootGhost = forest.find((n) => n.isGhost);
	assert.ok(rootGhost, 'expected a root-level ghost');
	assert.equal(rootGhost!.depth, 0);
	assert.equal(rootGhost!.pair.visual?.path, 'main > div:nth-of-type(1)');
});

test('computes signed readingOrderDelta when siblings drift', () => {
	// Two siblings under one parent. visual order is swapped vs AX walk order.
	const ax = [
		mkAx('main', 0, 'main', 'Main'),
		mkAx('main > button:nth-of-type(1)', 1, 'button', 'Alpha'),
		mkAx('main > button:nth-of-type(2)', 1, 'button', 'Beta')
	];
	// Visual rect positions place button(2) BEFORE button(1) — triggers order-drift.
	const vis = [
		mkVis('main', 'main', 0, 0),
		mkVis('main > button:nth-of-type(2)', 'button', 0, 10),
		mkVis('main > button:nth-of-type(1)', 'button', 0, 50)
	];
	const diff = diffTrees(ax, vis);
	const { forest } = buildDiffTree(diff);

	const main = forest[0];
	assert.equal(main.children.length, 2);
	const [first, second] = main.children;
	// first is button(1) in AX order but visually second → delta positive (actual=0, expected=1 → -1)
	assert.equal(first.pair.ax?.path, 'main > button:nth-of-type(1)');
	assert.equal(first.readingOrderDelta, -1);
	assert.equal(second.readingOrderDelta, 1);
});

test('handles empty diff gracefully', () => {
	const empty: AxTreeDiff = {
		pairs: [] as DiffPair[],
		summary: {
			match: 0,
			'missing-in-ax': 0,
			'extra-in-ax': 0,
			'role-mismatch': 0,
			'name-missing': 0,
			'order-drift': 0
		}
	};
	const { forest, nodesByKey } = buildDiffTree(empty);
	assert.deepEqual(forest, []);
	assert.equal(nodesByKey.size, 0);
});
