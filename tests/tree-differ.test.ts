import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffTrees } from '../src/lib/ax-tree/tree-differ.ts';
import type { AxNode, VisualNode } from '../src/lib/ax-tree/types.ts';

function mkAx(path: string, role = 'button', name = 'OK'): AxNode {
	return {
		id: path,
		role,
		name,
		path,
		level: 1,
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

test('matches identical trees', () => {
	const ax = [mkAx('a'), mkAx('b')];
	const vis = [mkVis('a'), mkVis('b', 'button', 50)];
	const diff = diffTrees(ax, vis);
	assert.equal(diff.summary.match, 2);
});

test('detects missing-in-ax nodes', () => {
	const ax = [mkAx('a')];
	const vis = [mkVis('a'), mkVis('b')];
	const diff = diffTrees(ax, vis);
	assert.equal(diff.summary['missing-in-ax'], 1);
});

test('flags name-missing when ax node has empty name', () => {
	const ax = [mkAx('a', 'button', '')];
	const vis = [mkVis('a')];
	const diff = diffTrees(ax, vis);
	assert.equal(diff.summary['name-missing'], 1);
});

test('flags role-mismatch when visual tag maps to a different canonical role', () => {
	const ax = [mkAx('a', 'generic', 'OK')];
	const vis = [mkVis('a', 'button')];
	const diff = diffTrees(ax, vis);
	assert.equal(diff.summary['role-mismatch'], 1);
});
