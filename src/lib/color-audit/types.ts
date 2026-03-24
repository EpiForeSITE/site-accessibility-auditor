export interface ColorEntry {
	hex: string;
	usage: 'background' | 'text' | 'border' | 'fill' | 'stroke' | 'outline' | 'other';
	element: string;
	context: string;
}

export interface ColorSection {
	name: string;
	description: string;
	colors: ColorEntry[];
}

export interface ColorAuditResult {
	sections: ColorSection[];
	pageUrl: string;
	timestamp: string;
}

export interface DomColorData {
	pageTitle: string;
	url: string;
	elements: DomElement[];
}

export interface DomElement {
	tag: string;
	text: string;
	path: string;
	colors: Record<string, string>;
	attributes: Record<string, string | null>;
}
