import type { ColorAuditResult, ColorSection, DomColorData } from './types.ts';

const MODEL = 'gpt-5.2-pro';
const API_URL = 'https://api.openai.com/v1/responses';

const INSTRUCTIONS = `You are an expert color accessibility auditor for websites. You will receive a JSON object describing a webpage's DOM elements and their computed CSS colors.

Your task:
1. Analyze the page structure and identify logical, human-readable sections (e.g. "Navigation Bar", "Hero Section", "Data Visualization — Concentration Levels", "Footer", "Sidebar Filters", "Chart Legend", etc.).
2. Group every distinct color into the section where it appears. Name sections descriptively based on the content and purpose of the elements.
3. For each color in a section, report:
   - "hex": the color in lowercase 6-digit hex (e.g. "#1a2b3c")
   - "usage": one of "background", "text", "border", "fill", "stroke", "outline", or "other"
   - "element": the HTML tag and key identifier (e.g. "h1#title", "div.chart-container", "svg rect")
   - "context": a short human-readable description of what this color is used for (e.g. "Heading text color", "Chart bar for high concentration", "Navigation background")

Rules:
- Deduplicate: if the same hex + usage combination appears multiple times in a section, keep only one representative entry.
- Skip fully transparent colors and default browser-agent colors (like transparent backgrounds on generic divs with no visual presence).
- Normalize all hex values to lowercase 6-digit format.
- If the page has data visualization elements (charts, graphs, maps, legends), create dedicated sections for them and label the colors by what they represent when possible.
- Order sections from top-of-page to bottom-of-page as they appear in the DOM.
- Aim for clear, descriptive section names that a non-technical person can understand.

You MUST respond with ONLY a single JSON object (no markdown fences, no commentary) matching this exact structure:
{
  "sections": [
    {
      "name": "Section Name",
      "description": "Brief description of what this section contains",
      "colors": [
        {
          "hex": "#1a2b3c",
          "usage": "background",
          "element": "div.container",
          "context": "Main content area background"
        }
      ]
    }
  ]
}`;

export async function extractColorSections(
	apiKey: string,
	domData: DomColorData
): Promise<ColorAuditResult> {
	const userMessage = `Analyze this webpage and extract all colors grouped by section.\n\nPage: ${domData.pageTitle} (${domData.url})\n\nDOM elements with colors (${domData.elements.length} total):\n${JSON.stringify(domData.elements)}`;

	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: MODEL,
			instructions: INSTRUCTIONS,
			input: userMessage,
			reasoning: { effort: 'medium' }
		})
	});

	if (!response.ok) {
		const err = await response.json().catch(() => null);
		const msg = err?.error?.message ?? `API request failed (${response.status})`;
		throw new Error(msg);
	}

	const data = await response.json();

	// Responses API: find the assistant message output
	const outputMessage = data.output?.find(
		(item: { type: string }) => item.type === 'message' && item.role === 'assistant'
	) ??
		data.output?.find((item: { type: string }) => item.type === 'message');

	const textBlock = outputMessage?.content?.find(
		(block: { type: string }) => block.type === 'output_text'
	);

	const content = textBlock?.text ?? data.output_text;
	if (!content) {
		throw new Error('Empty response from OpenAI');
	}

	// Strip markdown code fences if the model wraps its JSON response
	const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

	const parsed = JSON.parse(cleaned) as { sections: ColorSection[] };

	return {
		sections: parsed.sections,
		pageUrl: domData.url,
		timestamp: new Date().toISOString()
	};
}
