export interface TabOrderElement {
	id: number;
	tag: string;
	text: string;
	role: string | null;
	tabindex: number | null;
	rect: { x: number; y: number; width: number; height: number };
	path?: string | null;
	attributes: Record<string, string | null>;
	focusable: 'natural' | 'programmatic';
}

export interface TabOrderResult {
	elements: TabOrderElement[];
	summary: {
		total: number;
		natural: number;
		programmatic: number;
		hasPositiveTabindex: boolean;
	};
	timestamp: string;
}
