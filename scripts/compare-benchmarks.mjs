import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [groundTruthPath, resultsDir] = process.argv.slice(2);

if (!groundTruthPath || !resultsDir) {
	console.error('Usage: node scripts/compare-benchmarks.mjs <ground-truth.json> <results-dir>');
	process.exit(1);
}

const groundTruth = JSON.parse(readFileSync(groundTruthPath, 'utf8'));
const extensionDir = join(resultsDir, 'extension');
const axeDir = join(resultsDir, 'axe');
const lighthouseDir = join(resultsDir, 'lighthouse');

function safeLoad(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((file) => file.endsWith('.json'))
		.map((file) => ({ file, data: JSON.parse(readFileSync(join(dir, file), 'utf8')) }));
}

function flattenExtensionIssues(records) {
	return records.flatMap(({ file, data }) =>
		(data.issues ?? []).map((issue) => ({
			file,
			id: issue.id,
			wcag: issue.wcag,
			severity: issue.severity,
			title: issue.title
		}))
	);
}

const extensionIssues = flattenExtensionIssues(safeLoad(extensionDir));
const axeIssues = safeLoad(axeDir);
const lighthouseIssues = safeLoad(lighthouseDir);

const summary = {
	ground_truth_total: groundTruth.length,
	extension_issue_total: extensionIssues.length,
	axe_result_files: axeIssues.length,
	lighthouse_result_files: lighthouseIssues.length,
	matched_wcag_labels: groundTruth.filter((truth) =>
		extensionIssues.some((issue) => issue.wcag === truth.wcag && issue.severity === truth.severity)
	).length
};

mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, 'comparison-summary.json'), JSON.stringify(summary, null, 2));
console.log(`Wrote ${basename(join(resultsDir, 'comparison-summary.json'))}`);
