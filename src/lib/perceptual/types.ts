export type PerceptualMode =
	| 'none'
	| 'low-vision'
	| 'reduced-contrast'
	| 'focus-only'
	| 'reduced-motion'
	| 'cataract';

export type PerceptualLevel = 'mild' | 'moderate' | 'severe';

export interface PerceptualPreset {
	mode: PerceptualMode;
	level: PerceptualLevel;
}
