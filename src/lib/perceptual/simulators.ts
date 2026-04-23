import { evalInPage } from '../shared/devtools-eval.ts';
import type { PerceptualLevel, PerceptualMode } from './types.ts';

const STYLE_ID = 'perceptual-sim-style';

function buildCss(mode: PerceptualMode, level: PerceptualLevel): string {
	if (mode === 'none') return '';

	const levelScale: Record<PerceptualLevel, number> = {
		mild: 0.33,
		moderate: 0.66,
		severe: 1
	};
	const t = levelScale[level];

	switch (mode) {
		case 'low-vision': {
			const blur = (1 + 5 * t).toFixed(2);
			const contrast = (1 - 0.25 * t).toFixed(2);
			const brightness = (1 - 0.15 * t).toFixed(2);
			return `
html, body {
	filter: blur(${blur}px) contrast(${contrast}) brightness(${brightness}) !important;
}
`;
		}
		case 'cataract': {
			const blur = (2 + 4 * t).toFixed(2);
			const yellow = (0.2 + 0.3 * t).toFixed(2);
			return `
html, body {
	filter: blur(${blur}px) sepia(${yellow}) brightness(${(1 - 0.08 * t).toFixed(2)}) !important;
}
html::after {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	background: radial-gradient(circle, transparent 30%, rgba(255,255,255,${(0.25 * t).toFixed(2)}) 70%);
	z-index: 2147483646;
	mix-blend-mode: screen;
}
`;
		}
		case 'reduced-contrast': {
			const gray = (0.3 + 0.5 * t).toFixed(2);
			const contrast = (1 - 0.45 * t).toFixed(2);
			return `
html, body {
	filter: grayscale(${gray}) contrast(${contrast}) !important;
}
`;
		}
		case 'focus-only': {
			const dim = (0.12 + 0.18 * t).toFixed(2);
			return `
body > * { opacity: ${dim} !important; transition: opacity 0.2s !important; }
body *:focus-within, body *:focus { opacity: 1 !important; outline: 3px solid #2563eb !important; outline-offset: 3px !important; }
body *:focus-within * { opacity: 1 !important; }
`;
		}
		case 'reduced-motion': {
			return `
*, *::before, *::after {
	animation-duration: 0.01ms !important;
	animation-delay: 0.01ms !important;
	animation-iteration-count: 1 !important;
	transition-duration: 0.01ms !important;
	scroll-behavior: auto !important;
}
`;
		}
	}
}

export async function applyPerceptualMode(
	mode: PerceptualMode,
	level: PerceptualLevel
): Promise<void> {
	const css = buildCss(mode, level);
	const expr = `(function() {
		var existing = document.getElementById(${JSON.stringify(STYLE_ID)});
		if (existing) existing.remove();
		if (${JSON.stringify(css)} === '') return;
		var style = document.createElement('style');
		style.id = ${JSON.stringify(STYLE_ID)};
		style.textContent = ${JSON.stringify(css)};
		document.head.appendChild(style);
	})()`;
	await evalInPage(expr);
}

export async function clearPerceptualMode(): Promise<void> {
	await applyPerceptualMode('none', 'mild');
}
