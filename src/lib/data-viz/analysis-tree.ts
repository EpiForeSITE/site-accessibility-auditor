import type { AnalysisRow, ChartAnalysis, OlliNode } from './types.ts';

function stats(values: number[]): { min: number; max: number; mean: number; count: number } {
	const nums = values.filter((v) => typeof v === 'number' && isFinite(v));
	if (nums.length === 0) return { min: NaN, max: NaN, mean: NaN, count: 0 };
	const min = Math.min(...nums);
	const max = Math.max(...nums);
	const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
	return { min, max, mean, count: nums.length };
}

function fmt(n: number): string {
	if (!isFinite(n)) return '—';
	if (Math.abs(n) >= 1000) return n.toFixed(0);
	if (Math.abs(n) >= 10) return n.toFixed(1);
	return n.toFixed(2);
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const it of items) {
		const k = key(it);
		if (!map.has(k)) map.set(k, []);
		map.get(k)!.push(it);
	}
	return map;
}

function summaryOf(rows: AnalysisRow[], label: string): OlliNode {
	const values = rows
		.map((r) => r.value ?? r.y ?? null)
		.filter((n): n is number => typeof n === 'number');
	const s = stats(values);
	const parts: string[] = [];
	parts.push(`${s.count} values`);
	if (s.count > 0) parts.push(`min ${fmt(s.min)}, max ${fmt(s.max)}, mean ${fmt(s.mean)}`);
	return {
		id: `${label}-summary`,
		label: `Summary of ${label}`,
		role: 'summary',
		description: parts.join('; '),
		children: [],
		value: s.count > 0 ? s.mean : null
	};
}

function rowLabel(row: AnalysisRow): string {
	const parts: string[] = [];
	if (row.category != null) parts.push(String(row.category));
	else if (row.x != null) parts.push(String(row.x));
	else parts.push('—');
	const v = row.value ?? row.y ?? null;
	if (typeof v === 'number') parts.push(`= ${fmt(v)}`);
	return parts.join(' ');
}

export function buildAnalysisTree(analysis: ChartAnalysis): OlliNode {
	const rows = analysis.rows.slice();
	const root: OlliNode = {
		id: 'root',
		label: analysis.title ?? 'Chart',
		role: 'root',
		description: `${analysis.chartType} · ${rows.length} rows · ${analysis.series.length} series`,
		children: [],
		value: null
	};

	if (rows.length === 0) {
		root.children.push({
			id: 'empty',
			label: 'No data rows extracted',
			role: 'summary',
			description: '',
			children: [],
			value: null
		});
		return root;
	}

	const bySeries = groupBy(rows, (r) => r.series ?? '(default)');
	const multipleSeries = bySeries.size > 1;

	if (multipleSeries) {
		for (const [seriesName, seriesRows] of bySeries) {
			const seriesNode: OlliNode = {
				id: `series:${seriesName}`,
				label: seriesName,
				role: 'series',
				description: `${seriesRows.length} values`,
				children: [],
				value: null
			};
			seriesNode.children.push(summaryOf(seriesRows, seriesName));
			for (const row of seriesRows.slice(0, 120)) {
				seriesNode.children.push({
					id: `${seriesName}:${seriesNode.children.length}`,
					label: rowLabel(row),
					role: 'mark',
					description: row.color ?? '',
					children: [],
					value: row.value ?? row.y ?? null
				});
			}
			if (seriesRows.length > 120) {
				seriesNode.children.push({
					id: `${seriesName}:truncated`,
					label: `… ${seriesRows.length - 120} more rows`,
					role: 'summary',
					description: '',
					children: [],
					value: null
				});
			}
			root.children.push(seriesNode);
		}
	} else {
		const byCategory = groupBy(rows, (r) =>
			r.category != null ? String(r.category) : r.x != null ? String(r.x) : '(value)'
		);
		root.children.push(summaryOf(rows, 'chart'));
		if (byCategory.size > 1 && byCategory.size <= 200) {
			for (const [cat, catRows] of byCategory) {
				const catNode: OlliNode = {
					id: `cat:${cat}`,
					label: cat,
					role: 'category',
					description:
						catRows.length === 1 && typeof catRows[0].value === 'number'
							? `= ${fmt(catRows[0].value)}`
							: `${catRows.length} rows`,
					children: [],
					value: catRows[0].value ?? null
				};
				if (catRows.length > 1) catNode.children.push(summaryOf(catRows, cat));
				for (const row of catRows.slice(0, 80)) {
					catNode.children.push({
						id: `${cat}:${catNode.children.length}`,
						label: rowLabel(row),
						role: 'mark',
						description: row.color ?? '',
						children: [],
						value: row.value ?? row.y ?? null
					});
				}
				root.children.push(catNode);
			}
		} else {
			for (const row of rows.slice(0, 400)) {
				root.children.push({
					id: `row:${root.children.length}`,
					label: rowLabel(row),
					role: 'mark',
					description: row.color ?? '',
					children: [],
					value: row.value ?? row.y ?? null
				});
			}
			if (rows.length > 400) {
				root.children.push({
					id: 'root:truncated',
					label: `… ${rows.length - 400} more rows`,
					role: 'summary',
					description: '',
					children: [],
					value: null
				});
			}
		}
	}

	return root;
}

export function rowsToCsv(rows: AnalysisRow[]): string {
	const headers = ['series', 'category', 'x', 'y', 'z', 'value', 'color'];
	const escape = (v: unknown): string => {
		if (v === null || v === undefined) return '';
		const s = String(v);
		if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	};
	const lines = [headers.join(',')];
	for (const row of rows) {
		lines.push(
			[row.series, row.category, row.x, row.y, row.z, row.value, row.color].map(escape).join(',')
		);
	}
	return lines.join('\n');
}
