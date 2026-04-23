import type {
	ColorAuditResult,
	ColorEntry,
	ColorFinding,
	ColorSection,
	DomColorData
} from './types.ts';
import { callResponsesJson, OPENAI_MODEL } from '../shared/openai-client.ts';

const USAGE_VALUES = [
	'background',
	'text',
	'border',
	'fill',
	'stroke',
	'outline',
	'other'
] as const;

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low', 'info'] as const;

const COLOR_AUDIT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['sections', 'findings'],
	properties: {
		sections: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'description', 'colors'],
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					colors: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['hex', 'usage', 'element', 'context'],
							properties: {
								hex: { type: 'string', description: 'Lowercase hex color like #aabbcc' },
								usage: { type: 'string', enum: USAGE_VALUES as unknown as string[] },
								element: {
									type: 'string',
									description: 'Short DOM selector or tag describing where the color appears'
								},
								context: {
									type: 'string',
									description: 'One-line human-readable role the color plays in the UI'
								}
							}
						}
					}
				}
			}
		},
		findings: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['title', 'severity', 'wcag', 'summary', 'fix_hint', 'affected_colors'],
				properties: {
					title: { type: 'string' },
					severity: { type: 'string', enum: SEVERITY_VALUES as unknown as string[] },
					wcag: { type: 'string' },
					summary: { type: 'string' },
					fix_hint: { type: 'string' },
					affected_colors: { type: 'array', items: { type: 'string' } }
				}
			}
		}
	}
} as const;

function validateColorEntry(entry: Partial<ColorEntry>): entry is ColorEntry {
	return Boolean(entry.hex && entry.usage && entry.element && entry.context);
}

function normalizeColorSections(sections: Array<Partial<ColorSection>>): ColorSection[] {
	return sections
		.map((section) => ({
			name: section.name?.trim() || 'Unlabeled Section',
			description: section.description?.trim() || 'Grouped by semantic region.',
			colors: Array.isArray(section.colors)
				? section.colors.filter(validateColorEntry).map((color) => ({
						hex: color.hex.toLowerCase(),
						usage: color.usage,
						element: color.element,
						context: color.context
					}))
				: []
		}))
		.filter((section) => section.colors.length > 0);
}

function normalizeColorFindings(findings: Array<Partial<ColorFinding>>): ColorFinding[] {
	return findings
		.filter((finding) =>
			Boolean(finding.title && finding.summary && finding.wcag && finding.fix_hint)
		)
		.map((finding) => ({
			title: finding.title!,
			severity: finding.severity ?? 'medium',
			wcag: finding.wcag!,
			summary: finding.summary!,
			fix_hint: finding.fix_hint!,
			affected_colors: Array.isArray(finding.affected_colors) ? finding.affected_colors : []
		}));
}

export async function extractColorSections(
	apiKey: string,
	domData: DomColorData
): Promise<ColorAuditResult> {
	const instructions = `You are an expert accessibility auditor. You receive DOM color extraction data.

Group colors into human-readable semantic sections ordered top-to-bottom.

Each section MUST contain:
- "name": short human label (e.g. "Top navigation", "Primary card surface").
- "description": one-line summary of where these colors appear.
- "colors": one entry per distinct color occurrence with these fields:
    - "hex": lowercase hex like "#aabbcc".
    - "usage": one of background | text | border | fill | stroke | outline | other.
    - "element": short DOM selector or tag (e.g. "nav.navbar", "button.primary", "svg rect").
    - "context": one-line description of the role this color plays (e.g. "Active tab underline", "Card header text").

Findings are accessibility issues only (no generic design commentary). Allowed topics:
- likely low contrast clusters
- color-only meaning in charts, legends, or status indicators
- visually confusable palette groups
- insufficient distinction between interactive states

For each finding include title, severity (critical/high/medium/low/info), wcag, summary, fix_hint, and affected_colors (array of hex).`;

	const parsed = await callResponsesJson<{
		sections?: Array<Partial<ColorSection>>;
		findings?: Array<Partial<ColorFinding>>;
	}>(apiKey, {
		instructions,
		text: `Page: ${domData.pageTitle} (${domData.url})\nDOM color data:\n${JSON.stringify(domData.elements)}`,
		schemaName: 'color_audit',
		schema: COLOR_AUDIT_SCHEMA as unknown as Record<string, unknown>
	});

	return {
		sections: normalizeColorSections(parsed.sections ?? []),
		findings: normalizeColorFindings(parsed.findings ?? []),
		modelVersion: OPENAI_MODEL,
		pageUrl: domData.url,
		timestamp: new Date().toISOString()
	};
}
