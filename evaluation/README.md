# Evaluation Assets

This directory contains reproducible benchmark inputs and scaffolding for the paper workflow.

- `fixtures/`: local HTML pages that exercise touch-target, keyboard-flow, color, and chart auditing.
- `benchmark/ground-truth.json`: example schema for adjudicated issue labels.
- `results/`: place captured tool outputs and baseline JSON results here.
- `../study-assets/`: materials for participant studies.

Recommended workflow:

1. Load a fixture page in Chrome.
2. Inspect it with the relevant extension panels.
3. Save baseline tool outputs to `evaluation/results/axe/` and `evaluation/results/lighthouse/`.
4. Run `pnpm run evaluate:compare`.
5. Run `pnpm run evaluate:aggregate`.
