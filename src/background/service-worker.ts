export interface CaptureViewportMessage {
	type: 'CAPTURE_VIEWPORT';
	tabId: number;
}

export interface CaptureViewportResponse {
	ok: boolean;
	dataUrl?: string;
	error?: string;
}

async function captureViewport(tabId: number): Promise<CaptureViewportResponse> {
	try {
		const tab = await chrome.tabs.get(tabId);
		if (!tab?.windowId) {
			return { ok: false, error: 'Tab has no associated window' };
		}
		const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
		if (!dataUrl) {
			return { ok: false, error: 'captureVisibleTab returned empty result' };
		}
		return { ok: true, dataUrl };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : 'Unknown capture error'
		};
	}
}

chrome.runtime.onMessage.addListener(
	(
		message: CaptureViewportMessage,
		_sender,
		sendResponse: (response: CaptureViewportResponse) => void
	) => {
		if (message?.type !== 'CAPTURE_VIEWPORT') return false;
		captureViewport(message.tabId).then(sendResponse);
		return true;
	}
);
