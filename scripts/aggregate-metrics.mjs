import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [resultsDir] = process.argv.slice(2);

if (!resultsDir) {
	console.error('Usage: node scripts/aggregate-metrics.mjs <results-dir>');
	process.exit(1);
}

const summaryPath = join(resultsDir, 'comparison-summary.json');

if (!existsSync(summaryPath)) {
	console.error(`Missing ${summaryPath}. Run compare-benchmarks first.`);
	process.exit(1);
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const metrics = {
	issue_counts_by_module: summary.extension_issue_total,
	unique_over_baselines_estimate: Math.max(
		summary.extension_issue_total - summary.axe_result_files - summary.lighthouse_result_files,
		0
	),
	precision_proxy:
		summary.ground_truth_total === 0
			? 0
			: Number((summary.matched_wcag_labels / summary.ground_truth_total).toFixed(3)),
	state_discovered_only_issue_counts: 'derive from exported session state_id values',
	time_to_first_critical_issue: 'capture during study sessions'
};

writeFileSync(join(resultsDir, 'aggregate-metrics.json'), JSON.stringify(metrics, null, 2));
console.log('Wrote aggregate-metrics.json');
