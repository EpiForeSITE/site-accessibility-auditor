export interface DetectedChart {
	id: number;
	type: 'svg' | 'canvas' | 'img' | 'container';
	library: string | null;
	label: string;
	dimensions: { width: number; height: number };
	rect: { x: number; y: number; width: number; height: number };
	path: string;
	hasAccessibleName: boolean;
	childShapeCount: number;
}

export interface ChartScanResult {
	charts: DetectedChart[];
	pageTitle: string;
	url: string;
	timestamp: string;
}
