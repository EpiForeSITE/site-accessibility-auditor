import type { ColorEntry } from './types.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColorblindMode =
	| 'normal'
	| 'protanopia'
	| 'protanomaly'
	| 'deuteranopia'
	| 'deuteranomaly'
	| 'tritanopia'
	| 'tritanomaly'
	| 'achromatopsia'
	| 'achromatomaly';

export interface ColorblindModeInfo {
	key: ColorblindMode;
	name: string;
	description: string;
}

export interface ColorWarning {
	color1: ColorEntry;
	color2: ColorEntry;
	simulatedHex1: string;
	simulatedHex2: string;
	deltaE: number;
}

// ---------------------------------------------------------------------------
// Mode metadata for dropdown
// ---------------------------------------------------------------------------

export const COLORBLIND_MODES: ColorblindModeInfo[] = [
	{ key: 'normal', name: 'Normal Vision', description: '' },
	{ key: 'protanopia', name: 'Protanopia', description: 'Red-blind, ~1% of males' },
	{ key: 'protanomaly', name: 'Protanomaly', description: 'Red-weak, ~1% of males' },
	{ key: 'deuteranopia', name: 'Deuteranopia', description: 'Green-blind, ~1% of males' },
	{ key: 'deuteranomaly', name: 'Deuteranomaly', description: 'Green-weak, ~5% of males' },
	{ key: 'tritanopia', name: 'Tritanopia', description: 'Blue-blind, rare' },
	{ key: 'tritanomaly', name: 'Tritanomaly', description: 'Blue-weak, rare' },
	{ key: 'achromatopsia', name: 'Achromatopsia', description: 'Total color blindness, very rare' },
	{
		key: 'achromatomaly',
		name: 'Achromatomaly',
		description: 'Blue cone monochromacy, very rare'
	}
];

// ---------------------------------------------------------------------------
// Brettel / Viénot / Mollon simulation matrices (3x3, row-major)
// ---------------------------------------------------------------------------

const MATRICES: Record<ColorblindMode, number[]> = {
	normal: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
	protanomaly: [0.817, 0.183, 0, 0.333, 0.667, 0, 0, 0.125, 0.875],
	deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
	deuteranomaly: [0.8, 0.2, 0, 0.258, 0.742, 0, 0, 0.142, 0.858],
	tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
	tritanomaly: [0.967, 0.033, 0, 0, 0.733, 0.267, 0, 0.183, 0.817],
	achromatopsia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
	achromatomaly: [0.618, 0.32, 0.062, 0.163, 0.775, 0.062, 0.163, 0.32, 0.516]
};

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [
		parseInt(h.slice(0, 2), 16) / 255,
		parseInt(h.slice(2, 4), 16) / 255,
		parseInt(h.slice(4, 6), 16) / 255
	];
}

function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
	const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
	return '#' + toHex(r) + toHex(g) + toHex(b);
}

/** sRGB -> linear RGB (inverse gamma) */
function linearize(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linear RGB -> sRGB (gamma) */
function delinearize(c: number): number {
	return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** sRGB hex -> CIE XYZ (D65) */
function hexToXyz(hex: string): [number, number, number] {
	const [r, g, b] = hexToRgb(hex).map(linearize);
	return [
		0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
		0.2126729 * r + 0.7151522 * g + 0.072175 * b,
		0.0193339 * r + 0.119192 * g + 0.9503041 * b
	];
}

/** CIE XYZ -> CIELAB (D65 reference white) */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
	const Xn = 0.95047,
		Yn = 1.0,
		Zn = 1.08883;
	const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	const fx = f(x / Xn),
		fy = f(y / Yn),
		fz = f(z / Zn);
	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hexToLab(hex: string): [number, number, number] {
	const [x, y, z] = hexToXyz(hex);
	return xyzToLab(x, y, z);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Simulate how a hex color appears under a given colorblind mode. */
export function simulateColorblind(hex: string, mode: ColorblindMode): string {
	if (mode === 'normal') return hex;
	const [r, g, b] = hexToRgb(hex);
	const m = MATRICES[mode];
	return rgbToHex(
		m[0] * r + m[1] * g + m[2] * b,
		m[3] * r + m[4] * g + m[5] * b,
		m[6] * r + m[7] * g + m[8] * b
	);
}

/** CIE76 Delta-E: perceptual distance between two hex colors. */
export function deltaE(hex1: string, hex2: string): number {
	const [L1, a1, b1] = hexToLab(hex1);
	const [L2, a2, b2] = hexToLab(hex2);
	return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Check all unique color pairs in a section for confusability under a
 * given colorblind mode. Returns warnings for pairs whose simulated
 * Delta-E falls below the threshold.
 */
export function checkSectionWarnings(
	colors: ColorEntry[],
	mode: ColorblindMode,
	threshold = 10
): ColorWarning[] {
	if (mode === 'normal' || colors.length < 2) return [];

	const unique = deduplicateByHex(colors);
	const warnings: ColorWarning[] = [];

	for (let i = 0; i < unique.length; i++) {
		for (let j = i + 1; j < unique.length; j++) {
			const sim1 = simulateColorblind(unique[i].hex, mode);
			const sim2 = simulateColorblind(unique[j].hex, mode);
			const de = deltaE(sim1, sim2);
			if (de < threshold) {
				warnings.push({
					color1: unique[i],
					color2: unique[j],
					simulatedHex1: sim1,
					simulatedHex2: sim2,
					deltaE: de
				});
			}
		}
	}

	warnings.sort((a, b) => a.deltaE - b.deltaE);
	return warnings;
}

function deduplicateByHex(colors: ColorEntry[]): ColorEntry[] {
	const seen = new Set<string>();
	return colors.filter((c) => {
		if (seen.has(c.hex)) return false;
		seen.add(c.hex);
		return true;
	});
}
