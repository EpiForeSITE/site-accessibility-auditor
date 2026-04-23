/**
 * Shared wrappers around chrome.devtools.inspectedWindow.eval and
 * chrome.tabs.captureVisibleTab so every module has consistent error handling
 * and typing.
 */

export function evalInPage<T = unknown>(expression: string): Promise<T> {
	return new Promise((resolve, reject) => {
		chrome.devtools.inspectedWindow.eval(expression, {}, (result, exInfo) => {
			if (exInfo?.isException) {
				reject(new Error(exInfo.value || 'Evaluation failed'));
			} else {
				resolve(result as T);
			}
		});
	});
}

export async function captureTab(quality = 80): Promise<string | null> {
	const tabId = chrome.devtools?.inspectedWindow?.tabId;
	if (typeof tabId !== 'number') return null;
	try {
		const tab = await chrome.tabs.get(tabId);
		if (typeof tab.windowId !== 'number') return null;
		return await chrome.tabs.captureVisibleTab(tab.windowId, {
			format: 'jpeg',
			quality
		});
	} catch {
		return null;
	}
}

export async function downscaleDataUrl(dataUrl: string, maxWidth = 320): Promise<string> {
	if (!dataUrl.startsWith('data:image')) return dataUrl;
	const img = new Image();
	const loaded = new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error('image load failed'));
	});
	img.src = dataUrl;
	try {
		await loaded;
	} catch {
		return dataUrl;
	}
	const scale = Math.min(1, maxWidth / img.naturalWidth);
	const w = Math.max(1, Math.round(img.naturalWidth * scale));
	const h = Math.max(1, Math.round(img.naturalHeight * scale));
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) return dataUrl;
	ctx.drawImage(img, 0, 0, w, h);
	return canvas.toDataURL('image/jpeg', 0.7);
}

export function getPageInfo(): Promise<{ origin: string; url: string; title: string }> {
	return evalInPage<{ origin: string; url: string; title: string }>(
		`(function(){ return { origin: location.origin, url: location.href, title: document.title }; })()`
	);
}
