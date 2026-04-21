export interface ElementRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface AuditElement {
	id: number;
	tag: string;
	text: string;
	rect: ElementRect;
	selector?: string | null;
	domPath?: string | null;
	attributes: Record<string, string | null>;
	status: 'pass' | 'warning' | 'fail';
	touchWidth: number;
	touchHeight: number;
	suggestion: string;
}

export interface AuditSummary {
	total: number;
	pass: number;
	warning: number;
	fail: number;
}

export interface AuditResult {
	elements: AuditElement[];
	summary: AuditSummary;
	timestamp: string;
}
