import type {
	ColorAuditResult,
	ColorEntry,
	ColorFinding,
	ColorSection,
	DomColorData
} from './types.ts';

const API_URL = 'https://api.openai.com/v1/responses';
const MODEL = 'gpt-5.2-pro';

function validateColorEntry(entry: Partial<ColorEntry>): entry is ColorEntry {
	return Boolean(entry.hex && entry.usage && entry.element && entry.context);
}

function parseOutputText(data: unknown): string {
	const response = data as {
		output?: Array<{
			type?: string;
			role?: string;
			content?: Array<{ type?: string; text?: string }>;
		}>;
		output_text?: string;
	};

	const outputMessage =
		response.output?.find((item) => item.type === 'message' && item.role === 'assistant') ??
		response.output?.find((item) => item.type === 'message');
	const textBlock = outputMessage?.content?.find((block) => block.type === 'output_text');
	const content = textBlock?.text ?? response.output_text;

	if (!content) {
		throw new Error('Empty response from OpenAI');
	}

	return content
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?```\s*$/i, '')
		.trim();
}

async function requestJson<T>(apiKey: string, instructions: string, input: string): Promise<T> {
	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: MODEL,
			instructions,
			input,
			reasoning: { effort: 'medium' }
		})
	});

	if (!response.ok) {
		const err = await response.json().catch(() => null);
		const msg =
			(err as { error?: { message?: string } } | null)?.error?.message ??
			`API request failed (${response.status})`;
		throw new Error(msg);
	}

	const data = await response.json();
	return JSON.parse(parseOutputText(data)) as T;
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
	const instructions = `You are an expert accessibility auditor for websites. You will receive DOM color extraction data.

Return JSON with two keys: "sections" and "findings".
- "sections" groups colors into human-readable semantic sections from top to bottom.
- "findings" contains accessibility-relevant color findings only, not generic design commentary.

For each finding include:
- "title"
- "severity": one of critical/high/medium/low/info
- "wcag"
- "summary"
- "fix_hint"
- "affected_colors": array of hex colors

Allowed finding topics:
- likely low contrast clusters
- color-only meaning in charts, legends, or status indicators
- visually confusable palette groups
- insufficient distinction between interactive states

Respond with JSON only.`;

	const parsed = await requestJson<{
		sections?: Array<Partial<ColorSection>>;
		findings?: Array<Partial<ColorFinding>>;
	}>(
		apiKey,
		instructions,
		`Page: ${domData.pageTitle} (${domData.url})\nDOM color data:\n${JSON.stringify(domData.elements)}`
	);

	return {
		sections: normalizeColorSections(parsed.sections ?? []),
		findings: normalizeColorFindings(parsed.findings ?? []),
		modelVersion: MODEL,
		pageUrl: domData.url,
		timestamp: new Date().toISOString()
	};
}
