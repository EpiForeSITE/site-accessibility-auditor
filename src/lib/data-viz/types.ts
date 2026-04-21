export interface DetectedChart {
	id: number;
	type: 'svg' | 'canvas' | 'img' | 'container';
	library: string | null;
	label: string;
	accessibleName: string | null;
	captionText: string | null;
	dimensions: { width: number; height: number };
	rect: { x: number; y: number; width: number; height: number };
	path: string;
	hasAccessibleName: boolean;
	hasTableFallback: boolean;
	supportsKeyboard: boolean;
	legendItems: string[];
	seriesLabels: string[];
	colorChannels: string[];
	nearbyControls: string[];
	childShapeCount: number;
}

export interface ChartScanResult {
	charts: DetectedChart[];
	pageTitle: string;
	url: string;
	timestamp: string;
}
