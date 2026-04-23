const API_URL = 'https://api.openai.com/v1/responses';
export const OPENAI_MODEL = 'gpt-5.2-pro';

export interface ImagePart {
	type: 'input_image';
	image_url: string;
}

export interface TextPart {
	type: 'input_text';
	text: string;
}

export type InputPart = TextPart | ImagePart;

export interface ResponsesCallOptions {
	instructions: string;
	text: string;
	schemaName: string;
	schema: Record<string, unknown>;
	images?: string[];
	reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export class OpenAIError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
		this.name = 'OpenAIError';
	}
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
	const textBlock = outputMessage?.content?.find(
		(block) => block.type === 'output_text' || block.type === 'text'
	);
	const content = textBlock?.text ?? response.output_text;

	if (!content) {
		throw new Error('Empty response from OpenAI');
	}

	return content
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?```\s*$/i, '')
		.trim();
}

export async function callResponsesJson<T>(
	apiKey: string,
	options: ResponsesCallOptions
): Promise<T> {
	const content: InputPart[] = [{ type: 'input_text', text: options.text }];
	if (options.images) {
		for (const url of options.images) {
			content.push({ type: 'input_image', image_url: url });
		}
	}

	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: OPENAI_MODEL,
			instructions: options.instructions,
			input: [
				{
					role: 'user',
					content
				}
			],
			reasoning: { effort: options.reasoningEffort ?? 'medium' },
			text: {
				format: {
					type: 'json_schema',
					name: options.schemaName,
					strict: true,
					schema: options.schema
				}
			}
		})
	});

	if (!response.ok) {
		const err = await response.json().catch(() => null);
		const msg =
			(err as { error?: { message?: string } } | null)?.error?.message ??
			`OpenAI request failed (${response.status})`;
		throw new OpenAIError(msg, response.status);
	}

	const data = await response.json();
	return JSON.parse(parseOutputText(data)) as T;
}
