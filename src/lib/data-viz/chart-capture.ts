import { evalInPage } from '../shared/devtools-eval.ts';
import type { CaptureHint, DetectedChart } from './types.ts';

const MAX_DIM = 1800;
const ASYNC_POLL_INTERVAL = 80;
const ASYNC_TIMEOUT = 8000;

export interface CaptureResult {
	dataUrl: string;
	method: 'canvas' | 'svg' | 'img' | 'viewport';
	width: number;
	height: number;
}

function buildCanvasCaptureExpression(id: number): string {
	return `(function() {
	var el = document.querySelector('[data-viz-id="${id}"]');
	if (!el) return { ok: false, error: 'Element missing' };
	try {
		var canvas = el.tagName && el.tagName.toLowerCase() === 'canvas' ? el : el.querySelector('canvas');
		if (!canvas) return { ok: false, error: 'No canvas' };
		var dataUrl = canvas.toDataURL('image/png');
		return { ok: true, dataUrl: dataUrl, width: canvas.width, height: canvas.height };
	} catch (e) {
		return { ok: false, error: String(e && e.message || e) };
	}
})()`;
}

function buildSvgCaptureStart(id: number, slot: string, maxDim: number): string {
	return `(function() {
	var el = document.querySelector('[data-viz-id="${id}"]');
	if (!el) { window['${slot}'] = { ok: false, error: 'Element missing' }; return { started: false }; }
	var svg = el.tagName && el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
	if (!svg) { window['${slot}'] = { ok: false, error: 'No SVG' }; return { started: false }; }
	window['${slot}'] = { status: 'pending' };
	(async function() {
		try {
			var rect = svg.getBoundingClientRect();
			var clone = svg.cloneNode(true);
			if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			if (!clone.getAttribute('xmlns:xlink')) clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
			if (!clone.getAttribute('viewBox') && rect.width && rect.height) {
				clone.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
			}
			clone.setAttribute('width', String(rect.width || 800));
			clone.setAttribute('height', String(rect.height || 600));

			var origNodes = svg.querySelectorAll('*');
			var cloneNodes = clone.querySelectorAll('*');
			var pairs = Math.min(origNodes.length, cloneNodes.length);
			var props = ['fill','stroke','stroke-width','opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight','text-anchor','dominant-baseline','visibility','stroke-dasharray','stroke-linecap','stroke-linejoin'];
			for (var i = 0; i < pairs; i++) {
				try {
					var cs = getComputedStyle(origNodes[i]);
					var applied = '';
					for (var p = 0; p < props.length; p++) {
						var v = cs.getPropertyValue(props[p]);
						if (v && v !== 'none' && v !== 'normal' && v !== 'auto') applied += props[p] + ':' + v + ';';
					}
					if (applied) {
						var existing = cloneNodes[i].getAttribute('style') || '';
						cloneNodes[i].setAttribute('style', applied + existing);
					}
				} catch (_e) {}
			}

			var serialized = new XMLSerializer().serializeToString(clone);
			var svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
			var url = URL.createObjectURL(svgBlob);
			var img = new Image();
			img.crossOrigin = 'anonymous';
			var load = new Promise(function(res, rej) {
				img.onload = function() { res(null); };
				img.onerror = function(e) { rej(new Error('Image load failed')); };
			});
			img.src = url;
			await load;
			var dpr = Math.min(2, window.devicePixelRatio || 1);
			var w = Math.max(1, Math.floor(rect.width * dpr));
			var h = Math.max(1, Math.floor(rect.height * dpr));
			var maxDim = ${maxDim};
			if (w > maxDim || h > maxDim) {
				var scale = Math.min(maxDim / w, maxDim / h);
				w = Math.floor(w * scale);
				h = Math.floor(h * scale);
			}
			var canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			var ctx = canvas.getContext('2d');
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			ctx.drawImage(img, 0, 0, w, h);
			URL.revokeObjectURL(url);
			var dataUrl = canvas.toDataURL('image/png');
			window['${slot}'] = { ok: true, dataUrl: dataUrl, width: w, height: h };
		} catch (e) {
			window['${slot}'] = { ok: false, error: String(e && e.message || e) };
		}
	})();
	return { started: true };
})()`;
}

function buildSvgCapturePoll(slot: string): string {
	return `(function() {
	var s = window['${slot}'];
	if (!s) return null;
	if (s.status === 'pending') return { pending: true };
	return s;
})()`;
}

function buildScrollIntoViewExpression(id: number): string {
	return `(function() {
	var el = document.querySelector('[data-viz-id="${id}"]');
	if (!el) return null;
	el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
	var r = el.getBoundingClientRect();
	return { x: r.left, y: r.top, width: r.width, height: r.height, dpr: window.devicePixelRatio || 1, vw: window.innerWidth, vh: window.innerHeight };
})()`;
}

async function captureCanvas(id: number): Promise<CaptureResult | null> {
	const result = await evalInPage<{
		ok: boolean;
		dataUrl?: string;
		width?: number;
		height?: number;
	} | null>(buildCanvasCaptureExpression(id));
	if (!result?.ok || !result.dataUrl) return null;
	return {
		dataUrl: result.dataUrl,
		method: 'canvas',
		width: result.width ?? 0,
		height: result.height ?? 0
	};
}

async function captureSvg(id: number): Promise<CaptureResult | null> {
	const slot = `__vizCapture_${id}_${Date.now()}`;
	const started = await evalInPage<{ started: boolean }>(buildSvgCaptureStart(id, slot, MAX_DIM));
	if (!started?.started) return null;

	const deadline = Date.now() + ASYNC_TIMEOUT;
	while (Date.now() < deadline) {
		await new Promise((r) => setTimeout(r, ASYNC_POLL_INTERVAL));
		const status = await evalInPage<
			| { pending?: true; ok?: boolean; dataUrl?: string; width?: number; height?: number }
			| null
		>(buildSvgCapturePoll(slot));
		if (!status) continue;
		if ('pending' in status && status.pending) continue;
		if (status.ok && status.dataUrl) {
			return {
				dataUrl: status.dataUrl,
				method: 'svg',
				width: status.width ?? 0,
				height: status.height ?? 0
			};
		}
		return null;
	}
	return null;
}

async function captureImg(hint: CaptureHint): Promise<CaptureResult | null> {
	if (!hint.imageSrc) return null;
	const src = hint.imageSrc;
	if (!/^https?:\/\//i.test(src) && !src.startsWith('data:')) return null;
	return { dataUrl: src, method: 'img', width: 0, height: 0 };
}

async function captureViewport(id: number): Promise<CaptureResult | null> {
	const rect = await evalInPage<{
		x: number;
		y: number;
		width: number;
		height: number;
		dpr: number;
		vw: number;
		vh: number;
	} | null>(buildScrollIntoViewExpression(id));
	if (!rect || rect.width <= 0 || rect.height <= 0) return null;

	await new Promise((resolve) => setTimeout(resolve, 200));

	const tabId = chrome.devtools?.inspectedWindow?.tabId;
	if (tabId === undefined) return null;

	let response: { ok: boolean; dataUrl?: string; error?: string };
	try {
		response = (await chrome.runtime.sendMessage({ type: 'CAPTURE_VIEWPORT', tabId })) as {
			ok: boolean;
			dataUrl?: string;
			error?: string;
		};
	} catch (err) {
		response = { ok: false, error: err instanceof Error ? err.message : 'sendMessage failed' };
	}
	if (!response?.ok || !response.dataUrl) return null;

	return cropImage(response.dataUrl, rect);
}

async function cropImage(
	dataUrl: string,
	rect: { x: number; y: number; width: number; height: number; dpr: number; vw: number; vh: number }
): Promise<CaptureResult | null> {
	try {
		const blob = await (await fetch(dataUrl)).blob();
		const bitmap = await createImageBitmap(blob);
		const dpr = bitmap.width / rect.vw;
		const sx = Math.max(0, Math.floor(rect.x * dpr));
		const sy = Math.max(0, Math.floor(rect.y * dpr));
		const sw = Math.min(bitmap.width - sx, Math.floor(rect.width * dpr));
		const sh = Math.min(bitmap.height - sy, Math.floor(rect.height * dpr));
		if (sw <= 0 || sh <= 0) return null;

		let outW = sw;
		let outH = sh;
		if (outW > MAX_DIM || outH > MAX_DIM) {
			const scale = Math.min(MAX_DIM / outW, MAX_DIM / outH);
			outW = Math.floor(outW * scale);
			outH = Math.floor(outH * scale);
		}

		const canvas = new OffscreenCanvas(outW, outH);
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, outW, outH);
		ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
		const outBlob = await canvas.convertToBlob({ type: 'image/png' });
		const outDataUrl = await blobToDataUrl(outBlob);
		return { dataUrl: outDataUrl, method: 'viewport', width: outW, height: outH };
	} catch {
		return null;
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

export async function captureChartImage(chart: DetectedChart): Promise<CaptureResult | null> {
	const hint = chart.captureHint;

	if (hint.kind === 'canvas') {
		const r = await captureCanvas(chart.id);
		if (r) return r;
	}
	if (hint.kind === 'svg' || chart.type === 'svg') {
		const r = await captureSvg(chart.id);
		if (r) return r;
	}
	if (hint.kind === 'img' || chart.type === 'img') {
		const r = await captureImg(hint);
		if (r) return r;
	}

	return captureViewport(chart.id);
}
